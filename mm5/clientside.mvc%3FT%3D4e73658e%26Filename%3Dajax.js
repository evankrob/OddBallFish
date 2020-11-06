// Miva Merchant v5.x
//
// This file and the source codes contained herein are the property of
// Miva Merchant, Inc.  Use of this file is restricted to the specific terms and
// conditions in the License Agreement associated with this file.  Distribution
// of this file or portions of this file for uses not covered by the License
// Agreement is not allowed without a written agreement signed by an officer of
// Miva Merchant, Inc.
//
// Copyright 1998-2013 Miva Merchant, Inc.  All rights reserved.
// http://www.mivamerchant.com
//
// $Id: ajax.js 38969 2013-09-09 22:27:54Z burch $
//
// Prefix         : MER-AJX-
// Next Error Code: 8
//

/*!
 * \file
 * \brief	Functions that implement a browser-independent AJAX call mechanism
 */

// Order Processing Server-side AJAX calls
////////////////////////////////////////////////////

var json_url, json_nosessionurl, Session_ID;

function AJAX_New()
{
	var http_request = null;

	if ( window.XMLHttpRequest )
	{
		http_request = new XMLHttpRequest();
	}
	else if ( window.ActiveXObject )
	{
		http_request = new ActiveXObject( "Microsoft.XMLHTTP" );
	}

	return http_request;
}

function AJAX_Initialize()
{
	var session_start, session_id;

	if ( ( ( typeof json_nosessionurl ) == 'string' ) &&
		 ( ( typeof Session_ID ) == 'string' ) )
	{
		return;
	}

	if ( ( session_start = json_url.toLowerCase().indexOf( 'session_id=' ) ) == -1 )
	{
		json_nosessionurl	= json_url;
		session_id			= '';
	}
	else
	{
		if ( ( session_end = json_url.indexOf( '&', session_start + 11 /* length of 'Session_ID=' */ ) ) == -1 )
		{
			session_end		= json_url.length;
		}

		session_id			= json_url.substring( session_start + 11, session_end );
		json_nosessionurl	= json_url.slice( 0, session_start ) + json_url.slice( session_end + 1 );
	}

	if ( ( typeof Session_ID ) == 'undefined' )
	{
		Session_ID			= session_id;
	}
}

function AJAX_Append_SessionParameters( parameters, session_type )
{
	var session_parameters;

	session_parameters		= 'Session_Type=' + encodeURIComponent( session_type );

	if ( ( session_type == 'admin' ) && ( ( typeof Session_ID ) != 'undefined' ) )
	{
		session_parameters	+= '&Session_ID=' + encodeURIComponent( Session_ID );
	}

	if ( ( ( typeof parameters ) != 'string' ) || ( parameters.length == 0 ) )	return session_parameters;
	else																		return parameters + '&' + session_parameters;
}

function AJAX_Call_Module( callback, session_type, module_code, func, parameters )
{
	AJAX_Initialize();

	return AJAX_Call_LowLevel( null,
							   callback,
							   'application/x-www-form-urlencoded', AJAX_Append_SessionParameters( parameters, session_type ),
							   'Store_Code=' + encodeURIComponent( Store_Code ) + '&Function=Module&Module_Code=' + encodeURIComponent( module_code ) + '&Module_Function=' + encodeURIComponent( func ),
							   function( http_request )
							   {
									var response;

									response				= new Object();
									response.success		= 0;
									response.error_code		= 'MER-AJX-00002';
									response.error_message	= 'Miva Merchant returned an invalid response.\n' +
															  'Module: ' + module_code + '\n' +
															  'Function: ' + func + '\n' +
															  'Response: ' + http_request.responseText;
									return response;
							   } );
}

function AJAX_Call( callback, session_type, func, parameters )
{
	AJAX_Initialize();

	return AJAX_Call_LowLevel( null,
							   callback,
							   'application/x-www-form-urlencoded', AJAX_Append_SessionParameters( parameters, session_type ),
							   'Store_Code=' + encodeURIComponent( Store_Code ) + '&Function=' + encodeURIComponent( func ),
							   function( http_request )
							   {
									var response;

									response				= new Object();
									response.success		= 0;
									response.error_code		= 'MER-AJX-00001';
									response.error_message	= 'Miva Merchant returned an invalid response.\n' +
															  'Function: ' + func + '\n' +
															  'Response: ' + http_request.responseText;

									return response;
							   } );
}

function AJAX_Call_FieldList( callback, session_type, func, parameters, fields )
{
	for ( i = 0; i < fields.length; i++ )
	{
		parameters += '&' + encodeURIComponent( fields[ i ].name ) + '=' + encodeURIComponent( fields[ i ].value );
	}

	return AJAX_Call( callback, session_type, func, parameters );
}

function AJAX_Call_WithFile( progress_object, session_type, func, parameters, file_field, file_input, file_object )
{
	var response;

	AJAX_Initialize();

	if ( file_object && window.FormData )				return AJAX_Call_WithFile_FormData( progress_object, session_type, func, parameters, file_field, file_object );
	else if ( file_object && window.FileReader &&
			  XMLHttpRequest.prototype.sendAsBinary )	return AJAX_Call_WithFile_sendAsBinary( progress_object, session_type, func, parameters, file_field, file_object );
	else if ( file_input )								return AJAX_Call_WithFile_IFRAME( progress_object, session_type, func, parameters, file_field, file_input );

	response				= new Object();
	response.success		= 0;
	response.error_code		= 'MER-AJX-00006';
	response.error_message	= 'This browser does not support file upload with the provided parameters';

	progress_object.Complete( response );
	if ( window.Modal_Resize ) Modal_Resize();
}

function AJAX_Call_WithFile_FormData( progress_object, session_type, func, parameters, file_field, file_object )
{
	var content, param, http_request;

	content	= new FormData();

	for ( param in parameters )
	{
		content.append( param, parameters[ param ] );
	}

	content.append( 'Session_Type',		session_type );

	if ( ( session_type === 'admin' ) && ( ( typeof Session_ID ) != 'undefined' ) )
	{
		content.append( 'Session_ID',	Session_ID );
	}

	content.append( file_field,			file_object );

	if ( ( http_request = AJAX_New() ) == null )
	{
		return null;
	}

	progress_object.Initialize( http_request, true );

	http_request.upload.addEventListener( 'progress',	function( event ) { progress_object.Progress( ( event.loaded / event.total * 100 ).toFixed( 0 ) ); }, false );
	http_request.upload.addEventListener( 'load',		function( event ) { progress_object.Progress( 100 ); }, false );

	return AJAX_Call_LowLevel( http_request,
							   function( response ) { progress_object.Complete( response ); },
							   null,
							   content,
							   'Store_Code=' + encodeURIComponent( Store_Code ) + '&Function=' + encodeURIComponent( func ),
							   function( http_request )
							   {
									var response;

									response				= new Object();
									response.success		= 0;
									response.error_code		= 'MER-AJX-00003';
									response.error_message	= 'Miva Merchant returned an invalid response.\n' +
															  'Function: ' + func + '\n' +
															  'Response: ' + http_request.responseText;

									return response;
							   } );
}

function AJAX_Call_WithFile_sendAsBinary( progress_object, session_type, func, parameters, file_field, file_object )
{
	var http_request;
	var reader, param, now;
	var content, boundary, crlf;

	now					= new Date();
	boundary			= '--------miva_boundary_' + now.getTime();
	content				= '';
	reader				= new FileReader();
	reader.onloadend	= function()
	{
		for ( param in parameters )
		{
			content		+= '--' + boundary + '\r\n' +
						   'Content-Disposition: form-data; name="' + param + '"\r\n' +
						   '\r\n' +
						   parameters[ param ] + '\r\n';
		}

		content			+= '--' + boundary + '\r\n' +
						   'Content-Disposition: form-data; name="Session_Type"\r\n' +
						   '\r\n' +
						   session_type + '\r\n';

		if ( ( session_type === 'admin' ) && ( ( typeof Session_ID ) != 'undefined' ) )
		{
			content		+= '--' + boundary + '\r\n' +
						   'Content-Disposition: form-data; name="Session_ID"\r\n' +
						   '\r\n' +
						   Session_ID + '\r\n';
		}

		content			+= '--' + boundary + '\r\n' +
						   'Content-Disposition: form-data; name="' + file_field + '"; filename="' + file_object.name + '"\r\n' +
						   'Content-Type: ' + file_object.type + '\r\n' +
						   '\r\n' +
						   this.result + '\r\n';

		content			+= '--' + boundary + '--';

		if ( ( http_request = AJAX_New() ) == null )
		{
			return;
		}

		progress_object.Initialize( http_request, true );

		http_request.upload.addEventListener( 'progress',	function( event ) { progress_object.Progress( ( event.loaded / event.total * 100 ).toFixed( 0 ) ); }, false );
		http_request.upload.addEventListener( 'load',		function( event ) { progress_object.Progress( 100 ); }, false );

		AJAX_Call_LowLevel( http_request,
							function( response ) { progress_object.Complete( response ); },
							'multipart/form-data; boundary=' + boundary,
							content,
							'Store_Code=' + encodeURIComponent( Store_Code ) + '&Function=' + encodeURIComponent( func ),
							function( http_request )
							{
								var response;

								response				= new Object();
								response.success		= 0;
								response.error_code		= 'MER-AJX-00004';
								response.error_message	= 'Miva Merchant returned an invalid response.\n' +
														  'Function: ' + func + '\n' +
														  'Response: ' + http_request.responseText;

								return response;
							} );
	}

	reader.readAsBinaryString( file_object );
}

var AJAX_Call_WithFile_IFRAME_Count = 0;

function AJAX_Call_WithFile_IFRAME( progress_object, session_type, func, parameters, file_field, file_input )
{
	var param;
	var response;
	var iframe_id;
	var iframe, hidden_container, form;
	var file_original_name, file_original_disabled, file_original_parent;

	/*
	 * Since this function will submit ALL of the files attached to the input field, set a flag on the input
	 * field that will cause subequent calls to this function to silently return.
	 */

	if ( file_input.IFRAME_Submitted )	return;

	file_input.IFRAME_Submitted		= true;
	iframe_id						= 'AJAX_Call_WithFile_IFRAME_' + ++AJAX_Call_WithFile_IFRAME_Count;

	/*
	 * In IE, an IFRAME created using document.createElement somehow gets detached from the
	 * current browser window and results in a popup window.  So we create a containing div
	 * and set its innerHTML to create the IFRAME
	 */

	hidden_container				= newElement( 'div', null, { display: 'none' }, document.body );
	hidden_container.innerHTML		= '<iframe name="' + encodeURIComponent( iframe_id ) + '" id="' + encodeURIComponent( iframe_id ) + '"></iframe>';
	iframe							= document.getElementById( iframe_id );
	form							= newElement( 'form', { method:		'POST',
															action:		json_nosessionurl + 'Store_Code=' + encodeURIComponent( Store_Code ) + '&Function=' + encodeURIComponent( func ),
															target:		iframe_id,
															encoding:	'multipart/form-data',
															enctype:	'multipart/form-data' },
												  null, hidden_container );

	for ( param in parameters )
	{
		newElement( 'input',	{ type:	'hidden',
								  name:	param,
								  value:	parameters[ param ] }, null, form );
	}

	newElement( 'input',		{ type:		'hidden',
								  name:		'Session_Type',
								  value:	session_type }, null, form );

	if ( ( session_type === 'admin' ) && ( ( typeof Session_ID ) != 'undefined' ) )
	{
		newElement( 'input',	{ type:		'hidden',
								  name:		'Session_ID',
								  value:	Session_ID }, null, form );
	}

	/*
	 * Make the file input part of the dynamically created form, saving its original values
	 * so that we can restore them later.
	 */

	file_original_name				= file_input.name;
	file_original_disabled			= file_input.disabled;
	file_original_parent			= file_input.parentNode;

	form.appendChild( file_input );

	file_input.name					= file_field;
	file_input.disabled				= false;

	AddEvent( iframe, 'load', function()
	{
		file_input.IFRAME_Submitted	= false;
		file_input.name				= file_original_name;
		file_input.disabled			= file_original_disabled;
		file_original_parent.appendChild( file_input );

		try
		{
			if ( ( typeof JSON !== 'undefined' ) &&
				 ( typeof JSON.parse !== 'undefined' ) )	response = JSON.parse( window.frames[ iframe_id ].document.body.innerHTML );
			else											response = eval( '(' + window.frames[ iframe_id ].document.body.innerHTML + ')' );
		}
		catch ( e )
		{
			response				= new Object();
			response.success		= 0;
			response.error_code		= 'MER-AJX-00005';
			response.error_message	= 'Miva Merchant returned an invalid response.\n' +
									  'Function: ' + func + '\n' +
									  'Response: ' + window.frames[ iframe_id ].document.body.innerHTML;
		}

		hidden_container.parentNode.removeChild( hidden_container );

		if ( response.error_code == 'session_timeout' )
		{
			parent.location.reload();
			return;
		}

		progress_object.Complete( response );
		if ( window.Modal_Resize ) Modal_Resize();
	} );

	progress_object.Initialize( null, false );
	form.submit();
}

function AJAX_Call_LowLevel( http_request, callback, content_type, content, uri, error_response )
{
	var response;

	if ( http_request == null )
	{
		if ( ( http_request = AJAX_New() ) == null )
		{
			return null;
		}
	}

	AJAX_Call_Initialize( http_request, callback, content_type, uri, error_response );

	if ( content &&
		 ( typeof content.constructor != 'undefined' ) &&
		 ( typeof window.FormData != 'undefined' ) &&
		 ( content.constructor == window.FormData ) )		http_request.send( content );
	else if ( http_request.sendAsBinary )					http_request.sendAsBinary( content );
	else													http_request.send( content );

	return http_request;
}

function AJAX_Call_Initialize( http_request, callback, content_type, uri, error_response )
{
	http_request.open( 'POST', json_nosessionurl + uri, true );
	http_request.setRequestHeader( 'If-Modified-Since',	'Sat, 1 Jan 2000 00:00:00 GMT' );		// Avoid caching

	if ( content_type )
	{
		http_request.setRequestHeader( 'Content-Type', content_type );
	}

	if ( MivaVM_API == 'Mia' && MivaVM_Version < 5.07 )
	{
		http_request.setRequestHeader( 'Connection', 'close' );
	}

	http_request.onreadystatechange = function()
	{
		var content_length = null, content_encoding = null;

		if ( http_request.readyState == 4 )
		{
			if ( http_request.status == 200 )
			{
				// Prevent eval() of a partial response due to a navigation away from the current page, pressing
				// the stop button, etc...
				if ( typeof http_request.getResponseHeader != 'undefined' )
				{
					content_length		= http_request.getResponseHeader( 'Content-Length' );
					content_encoding	= http_request.getResponseHeader( 'Content-Encoding' );
				}

				if ( content_length && ( content_length != http_request.responseText.length ) &&
					 ( content_encoding == null || ( content_encoding == 'identity' ) ) )
				{
					return;
				}

				try
				{
					if ( ( typeof JSON !== 'undefined' ) &&
						 ( typeof JSON.parse !== 'undefined' ) )	response = JSON.parse( http_request.responseText );
					else											response = eval( '(' + http_request.responseText + ')' );
				}
				catch ( e )
				{
					response = error_response( http_request );
				}

				if ( response.error_code == 'session_timeout' )
				{
					location.reload();
					return;
				}

				callback( response );
				if ( window.Modal_Resize ) Modal_Resize();
			}

			http_request = null;
		}
	}
}

function AJAX_AutoComplete_Initialize( http_request, callback, session_type, func, parameters )
{
	AJAX_Initialize();
	AJAX_Call_Initialize( http_request,
						  callback,
						  'application/x-www-form-urlencoded',
						  'Store_Code=' + encodeURIComponent( Store_Code ) + '&Function=' + encodeURIComponent( func ),
						  function( http_request )
						  {
							  var response;

							  response					= new Object();
							  response.success			= 0;
							  response.error_code		= 'MER-AJX-00007';
							  response.error_message	= 'Miva Merchant returned an invalid response.\n' +
														  'Function: ' + func + '\n' +
														  'Response: ' + http_request.responseText;

							  return response;
						  } );

	http_request.autocomplete_content	= AJAX_Append_SessionParameters( parameters, session_type );
}

function AJAX_AutoComplete_Execute( http_request )
{
	http_request.send( http_request.autocomplete_content );
}

function PackArray( array )
{
	var i;
	var packed = '';

	if ( array == null || array.length == 0 )
	{
		return '';
	}

	for ( i = 0; i < array.length - 1; i++ )
	{
		packed += encodeURIComponent( array[ i ] ) + '|';
	}

	packed += encodeURIComponent( array[ i ] );
	return packed;
}

function EncodeArray( array )
{
	return encodeURIComponent( PackArray( array ) );
}

function PackTwoDimensionalArray( array )
{
	var i, j;
	var packed = '';

	if ( array == null || array.length == 0 )
	{
		return '';
	}

	for ( i = 0; i < array.length; i++ )
	{
		for ( j = 0; j < array[ i ].length; j++ )
		{
			packed		+= encodeURIComponent( array[ i ][ j ] );
			if ( j < array[ i ].length - 1 )
			{
				packed	+= '%7C';
			}
		}

		if ( i < array.length - 1 )
		{
			packed		+= '|';
		}
	}

	return packed;
}

function EncodeTwoDimensionalArray( array )
{
	return encodeURIComponent( PackTwoDimensionalArray( array ) );
}

function AddEvent( obj, eventType, fn  )
{
	if( obj.addEventListener )
	{
		obj.addEventListener( eventType, fn, false );
		return true;
	}
	else if( obj.attachEvent )
	{
		var r = obj.attachEvent( 'on' + eventType, fn );
		return r;
	}
	else
	{
		return false;
	}
}

function RemoveEvent( obj, eventType, fn )
{
	if( obj.removeEventListener )
	{
		obj.removeEventListener( eventType, fn, false );
		return true;
	}
	else if( obj.detachEvent )
	{
		var r = obj.detachEvent( 'on' + eventType, fn );
		return r;
	}
	else
	{
		return false;
	}
}
