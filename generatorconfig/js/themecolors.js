//
// Copyright 2014 Adobe Systems Inc.  All Rights Reserved.
//
// Code to handle Photoshop theme color changes
//
// John Peterson - May 2014
//

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
// <link id="ccstyleTheme" href="css/ccstyle_D.css" rel="stylesheet" type="text/css" />

function swapCSS( isDark )
{
    var panelName = "config";
    var themeID = panelName + "Theme";

    if ($("#ccstyleTheme").length)
        $("#ccstyleTheme").remove();
    var link = document.createElement('link');
    $("head").append('<link id="ccstyleTheme" href="css/ccstyle'
                     + (isDark ? '_D.css' : '_L.css') +'" rel="stylesheet" type="text/css" />');
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

function initColors()
{
    setupColors();
    
    // Causes setupColors() to get called when them color changes
    csInterface.addEventListener( CSInterface.THEME_COLOR_CHANGED_EVENT, setupColors, null );
    csInterface.initResourceBundle();
}

