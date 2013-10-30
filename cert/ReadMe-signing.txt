The files posted here are just to give an example of how to produce a signed
".ZXP" for use with the Adobe Extension Manager CC.  To sign the files,
you'll need the ZXPSignCmd utility, available as part of the Extension Builder
package:

http://labs.adobe.com/downloads/extensionbuilder3.html

Please note panel extensions signed with self-signed certificates produce
security warnings when loaded by the Extension Manager.  In order to avoid
the warnings, you'll need to obtain an official certificate from a verified
signing authority.
