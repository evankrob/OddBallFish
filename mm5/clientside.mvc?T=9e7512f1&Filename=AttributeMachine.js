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
// $Id: AttributeMachine.js 35234 2013-02-22 21:55:50Z rguisewite $
//

function AttributeMachine( product_code, dependency_resolution, inventory_element_id, inv_long, price_element_id, swatch_element_id, invalid_msg, missing_text_msg, missing_radio_msg )
{
	this.product_code			= product_code;
	this.dependency_resolution	= dependency_resolution;
	this.inv_div				= null;
	this.inv_long				= inv_long;
	this.price_div				= null;
	this.swatches				= null;
	this.master_attributes		= null;
	this.attributes				= null;
	this.purchase_buttons		= null;
	this.buttons				= new Array();
	this.possible_req			= null;
	this.invalid_msg			= invalid_msg ? invalid_msg : '';
	this.missing_text_msg		= missing_text_msg ? missing_text_msg : '';
	this.missing_radio_msg		= missing_radio_msg ? missing_radio_msg : '';
	
	if ( inventory_element_id )	this.inv_div				= document.getElementById( inventory_element_id );
	if ( price_element_id )		this.price_div				= document.getElementById( price_element_id );
	if ( swatch_element_id )	this.swatches				= document.getElementById( swatch_element_id );
	if ( this.price_div )		this.initial_price_value	= this.price_div.innerHTML;
}

AttributeMachine.prototype.Initialize = function( attributes, possible )
{
	var i;
	var self = this;
	
	this.Find_Purchase_Buttons();

	if ( attributes )	return this.AttributeAndOptionList_Load_Callback( attributes, possible );
	else				Runtime_AttributeAndOptionList_Load_Product( this.product_code, function( response ) { self.AttributeAndOptionList_Load_Callback( response, possible ); } );
}

AttributeMachine.prototype.Find_Purchase_Buttons = function()
{
	var i, j;
	var action, product_code;
	var forms = document.getElementsByTagName( 'form' );

	for ( i = 0; i < forms.length; i++ )
	{
		action			= forms[ i ].elements[ 'Action' ];
		product_code	= forms[ i ].elements[ 'Product_Code' ];

		if ( !action || !product_code )												continue;
		if ( ( action.value != 'ADPR' ) && ( action.value != 'AUPR' ) )				continue;
		if ( product_code.value.toLowerCase() != this.product_code.toLowerCase() )	continue;

		for ( j = 0; j < forms[ i ].elements.length; j++ )
		{
			if ( forms[ i ].elements[ j ].type.toLowerCase() == 'button' ||
				 forms[ i ].elements[ j ].type.toLowerCase() == 'submit' )
			{
				this.buttons.push( forms[ i ].elements[ j ] );
			}
		}
	}
}

AttributeMachine.prototype.Disable_Purchase_Buttons = function()
{
	var i;

	for( i = 0; i < this.buttons.length; i++ )
	{
		this.buttons[ i ].disabled = true;
	}
}

AttributeMachine.prototype.Enable_Purchase_Buttons = function()
{
	var i;

	for( i = 0; i < this.buttons.length; i++ )
	{
		this.buttons[ i ].disabled = false;
	}
}

AttributeMachine.prototype.AttributeAndOptionList_Load_Callback = function( response, possible )
{
	var self = this;
	var form;
	var i, j;
	var selection, last_attr_id, last_attmpat_id, last_option_id;

	if ( ! response.success )
	{
		this.onerror( response.error_message );
	}

	this.master_attributes	= response.data;
	this.attributes			= new Array();
	form					= this.Lookup_Attribute_Form();

	if ( !form )
	{
		this.onerror( 'Unable to locate form for inventory attributes' );
		return;
	}

	// First pass to create JavaScript objects referencing the attributes' HTML element(s)
	for ( i = 0; i < this.master_attributes.length; i++ )
	{
		attribute	= this.master_attributes[ i ];

		if ( attribute.type != 'template' )
		{
			if ( !attribute.inventory )					continue;

			if ( attribute.type == 'checkbox' )				input = new AttributeMachine_Checkbox( this, attribute, null );
			else if ( attribute.type == 'text' )			input = new AttributeMachine_Text( this, attribute, null );
			else if ( attribute.type == 'memo' )			input = new AttributeMachine_Memo( this, attribute, null );
			else if ( attribute.type == 'radio' )			input = new AttributeMachine_Radio( this, attribute, null );
			else if ( attribute.type == 'select' )			input = new AttributeMachine_Select( this, attribute, null );
			else if ( attribute.type == 'swatch-select' )	input = new AttributeMachine_Select( this, attribute, null );

			if ( !input.Initialize( form ) )
			{
				this.onerror( 'Unable to locate form element(s) for attribute ' + attribute.code );
				continue;
			}

			this.attributes.push( input );
		}
		else
		{
			for ( j = 0; j < attribute.attributes.length; j++ )
			{
				template_attribute	= attribute.attributes[ j ];

				if ( !template_attribute.inventory )	continue;

				if ( template_attribute.type == 'checkbox' )			input = new AttributeMachine_Checkbox( this, attribute, template_attribute );
				else if ( template_attribute.type == 'text' )			input = new AttributeMachine_Text( this, attribute, template_attribute );
				else if ( template_attribute.type == 'memo' )			input = new AttributeMachine_Memo( this, attribute, template_attribute );
				else if ( template_attribute.type == 'radio' )			input = new AttributeMachine_Radio( this, attribute, template_attribute );
				else if ( template_attribute.type == 'select' )			input = new AttributeMachine_Select( this, attribute, template_attribute );
				else if ( template_attribute.type == 'swatch-select' )	input = new AttributeMachine_Select( this, attribute, template_attribute );

				if ( !input.Initialize( form ) )
				{
					this.onerror( 'Unable to locate form element(s) for template attribute ' + attribute.code + ':' + template_attribute.code );
					continue;
				}

				this.attributes.push( input );
			}
		}
	}

	if ( this.attributes.length == 0 )
	{
		this.oninitializeswatches( this.master_attributes, null );
		return;
	}

	selection			= this.Build_Selection();

	if ( !selection.Has_Selected() )
	{
		last_attr_id	= 0;
		last_attmpat_id	= 0;
		last_option_id	= 0;
	}
	else
	{
		last_attr_id	= selection.selected_attr_ids[ 0 ];
		last_attmpat_id	= selection.selected_attmpat_ids[ 0 ];
		last_option_id	= selection.selected_option_ids[ 0 ];
	}

	if ( possible )	this.AttributeList_Load_Possible_Callback( possible );
	else			this.possible_req = Runtime_AttributeList_Load_ProductVariant_Possible( this.product_code, this.dependency_resolution,
																							last_attr_id, last_attmpat_id, last_option_id,
																							selection.selected_attr_ids, selection.selected_attmpat_ids, selection.selected_option_ids, selection.selected_attr_types,
																							selection.unselected_attr_ids, selection.unselected_attmpat_ids,
																							function( possible_response ) { self.AttributeList_Load_Possible_Callback( possible_response ); } );
}

AttributeMachine.prototype.AttributeList_Load_Possible_Callback = function( response )
{
	var i;
	var post_selected;
	var message;
	var cull_failures = new Array();
	var possible_lookup, possible_sublookup;
	var attribute, template_attribute, input;
	var variant;

	this.possible_req = null;

	if ( !response.success )
	{
		this.onerror( response.error_message );
	}

	this.oninitializeswatches( this.master_attributes, response );

	possible_lookup	= ( response.data ) ? this.Build_Possible_Lookup( response.data.attributes ) : null;

	// Iterate through the attributes we've created and disable any that are not possible
	for ( i = 0; i < this.attributes.length; i++ )
	{
		attribute				= this.attributes[ i ].attribute;
		template_attribute		= this.attributes[ i ].template_attribute;

		possible_sublookup		= ( possible_lookup ) ? possible_lookup[ attribute.id ] : null;

		if ( possible_sublookup )
		{
			if ( template_attribute )	possible_sublookup	= possible_sublookup[ template_attribute.id ];
			else						possible_sublookup	= possible_sublookup[ 0 ];
		}

		if ( possible_sublookup == null )	this.attributes[ i ].Disable();
		else
		{
			if ( !this.attributes[ i ].Cull( possible_sublookup.options, possible_sublookup.selected_id, message ) )
			{
				cull_failures.push( template_attribute ? template_attribute : attribute );
			}
		}
	}
	
	variant = ( response.data ) ? response.data.variant : null;

	// Handle the purchase buttons and inventory message
	if ( !variant || cull_failures.length )
	{
		this.Disable_Purchase_Buttons();

		if ( this.price_div )								this.price_div.innerHTML	= this.initial_price_value;
		if ( this.inv_div )
		{
			this.inv_div.innerHTML		= this.invalid_msg;
			for ( i = 0; i < cull_failures.length; i++ )
			{
				if ( cull_failures[ i ].type == 'radio' )													message = this.missing_radio_msg;
				else if ( ( cull_failures[ i ].type == 'text' ) || ( cull_failures[ i ].type == 'memo' ) )	message = this.missing_text_msg;
				else																						message = '';

				message	= message.replace( '%attribute_code%',		cull_failures[ i ].code	);
				message	= message.replace( '%attribute_prompt%',	cull_failures[ i ].prompt );

				this.inv_div.innerHTML	+= message;
			}
		}
	}
	else
	{
		if ( response.data.variant.inv_active &&
			 response.data.variant.inv_level == 'out' )	this.Disable_Purchase_Buttons();
		else											this.Enable_Purchase_Buttons();

		if ( this.inv_div )								this.inv_div.innerHTML = this.inv_long ? response.data.variant.inv_long : response.data.variant.inv_short;

		if ( this.price_div )
		{
			if ( response.data.formatted_price != null )	this.price_div.innerHTML	= response.data.formatted_price;
			else											this.price_div.innerHTML	= this.initial_price_value;
		}

		if( typeof MivaEvents !== 'undefined' )
		{ 
			MivaEvents.ThrowEvent( 'variant_changed', { product_code:this.product_code,	variant_id:response.data.variant.variant_id } );
		}
	}
}

AttributeMachine.prototype.Attribute_Changed = function( attribute )
{
	var self = this;
	var selection = this.Build_Selection();

	if ( this.possible_req )
	{
		this.possible_req.onreadystatechange = function() {};
		this.possible_req.abort();
	}

	this.possible_req = Runtime_AttributeList_Load_ProductVariant_Possible( this.product_code, this.dependency_resolution,
																			attribute.attribute.id, attribute.template_attribute ? attribute.template_attribute.id : 0, attribute.Selected_Option_ID(),
																			selection.selected_attr_ids, selection.selected_attmpat_ids, selection.selected_option_ids, selection.selected_attr_types,
																			selection.unselected_attr_ids, selection.unselected_attmpat_ids,
																			function( possible_response ) { self.AttributeList_Load_Possible_Callback( possible_response ); } );
}

AttributeMachine.prototype.Build_Selection = function()
{
	var i;
	var attr_id, attmpat_id, option_id, type;
	var selection = new AttributeMachine_Selection();

	for ( i = 0; i < this.attributes.length; i++ )
	{
		attr_id		= this.attributes[ i ].attribute.id;
		attmpat_id	= this.attributes[ i ].template_attribute == null ? 0 : this.attributes[ i ].template_attribute.id;

		if ( ( option_id = this.attributes[ i ].Selected_Option_ID() ) == null )
		{
			selection.unselected_attr_ids.push( attr_id );
			selection.unselected_attmpat_ids.push( attmpat_id );
		}
		else
		{
			type	= this.attributes[ i ].template_attribute == null ? this.attributes[ i ].attribute.type : this.attributes[ i ].template_attribute.type;

			selection.selected_attr_ids.push( attr_id );
			selection.selected_attmpat_ids.push( attmpat_id );
			selection.selected_option_ids.push( option_id );
			selection.selected_attr_types.push( type );
		}
	}

	return selection;
}

AttributeMachine.prototype.Build_Possible_Lookup = function( data )
{
	var i, j;
	var lookup;
	var attr_id, attmpat_id, option_id;

	lookup = new Array();

	for ( i = 0; i < data.length; i++ )
	{
		attr_id										= data[ i ].id;
		attmpat_id									= data[ i ].attmpat_id;

		if ( lookup[ attr_id ] == null )
		{
			lookup[ attr_id ]						= new Array();
		}

		if ( lookup[ attr_id ][ attmpat_id ] == null )
		{
			lookup[ attr_id ][ attmpat_id ]			= new Object;
			lookup[ attr_id ][ attmpat_id ].options	= new Array();
		}

		lookup[ attr_id ][ attmpat_id ].selected_id	= data[ i ].selected_id;

		for ( j = 0; j < data[ i ].options.length; j++ )
		{
			option_id												= data[ i ].options[ j ];
			lookup[ attr_id ][ attmpat_id ].options[ option_id ]	= 1;
		}
	}

	return lookup;
}

AttributeMachine.prototype.Lookup_Attribute_Form = function()
{
	var i, j;
	var action, product_code;
	var forms = document.getElementsByTagName( 'form' );

	for ( i = 0; i < forms.length; i++ )
	{
		action			= forms[ i ].elements[ 'Action' ];
		product_code	= forms[ i ].elements[ 'Product_Code' ];

		if ( !action || !product_code )												continue;
		if ( ( action.value != 'ADPR' ) && ( action.value != 'AUPR' ) )				continue;
		if ( product_code.value.toLowerCase() != this.product_code.toLowerCase() )	continue;

		for ( j = 0; j < forms[ i ].elements.length; j++ )
		{
			if ( forms[ i ].elements[ j ].name.indexOf( 'Product_Attributes[' ) == 0 )
			{
				return forms[ i ];
			}
		}
	}

	return null;
}

AttributeMachine.prototype.Lookup_Attribute_Form_Index = function( form, attribute_code, template_code )
{
	var i, j;
	var name;
	var index = null;

	for ( i = 0; i < form.elements.length; i++ )
	{
		if ( form.elements[ i ].type.toLowerCase() != 'hidden' )												continue;
		if ( form.elements[ i ].name.indexOf( ']:code' ) != form.elements[ i ].name.length - 6 )				continue;
		if ( form.elements[ i ].name.indexOf( 'Product_Attributes[' ) != 0 )									continue;
		if ( form.elements[ i ].value != attribute_code )														continue;

		name	= form.elements[ i ].name.replace( /Product_Attributes\[/g, '' );
		name	= name.replace( / /g, '' );
		name	= name.replace( /\]:code/g, '' );
		index	= parseInt( name );

		if ( template_code == null )
		{
			return index;
		}

		for ( j = 0; j < form.elements.length; j++ )
		{
			if ( j == i )																						continue;
			if ( form.elements[ j ].type.toLowerCase() != 'hidden' )											continue;
			if ( form.elements[ j ].name.indexOf( ']:template_code' ) != form.elements[ j ].name.length - 15 )	continue;
			if ( form.elements[ j ].name.indexOf( 'Product_Attributes[' ) != 0 )								continue;
			if ( form.elements[ j ].value != template_code )													continue;

			name	= form.elements[ j ].name.replace( /Product_Attributes\[/g, '' );
			name	= name.replace( / /g, '' );
			name	= name.replace( /\]:value/g, '' );

			if ( parseInt( name ) == index )
			{
				return index;
			}
		}
	}

	return null;
}

AttributeMachine.prototype.onerror = function( error_message )	{ alert( error_message ); }

// AttributeMachine_Selection
///////////////////////////////////////////////////////////////////

function AttributeMachine_Selection()
{
	this.selected_attr_ids		= new Array();
	this.selected_attmpat_ids	= new Array();
	this.selected_option_ids	= new Array();
	this.selected_attr_types	= new Array();

	this.unselected_attr_ids	= new Array();
	this.unselected_attmpat_ids	= new Array();
}

AttributeMachine_Selection.prototype.Has_Selected = function()
{
	return this.selected_attr_ids.length ? true : false;
}

// AttributeMachine_Checkbox
///////////////////////////////////////////////////////////////////

function AttributeMachine_Checkbox( machine, attribute, template_attribute )
{
	this.machine			= machine;
	this.attribute			= attribute;
	this.template_attribute	= template_attribute;
	this.checkbox			= null;
	this.hidden				= null;
}

AttributeMachine_Checkbox.prototype.Initialize = function( form )
{
	var i;
	var self = this;
	var index, name;

	if ( ( index = this.machine.Lookup_Attribute_Form_Index( form, this.attribute.code, this.template_attribute ? this.template_attribute.code : null ) ) != null )
	{
		for ( i = 0; i < form.elements.length; i++ )
		{
			if ( form.elements[ i ].type.toLowerCase() != 'checkbox' )									continue;
			if ( form.elements[ i ].name.indexOf( ']:value' ) != form.elements[ i ].name.length - 7 )	continue;
			if ( form.elements[ i ].name.indexOf( 'Product_Attributes[' ) != 0 )						continue;

			name	= form.elements[ i ].name.replace( /Product_Attributes\[/g, '' );
			name	= name.replace( / /g, '' );
			name	= name.replace( /\]:value/g, '' );

			if ( parseInt( name ) == index )
			{
				this.checkbox	= form.elements[ i ];
				break;
			}
		}
	}

	if ( this.checkbox == null )
	{
		return false;
	}

	this.hidden						= document.createElement( 'input' );
	this.hidden.type				= 'hidden';
	this.hidden.name				= this.checkbox.name;
	this.hidden.value				= this.checkbox.checked ? 'Yes' : '';
	this.hidden.disabled			= this.checkbox.disabled ? false : true;

	this.checkbox.form.appendChild( this.hidden );

	AddEvent( this.checkbox, 'click', function()
	{
		self.machine.Attribute_Changed( self );
		return true;
	} );

	return true;
}

AttributeMachine_Checkbox.prototype.Disable = function()
{
	this.checkbox.disabled	= true;
	this.hidden.disabled	= false;
}

AttributeMachine_Checkbox.prototype.Enable = function()
{
	this.checkbox.disabled	= false;
	this.hidden.disabled	= true;
}

AttributeMachine_Checkbox.prototype.Cull = function( possible_option_lookup, selected_id )
{
	if ( selected_id == 0 )
	{
		this.checkbox.checked	= false;
		this.hidden.value		= '';
	}
	else if ( selected_id == 1 )
	{
		this.checkbox.checked	= true;
		this.hidden.value		= 'Yes';
	}

	if ( possible_option_lookup[ 0 ] == null ||
		 possible_option_lookup[ 1 ] == null )	this.Disable();
	else										this.Enable();

	return true;
}

AttributeMachine_Checkbox.prototype.Selected_Option_ID = function()
{
	if ( this.checkbox.checked )	return 1;
	else							return 0;
}

// AttributeMachine_Text
///////////////////////////////////////////////////////////////////

function AttributeMachine_Text( machine, attribute, template_attribute )
{
	this.machine			= machine;
	this.attribute			= attribute;
	this.template_attribute	= template_attribute;
	this.input				= null;
	this.last_value			= null;
}

AttributeMachine_Text.prototype.Initialize = function( form )
{
	var i;
	var self = this;
	var index, name;

	if ( ( index = this.machine.Lookup_Attribute_Form_Index( form, this.attribute.code, this.template_attribute ? this.template_attribute.code : null ) ) != null )
	{
		for ( i = 0; i < form.elements.length; i++ )
		{
			if ( form.elements[ i ].type.toLowerCase() != 'text' )										continue;
			if ( form.elements[ i ].name.indexOf( ']:value' ) != form.elements[ i ].name.length - 7 )	continue;
			if ( form.elements[ i ].name.indexOf( 'Product_Attributes[' ) != 0 )						continue;

			name	= form.elements[ i ].name.replace( /Product_Attributes\[/g, '' );
			name	= name.replace( / /g, '' );
			name	= name.replace( /\]:value/g, '' );

			if ( parseInt( name ) == index )
			{
				this.input	= form.elements[ i ];
				break;
			}
		}
	}

	if ( this.input == null )
	{
		return false;
	}

	this.last_value					= this.input.value;
	
	AddEvent( this.input, 'change', function()
	{
		if ( ( self.last_value.length == 0 ) != ( this.value.length == 0 ) )
		{
			self.machine.Attribute_Changed( self );
		}

		self.last_value				= this.value;
		return true;
	} );

	AddEvent( this.input, 'keyup', function()
	{
		if ( ( self.last_value.length == 0 ) != ( this.value.length == 0 ) )
		{
			self.machine.Attribute_Changed( self );
		}

		self.last_value				= this.value;
		return true;
	} );

	return true;
}

AttributeMachine_Text.prototype.Disable = function()
{
	this.input.disabled	= true;
}

AttributeMachine_Text.prototype.Enable = function()
{
	this.input.disabled	= false;
}

AttributeMachine_Text.prototype.Cull = function( possible_option_lookup, selected_id )
{
	if ( possible_option_lookup[ 1 ] == null )
	{
		this.Disable();
		return true;
	}

	this.Enable();

	switch ( selected_id )
	{
		case 0 :
		{
			this.last_value		= '';
			this.input.value	= '';

			break;
		}
		case 1 :
		{
			if ( this.input.value.length == 0 )
			{
				return false;
			}
			
			break;
		}
	}

	return true;
}

AttributeMachine_Text.prototype.Selected_Option_ID = function()
{
	if ( this.input.disabled )		return 0;
	if ( this.input.value.length )	return 1;
	else							return 0;
}

// AttributeMachine_Memo
///////////////////////////////////////////////////////////////////

function AttributeMachine_Memo( machine, attribute, template_attribute )
{
	this.machine			= machine;
	this.attribute			= attribute;
	this.template_attribute	= template_attribute;
	this.textarea			= null;
	this.last_value			= null;
}

AttributeMachine_Memo.prototype.Initialize = function( form )
{
	var i;
	var self = this;
	var index, name;

	if ( ( index = this.machine.Lookup_Attribute_Form_Index( form, this.attribute.code, this.template_attribute ? this.template_attribute.code : null ) ) != null )
	{
		for ( i = 0; i < form.elements.length; i++ )
		{
			if ( form.elements[ i ].type != 'textarea' )												continue;
			if ( form.elements[ i ].name.indexOf( ']:value' ) != form.elements[ i ].name.length - 7 )	continue;
			if ( form.elements[ i ].name.indexOf( 'Product_Attributes[' ) != 0 )						continue;

			name	= form.elements[ i ].name.replace( /Product_Attributes\[/g, '' );
			name	= name.replace( / /g, '' );
			name	= name.replace( /\]:value/g, '' );

			if ( parseInt( name ) == index )
			{
				this.textarea	= form.elements[ i ];
				break;
			}
		}
	}

	if ( this.textarea == null )
	{
		return false;
	}

	this.last_value					= this.textarea.value;
	
	AddEvent( this.textarea, 'change', function()
	{
		if ( ( self.last_value.length == 0 ) != ( this.value.length == 0 ) )
		{
			self.machine.Attribute_Changed( self );
		}

		self.last_value				= this.value;
		return true;
	} );

	AddEvent( this.textarea, 'keyup', function()
	{
		if ( ( self.last_value.length == 0 ) != ( this.value.length == 0 ) )
		{
			self.machine.Attribute_Changed( self );
		}

		self.last_value				= this.value;
		return true;
	} );

	return true;
}

AttributeMachine_Memo.prototype.Disable = function()
{
	this.textarea.disabled = true;
}

AttributeMachine_Memo.prototype.Enable = function()
{
	this.textarea.disabled = false;
}

AttributeMachine_Memo.prototype.Cull = function( possible_option_lookup, selected_id )
{
	if ( possible_option_lookup[ 1 ] == null )
	{
		this.Disable();
		return true;
	}

	this.Enable();

	switch ( selected_id )
	{
		case 0 :
		{
			this.last_value		= '';
			this.textarea.value	= '';

			break;
		}
		case 1 :
		{
			if ( this.textarea.value.length == 0 )
			{
				return false;
			}
			
			break;
		}
	}

	return true;
}

AttributeMachine_Memo.prototype.Selected_Option_ID = function()
{
	if ( this.textarea.disabled )		return 0;
	if ( this.textarea.value.length )	return 1;
	else								return 0;
}

// AttributeMachine_Radio
///////////////////////////////////////////////////////////////////

function AttributeMachine_Radio( machine, attribute, template_attribute )
{
	var i;

	this.machine			= machine;
	this.attribute			= attribute;
	this.template_attribute	= template_attribute;
	this.options			= template_attribute ? template_attribute.options : attribute.options;
	this.radios				= null;
	this.empty_radio		= null;
	this.option_lookup		= null;
}

AttributeMachine_Radio.prototype.Initialize = function( form )
{
	var i;
	var self = this;
	var index, name;

	if ( ( index = this.machine.Lookup_Attribute_Form_Index( form, this.attribute.code, this.template_attribute ? this.template_attribute.code : null ) ) != null )
	{
		for ( i = 0; i < form.elements.length; i++ )
		{
			if ( form.elements[ i ].type.toLowerCase() != 'radio' )										continue;
			if ( form.elements[ i ].name.indexOf( ']:value' ) != form.elements[ i ].name.length - 7 )	continue;
			if ( form.elements[ i ].name.indexOf( 'Product_Attributes[' ) != 0 )						continue;

			name	= form.elements[ i ].name.replace( /Product_Attributes\[/g, '' );
			name	= name.replace( / /g, '' );
			name	= name.replace( /\]:value/g, '' );

			if ( parseInt( name ) == index )
			{
				if ( this.radios == null )
				{
					this.radios = new Array();
				}

				this.radios.push( form.elements[ i ] );
			}
		}
	}

	if ( this.radios == null )
	{
		return false;
	}

	// Build an option lookup by ID that correlates to the specific radio <input> element for that option
	this.option_lookup			= new Array();

	for ( i = 0; i < this.radios.length; i++ )
	{
		if ( ( this.radios[ i ].value.length == 0 ) && ( this.empty_radio == null ) )
		{
			this.empty_radio	= this.radios[ i ];
		}
		else
		{
			for ( j = 0; j < this.options.length; j++ )
			{
				if ( this.radios[ i ].value == this.options[ j ].code )
				{
					this.option_lookup[ this.options[ j ].id ]	= this.radios[ i ];
				}
			}
		}
	}

	for ( i = 0; i < this.radios.length; i++ )
	{
		AddEvent( this.radios[ i ], 'click', function()
		{
			self.machine.Attribute_Changed( self );
			return true;
		} );
	}

	return true;
}

AttributeMachine_Radio.prototype.Disable = function()
{
	var i;

	for ( i = 0; i < this.radios.length; i++ )
	{
		this.radios[ i ].disabled	= true;
		this.radios[ i ].checked	= false;
	}

	if ( this.empty_radio )
	{
		this.empty_radio.disabled	= false;
		this.empty_radio.checked	= true;
	}
}

AttributeMachine_Radio.prototype.Enable = function()
{
	var i;

	for ( i = 0; i < this.radios.length; i++ )
	{
		this.radios[ i ].disabled	= false;
	}
}

AttributeMachine_Radio.prototype.Cull = function( possible_option_lookup, selected_id )
{
	var i;

	this.Enable();

	for ( i = 0; i < this.options.length; i++ )
	{
		if ( !possible_option_lookup[ this.options[ i ].id ] )
		{
			this.option_lookup[ this.options[ i ].id ].disabled	= true;
		}
	}

	if ( selected_id )				this.option_lookup[ selected_id ].checked	= true;
	else if ( this.empty_radio )	this.empty_radio.checked					= true;
	else
	{
		for ( i in this.option_lookup )
		{
			this.option_lookup[ i ].checked	= false;
		}

		return false;
	}

	return true;
}

AttributeMachine_Radio.prototype.Selected_Option_ID = function()
{
	var i, j;

	for ( i = 0; i < this.radios.length; i++ )
	{
		if ( this.radios[ i ].checked && !this.radios[ i ].disabled )
		{
			for ( j = 0; j < this.options.length; j++ )
			{
				if ( this.options[ j ].code == this.radios[ i ].value )
				{
					return this.options[ j ].id;
				}
			}
		}
	}

	return null;
}

// AttributeMachine_Select
///////////////////////////////////////////////////////////////////

function AttributeMachine_Select( machine, attribute, template_attribute )
{
	var i;

	this.machine			= machine;
	this.attribute			= attribute;
	this.template_attribute	= template_attribute;
	this.options			= template_attribute ? template_attribute.options : attribute.options;
	this.select				= null;
	this.option_lookup		= null;
	this.empty_option		= null;
}

AttributeMachine_Select.prototype.Initialize = function( form )
{
	var i, j;
	var self = this;
	var index, name;

	if ( ( index = this.machine.Lookup_Attribute_Form_Index( form, this.attribute.code, this.template_attribute ? this.template_attribute.code : null ) ) != null )
	{
		for ( i = 0; i < form.elements.length; i++ )
		{
			if ( form.elements[ i ].type.toLowerCase() != 'select-one' )								continue;
			if ( form.elements[ i ].name.indexOf( ']:value' ) != form.elements[ i ].name.length - 7 )	continue;
			if ( form.elements[ i ].name.indexOf( 'Product_Attributes[' ) != 0 )						continue;

			name	= form.elements[ i ].name.replace( /Product_Attributes\[/g, '' );
			name	= name.replace( / /g, '' );
			name	= name.replace( /\]:value/g, '' );

			if ( parseInt( name ) == index )
			{
				this.select	= form.elements[ i ];
				break;
			}
		}
	}

	if ( this.select == null )
	{
		return false;
	}

	// Build an option lookup by ID that correlates to the specific <option> element for that option
	this.option_lookup				= new Array();

	for ( i = 0; i < this.select.options.length; i++ )
	{
		if ( this.select.options[ i ].value == "" )
		{
			this.empty_option								= this.select.options[ i ];
			continue;
		}

		for ( j = 0; j < this.options.length; j++ )
		{
			if ( this.select.options[ i ].value == this.options[ j ].code )
			{
				this.option_lookup[ this.options[ j ].id ]	= this.select.options[ i ];
			}
		}
	}

	AddEvent( this.select, 'change', function()
	{
		self.machine.Attribute_Changed( self );
		return true;
	} );

	return true;
}

AttributeMachine_Select.prototype.Initialize_NonInventory = function( form )
{
	var i, j;
	var self = this;
	var index, name;

	if ( ( index = this.machine.Lookup_Attribute_Form_Index( form, this.attribute.code, this.template_attribute ? this.template_attribute.code : null ) ) != null )
	{
		for ( i = 0; i < form.elements.length; i++ )
		{
			if ( form.elements[ i ].type.toLowerCase() != 'select-one' )								continue;
			if ( form.elements[ i ].name.indexOf( ']:value' ) != form.elements[ i ].name.length - 7 )	continue;
			if ( form.elements[ i ].name.indexOf( 'Product_Attributes[' ) != 0 )						continue;

			name	= form.elements[ i ].name.replace( /Product_Attributes\[/g, '' );
			name	= name.replace( / /g, '' );
			name	= name.replace( /\]:value/g, '' );

			if ( parseInt( name ) == index )
			{
				this.select	= form.elements[ i ];
				break;
			}
		}
	}
}

AttributeMachine_Select.prototype.Disable = function()
{
	this.select.disabled	= true;
}

AttributeMachine_Select.prototype.Enable = function()
{
	this.select.disabled	= false;
}

AttributeMachine_Select.prototype.Cull = function( possible_option_lookup, selected_id )
{
	var i, option_count, selected_index;

	this.select.options.length	= 0;
	option_count				= 0;
	selected_index				= 0;

	if ( this.empty_option )
	{
		this.select.options[ option_count++ ]		= this.empty_option;
	}

	for ( i = 0; i < this.options.length; i++ )
	{
		if ( possible_option_lookup[ this.options[ i ].id ] )
		{
			if ( this.options[ i ].id == selected_id )
			{
				selected_index						= option_count;
			}

			this.select.options[ option_count++ ]	= this.option_lookup[ this.options[ i ].id ];
		}
	}

	this.select.selectedIndex	= selected_index;

	if ( this.select.options.length )	this.Enable();
	else								this.Disable();
	
	return true;
}

AttributeMachine_Select.prototype.Selected_Option_ID = function()
{
	var i;
	var selected_code;

	if ( this.select.disabled ||
		 this.select.selectedIndex < 0 )
	{
		return null;
	}

	selected_code = this.select.options[ this.select.selectedIndex ].value;

	for ( i = 0; i < this.options.length; i++ )
	{
		if ( this.options[ i ].code == selected_code )
		{
			return this.options[ i ].id;
		}
	}

	return null;
}

// AttributeMachine Swatches
///////////////////////////////////////////////////////////////////

AttributeMachine.prototype.oninitializeswatches = function( attributes, possible )
{
	this.Initialize_Swatches( attributes, possible );
}

AttributeMachine.prototype.onswatchclick = function( input, attribute, option )
{
	this.Swatch_Click( input, attribute, option );
}

AttributeMachine.prototype.Initialize_Swatches = function( attributes, possible )
{
	var self = this;
	var i, j, k;
	var possible_lookup, sublookup;
	var form;
	var attribute, template_attribute, current, swatch, attr_ul;

	form = this.Lookup_Attribute_Form();

	this.swatch_attributes = []

	for ( i = 0; i < attributes.length; i++ )
	{
		if ( attributes[ i ].type === 'template' )
		{
			for ( j = 0; j < attributes[ i ].attributes.length; j++ )
			{
				if( attributes[ i ].attributes[ j ].type === 'swatch-select' )
				{
					this.swatch_attributes.push( new AttributeMachine_Select( this, attributes[ i ], attributes[ i ].attributes[ j ] ) );
					this.swatch_attributes[ this.swatch_attributes.length - 1 ].Initialize_NonInventory( form );
				}
			}
		}
		else if( attributes[ i ].type === 'swatch-select' )
		{
			this.swatch_attributes.push( new AttributeMachine_Select( this, attributes[ i ], 0 ) );
			this.swatch_attributes[ this.swatch_attributes.length - 1 ].Initialize_NonInventory( form );
		}
	}

	if( this.swatch_attributes.length === 0 ) return;

	if( this.swatches ) this.Empty_Element( this.swatches );
	
	possible_lookup = ( possible ) ? this.Build_Possible_Lookup( possible.data.attributes ) : null;

	for ( i = 0; i < this.swatch_attributes.length; i++ )
	{
		attribute				= this.swatch_attributes[ i ].attribute;
		template_attribute		= this.swatch_attributes[ i ].template_attribute;

		current = template_attribute ? template_attribute : attribute;

		possible_sublookup		= ( possible_lookup ) ? possible_lookup[ attribute.id ] : null;

		if ( possible_sublookup )
		{
			if ( template_attribute )	possible_sublookup	= possible_sublookup[ template_attribute.id ];
			else						possible_sublookup	= possible_sublookup[ 0 ];
		}

		if ( attribute.inventory && possible_sublookup == null )	continue;

		attr_ul			= null;

		attr_ul				= document.createElement( 'ul' );
		attr_ul.style.clear	= 'both';
		
		for ( j = 0; j < current.options.length; j++ )
		{
			if( current.inventory && possible_sublookup )
			{
				if( ! possible_sublookup.options[ current.options[ j ].id ] ) continue;
			}

			swatch = this.Generate_Swatch( this.product_code, current, current.options[ j ] );

			swatch.mm5_input		= this.swatch_attributes[ i ];
			swatch.mm5_attribute	= current;
			swatch.mm5_option		= current.options[ j ];
			
			AddEvent( swatch, 'click', function()
			{ 
				var node;

				if ( this.mm5_input )		node = this;
				else if ( window.event )	node = window.event.srcElement;
				else						node = null;

				while ( node && !node.mm5_input )
				{
					node = node.parentNode;
				}

				if ( node ) self.onswatchclick( node.mm5_input, node.mm5_attribute, node.mm5_option );
			} );
			
			if( this.swatches ) attr_ul.appendChild( swatch );
		}		

		if( this.swatches )	this.swatches.appendChild( attr_ul );
	}
}

AttributeMachine.prototype.Swatch_Click = function( input, attribute, option )
{
	var i
		
	for ( i = 0; i < input.select.options.length; i++ )
	{
		if( input.select.options[ i ].value == option.code )
		{
			input.select.selectedIndex = i;
		}
	}					

	if( attribute.inventory )
	{
		this.Attribute_Changed( input );
	}
}

AttributeMachine.prototype.Empty_Element = function( container )
{
	while( container.hasChildNodes() )
	{
		container.removeChild( container.lastChild );
	}
}
