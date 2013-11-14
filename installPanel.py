#!/usr/bin/python
#
# Install & manage the extension panels.
#
# John Peterson (jp@adobe.com), Aug 2013
#
# By default, this copies the extension panels into the debug panel
# location for the platform.  PanelDebugMode must be "on" for a panel
# to operate this way.
#
# Other options:
#  -d,--debug {on,off,status}   Set/check PanelDebugMode
#  -p,--package PASSWORD        Package the panels signed with a
#                               private certificate using PASSWORD
#  -z,--zip                     Package the panels as a ZIP archives
#  -s,--sign {up,down}          Upload/download panels to Hancock for
#                               official Adobe signing (implies -z)
#  -e,--erase                   Remove the panels from the debug location
#  -l,--launch                  Launch Photoshop after copying.
#
# 

import os, sys, shutil, re, getpass, stat, datetime
import argparse, subprocess, zipfile, ftplib, xml.dom.minidom

# Dictionary of panel folders to copy (src file name, dest name)
panels = {"renamelayers":"Rename Layers"}

# PS executable location, used just to launch PS
PSexePath = {"win32":"C:\\Program Files\\Adobe\\Adobe Photoshop CC (64 Bit)\\Photoshop.exe",
             "darwin": "/Applications/Adobe Photoshop CC/Adobe Photoshop CC.app/Contents/MacOS/Adobe Photoshop CC"
             }[sys.platform]

# Where the panel lives.  Uses current dir
# unless there's an entry in srcPaths
srcLocation = sys.path[0] + os.sep
if (not os.path.exists( srcLocation + "renamelayers")):
    print "# Error - Script must be run from the generator-panels folder"
    sys.exit(-1)

# Add Kuler if it's there.
if (os.path.exists(srcLocation + "kuler")):
    panels['kuler'] = "Kuler"

# Location of the certificate file used to sign the package.
certPath = os.path.join( srcLocation, "cert", "panelcert.p12" )

# Where to place the panel.
extensionSubpath = os.path.normpath("/Adobe/CEPServiceManager4/extensions") + os.path.sep
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
# (Mac) /Library/Application Support/Adobe/CEPServiceManager4/extensions/
# (Win) C:\Program Files (x86)\Common Files\Adobe\CEPServiceManager4\extensions\
#
# This is different than the local copies used for debugging.

argparser = argparse.ArgumentParser(description="Manage Photoshop CEP panels.  By default, installs the panels for debugging.")
argparser.add_argument('--package', '-p', nargs=1, metavar='password', default=None, help="Package the item using the private certificate; specify the password for that cert")
argparser.add_argument('--zip', '-z', action='store_true', default=False, help="Create ZIP archives for BuildForge signing")
argparser.add_argument('--sign', '-s', nargs=1, default=None, choices=['up', 'down'], help="Make zip and upload to hancock for signing; or download signed .zxp from hancock")
argparser.add_argument('--debug', '-d', nargs='?', const='status', default=None, choices=['status', 'on', 'off'], help="Enable panel without signing")
argparser.add_argument('--launch', '-l', action='store_true', default=False, help="Launch Photoshop after copy")
argparser.add_argument('--erase', '-e', action='store_true', default=False, help="Erase the panels from the debug install location")
args = argparser.parse_args( sys.argv[1:] )

def erasePanels():
    # Because Perforce may leave them locked.
    def makeWritable( path ):
        os.chmod( path, os.stat( path ).st_mode | stat.S_IWRITE )

    # Unlock, then remove the panels
    for k in panels.keys():
        destPath = osDestPath + panels[k]
        if (os.path.exists( destPath )):
            print "# Removing " + destPath
            for df in [root + os.sep + f for root, dirs, files in os.walk(destPath) for f in files]:
                makeWritable(df)
            shutil.rmtree( destPath )

# Create the .debug file for enabling the remote debugger
def debugFilename( panel ):
    return os.path.join( osDestPath, panels[panel], ".debug" )

def createRemoteDebugXML(panel):
    global portNumber
    extensionTemplate = """  <Extension Id="%s">
    <HostList>
      <Host Name="PHXS" Port="%d"/>
    </HostList>
  </Extension>
"""
    # Fish the ID for each extension in the package out of the CSXS/manifest.xml file
    manifestXML = xml.dom.minidom.parse( os.path.join( srcLocation, panel, "CSXS", "manifest.xml" ) )
    extensions = manifestXML.getElementsByTagName("ExtensionList")[0].getElementsByTagName("Extension")
    debugText = """<?xml version="1.0" encoding="UTF-8"?>\n"""
    debugText += "<ExtensionList>\n"
    for ext in extensions:
        extName = ext.getAttribute("Id")
        debugText += extensionTemplate % (extName, portNumber)
        print "# Remote Debug %s at http://localhost:%d" % (extName, portNumber)
        portNumber += 1
    debugText += "</ExtensionList>\n"
    file(debugFilename(panel), 'w' ).write(debugText)

#
# Examine the state of debugKey (either "Logging" or "PlayerDebugMode")
# If panelDebugValue is not None, set the to that value.
# returns the previous value of the debugKey
#
def panelExecutionState( debugKey, panelDebugValue=None ):
    oldPanelDebugValue = 'err'

    # Windows: add HKEY_CURRENT_USER/Software/Adobe/CSXS.4 (add key) PlayerDebugMode [String] "1"
    if sys.platform == 'win32':
        import _winreg
        def tryKey(key):
            try:
                return _winreg.QueryValueEx( key, debugKey )
            except:
                return None

        access = _winreg.KEY_READ if (not panelDebugValue) else _winreg.KEY_ALL_ACCESS

        ky = _winreg.OpenKey( _winreg.HKEY_CURRENT_USER, "Software\\Adobe\\CSXS.4", 0, access )
        keyValue = tryKey( ky )
        oldPanelDebugValue = '1' if keyValue and (keyValue[0] == '1') else '0'

        if (panelDebugValue):
            if not keyValue:
                _winreg.CreateKey( ky, debugKey )
            _winreg.SetValueEx( ky, debugKey, 0, _winreg.REG_SZ, panelDebugValue );

        _winreg.CloseKey( ky )

    # Mac: ~/Library/Preferences/com.adobe.CSXS.4.plist (add row) PlayerDebugMode [String] "1"
    elif sys.platform == "darwin":
        import subprocess, plistlib
        plistFile = os.path.expanduser( "~/Library/Preferences/com.adobe.CSXS.4.plist" )
        
        # First, make sure the Plist is in text format
        subprocess.check_output( "plutil -convert xml1 " + plistFile, shell=True )
        plist = plistlib.readPlist( plistFile )
        oldPanelDebugValue = '1' if (plist.has_key( debugKey )) and (plist[debugKey] == '1') else '0'

        if (panelDebugValue):
            plist[debugKey] = panelDebugValue
            plistlib.writePlist( plist, plistFile )
    else:
        print "Error: Unsupported platform: " + sys.platform
        sys.exit(0)

    return oldPanelDebugValue

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
            # Setup/remove remote debug config file
            for k in panels.keys():
                if panelDebugValue=='1':
                    createRemoteDebugXML(k)
                else:
                    if (os.path.exists( debugFilename(k) )):
                        os.remove( debugFilename(k) )

#
# Create a signed double-clickable install package
#
elif (args.package):
    pkgTargetFolder = getTargetFolder()

    for k in panels.keys():
        pkgFile = pkgTargetFolder + panels[k] + ".zxp"
        print "# Creating package: '%s'" % pkgFile
        result = subprocess.check_output('ZXPSignCmd -sign %s "%s" %s %s'
                                         % (srcLocation + k, pkgFile,
                                            certPath, args.package[0]), shell=True)
        print result

#
# Create a .zip archive for signing on BuildForge
# See https://zerowing.corp.adobe.com/display/coresvcwiki/SigningKioskZXPandCSXS
# for details.  If the "--sign up" option is used, the package file is sent to
# the signing folder.  Go browse to http://matrix-ctrel/; > Start > Sign_CSXS_and_ZXP
#
elif (args.zip or (args.sign and args.sign[0].startswith("up"))):
    zipTargetFolder = getTargetFolder()

    # Make the zip
    for k in panels.keys():
        zipTargetFile = zipTargetFolder + k + ".zip"
        print "# Creating archive: " + zipTargetFile
        zf = zipfile.ZipFile( zipTargetFile, 'w', zipfile.ZIP_DEFLATED )
        os.chdir( srcLocation + k )
        fileList = [root + os.sep + f for root, dirs, files in os.walk(".") for f in files]
        for f in fileList:
            zf.write( f )
        zf.close()

        # Upload to hancock
        if (args.sign and args.sign[0].startswith("up")):
            print "# Sending to ftp://sjshare.corp.adobe.com/hancock/UnSigned/" + k + ".zip"
            password = getpass.getpass("LDAP password for ftp to sjshare:")
            ftp = ftplib.FTP( "sjshare.corp.adobe.com", getpass.getuser(), password )
            ftp.cwd("hancock/UnSigned/")
            ftp.storbinary( "STOR "+k+".zip", file(zipTargetFile, 'rb') )
            ftp.quit()
            print "# Sent"
    if (args.sign and args.sign[0].startswith("up")):
        print "# Browse to 'http://matrix-ctrel/' and go to Start > Sign CSXS and ZXP"
        print "# Name the new files using the same basename and a \".zxp\" suffix"

#
# Once the package is signed by buildforge,
# --sign down retreives the signed copy from hancock
#
elif (args.sign and args.sign[0].startswith("down")):
    zxpTargetFolder = getTargetFolder()
    for k in panels.keys():
        password = getpass.getpass("LDAP password for ftp to sjshare:")
        ftp = ftplib.FTP( "sjshare.corp.adobe.com", getpass.getuser(), password )
        ftp.cwd("hancock/Signed_ZXP/")
        todaysFolders = ftp.nlst(datetime.date.today().strftime("%Y%m%d") + ".m.*")
        # Sort folders so you only grab the most recent signed copy
        todaysFolders.sort(reverse=True)
        for f in todaysFolders:
            contents = ftp.nlst(f)
            if (f + "/" + k + ".zxp") in contents:
                ftp.retrbinary( "RETR " + f+"/"+k+".zxp", file(zxpTargetFolder + k + "_signed.zxp", 'wb').write )
                print "# Retreived " + zxpTargetFolder + k + "_signed.zxp from: " + f
                break;
        ftp.quit()
        
elif (args.erase):
    erasePanels()
#
# Default; copy the files directly into their debug locations
#
else:
    erasePanels()
    # Copy the files
    for k in panels.keys():
        destPath = osDestPath + panels[k]
        print "# Copying " + srcLocation + k + "\n  to " + destPath
        shutil.copytree( srcLocation + k, destPath )

# Launch PS
if (args.launch):
    os.execl(PSexePath, "Adobe Photoshop")
