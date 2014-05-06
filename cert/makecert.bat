rem sample script to produce certificate files

rem set your email address here
set email=%USERNAME%@example.com

rem voodoo from http://stackoverflow.com/questions/7809648
rem will probably fail if your computer isn't part of a Windows domain
FOR /F "tokens=1 delims=" %%A in ('net user "%USERNAME%" /domain ^| find /I "Full Name"') do SET fullNameText=%%A
set fullName=%fullNameText:Full Name=%
for /f "tokens=* delims= " %%a in ("%fullName%") do set fullName=%%a

set /P certpass="Enter certificate password: " %=%
del panelcert.p12
ZXPSignCmd -selfSignedCert US California %USERDOMAIN% "%fullName%" %certpass% panelcert.p12 -email %email% -validityDays 3000
