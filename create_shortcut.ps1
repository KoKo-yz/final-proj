$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('C:\Users\yazan\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\FireIntelligence.lnk')
$s.TargetPath = 'C:\Users\yazan\Desktop\Jordan-Fire-Intelligence-v3-fixed\auto_start.bat'
$s.WorkingDirectory = 'C:\Users\yazan\Desktop\Jordan-Fire-Intelligence-v3-fixed'
$s.Save()
