_*Note:* The [`spectrum_ui` branch](https://github.com/adobe-photoshop/generator-panels/tree/spectrum_ui) has a version of the panels updated with the new UI.  It hasn't been rolled into `master` yet pending further tests, but take a look if you want to see how to get your panels to match the new Photshop UI look._

generator-panels
================

This repo contains the source for two extension panels for Photoshop, Generator Configuration and Rename Layer Suffix.  Both of these panels are implemented using the new [CEP5 Extension Framework](https://github.com/Adobe-CEP/CEP-Resources), and require Photoshop CC 2014 to run.

The **Generator Configuration** panel lets you easily change the [configuration options](https://github.com/adobe-photoshop/generator-assets/wiki/Configuration-Options) for the Generator Assets plugin that ships with Photoshop.

![](https://github.com/adobe-photoshop/generator-panels/blob/master/screenshots/GeneratorConfig.png)

The **Generator Layer Names** panel lets you easily change the suffix, scale, size and folder [parameters](https://github.com/adobe-photoshop/generator-assets/wiki/Generate-Web-Assets-Functional-Spec) of the selected layers in Photoshop.  This is an easy way to update existing Photoshop design files to take advantage of Generator to export assets.

![](https://github.com/adobe-photoshop/generator-panels/blob/master/screenshots/GeneratorLayerNames.png)

### Installation

The release version of the Generator Configuration panel is available directly for free from the [Adobe Add-ons site](https://creative.adobe.com/addons/products/2274).  The Generator Layer Names panel is also now [available from the Add-ons site](https://creative.adobe.com/addons/products/2365) as well.

Full source code is provided for both panels.  At the top level, a Python script, [installPanels.py](https://github.com/adobe-photoshop/generator-panels/blob/master/installPanels.py) provides tools for installing, testing and packaging the panels.  Windows users will need to install [Python 2.7](http://www.python.org/download/).  Packaging the panels into installable .ZXP files requires installing the ZXPSignCmd command-line tool.  This is found on the [Extension Builder Toolkit download](http://labs.adobe.com/downloads/extensionbuilder3.html) page, near the bottom under the "Download CC Extensions for Signing" links.

The simplest way to start using the panels from the source code is to run:

    installPanels.py
    installPanels.py -d on

to run the panels in debug mode.  After you re-launch Photoshop, the panels should appear in the Windows > Extensions menu.

### Third-Party Code

* [jQuery](http://jQuery.com), version 2.0.2 provided under the [terms of the MIT license](https://jquery.org/license/), found in [generatorconfig/js/libs/](https://github.com/adobe-photoshop/generator-panels/tree/master/generatorconfig/js/libs) and [renamelayers/js/libs](https://github.com/adobe-photoshop/generator-panels/tree/master/renamelayers/js/libs)


### License

(MIT License)

Copyright (c) 2013-2014 Adobe Systems Incorporated. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

