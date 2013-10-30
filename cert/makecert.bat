set /P certpass="Enter certificate password: " %=%
ZXPSignCmd -selfSignedCert US California "Adobe Systems" "John Peterson" %certpass% panelcert.p12 -email jp@adobe.com -validityDays 120
