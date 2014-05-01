//
// Copyright 2014 Adobe Systems Inc.  All Rights Reserved.
// 
// Generator Configuration panel
//
// John Peterson - May 2014
//

// Uncomment for debugger on load (Disabled in CEP 4.2)
//window.__adobe_cep__.showDevTools();

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
}

function initialize()
{
    initColors();
    loadConfig();
    
}

$(".configchk").change( function(checkEvent) {
    var itemID = this.id;
	var value = ($("#" + itemID).is(":checked"));
    var msg = value ? " is checked" : " is not checked";
    alert( itemID + msg );
});

// These are just developer shortcuts; they shouldn't appear in final code.
$("#debug").click( function() { window.__adobe_cep__.showDevTools(); } );
$("#reload").click( function() { window.location.reload(true); } );

initialize();
