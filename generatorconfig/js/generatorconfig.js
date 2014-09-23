/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
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
// Generator Configuration panel, for setting the generator-assets options.
//
// John Peterson - May 2014
//

// Note: This code assumes the CSS IDs of the checkbox elements
// match the keys used by the generator-assets configuration file.

var config = require("./js/config");

function saveDisable(flag)
{
    $(".configbutton").prop( "disabled", flag );
}

// Load the configuration and set the checkboxes.
function loadConfig()
{
    var currentConfig = config.getConfig();
    if (currentConfig && currentConfig["generator-assets"]) {
        var optionList = Object.keys(currentConfig["generator-assets"]);
        // Set the checkbox values
        optionList.forEach( function( opt ) {
            if ($("#" + opt).attr("class") === "configchk")
                $("#" + opt).prop('checked', currentConfig["generator-assets"][opt] );
            if ($("#" + opt).attr("class") === "ccmenu")
                $("#" + opt).val( currentConfig["generator-assets"][opt] );
        });

        // If the interpolation method isn't in the config file,
        // set the menu to the current Photoshop default.
        if (! ("interpolation-type" in currentConfig)) {
            csInterface.evalScript("DefaultInterpolationMethod();",
                                   function( method ) { $("#interpolation-type").val(method); } );
        }
    }

    // Checkboxes now match config file on disk, so save/revert buttons disable.
    saveDisable( true );
    return currentConfig;
}

// This table defines all of the checkbox (true/false) controls
// Table is: HTML tag | config ID | English text label
// Note the CSS IDs of the checkbox elements match the
// keys used by the generator-assets configuration file.
var checkboxes = [
    ["svg",            "svg-enabled",                        "SVG Enabled"],
    ["svgomg",         "svgomg-enabled",                     "SVG OMG Enabled"],
    ["copycss",        "css-enabled",                        "Enable Copy CSS"],
    ["smartscale",     "use-smart-scaling",                  "Use Smart Scaling"],
    ["ancmasks",       "include-ancestor-masks",             "Included Ancestor Masks"],
    ["dither",         "allow-dither",                       "Allow Dither"],
    ["usesmartobject", "use-psd-smart-object-pixel-scaling", "Smart Object Pixel Scaling"],
    ["pngquant",       "use-pngquant",                       "Use pngquant for PNG-8"],
    ["convcolorspace", "convert-color-space",                "Color convert pixels"],
    // WebP must be last - it's only visible on the Mac
    ["webp",           "webp-enabled",                       "WebP Enabled"]];

function generateCheckboxes()
{
    function addBox( tag, id, message )
    {
        var boxContent = ['<label id="#TAG#label" for="#ID#">',
                          '<input class="configchk" type="checkbox" name="#ID#" id="#ID#">',
                          '<span data-locale="#TAG#-checkbox" id="#TAG#span">#MESSAGE#</span>',
                          '</label><br>'].join("\n");

        // Clever hack for search/replace - http://stackoverflow.com/a/1145525/105767
        boxContent = boxContent.split("#TAG#").join(tag);
        boxContent = boxContent.split("#ID#").join(id);
        boxContent = boxContent.split("#MESSAGE#").join(message);
        $("#checkboxes").append( boxContent );
    }
    
    for (var i in checkboxes) {
        var box = checkboxes[i];
        addBox( box[0], box[1], box[2] );
    }
}

function initialize()
{
    initColors();
    generateCheckboxes();
    loadConfig();

    if (process.platform !== "darwin")
        $("#webplabel").toggle(false);  // This option is Mac-only
}

// Initialize must be called -before- the change() callback is
// defined, so the controls exist.
initialize();

// Control state no longer matches file on disk, so enable save & revert
$(".configchk").change( function() {
    saveDisable( false );
});

$(".ccmenu").change( function() {
    saveDisable( false );
});

$("#savebutton").click( function() {
    // Collect checkbox options
    var genOpts = { "generator-assets": {} };
    $(".configchk").each(function (i, checkbox) {
        genOpts["generator-assets"][checkbox.id] = checkbox.checked;
    });
    $(".ccmenu").each(function(i, menu) {
        genOpts["generator-assets"][menu.id] = menu.value;
    });
    
    // Save results and disable save/revert
    config.putConfig(genOpts);
    saveDisable( true );
    
    // Restart generator
    csInterface.evalScript( "IsGeneratorRunning();", function(result) {
        if (result === "true") {
            $("#restarting").toggle(true);
            csInterface.evalScript( "EnableGenerator( false ); $.sleep(2000); EnableGenerator( true );",
                                    function(result) {
                                        $("#restarting").toggle(false);
                                    });
        }
    });
});

$("#revertbutton").click( function() {
    loadConfig();
    saveDisable( true );
});

$(".infolink").click( function() {
    csInterface.openURLInDefaultBrowser("https://github.com/adobe-photoshop/generator-assets/wiki/Configuration-Options");
} );
