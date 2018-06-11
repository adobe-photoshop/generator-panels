#!/usr/bin/python
#
# Copyright (c) 2013-2015 Adobe Systems Incorporated. All rights reserved.
#
# Permission is hereby granted, free of charge, to any person obtaining a
# copy of this software and associated documentation files (the "Software"),
# to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# DEALINGS IN THE SOFTWARE.
#
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
#  -l,--list                    List all panels installed
#  -a,--allusers                Install panels for All users (requires sudo/admin)
#  -v,--version                 Set the CEP version used for registry/plist keys
#  -c,--clean                   Clean the CEP caches
#  -p,--package PASSWORD        Package the panels signed with a
#                               private certificate, using the certificate's PASSWORD
#  -i,--install                 Installs the signed panels created with -p into
#                               the user panel location.  Does not require debug mode.
#  -z,--zip                     Package the panels as a ZIP archives
#  -e,--erase                   Remove the panels from the debug location
#  -c,--clean                   Delete the CEP caches for the panels
#  -r,--run                     Run Photoshop after copying.
#
#

import os, sys, shutil, re, string, getpass, stat, datetime, platform, glob
import argparse, subprocess, zipfile, ftplib, xml.dom.minidom, socket, errno
if sys.platform == 'win32':
    import _winreg

# Some options only make sense for internal Adobe developers
adobeDevMachine = socket.getfqdn().endswith('.adobe.com')

# Current version of Photoshop, for listing panels within the app
psFolderName = "Adobe Photoshop CC 2018"

psAppFolder = {"win32":"C:\\Program Files\\Adobe\\%s\\" % psFolderName,
               "darwin": "/Applications/%s/%s.app/Contents/" % (psFolderName, psFolderName)
              }[sys.platform]

# PS executable location, used just to launch PS
PSexePath = psAppFolder + {"win32":"Photoshop.exe",
                           "darwin": "MacOS/%s" % (psFolderName)}[sys.platform]

# Extract the panel ID and name from the Manifest file
def getExtensionInfo(manifestPath):
    extensionManifest = xml.dom.minidom.parse(manifestPath).getElementsByTagName("ExtensionManifest")[0]

    if extensionManifest:
        return ''.join('{}="{}" '.format(key, val) for key, val in extensionManifest.attributes.items())
    else:
        print("# No ExtensionManifest for %s" % manifestPath)
        return None

class Panel:
    #
    # Pull out the panel ID and name from the manifest file
    #
    def __init__(self, extInfo, manifestPath):
        m = re.search('ExtensionBundleId\s*=\s*["][\w.]*[.](\w+)["]', extInfo)
        self.panelID = m.group(1) if m else "ERROR_FINDING_ID"
        m = re.search('ExtensionBundleId\s*=\s*["]([\w.]+)["]', extInfo)
        self.fullPanelID = m.group(1) if m else "ERROR_FINDING_ID"
        m = re.search('ExtensionBundleName\s*=\s*["]([\w\s]+)["]', extInfo)
        self.panelName = m.group(1) if m else self.panelID
        self.panelSrcFolder = manifestPath.split(os.sep)[0]

    def destPath(self):
        return osDestPath + (self.fullPanelID if args.allusers else self.panelName)

    # Copy panel source to the deployment folder
    def copyPanel(self):
        destPath = self.destPath()
        print( "# Copying " + srcLocation + self.panelSrcFolder + "\n  to " + destPath )
        shutil.copytree( srcLocation + self.panelSrcFolder, destPath )

    def cleanCache(self):
        cachePath = os.getenv('HOME') + {'win32':'\\AppData\\Local\\Temp\\cep_cache\\',
                                         'darwin':'/Library/Caches/CSXS/cep_cache/'}[sys.platform]
        cacheFolders = glob.glob( cachePath + "*%s*" % self.fullPanelID )
        for f in cacheFolders:
            try:
                shutil.rmtree( f )
                print( "# Removing cache folder " + f )
            except (OSError, IOError) as writeErr:
                if (writeErr.errno == errno.EACCES):
                    print( "# PS still running? Unable to delete " + f )
                else:
                    print( "# Unable to remove cache folder " + f )

    # Unlock, then remove the panels
    def erasePanel(self):
        # Because Perforce may leave them locked.
        def makeWritable( path ):
            os.chmod( path, os.stat( path ).st_mode | stat.S_IWRITE )

        # Unlock, then remove the panels
        destPath = self.destPath()
        if (os.path.exists( destPath )):
            print( "# Removing " + destPath )
            for df in [root + os.sep + f for root, dirs, files in os.walk(destPath) for f in files]:
                makeWritable( df )
            shutil.rmtree( destPath )

    # Create the .debug file for enabling the remote debugger
    def debugFilename(self):
        return os.path.join( self.destPath(), ".debug" )

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
            print( "# Remote Debug %s at http://localhost:%d" % (extName, portNumber) )
            portNumber += 1
        debugText += "</ExtensionList>\n"
        try:
            file(self.debugFilename(), 'w' ).write(debugText)
        except IOError as writeErr:
            if (writeErr.errno == errno.ENOENT):
               print( "# Note: Panel %s is not installed" % self.panelName )

    def setupRemoteDebugFile(self, debugEnabled):
        if debugEnabled:
            self.createRemoteDebugXML()
        else:
            if (os.path.exists( self.debugFilename() )):
                os.remove( self.debugFilename() )
                print( "# Removing debug file for %s" % self.panelName )

    #
    # Create a signed double-clickable install package
    # There's some more info on self-signing here:
    # http://forums.adobe.com/message/5714997
    #
    def packagePanel(self):
        pkgTargetFolder = getTargetFolder()
        timestampURL = "http://timestamp.digicert.com"
#        timestampURL = "http://tsa.starfieldtech.com"

        pkgFile = pkgTargetFolder + self.panelName + ".zip"
        # Must remove the file first, otherwise contents not updated.
        if os.path.exists( pkgFile ):
            os.remove( pkgFile )
        print( "# Creating package: '%s'" % pkgFile )
        result = ""
        try:
            result = subprocess.check_output('ZXPSignCmd -sign %s "%s" %s %s -tsa %s'
                                             % (srcLocation + self.panelSrcFolder, pkgFile,
                                                certPath, args.package[0], timestampURL), shell=True)
        except subprocess.CalledProcessError as procErr:
            if (procErr.returncode == 1):
                print()
                print( "## Signing package failed.  ZXPSignCmd is not installed?" )
            else:
                print( "## Signing package %s failed." % (self.panelName + ".zip") )
            sys.exit(procErr.returncode)
        else:
            print( result )

    # Make the zip of the panel source
    def zipPanel(self):
        zipTargetFolder = getTargetFolder()

        zipTargetFile = zipTargetFolder + self.panelID + ".zip"
        print( "# Creating archive: " + zipTargetFile )
        zf = zipfile.ZipFile( zipTargetFile, 'w', zipfile.ZIP_DEFLATED )
        os.chdir( srcLocation + self.panelSrcFolder )
        fileList = [root + os.sep + f for root, dirs, files in os.walk(".") for f in files]
        for f in fileList:
            zf.write( f )
        zf.close()

# For future reference, the Extension Manager stages the bundle in
#
# (Mac) /Library/Application Support/Adobe/Extension Manager CC/EM Store/Photoshop/
# (Win) %APPDATA%\Adobe\Extension Manager CC\EM Store\Photoshop{32,64} (No?)
# (Win) %APPDATA%\Adobe.ExMan\Local Store\Photoshop{32,64}    (No?)
# (Win) C:\ProgramData\Adobe\Extension Manager CC\EM Store\Shared\   (YES?!)
#
# and deploys it to:
#
# (Mac) /Library/Application Support/Adobe/CEP/extensions/  (for all users)
#       ~/Library/Application Support/Adobe/CEP/extensions/ (for current user)
# (Win) C:\Program Files\Common Files\Adobe\CEP\extensions\  (for all users)
# 		C:\<username>\AppData\Roaming\Adobe\CEP\extensions\  (for current user)
# Note the Adobe CC Panel deploys them to:
# (Win) C:\Program Files(x86)\Common Files\Adobe\CEP\extensions\[extensionID]
#

argparser = argparse.ArgumentParser(description="Manage Photoshop CEP panels.  By default, installs the panels for debugging.")
argparser.add_argument('--package', '-p', nargs=1, metavar='password', default=None,
                       help="Package the item using the private certificate; specify the password used to create it")
argparser.add_argument('--zip', '-z', action='store_true', default=False,
                       help="Create ZIP archives for BuildForge signing")
argparser.add_argument('--debug', '-d', nargs='?', const='status', default=None, choices=['status', 'on', 'off'],
                       help="Enable panel without signing")
argparser.add_argument('--version', '-v', default='8',
                       help="CEP Version for setting PanelDebugMode")
argparser.add_argument('--run', '-r', action='store_true', default=False,
                       help="Launch Photoshop after copy")
argparser.add_argument('--list', '-l', action='store_true', default=False,
                       help="List all installed panels")
if (adobeDevMachine):
    argparser.add_argument('--branch', '-b', nargs=1, metavar='branch_path', default=None,
                           help='Path to branch for listing the extensions in that branch executable')
argparser.add_argument('--erase', '-e', action='store_true', default=False,
                       help="Erase the panels from the debug install location")
argparser.add_argument('--clean', '-c', action='store_true', default=False,
                       help="Clean CEP caches")
argparser.add_argument('--allusers', '-a', action='store_true', default=False,
                       help="Install/erase panel for all users (requires sudo/admin)")
argparser.add_argument('--install', '-i', action='store_true', default=False,
                       help="Install the signed panels created with -p")
args = argparser.parse_args( sys.argv[1:] )

if (sum([args.package!=None, args.zip, args.erase, args.install]) > 1):
    print( "# Error: Only one of -p, -z, -e or -i is allowed" )
    sys.exit(0)

# Where to place the panel.
extensionSubpath = os.path.normpath("/Adobe/CEP/extensions") + os.path.sep
winAppData = os.getenv("APPDATA") if (sys.platform == "win32") else ""
winCommon = os.getenv("CommonProgramFiles(x86)") if (sys.platform == "win32") else ""
allDestPaths = { "win32": {False:winAppData + extensionSubpath,
                           True:winCommon + extensionSubpath},
                 "darwin":{False:os.path.expanduser("~")+"/Library/Application Support" + extensionSubpath,
                           True:"/Library/Application Support" + extensionSubpath}
               }[sys.platform]
devExtensionPath = { "win32": "\\photoshop\\Targets\\x64\\Debug\\Required\\CEP\\extensions\\",
                     "darwin": "/photoshop/Targets/Debug_x86_64/%s/Contents/Required/CEP/extensions/"
                                % psFolderName
                   }[sys.platform]
osDestPath = allDestPaths[args.allusers]

# If writing to the system folders, make sure we actually can
if (args.allusers):
    try:
        if (not os.path.exists(osDestPath)):
           os.makedirs(osDestPath)
        testfile = osDestPath + os.sep + "test.txt"
        f = file( testfile, 'w')
        f.write("test")
        f.close()
        os.remove(testfile)
    except (OSError, IOError) as writeErr:
        if (writeErr.errno == errno.EACCES):
           print( "# Error - Must run as admin to access %s" % osDestPath )
        else:
           print( "# Error - Unable to access %s" % osDestPath )
        sys.exit(1)

#
# Find installable extensions.  Assumes this script is in
# the top level folder containing the extension sources.
#
srcLocation = sys.path[0] + os.sep
os.chdir(srcLocation)
manifestFiles = glob.glob("*/CSXS/manifest.xml")

if len(manifestFiles) == 0:
    print( "# Warning - no extension manifests found" )
    if (not (args.debug or args.list)):
        sys.exit(-1)

# Load the panel info from the extension
panelList = [Panel(getExtensionInfo(f), f) for f in manifestFiles if getExtensionInfo(f)]

# Location of the certificate file used to sign the package.
certPath = os.path.join( srcLocation, "cert", "panelcert.p12" )

# Base port number used for remote debugger (each extra panel increments it)
portNumber = 8000

def getTargetFolder():
    targetFolder = os.path.abspath( os.path.join( srcLocation, "Targets" ) ) + os.sep
    if (not os.path.exists( targetFolder )):
        os.makedirs( targetFolder )
    return targetFolder

def erasePanels():
    # Unlock, then remove the panels
    for p in panelList:
        p.erasePanel()

    # Leaving the cache around can cause problems.
    cachePath = os.path.normpath( osDestPath + "../cache" )
    if os.path.exists(cachePath):
        shutil.rmtree(cachePath);

def listInstalledPanels():
    def displayPanelsInfo(panelPath, title):
        if (not os.path.exists(panelPath)):
            return
        panelList = glob.glob(panelPath + "*")
        if len(panelList) == 0:
            return
        print( "\n# (%s)\n# Panels in %s" % (title, os.path.dirname(panelList[0])) )
        for f in panelList:
            # Fish the ID for each extension in the package out of the CSXS/manifest.xml file
            manifestXML = xml.dom.minidom.parse( os.path.join( f, "CSXS", "manifest.xml" ) )
            name = os.path.basename(f)
            manifest = manifestXML.getElementsByTagName("ExtensionManifest")
            # Only print the bundle (names) if they're different from the folder name
            extNames = [x.getAttribute("ExtensionBundleName") for x in manifest if x.getAttribute("ExtensionBundleName") != name]
            extVersions = [x.getAttribute("ExtensionBundleVersion") for x in manifest]
            extNames = " (" + string.join(extNames) + ")" if len(extNames) > 0 else ""
            extVersions = " [" + string.join(extVersions) + "]" if len(extVersions) > 0 else ""
            print( "  %s%s%s" % (name, extVersions, extNames) )

    displayPanelsInfo( allDestPaths[True], "for all users")
    displayPanelsInfo( allDestPaths[False], "for this user")
    
    psAppPath = psAppFolder + "Required" + os.sep + "CEP" + os.sep + "extensions" + os.sep
    
    displayPanelsInfo( psAppPath, "installed with Photoshop")

    # For Adobe developers, also list extensions found in the specified debug branch
    if (adobeDevMachine and args.branch):
        displayPanelsInfo( args.branch[0] + devExtensionPath, "for branch %s debug app" % args.branch[0])

#
# Examine the state of debugKey (either "Logging" or "PlayerDebugMode")
# If panelDebugValue is not None, set the to that value.
# returns the previous value of the debugKey
#
def panelExecutionState( debugKey, panelDebugValue=None ):
    oldPanelDebugValue = 'err'
    CEPversion = 'CSXS.' + args.version

    # Windows: add HKEY_CURRENT_USER/Software/Adobe/CSXS.5 (add key) PlayerDebugMode [String] "1"
    if sys.platform == 'win32':
        def tryKey(key):
            try:
                return _winreg.QueryValueEx( key, debugKey )
            except:
                return None

        access = _winreg.KEY_READ if (not panelDebugValue) else _winreg.KEY_ALL_ACCESS

        ky = _winreg.OpenKey( _winreg.HKEY_CURRENT_USER,
                              "Software\\Adobe\\%s" % CEPversion, 0, access )
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
        plistFile = os.path.expanduser( "~/Library/Preferences/com.adobe.%s.plist" % CEPversion )

        # First, make sure the Plist is in text format
        subprocess.check_output( "plutil -convert xml1 " + plistFile, shell=True )
        plist = plistlib.readPlist( plistFile )
        oldPanelDebugValue = '1' if ((debugKey in plist) and (plist[debugKey] == '1')) else '0'

        if (panelDebugValue):
            plist[debugKey] = panelDebugValue
            plistlib.writePlist( plist, plistFile )

            # On Mac OS X 10.9 and higher, must reset the cfprefsd process
            # before changes in a plist file take effect
            macOSVer = [int(x) for x in platform.mac_ver()[0].split('.')]
            if (macOSVer[0] == 10) and (macOSVer[1] >= 9):
                proc = subprocess.Popen("ps ax | grep cfprefsd | grep -v grep", shell=True,
                                        stdout=subprocess.PIPE).stdout.read()
                procID = re.findall("^\s*(\d+)", proc.decode('utf-8'), re.MULTILINE)
                if (procID):
                    for p in procID:
                        print( "# MacOS 10.9: Killing cfprefsd process ID: " + p )
                    os.system( "kill -HUP " + p )
                else:
                    print( "# MacOS 10.9: No cfprefsd process" )

    else:
        print( "Error: Unsupported platform: " + sys.platform )
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
            print( "# Debug enabled - panel will run without signing" )
        else:
            print( "# Panel only runs if a signed package is installed" )
    else:
        # Only report if the value actually changed, so you can verify
        # the change actually "stuck"
        if panelDebugValue != oldPanelDebugValue:
            print( "# Panel debug mode " + ("enabled" if panelDebugValue=='1' else "disabled") )
            setupRemoteDebugFiles()

#
# Create a signed double-clickable install package
# There's some more info on self-signing here:
# http://forums.adobe.com/message/5714997
#
elif (args.package):
    for p in panelList:
        p.packagePanel()

#
# Unpack packaged panels into the user's extension folder
#
elif (args.install):
    erasePanels()
    if (not os.path.exists(osDestPath)):
        os.makedirs(osDestPath)
    pkgTargetFolder = getTargetFolder()
    zxpFiles = filter(os.path.exists, [pkgTargetFolder + p.panelName + ".zip" for p in panelList])
    if len(zxpFiles) > 0:
        for f in zxpFiles:
            zps = zipfile.ZipFile( f )
            destFolder = osDestPath + os.path.splitext(os.path.basename(f))[0]
            print( "# Extracting %s \n   to %s" % (f, destFolder) )
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
        print( "# No packaged panels to install, use --package first" )
        sys.exit(0)
#
# Create a .zip archive
#
elif (args.zip):
    for p in panelList:
        p.zipPanel()

elif (args.erase):
    erasePanels()

elif (args.clean):
    for p in panelList:
        p.cleanCache()

elif (args.list):
    listInstalledPanels()
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
if (args.run):
    os.execl(PSexePath, "Adobe Photoshop")
