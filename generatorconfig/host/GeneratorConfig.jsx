/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

// Tools for stopping and re-starting Generator

// Load the Photoshop Event Terminology definitions
var g_StackScriptFolderPath = app.path + "/"+ localize("$$$/ScriptingSupport/InstalledScripts=Presets/Scripts") + "/"
										+ localize("$$$/private/Exposuremerge/StackScriptOnly=Stack Scripts Only/");
if (typeof typeNULL == "undefined")
    $.evalFile(g_StackScriptFolderPath + "Terminology.jsx");

//
// Utility routines for turning Generator on/off & checking status
//
kgeneratorStatusStr = app.stringIDToTypeID( "generatorStatus" );
classPluginPrefs             = app.charIDToTypeID('PlgP');
kgeneratorDisabledStr        = app.stringIDToTypeID("generatorDisabled");
kgeneratorEnabledStr         = app.stringIDToTypeID("generatorEnabled");
kinterpolationMethodStr     = app.stringIDToTypeID("interpolationMethod");

function GetApplicationAttr( attr )
{
	var ref = new ActionReference();
	var desc1 = new ActionDescriptor();
	ref.putProperty( classProperty, attr );
	ref.putEnumerated( classApplication, typeOrdinal, enumTarget );
	desc1.putReference( typeNULL, ref );
	return executeAction( eventGet, desc1, DialogModes.NO );
}

function DefaultInterpolationMethod()
{
    var desc = GetApplicationAttr( kinterpolationMethodStr );
    var v = desc.getEnumerationValue( kinterpolationMethodStr );
    return app.typeIDToStringID( v );
}

function IsGeneratorRunning()
{
    var desc = GetApplicationAttr( kgeneratorStatusStr );
	var v = desc.getObjectValue( kgeneratorStatusStr );
	return v.getInteger( kgeneratorStatusStr ) === 1;
}

function EnableGenerator( flag )
{
	if (IsGeneratorRunning() == flag) {
		return;
    }
	var desc = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putProperty( classProperty, classPluginPrefs );
	ref.putEnumerated( classApplication, typeOrdinal, enumTarget );
	desc.putReference( typeNULL, ref );
	var desc5 = new ActionDescriptor();
	desc5.putBoolean( kgeneratorEnabledStr, flag );
	desc5.putBoolean( kgeneratorDisabledStr, ! flag );
	desc.putObject( keyTo, classPluginPrefs, desc5 );
	executeAction( eventSet, desc, DialogModes.NO );
}

// EnableGenerator( false ); $.sleep(2000); EnableGenerator( true );
//$.writeln("Gen running: " + IsGeneratorRunning () );
//$.writeln("Interp: " + DefaultInterpolationMethod() );
