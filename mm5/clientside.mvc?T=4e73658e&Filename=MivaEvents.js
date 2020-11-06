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
// $Id: MivaEvents.js 36014 2013-04-01 18:05:24Z khansen $
//

var MivaEvents =
{
	SubscribeToEvent: function( evt_code, fn )
	{
		var i;

		if ( typeof this.data[ evt_code ] === 'undefined' )
		{ 
			this.data[ evt_code ] = new Array();
		}

		for ( i = 0; i < this.data[ evt_code ].length; i++ )
		{
			if ( this.data[ evt_code ][ i ] === fn )
			{
				return i;
			}
		}

		return this.data[ evt_code ].push( fn ) - 1;
	},
	UnsubscribeFromEvent: function( evt_code, index )
	{
		if ( typeof this.data[ evt_code ] === 'undefined' )
		{ 
			return;
		}

		this.data[ evt_code ].splice( index, 1 );
	},
	ThrowEvent: function( evt_code, miva_data )
	{
		var i;

		if ( typeof this.data[ evt_code ] === 'undefined' )
		{
			return;
		}

		for ( i = 0; i < this.data[ evt_code ].length; i++ )
		{
			if ( typeof this.data[ evt_code][ i ] !== 'function' )
			{
				continue;
			}

			this.data[ evt_code ][ i ]( miva_data );
		}
	},
	data: []
}
