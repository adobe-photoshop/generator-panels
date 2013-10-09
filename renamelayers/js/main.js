//
// Copyright 2013 Adobe Systems Inc.  All Rights Reserved.
// 
// Rename layers panel
//
// John Peterson - Sep 2013
//

// Uncomment for debugger on load (Disabled in CEP 4.2)
//window.__adobe_cep__.showDevTools();

// Get a reference to a CSInterface object
var csInterface = new CSInterface();

function tohex(c) { return Math.round(c).toString(16); }

// Trying to make this a method of UIColor fails...why?
//UIColor.prototype.toHexString = function()
function colorToHex( uicolor )
{
    var result = "#";
    result += tohex( uicolor.color.red ) + tohex( uicolor.color.green ) + tohex( uicolor.color.blue );
    if (uicolor.color.alpha < 255)
        result += tohex( uicolor.color.alpha );
    return result.toUpperCase();
}

function grayToHex( gray )
{
	var hex = tohex(gray);
	return "#"+hex+hex+hex;
}

// UI item colors based on the four workspace brightness settings.  These are
// hand-lifted off of the PS UI, because the CEP host environment doesn't
// provide anything except for the background color.
var colorTable = {
	'#34':{ textfg:0xCE, textbg:0x22 },
	'#53':{ textfg:0xE1, textbg:0x3A },
	'#B8':{ textfg:0x18, textbg:0xEE },
	'#D6':{ textfg:0x21, textbg:0xFF } };

var sampleLayerName;

// This swaps the light/dark stylesheets for the control widgets
function swapCSS( isDark )
{
    if ($("#renameLayersTheme").length)
        $("#renameLayersTheme").remove();
    var link = document.createElement('link');
    $("head").append('<link id="renameLayersTheme" href="css/renameLayers_'
                     + (isDark ? 'D' : 'L') +'.css" rel="stylesheet" type="text/css" />');
}

function dimScaleValue( isDim )
{
	var colors = colorTable[window.document.bgColor.slice(0,3)];
	var colorStr = grayToHex(isDim ? ((colors.textfg + colors.textbg)/2)|0 : colors.textfg);
	// Note: Use ".css" instead of ".attr" if the attr is defined in a style sheet.
	$("#scalevalue").css('color', colorStr );
	$("#scalevalue").attr("disabled", isDim);
}

function setupColors()
{
	// You need to reload the host environment; the csInterface object won't do it for you
	csInterface.hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
	window.document.bgColor = colorToHex( csInterface.hostEnvironment.appSkinInfo.panelBackgroundColor );

    var colors = colorTable[window.document.bgColor.slice(0,3)];
	window.document.fgColor = grayToHex( colors.textfg );
    
    swapCSS(colors.textfg > 128);
	
	dimScaleValue( $("#scalevalue").is(":disabled") );
}

function initialize()
{
    setupColors();
    
    // Causes setupColors() to get called when them color changes
    csInterface.addEventListener( CSInterface.THEME_COLOR_CHANGED_EVENT, setupColors, null );
    csInterface.initResourceBundle();
    
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
// Unfortunately, debug is disabled in CEP 4.2
//$("#debug").click( function() { window.__adobe_cep__.showDevTools(); } );
$("#reload").click( function() { window.location.reload(true); } );

initialize();
