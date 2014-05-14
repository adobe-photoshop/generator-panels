#!/usr/bin/python
#
# Install & manage the extension panels.
#
# John Peterson (jp@adobe.com), Aug 2013
#
# By default, this copies the extension panels into the user panel
# location for the platform.  PanelDebugMode must be "on" for a panel
# to operate this way.
#
# Other options:
#  -d,--debug {on,off,status}   Set/check PanelDebugMode
#  -p,--package PASSWORD        Package the panels signed with a
#                               private certificate, using the certificate's PASSWORD
#  -i,--install                 Installs the signed panels created with -p into
#                               the user panel location.  Does not require debug mode.
#  -z,--zip                     Package the panels as a ZIP archives
#  -e,--erase                   Remove the panels from the debug location
#  -l,--launch                  Launch Photoshop after copying.
#
#

import os, sys, shutil, re, getpass, stat, datetime, platform, glob
import argparse, subprocess, zipfile, ftplib, xml.dom.minidom
if sys.platform == 'win32':
    import _winreg

# PS executable location, used just to launch PS
PSexePath = {"win32":"C:\\Program Files\\Adobe\\Adobe Photoshop CC (64 Bit)\\Photoshop.exe",
             "darwin": "/Applications/Adobe Photoshop CC/Adobe Photoshop CC.app/Contents/MacOS/Adobe Photoshop CC"
             }[sys.platform]

# Extract the panel ID and name from the Manifest file
def getExtensionInfo(manifestPath):
    extInfo = [s for s in open(manifestPath,'r').readlines() if re.match("^<ExtensionManifest.*", s)]
    if (len(extInfo) > 0):
        extInfo = extInfo[0]
        return extInfo
    else:
        print "# No ExtensionManifest for %s" % manifestPath
        return None

class Panel:
    #
    # Pull out the panel ID and name from the manifest file
    #
    def __init__(self, extInfo, manifestPath):
        m = re.search('ExtensionBundleId\s*=\s*["][\w.]*[.](\w+)["]', extInfo)
        self.panelID = m.group(1) if m else "ERROR_FINDING_ID"
        m = re.search('ExtensionBundleName\s*=\s*["]([\w\s]+)["]', extInfo)
        self.panelName = m.group(1) if m else self.panelID
        self.panelSrcFolder = manifestPath.split(os.sep)[0]

    # Copy panel source to the deployment folder
    def copyPanel(self):
        destPath = osDestPath + self.panelName
        print "# Copying " + srcLocation + self.panelSrcFolder + "\n  to " + destPath
        shutil.copytree( srcLocation + self.panelSrcFolder, destPath )

    # Unlock, then remove the panels
    def erasePanel(self):
        # Because Perforce may leave them locked.
        def makeWritable( path ):
            os.chmod( path, os.stat( path ).st_mode | stat.S_IWRITE )

        # Unlock, then remove the panels
        destPath = osDestPath + self.panelName
        if (os.path.exists( destPath )):
            print "# Removing " + destPath
            for df in [root + os.sep + f for root, dirs, files in os.walk(destPath) for f in files]:
                makeWritable( df )
            shutil.rmtree( destPath )
            
    # Create the .debug file for enabling the remote debugger
    def debugFilename(self):
        return os.path.join( osDestPath, self.panelName, ".debug" )

    # Setup/remove remote debug config files
    def createRemoteDebugXML(self):
        global portNumber
        extensionTemplate = """  <Extension Id="%s">
    <HostList>
      <Host Name="PHXS" Port="%d"/>
    </HostList>
  </Extension>
"""
        # Fish the ID for each extension in the package out of the CSXS/manifest.xml file
        manifestXML = xml.dom.minidom.parse( os.path.join( srcLocation, self.panelSrcFolder, "CSXS", "manifest.xml" ) )
        extensions = manifestXML.getElementsByTagName("ExtensionList")[0].getElementsByTagName("Extension")
        debugText = """<?xml version="1.0" encoding="UTF-8"?>\n"""
        debugText += "<ExtensionList>\n"
        for ext in extensions:
            extName = ext.getAttribute("Id")
            debugText += extensionTemplate % (extName, portNumber)
            print "# Remote Debug %s at http://localhost:%d" % (extName, portNumber)
            portNumber += 1
        debugText += "</ExtensionList>\n"
        file(self.debugFilename(), 'w' ).write(debugText)
        
    def setupRemoteDebugFile(self, debugEnabled):
        if debugEnabled:
            self.createRemoteDebugXML()
        else:
            if (os.path.exists( self.debugFilename() )):
                os.remove( self.debugFilename() )
                print "# Removing debug file for %s" % self.panelName

    #
    # Create a signed double-clickable install package
    # There's some more info on self-signing here:
    # http://forums.adobe.com/message/5714997
    #
    def packagePanel(self):
        pkgTargetFolder = getTargetFolder()
        timestampURL = "http://tsa.starfieldtech.com"

        pkgFile = pkgTargetFolder + self.panelName + ".zxp"
        # Must remove the file first, otherwise contents not updated.
        if os.path.exists( pkgFile ):
            os.remove( pkgFile )
        print "# Creating package: '%s'" % pkgFile
        result = ""
        try:
            result = subprocess.check_output('ZXPSignCmd -sign %s "%s" %s %s -tsa %s'
                                             % (srcLocation + self.panelSrcFolder, pkgFile,
                                                certPath, args.package[0], timestampURL), shell=True)
        except subprocess.CalledProcessError as procErr:
            if (procErr.returncode == 1):
                print
                print "## Signing package failed.  ZXPSignCmd is not installed?"
            else:
                print "## Signing package %s failed." % (self.panelName + ".zxp")
            sys.exit(procErr.returncode)
        else:
            print result

    # Make the zip of the panel source
    def zipPanel(self):
        zipTargetFolder = getTargetFolder()

        zipTargetFile = zipTargetFolder + self.panelID + ".zip"
        print "# Creating archive: " + zipTargetFile
        zf = zipfile.ZipFile( zipTargetFile, 'w', zipfile.ZIP_DEFLATED )
        os.chdir( srcLocation + self.panelSrcFolder )
        fileList = [root + os.sep + f for root, dirs, files in os.walk(".") for f in files]
        for f in fileList:
            zf.write( f )
        zf.close()

#
# Find installable extensions.  Assumes this script is in
# the top level folder containing the extension sources.
#
srcLocation = sys.path[0] + os.sep
os.chdir(srcLocation)
manifestFiles = glob.glob("*/CSXS/manifest.xml")

if len(manifestFiles) == 0:
    print "# Error - no extension manifests found"
    sys.exit(-1)

# Load the panel info from the extension
panelList = [Panel(getExtensionInfo(f), f) for f in manifestFiles if getExtensionInfo(f)]

# Location of the certificate file used to sign the package.
certPath = os.path.join( srcLocation, "cert", "panelcert.p12" )

# Where to place the panel.
extensionSubpath = os.path.normpath("/Adobe/CEP/extensions") + os.path.sep
winAppData = os.getenv("APPDATA") if (sys.platform == "win32") else ""
osDestPath = { "win32":winAppData + extensionSubpath,
               "darwin":os.path.expanduser("~")+"/Library/Application Support" + extensionSubpath
             }[sys.platform]

# Base port number used for remote debugger (each extra panel increments it)
portNumber = 8000

def getTargetFolder():
    targetFolder = os.path.abspath( os.path.join( srcLocation, "Targets" ) ) + os.sep
    if (not os.path.exists( targetFolder )):
        os.makedirs( targetFolder )
    return targetFolder

# For future reference, the Extension Manager stores the bundle in
#
# (Mac) /Library/Application Support/Adobe/Extension Manager CC/EM Store/Photoshop/
# (Win) %APPDATA%\Adobe\Extension Manager CC\EM Store\Photoshop{32,64} (No?)
# (Win) %APPDATA%\Adobe.ExMan\Local Store\Photoshop{32,64}    (No?)
# (Win) C:\ProgramData\Adobe\Extension Manager CC\EM Store\Shared\   (YES?!)
#
# and deploys it to:
#
# (Mac) /Library/Application Support/Adobe/CEP/extensions/
# (Win) C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\  [not sure about (x86)]
#
# This is different than the local copies used for debugging.

argparser = argparse.ArgumentParser(description="Manage Photoshop CEP panels.  By default, installs the panels for debugging.")
argparser.add_argument('--package', '-p', nargs=1, metavar='password', default=None,
                       help="Package the item using the private certificate; specify the password used to create it")
argparser.add_argument('--zip', '-z', action='store_true', default=False,
                       help="Create ZIP archives for BuildForge signing")
argparser.add_argument('--debug', '-d', nargs='?', const='status', default=None, choices=['status', 'on', 'off'],
                       help="Enable panel without signing")
argparser.add_argument('--launch', '-l', action='store_true', default=False,
                       help="Launch Photoshop after copy")
argparser.add_argument('--erase', '-e', action='store_true', default=False,
                       help="Erase the panels from the debug install location")
argparser.add_argument('--install', '-i', action='store_true', default=False,
                       help="Install the signed panels created with -p")
args = argparser.parse_args( sys.argv[1:] )

if (sum([args.package!=None, args.zip, args.erase, args.install]) > 1):
    print "# Error: Only one of -p, -z, -e or -i is allowed"
    sys.exit(0)

def erasePanels():
    # Unlock, then remove the panels
    for p in panelList:
        p.erasePanel()

    # Leaving the cache around can cause problems.
    cachePath = os.path.normpath( osDestPath + "../cache" )
    if os.path.exists(cachePath):
        shutil.rmtree(cachePath);

#
# Examine the state of debugKey (either "Logging" or "PlayerDebugMode")
# If panelDebugValue is not None, set the to that value.
# returns the previous value of the debugKey
#
def panelExecutionState( debugKey, panelDebugValue=None ):
    oldPanelDebugValue = 'err'

    # Windows: add HKEY_CURRENT_USER/Software/Adobe/CSXS.5 (add key) PlayerDebugMode [String] "1"
    if sys.platform == 'win32':
        def tryKey(key):
            try:
                return _winreg.QueryValueEx( key, debugKey )
            except:
                return None

        access = _winreg.KEY_READ if (not panelDebugValue) else _winreg.KEY_ALL_ACCESS

        ky = _winreg.OpenKey( _winreg.HKEY_CURRENT_USER, "Software\\Adobe\\CSXS.5", 0, access )
        keyValue = tryKey( ky )
        oldPanelDebugValue = '1' if keyValue and (keyValue[0] == '1') else '0'

        if (panelDebugValue):
            if not keyValue:
                _winreg.CreateKey( ky, debugKey )
            _winreg.SetValueEx( ky, debugKey, 0, _winreg.REG_SZ, panelDebugValue );

        _winreg.CloseKey( ky )

    # Mac: ~/Library/Preferences/com.adobe.CSXS.5.plist (add row) PlayerDebugMode [String] "1"
    elif sys.platform == "darwin":
        import subprocess, plistlib
        plistFile = os.path.expanduser( "~/Library/Preferences/com.adobe.CSXS.5.plist" )

        # First, make sure the Plist is in text format
        subprocess.check_output( "plutil -convert xml1 " + plistFile, shell=True )
        plist = plistlib.readPlist( plistFile )
        oldPanelDebugValue = '1' if (plist.has_key( debugKey )) and (plist[debugKey] == '1') else '0'

        if (panelDebugValue):
            plist[debugKey] = panelDebugValue
            plistlib.writePlist( plist, plistFile )

            # On Mac OS X 10.9 and higher, must reset the cfprefsd process
            # before changes in a plist file take effect
            macOSVer = [int(x) for x in platform.mac_ver()[0].split('.')]
            if (macOSVer[0] == 10) and (macOSVer[1] >= 9):
                proc = subprocess.Popen("ps ax | grep cfprefsd | grep -v grep", shell=True,
                                        stdout=subprocess.PIPE).stdout.read()
                procID = re.findall("^\s*(\d+)", proc, re.MULTILINE)
                if (procID):
                    for p in procID:
                        print "# MacOS 10.9: Killing cfprefsd process ID: " + p
                    os.system( "kill -HUP " + p )
                else:
                    print "# MacOS 10.9: No cfprefsd process"

    else:
        print "Error: Unsupported platform: " + sys.platform
        sys.exit(0)

    return oldPanelDebugValue

#
# Setup/remove remote debug config files
#
def setupRemoteDebugFiles():
    debugEnabled = panelExecutionState( 'PlayerDebugMode' ) == '1'
    for p in panelList:
        p.setupRemoteDebugFile(debugEnabled)

#
# Argument processing starts here
#
# Print or change PlayerDebugMode
#
if (args.debug):
    panelDebugValue = {'on':'1', 'off':'0', 'status':None}[args.debug]
    oldPanelDebugValue = panelExecutionState( 'PlayerDebugMode', panelDebugValue )

    if (args.debug == 'status'):
        if oldPanelDebugValue == '1':
            print "# Debug enabled - panel will run without signing"
        else:
            print "# Panel only runs if a signed package is installed"
    else:
        # Only report if the value actually changed, so you can verify
        # the change actually "stuck"
        if panelDebugValue != oldPanelDebugValue:
            print "# Panel debug mode " + ("enabled" if panelDebugValue=='1' else "disabled")
            setupRemoteDebugFiles()

#
# Create a signed double-clickable install package
# There's some more info on self-signing here:
# http://forums.adobe.com/message/5714997
#
elif (args.package):
    for p in panelList:
        packagePanel():

#
# Unpack packaged panels into the user's extension folder
#
elif (args.install):
    erasePanels()
    pkgTargetFolder = getTargetFolder()
    zxpFiles = filter(os.path.exists, [pkgTargetFolder + p.panelName + ".zxp" for p in panelList])
    if len(zxpFiles) > 0:
        for f in zxpFiles:
            zps = zipfile.ZipFile( f )
            destFolder = osDestPath + os.path.splitext(os.path.basename(f))[0]
            print "# Extracting %s \n   to %s" % (f, destFolder)
            os.mkdir( destFolder )
            os.chdir( destFolder )

            zipNames = zps.namelist()
            for n in zipNames:
                if (n[-1] == '/'):
                    os.mkdir( os.path.normpath( n ))
                else:
                    file( os.path.normpath(n), 'wb' ).write(zps.read(n))
            zps.close()
    else:
        print "# No packaged panels to install, use --package first"
        sys.exit(0)
#
# Create a .zip archive
#
elif (args.zip):
    for p in panelList:
        p.zipPanel()

elif (args.erase):
    erasePanels()
#
# Default; copy the files directly into their debug locations
#
else:
    erasePanels()
    # Copy the files
    for p in panelList:
        p.copyPanel()
    setupRemoteDebugFiles()

# Launch PS
if (args.launch):
    os.execl(PSexePath, "Adobe Photoshop")
