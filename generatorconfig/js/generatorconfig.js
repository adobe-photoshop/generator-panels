//
// Copyright 2014 Adobe Systems Inc.  All Rights Reserved.
// 
// Generator Configuration panel, for setting the generator-assets options.
//
// John Peterson - May 2014
//

// Note: This code assumes the CSS IDs of the checkbox elements
// match the keys used by the generator-assets configuration file.

var config = require("./js/config")

// Load the configuration and set the checkboxes.
function loadConfig()
{
    var currentConfig = config.getConfig();
    if (currentConfig && currentConfig["generator-assets"]) {
        var optionList = Object.keys(currentConfig["generator-assets"]);
        // Set the checkbox values
        optionList.forEach( function( opt ) {
            $("#" + opt).prop('checked', currentConfig["generator-assets"][opt] );
        });
    }

    // Checkboxes now match config file on disk, so save/revert buttons disable.
    $(".configbutton").prop( "disabled", true );
}

function initialize()
{
    initColors();
    loadConfig();
    
    if (process.platform !== "darwin")
        $("#webplabel").toggle(false);  // This option is Mac-only
}

$(".configchk").change( function() {
    var itemID = this.id;
    // Checkbox state no longer matches file on disk, so enable save & revert
    $(".configbutton").prop( "disabled", false );
});

$("#savebutton").click( function() {
    // Collect checkbox options
    var genOpts = { "generator-assets": {} };
    $(".configchk").each(function (i, checkbox) {
        genOpts["generator-assets"][checkbox.id] = checkbox.checked;
    });
    
    // Save results and disable save/revert
    config.putConfig(genOpts);
    $(".configbutton").prop("disabled", true);
    
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
    $(".configbutton").prop("disabled", true);
});

initialize();
