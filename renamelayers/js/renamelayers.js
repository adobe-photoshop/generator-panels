//
// Copyright 2013 Adobe Systems Inc.  All Rights Reserved.
// 
// Rename layers panel
//
// John Peterson - Sep 2013
//

var gSampleLayerName;
var gPSLayerInfo;

// The event IDs are decoded from the OSType values in Photoshop.
// This is the list of Photoshop events we wish to respond to.
var PSEventIDs = [
    1298866208,      // "Mk  " eventMake
    1147958304,      // "Dlt " eventDelete
    1131180832,      // "Cls " eventClose
    1936483188,      // "slct" eventSelect
    1936028772];     // "setd" eventSet

// Dim text fields according to the current theme color
// (should be moved to themecolors.js)
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

// Query Photoshop for the current layer's information
function loadLayerInfo()
{
    // Callback for fetching information about the document from PS
    function setLayerInfo(infoText)
    {
        gPSLayerInfo = JSON.parse(infoText);
        if (gPSLayerInfo) {
            $("#resizeX").val(String(gPSLayerInfo.width));
            $("#resizeY").val(String(gPSLayerInfo.height));
            $("#foldervalue").val(gPSLayerInfo.folder);
        }
        else {
            $("#resizeX").val("");
            $("#resizeY").val("");
            $("#foldervalue").val("");
            $("#folder").prop("checked", false);
            $("#resize").prop("checked", false);
            gPSLayerInfo = null;
        }
        updateSample(); // Must update here to avoid race condition
    }

    csInterface.evalScript("layerOps.activeLayerInfo()", setLayerInfo);
}

// This handles events sent back by Photoshop
// It *must* be named PhotoshopCallback.
function PhotoshopCallback(csEvent)
{
    try {
        // Check to make sure it's for us.
        if (csEvent.extensionId === csInterface.getExtensionID())
        {
            loadLayerInfo();
            if (typeof csEvent.data != "undefined") {
                // The returned event data is two comma separated
                // numbers, the first is the PS event ID, the
                // second is a number you can use with desc.fromID
                // that's an argument of the event.
                //console.log(csEvent.data);
                
                // In our case we don't really care what the
                // event actually was, it's just a signal we need
                // to go ask PS to update our layer information.
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
    csInterface.addEventListener("PhotoshopCallback", PhotoshopCallback);
    // Send an event to register for events
    var event = new CSEvent("com.adobe.PhotoshopRegisterEvent", "APPLICATION");
    event.extensionId = csInterface.getExtensionID();
    event.data = PSEventIDs.join(", ");
    csInterface.dispatchEvent(event);
    
    // Pull the layername from the HTML so we get a localized string.
    gSampleLayerName = $("#samplename").text();
    loadLayerInfo();

    // Force one call so sample name and option pop-ups are initialized
    $("#suffixmenu").change();
    
}

// Get the current filename parameters from the panel's controls
function getParams() {
    function hasText(id) {return $(id).val().length > 0;}

    var suffix = $("#suffixmenu").val();
    if (suffix == ".png") suffix += $("#pngdepth").val();
    if (suffix == ".jpg") suffix += $("#jpgqual").val();
    
    var scaleTxt = (suffix != "") ? $("#scalevalue").val() + "%" : "100%";
    var resizeTxt = "";
    if ((suffix != "") && $("#resize").is(":checked")
        && hasText("#resizeX") && hasText("#resizeY"))
    {
        resizeTxt = $("#resizeX").val() + "x" + $("#resizeY").val();
    }
    
    folderTxt = ((suffix != "") && $("#folder").is(":checked"))
                ? $("#foldervalue").val() : "";

    return {'suffix': suffix, 'scale':scaleTxt, 'folder':folderTxt,
            'resize':resizeTxt, 'renfolder':true };
}

function updateSample() {
	var params = getParams();
    var nameTxt = ((params.folder.length > 0) ? (params.folder + "/") : "")
                    + gSampleLayerName + params.suffix;
	var scaleTxt = (params.scale == "100%") ? "" : (params.scale + " ");
    $("#samplename").css("font-size", "10pt");
    if (params.resize === "") {
        // just rename, or scale only
        $("#samplename").text( scaleTxt + nameTxt );
    }
    else if (scaleTxt === "") {
        // Resize text only
        $("#samplename").text( params.resize + " " + nameTxt );
    }
    else {// Both resize and scale
        $("#samplename").css("font-size", "7pt");
        $("#samplename").text( scaleTxt + nameTxt + ","
                               + params.resize + " " + nameTxt );
    }
}

// Menu / control handlers

//////////////// Suffix menus ////////////////

$("#suffixmenu").change( function() {
	var suffix = $("#suffixmenu").val();
    // Turn on the auxillary pop-up menus if needed.
	$("#jpgqual").toggle( suffix == ".jpg" );
	$("#pngdepth").toggle( suffix == ".png" );
	updateSample();
});

$("#jpgqual").change( function() { updateSample(); } );
$("#pngdepth").change( function() { updateSample(); } );

//////////////// Scale ////////////////

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

/////////////// Folder /////////////////

$("#folder").change( function() {
    updateSample();
});

$("#foldervalue").keyup( function() {
    // Auto turn-on the checkbox if there's content
    $("#folder").prop("checked", $("#foldervalue").val().length > 0);
    updateSample();
});

////////////// Resize ///////////////////

$("#resize").change( function() {
    var resizeOn = $("#resize").is(":checked");
    updateSample();
    dimTextValue( "#resizeX", !resizeOn );
    dimTextValue( "#resizeY", !resizeOn );
});

$("#resizeX").keyup( function() {
    if ($("#resize").is(":checked") 
        && $("#locksize").is(":checked")
        && gPSLayerInfo) {
        var ratio = Number($("#resizeX").val()) / gPSLayerInfo.width;
        $("#resizeY").val(String(Math.round(ratio * gPSLayerInfo.height)));
    }
    updateSample();
});

$("#resizeY").keyup( function() {
    if ($("#resize").is(":checked")
        && $("#locksize").is(":checked")
        && gPSLayerInfo) {
        var ratio = Number($("#resizeY").val()) / gPSLayerInfo.height;
        $("#resizeX").val(String(Math.round(ratio * gPSLayerInfo.width)));
    }
    updateSample();
});

////////////// Rename ////////////////

$("#renamebutton").click( function() {
    // Call function defined in host/RenameLayers.jsx
    // The path to this script is defined in the manifest.xml file.
    csInterface.evalScript("layerOps.doRename(" + JSON.stringify( getParams() ) + ");");
});

initialize();
