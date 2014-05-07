//
// Copyright 2013 Adobe Systems Inc.  All Rights Reserved.
// 
// Rename layers panel
//
// John Peterson - Sep 2013
//

var sampleLayerName;

function dimScaleValue( isDim )
{
	var colors = colorTable[window.document.bgColor.slice(0,3)];
	var colorStr = grayToHex(isDim ? ((colors.textfg + colors.textbg)/2)|0 : colors.textfg);
	// Note: Use ".css" instead of ".attr" if the attr is defined in a style sheet.
	$("#scalevalue").css('color', colorStr );
	$("#scalevalue").attr("disabled", isDim);
}

// This gets called any time the app's color theme is updated.
function setupColorHook()
{
	dimScaleValue( $("#scalevalue").is(":disabled") );
}

function initialize()
{
    initColors( setupColorHook );
    
    // Pull the layername from the HTML so we get a localized string.
    sampleLayerName = $("#samplename").text();
    updateSample();

    // Force one call so sample name and option pop-ups are initialized
    $("#suffixmenu").change();
}

function getParams() {
    var suffix = $("#suffixmenu").val();
    if (suffix == ".png") suffix += $("#pngdepth").val();
    if (suffix == ".jpg") suffix += $("#jpgqual").val();
    
    var scaleTxt = (suffix != "") ? $("#scalevalue").val() + "%" : "100%";
    
    return {'suffix': suffix, 'scale':scaleTxt, 'renfolder':true };
}

function updateSample() {
	var params = getParams();
	var scaleTxt = (params.scale == "100%") ? "" : (params.scale + " ");
	$("#samplename").text( scaleTxt + sampleLayerName + params.suffix );
}

// Menu / control handlers

$("#suffixmenu").change( function() {
	var suffix = $("#suffixmenu").val();
    // Turn on the auxillary pop-up menus if needed.
	$("#jpgqual").toggle( suffix == ".jpg" );
	$("#pngdepth").toggle( suffix == ".png" );
	updateSample();
});

$("#jpgqual").change( function() { updateSample(); } );
$("#pngdepth").change( function() { updateSample(); } );

$("#scale").change( function() {
	var scaleOff = !($("#scale").is(":checked"))
	if (scaleOff)
		$("#scalevalue").val("100");
	dimScaleValue( scaleOff );
	// Curious: changing scalevalue here does
	// not kick off an onchange call for it.
	updateSample();
});

// Handle keyup so sample layer name
// updates as you type the scale.
$("#scalevalue").keyup( function() {
	if ($("#scale").is(":checked"))
		updateSample();
});

$("#renamebutton").click( function() {
    // Call function defined in host/RenameLayers.jsx
    // The path to this script is defined in the manifest.xml file.
    csInterface.evalScript("layerOps.doRename(" + JSON.stringify( getParams() ) + ");");
});

// These are just developer shortcuts; they shouldn't appear in final code.
$("#reload").click( function() { window.location.reload(true); } );

initialize();
