//
// Copyright 2013 Adobe Systems Inc.  All Rights Reserved.
// 
// Rename layers panel
//
// John Peterson - Sep 2013
//

var sampleLayerName;
var isDebugOn = false;
var layerSize;

// The event IDs are decoded from the OSType values
// in Photoshop.
var PSEventIDs = [
    1298866208,      // "Mk  " eventMake
    1147958304,      // "Dlt " eventDelete
    1131180832,      // "Cls " eventClose
    1936483188,      // "slct" eventSelect
    1936028772];     // "setd" eventSet

function dimTextValue( textID, isDim )
{
	var colors = colorTable[window.document.bgColor.slice(0,3)];
	var colorStr = grayToHex(isDim ? ((colors.textfg + colors.textbg)/2)|0 : colors.textfg);
	// Note: Use ".css" instead of ".attr" if the attr is defined in a style sheet.
	$(textID).css('color', colorStr );
	$(textID).attr("disabled", isDim);
}

// This gets called any time the app's color theme is updated.
function setupColorHook()
{
    function dimTxt(id) { dimTextValue( id, $(id).is(":disabled") ); }
    
    dimTxt( "#scalevalue" );
	dimTxt( "#resizeX" );
    dimTxt( "#resizeY" );
}

function setResizeValues(sizeText)
{
    layerSize = JSON.parse(sizeText);
    if (layerSize) {
        $("#resizeX").val(String(layerSize.width));
        $("#resizeY").val(String(layerSize.height));
    }
    else {
        $("#resizeX").val("");
        $("#resizeY").val("");
        layerSize = null;
    }
    updateSample(); // Must update here to avoid race condition
}

function loadLayerSize()
{
    csInterface.evalScript("layerOps.activeLayerBounds()", setResizeValues);
}

function HandlePSEvent(csEvent)
{
    console.log("Event!");
    try {
        if (csEvent.extensionId === csInterface.getExtensionID())
        {
            loadLayerSize();
            if (typeof csEvent.data != "undefined") {
                console.log(csEvent.data);
            }
        }
    } catch (err) {
        console.log("PSCallback error: " + err);
    }
}

function initialize()
{
    initColors( setupColorHook );
    
    // Register callback for PS events
    csInterface.addEventListener("com.adobe.PhotoshopCallback", HandlePSEvent);
    // Send an event to register for events
    var event = new CSEvent("com.adobe.PhotshopRegisterEvent", "APPLICATION");
    event.extensionId = csInterface.getExtensionID();
    event.data = PSEventIDs.join(", ");
    csInterface.dispatchEvent(event);
    
    // Pull the layername from the HTML so we get a localized string.
    sampleLayerName = $("#samplename").text();
    loadLayerSize();

    // Force one call so sample name and option pop-ups are initialized
    $("#suffixmenu").change();
    
}

function getParams() {
    var suffix = $("#suffixmenu").val();
    if (suffix == ".png") suffix += $("#pngdepth").val();
    if (suffix == ".jpg") suffix += $("#jpgqual").val();
    
    var scaleTxt = (suffix != "") ? $("#scalevalue").val() + "%" : "100%";
    var resizeTxt = "";
    if ((suffix != "") && $("#resize").is(":checked")) {
        resizeTxt = $("#resizeX").val() + "x" + $("#resizeY").val();
    }

    return {'suffix': suffix, 'scale':scaleTxt, 'resize':resizeTxt, 'renfolder':true };
}

function updateSample() {
	var params = getParams();
	var scaleTxt = (params.scale == "100%") ? "" : (params.scale + " ");
    $("#samplename").css("font-size", "10pt");
    if (params.resize === "") {
        // just rename, or scale only
        $("#samplename").text( scaleTxt + sampleLayerName + params.suffix );
    }
    else if (scaleTxt === "") {
        // Resize text only
        $("#samplename").text( params.resize + " " + sampleLayerName + params.suffix );
    }
    else {// Both resize and scale
        $("#samplename").css("font-size", "7pt");
        $("#samplename").text( scaleTxt + sampleLayerName + params.suffix + ","
                               + params.resize + " " + sampleLayerName + params.suffix );
    }
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
	dimTextValue( "#scalevalue", scaleOff );
	// Curious: changing scalevalue here does
	// not kick off an onchange call for it.
	updateSample();
});

// Handle keyup so sample layer name updates as you type the scale.
$("#scalevalue").keyup( function() {
	if ($("#scale").is(":checked"))
		updateSample();
});


$("#resize").change( function() {
    var resizeOn = $("#resize").is(":checked");
    if (resizeOn)
        loadLayerSize();
    else
        updateSample();
    dimTextValue( "#resizeX", !resizeOn );
    dimTextValue( "#resizeY", !resizeOn );
});

$("#resizeX").keyup( function() {
    if ($("#resize").is(":checked") 
        && $("#locksize").is(":checked")
        && layerSize) {
        var ratio = Number($("#resizeX").val()) / layerSize.width;
        $("#resizeY").val(String(Math.round(ratio * layerSize.height)));
    }
    updateSample();
});

$("#resizeY").keyup( function() {
    if ($("#resize").is(":checked")
        && $("#locksize").is(":checked")
        && layerSize) {
        var ratio = Number($("#resizeY").val()) / layerSize.height;
        $("#resizeX").val(String(Math.round(ratio * layerSize.width)));
    }
    updateSample();
});

$("#renamebutton").click( function() {
    // Call function defined in host/RenameLayers.jsx
    // The path to this script is defined in the manifest.xml file.
    csInterface.evalScript("layerOps.doRename(" + JSON.stringify( getParams() ) + ");");
});

initialize();
