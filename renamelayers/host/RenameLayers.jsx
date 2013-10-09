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

function LayerOperations()
{
	this.skipRenamingFolders = false;
	// Work-around for screwy layer indexing.
	this.backgroundIndexOffset = 0;
	try {
		// This throws an error if there's no background
		if (app.activeDocument.backgroundLayer)
			this.backgroundIndexOffset = 1;
	}
	catch (err)
	{}
}

// Rename a layer via eventSet.  Unfortunately, eventSet on layers
// ONLY pays attention to the target, not the layerID, so there's no 
// way to set the layer's name (or anything else!) without making it
// active.  Ugh.
LayerOperations.prototype.renameLayerFail = function( layerID, newName )
{
	var desc2 = new ActionDescriptor();
	var ref1 = new ActionReference();
	ref1.putIdentifier( classLayer, layerID );
	desc2.putReference( typeNULL, ref1 );
	var desc3 = new ActionDescriptor();
	desc3.putString( keyName, newName );
	desc2.putObject( keyTo, classLayer, desc3 );
	executeAction( eventSet, desc2, DialogModes.NO );
}

// Rename the indexed layer (must make it active)
LayerOperations.prototype.renameLayer = function( layerIndex, newName )
{
	
	this.makeLayerActive( layerIndex );
	app.activeDocument.activeLayer.name = newName;
}

// Make the index layer active
LayerOperations.prototype.makeLayerActive = function( layerIndex )
{
	var desc = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putIndex( classLayer, layerIndex );
	desc.putReference( typeNULL, ref );
	executeAction( eventSelect, desc, DialogModes.NO );
}

// What follows is a clumsy way for querying layer properties.  Look at
// the code in <PS app>/Required/CopyCSSToClipboard.jsx for better tools for this.

LayerOperations.prototype.layerName = function( layerIndex )
{
	var ref = new ActionReference();
	ref.putProperty( classProperty, keyName );
	ref.putIndex( classLayer, layerIndex );
	var resultDesc = executeActionGet( ref );
	return resultDesc.getString( keyName );
}

LayerOperations.prototype.isBackgroundLayer = function( layerIndex )
{
	var keyBackground = app.charIDToTypeID('Bckg');
	var ref = new ActionReference();
	ref.putProperty( classProperty, keyBackground );
	ref.putIndex( classLayer, layerIndex );
	var resultDesc = executeActionGet( ref );
	return resultDesc.getBoolean( keyBackground );
}

LayerOperations.prototype.layerKind = function( layerIndex )
{
	var klayerKindStr = app.stringIDToTypeID( "layerKind" );
	var ref = new ActionReference();
	ref.putProperty( classProperty, klayerKindStr );
	ref.putIndex( classLayer, layerIndex );
	var resultDesc = executeActionGet( ref );
	return resultDesc.getInteger( klayerKindStr );
}

// Return a list of the currently selected layers.  This handles LayerSets.
LayerOperations.prototype.getSelectedLayerIndicies = function()
{
	// ktargetLayers is missing from Terminology.jsx
	const ktargetLayers = app.stringIDToTypeID("targetLayers");

	var resultLayerIndices = [];
	var ref = new ActionReference();
	var args = new ActionDescriptor();
	ref.putProperty( classProperty, ktargetLayers );
	ref.putEnumerated( classDocument, typeOrdinal, enumTarget );
	args.putReference( keyTarget, ref );
	var resultDesc = executeAction( eventGet, args, DialogModes.NO );
	if (! resultDesc.hasKey( ktargetLayers ))
	{
		resultLayerIndices.push( app.activeDocument.activeLayer.itemIndex - this.backgroundIndexOffset );
		return resultLayerIndices;
	}
	var selIndexList = resultDesc.getList( ktargetLayers );
	for (i = 0; i < selIndexList.count; ++i)
		resultLayerIndices.push(selIndexList.getReference(i).getIndex( classLayer ) + (1-this.backgroundIndexOffset) );

	return resultLayerIndices;  // Reverse again to match layer palette
}

// Walk through the selected layers, and add (or remove) suffixes from them.
LayerOperations.prototype.setSelectedLayerSuffix = function( scale, suffix )
{
	const kLayerGroupSheet		= 7;
	var i, name, selectedLayers = this.getSelectedLayerIndicies();
	
	var turnGenBackOn = false;
	
//	if ((selectedLayers.length > 1) && IsGeneratorRunning())
//	{
//		EnableGenerator( false );
//		turnGenBackOn = true;
//	}
	
	for (i in selectedLayers)
	{
		var layerIndex = selectedLayers[i];

		if (this.skipRenamingFolders && (this.layerKind( layerIndex ) == kLayerGroupSheet))
			continue;
			
		if (this.isBackgroundLayer( layerIndex ))
			continue;
			
		var newName = null;
		var name = this.layerName( layerIndex );
		var sfxPos = name.search(/[.](\w)+$/ );
		var scalePos = name.match(/^(\d+[%]\s*)/);
		scalePos = scalePos ? scalePos[0].length : null;
		
		if (suffix.length == 0)	// remove suffix
		{
			if (sfxPos >= 0)
				newName = name.slice( 0, sfxPos );
		}
		else							
		{
			if (sfxPos < 0)			// No suffix, add one
				newName = name + suffix;
			else
			{
				if (name.slice(sfxPos) != suffix)	// Replace suffix if different
				{
					name = name.slice( 0, sfxPos );
					newName = name + suffix;
				}
			}
		}
		if (newName)
			name = newName;
		if ((scale.length == 0) || (scale == "100%"))	// Remove %
		{
			if (scalePos)
				newName = name.slice( scalePos );
		}
		else
		{
			if (! scalePos)	// No scale, add it
				newName = scale + " " + name;
			else
				newName = scale + " " + name.slice( scalePos );
		}
		if (newName)
			this.renameLayer( layerIndex, newName );
	}

//	if (turnGenBackOn)
//		EnableGenerator( true );
}

var layerOps = new LayerOperations();

// entry point for rename panel
layerOps.doRename = function(params) {
  this.skipRenamingFolders = ! params.renfolder;
  if (app.documents.length > 0)
    this.setSelectedLayerSuffix( params.scale, params.suffix );
};

//layerOps.doRename({suffix:".jpg",scale:"",renfolder:false});

