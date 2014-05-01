//
// Copyright 2014 Adobe Systems Inc.  All Rights Reserved.
// 
// Generator Configuration panel
//
// John Peterson - May 2014
//

// Uncomment for debugger on load (Disabled in CEP 4.2)
//window.__adobe_cep__.showDevTools();

function initialize()
{
    initColors();
}


function updateSample() {
	var params = getParams();
	var scaleTxt = (params.scale == "100%") ? "" : (params.scale + " ");
	$("#samplename").text( scaleTxt + sampleLayerName + params.suffix );
}

// Menu / control handlers



$(".configchk").change( function(checkEvent) {
    var itemID = this.id;
	var value = ($("#" + itemID).is(":checked"));
    var msg = value ? " is checked" : " is not checked";
    alert( itemID + msg );
});

$("#saveconfig").click( function() {
    // Call function defined in host/RenameLayers.jsx
    // The path to this script is defined in the manifest.xml file.
//    csInterface.evalScript("layerOps.doRename(" + JSON.stringify( getParams() ) + ");");
    alert("Saving...");
});

// These are just developer shortcuts; they shouldn't appear in final code.
$("#debug").click( function() { window.__adobe_cep__.showDevTools(); } );
$("#reload").click( function() { window.location.reload(true); } );

initialize();
