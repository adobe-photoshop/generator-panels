generator-panels
================

This repo contains the source for two extension panels for Photoshop, Generator Configuration and Rename Layer Suffix.  Both of these panels are implemented using the new [CEP5 Extension Framework](https://github.com/Adobe-CEP/CEP-Resources), and require Photoshop CC 2014 to run.

The **Generator Configuration** panel lets you easily change the [configuration options](https://github.com/adobe-photoshop/generator-assets/wiki/Configuration-Options) for the Generator Assets plugin that ships with Photoshop.

The **Rename Layer Suffix** panel lets you easily change the suffix, scale, size and folder parameters of the selected layers in Photoshop.  This is an easy way to update existing Photoshop design files to take advantage of Generator to export assets.

Full source code is provided for both panels.  At the top level, a python script, [installPanels.py](https://github.com/adobe-photoshop/generator-panels/blob/master/installPanels.py) provides tools for installing, testing and packaging the panels.  Windows users will need to install [Python 2.7](http://www.python.org/download/).  Packaging the panels into installable .ZXP files requires installing the ZXPSignCmd command-line tool.  This is found on the [Extension Builder Toolkit download](http://labs.adobe.com/downloads/extensionbuilder3.html) page, near the bottom under the "Download CC Extensions for Signing" links.

The simplest way to start using the panels is to run:

    installPanels.py
    installPanels.py -d on

to run the panels in debug mode.  After you re-launch Photoshop, the panels should appear in the Windows > Extensions menu.

  
