//
// Copyright 2014 Adobe Systems Inc.  All Rights Reserved.
// 
// Generator Configuration panel
//
// John Peterson - May 2014
//

// Note: This code assumes the CSS IDs of the checkbox elements
// match the keys used by the generator-assets configuration file.

var config = require("./js/config")

function loadConfig()
{
    var currentConfig = config.getConfig();
    if (currentConfig && currentConfig["generator-assets"]) {
        var optionList = Object.keys(currentConfig["generator-assets"]);
        optionList.forEach( function( opt ) {
            $("#" + opt).prop('checked', currentConfig["generator-assets"][opt] );
        });
    }
    $(".configbutton").prop( "disabled", true );
}

function initialize()
{
    initColors();
    loadConfig();
    
}

$(".configchk").change( function() {
    var itemID = this.id;
    $(".configbutton").prop( "disabled", false );
});

$("#savebutton").click( function() {
    var genOpts = { "generator-assets": {} };
    $(".configchk").each(function (i, checkbox) {
        genOpts["generator-assets"][checkbox.id] = checkbox.checked;
    });
    config.putConfig(genOpts);
    $(".configbutton").prop("disabled", true);
});

$("#revertbutton").click( function() {
    loadConfig();
    $(".configbutton").prop("disabled", true);
});

// These are just developer shortcuts; they shouldn't appear in final code.
// $("#debug").click( function() { window.__adobe_cep__.showDevTools(); } );
$("#reload").click( function() { window.location.reload(true); } );

initialize();
