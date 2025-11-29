; Instant Screenshot Tool - No visible windows
; Hotkey: Ctrl+Shift+S

; Set the target directory
TargetDir := "C:\Users\7d.vision\Projects\Fire-Proof-ERP-Sandbox\erp-core-docs\frontend-rebuild\screenshots"

; Override Ctrl+Shift+S 
^+s::
{
    ; Generate filename with timestamp
    Timestamp := FormatTime(A_Now, "yyyy-MM-dd_HHmmss")
    Filename := "Screenshot_" . Timestamp . ".png"
    FullPath := TargetDir . "\" . Filename
    
    ; Clear clipboard
    A_Clipboard := ""
    
    ; Show message
    ToolTip("📸 Taking screenshot...")
    
    ; Use AutoHotkey's built-in GDIP screenshot (handles DPI properly)
    ; Get screen dimensions using AutoHotkey
    MonitorGet(1, &Left, &Top, &Right, &Bottom)
    Width := Right - Left
    Height := Bottom - Top
    
    ; Create bitmap and capture screen using Windows GDI
    hdc := DllCall("GetDC", "Ptr", 0, "Ptr")
    hbm := DllCall("CreateCompatibleBitmap", "Ptr", hdc, "Int", Width, "Int", Height, "Ptr")
    hdc2 := DllCall("CreateCompatibleDC", "Ptr", hdc, "Ptr")
    DllCall("SelectObject", "Ptr", hdc2, "Ptr", hbm)
    DllCall("BitBlt", "Ptr", hdc2, "Int", 0, "Int", 0, "Int", Width, "Int", Height, "Ptr", hdc, "Int", Left, "Int", Top, "UInt", 0x00CC0020)
    
    ; Save using simple PowerShell with the captured bitmap in clipboard
    DllCall("OpenClipboard", "Ptr", 0)
    DllCall("EmptyClipboard")
    DllCall("SetClipboardData", "UInt", 2, "Ptr", hbm)
    DllCall("CloseClipboard")
    
    ; Clean up
    DllCall("DeleteDC", "Ptr", hdc2)
    DllCall("ReleaseDC", "Ptr", 0, "Ptr", hdc)
    
    ; Save from clipboard
    PSCommand := "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $img = [Windows.Forms.Clipboard]::GetImage(); $img.Save('" . FullPath . "'); $img.Dispose()"
    RunWait("powershell.exe -WindowStyle Hidden -Command `"" . PSCommand . "`"", , "Hide")
    
    ; Check if file was created
    if FileExist(FullPath) {
        A_Clipboard := FullPath
        ToolTip("✅ Screenshot saved instantly!`n" . Filename . "`nPath copied to clipboard")
        SetTimer(() => ToolTip(), -2000)
    } else {
        ToolTip("❌ Failed to save screenshot")
        SetTimer(() => ToolTip(), -2000)
    }
}

; Test hotkey
^+d::
{
    if FileExist(TargetDir) {
        ToolTip("✅ Directory found: " . TargetDir)
    } else {
        ToolTip("❌ Directory not found: " . TargetDir)
    }
    SetTimer(() => ToolTip(), -3000)
}

; Startup message
ToolTip("⚡ Instant Screenshot Tool loaded!`nCtrl+Shift+S: Take full screen`nNo windows, instant capture!")
SetTimer(() => ToolTip(), -4000)