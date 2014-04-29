// Copyright 2013 Adobe Systems Incorporated.  All Rights reserved.

// Add or remove suffixes from selected layers.

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

function IsGeneratorRunning()
{
	var ref = new ActionReference();
	var desc1 = new ActionDescriptor();
	ref.putProperty( classProperty, kgeneratorStatusStr );
	ref.putEnumerated( classApplication, typeOrdinal, enumTarget );
	desc1.putReference( typeNULL, ref );
	var desc = executeAction( eventGet, desc1, DialogModes.NO );
	var v = desc.getObjectValue( kgeneratorStatusStr );
	return v.getInteger( kgeneratorStatusStr ) === 1;
}

function EnableGenerator( flag )
{
	if (IsGeneratorRunning() == flag)
		return;
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

