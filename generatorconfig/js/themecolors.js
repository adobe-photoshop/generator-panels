/*
 * Copyright (c) 2013-2015 Adobe Systems Incorporated. All rights reserved.
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

//
// Code to handle Photoshop theme color changes
//
// John Peterson - May 2014
//

// Get a reference to a CSInterface object
var csInterface = new CSInterface();

var themeColorSetupHook = null;
var debugPort = null;

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
    '#32':{ textfg:0xCE, textbg:0x22, cssfile:'darker' },
    '#34':{ textfg:0xCE, textbg:0x22, cssfile:'darker' }, // CC 2014
    '#53':{ textfg:0xE1, textbg:0x3A, cssfile:'dark' },
    '#B8':{ textfg:0x18, textbg:0xEE, cssfile:'light' },
    '#D6':{ textfg:0x21, textbg:0xFF, cssfile:'lighter' }, // CC 2014
    '#F0':{ textfg:0x21, textbg:0xFF, cssfile:'lighter' } };


// This swaps the light/dark stylesheets for the control widgets
// <link id="ccstyleTheme" href="css/ccstyle_D.css" rel="stylesheet" type="text/css" />

function swapCSS( cssfilename )
{
    var panelName = "config";
    var themeID = panelName + "Theme";

    if ($("#ccstyleTheme").length)
        $("#ccstyleTheme").remove();
    var link = document.createElement('link');
    $("head").append('<link id="ccstyleTheme" href="css/styles-'
                     + cssfilename +'.css" rel="stylesheet" type="text/css" />');
}

// Called by the theme color changed event.
function setupColors()
{
    // You need to reload the host environment; the csInterface object won't do it for you
    csInterface.hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
    window.document.bgColor = colorToHex( csInterface.hostEnvironment.appSkinInfo.panelBackgroundColor );

    var bgcolorval = window.document.bgColor.slice(0,3);
    var colors = colorTable[bgcolorval];
    window.document.fgColor = grayToHex( colors.textfg );

    swapCSS(colorTable[bgcolorval].cssfile);

    if (themeColorSetupHook)
        themeColorSetupHook();
}

function initColors( setupHook )
{
    if (typeof setupHook !== "undefined")
        themeColorSetupHook = setupHook;
    setupColors();

    // Causes setupColors() to get called when them color changes
    csInterface.addEventListener( CSInterface.THEME_COLOR_CHANGED_EVENT, setupColors, null );
    csInterface.initResourceBundle();

    // Look for the debug control file, and if it exists,
    // enable debugging controls
    var path = cep_node.require("path");
    var fs = cep_node.require("fs");
    var debugPath = path.join(csInterface.getSystemPath( SystemPath.EXTENSION ), ".debug");
    if (fs.existsSync(debugPath)) {
        $(".debuglink").toggle( true );
        var debugText = fs.readFileSync(debugPath, "utf8");
        var m = debugText.match(/<Host.*Port="(\d+)"[/]>/m);
        // Enable the debug link only if we know the port.
        if (m)
            debugPort = m[1];
        else
            $("#debug").toggle( false );
    }
    else
        $(".debuglink").toggle( false );
}

// These are just developer shortcuts; they shouldn't appear in non-debug panels
$("#reload").click( function() { window.location.reload(true); } );
$("#sources").click( function() { csInterface.openURLInDefaultBrowser("https://github.com/adobe-photoshop/generator-panels"); } );
// This assumes CHROME is your default browser!
$("#debug").click( function() { if (debugPort) csInterface.openURLInDefaultBrowser("http://localhost:"+debugPort); } );
