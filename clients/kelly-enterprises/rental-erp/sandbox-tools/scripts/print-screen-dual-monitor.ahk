; Dual Monitor Screenshot Tool - Captures active monitor or all monitors
; Hotkey: Ctrl+Shift+S - Capture active monitor
; Hotkey: Ctrl+Shift+A - Capture all monitors (virtual screen)

; Set the target directory
TargetDir := "C:\Users\7d.vision\Projects\Fire-Proof-ERP-Sandbox\erp-core-docs\frontend-rebuild\screenshots"

; Capture active monitor
^+s::
{
    CaptureActiveMonitor()
}

; Capture all monitors (virtual screen)
^+a::
{
    CaptureAllMonitors()
}

CaptureActiveMonitor() {
    global TargetDir

    ; Get active window
    hwnd := WinGetID("A")

    ; Get window position
    WinGetPos(&winX, &winY, , , hwnd)

    ; Find which monitor contains this window
    MonitorCount := MonitorGetCount()
    targetMonitor := 1

    Loop MonitorCount {
        MonitorGet(A_Index, &Left, &Top, &Right, &Bottom)
        ; Check if window is on this monitor
        if (winX >= Left && winX < Right && winY >= Top && winY < Bottom) {
            targetMonitor := A_Index
            break
        }
    }

    ; Get monitor dimensions
    MonitorGet(targetMonitor, &Left, &Top, &Right, &Bottom)
    Width := Right - Left
    Height := Bottom - Top

    ; Generate filename with timestamp and monitor info
    Timestamp := FormatTime(A_Now, "yyyy-MM-dd_HHmmss")
    Filename := "Screenshot_" . Timestamp . ".png"
    FullPath := TargetDir . "\" . Filename

    ; Show message
    ToolTip("📸 Capturing Monitor " . targetMonitor . "...")

    ; Capture screen
    CaptureScreen(Left, Top, Width, Height, FullPath, "Monitor " . targetMonitor)
}

CaptureAllMonitors() {
    global TargetDir

    ; Get virtual screen dimensions (all monitors combined)
    VirtScreenLeft := SysGet(76)    ; SM_XVIRTUALSCREEN
    VirtScreenTop := SysGet(77)     ; SM_YVIRTUALSCREEN
    VirtScreenWidth := SysGet(78)   ; SM_CXVIRTUALSCREEN
    VirtScreenHeight := SysGet(79)  ; SM_CYVIRTUALSCREEN

    ; Generate filename with timestamp
    Timestamp := FormatTime(A_Now, "yyyy-MM-dd_HHmmss")
    Filename := "Screenshot_" . Timestamp . ".png"
    FullPath := TargetDir . "\" . Filename

    ; Show message
    ToolTip("📸 Capturing All Monitors...")

    ; Capture entire virtual screen
    CaptureScreen(VirtScreenLeft, VirtScreenTop, VirtScreenWidth, VirtScreenHeight, FullPath, "All Monitors")
}

CaptureScreen(Left, Top, Width, Height, FullPath, Description) {
    ; Clear clipboard
    A_Clipboard := ""

    ; Create bitmap and capture screen using Windows GDI
    hdc := DllCall("GetDC", "Ptr", 0, "Ptr")
    hbm := DllCall("CreateCompatibleBitmap", "Ptr", hdc, "Int", Width, "Int", Height, "Ptr")
    hdc2 := DllCall("CreateCompatibleDC", "Ptr", hdc, "Ptr")
    DllCall("SelectObject", "Ptr", hdc2, "Ptr", hbm)
    DllCall("BitBlt", "Ptr", hdc2, "Int", 0, "Int", 0, "Int", Width, "Int", Height, "Ptr", hdc, "Int", Left, "Int", Top, "UInt", 0x00CC0020)

    ; Save using PowerShell with the captured bitmap in clipboard
    DllCall("OpenClipboard", "Ptr", 0)
    DllCall("EmptyClipboard")
    DllCall("SetClipboardData", "UInt", 2, "Ptr", hbm)
    DllCall("CloseClipboard")

    ; Clean up GDI objects
    DllCall("DeleteDC", "Ptr", hdc2)
    DllCall("ReleaseDC", "Ptr", 0, "Ptr", hdc)

    ; Save from clipboard using PowerShell
    PSCommand := "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $img = [Windows.Forms.Clipboard]::GetImage(); $img.Save('" . FullPath . "'); $img.Dispose()"
    RunWait("powershell.exe -WindowStyle Hidden -Command `"" . PSCommand . "`"", , "Hide")

    ; Check if file was created
    if FileExist(FullPath) {
        A_Clipboard := FullPath
        SplitPath(FullPath, &Filename)
        ToolTip("✅ Screenshot saved!`n" . Description . "`n" . Filename . "`nPath copied to clipboard")
        SetTimer(() => ToolTip(), -2000)
    } else {
        ToolTip("❌ Failed to save screenshot")
        SetTimer(() => ToolTip(), -2000)
    }
}

; Test hotkey - Show monitor info
^+d::
{
    global TargetDir

    info := "Monitor Information:`n`n"

    ; Check directory
    if FileExist(TargetDir) {
        info .= "✅ Directory: " . TargetDir . "`n`n"
    } else {
        info .= "❌ Directory not found: " . TargetDir . "`n`n"
    }

    ; Show monitor count and dimensions
    MonitorCount := MonitorGetCount()
    info .= "Monitors detected: " . MonitorCount . "`n"

    Loop MonitorCount {
        MonitorGet(A_Index, &Left, &Top, &Right, &Bottom)
        Width := Right - Left
        Height := Bottom - Top
        info .= "Monitor " . A_Index . ": " . Width . "x" . Height . " at (" . Left . "," . Top . ")`n"
    }

    ; Virtual screen info
    VirtScreenLeft := SysGet(76)
    VirtScreenTop := SysGet(77)
    VirtScreenWidth := SysGet(78)
    VirtScreenHeight := SysGet(79)
    info .= "`nVirtual Screen: " . VirtScreenWidth . "x" . VirtScreenHeight . " at (" . VirtScreenLeft . "," . VirtScreenTop . ")"

    ToolTip(info)
    SetTimer(() => ToolTip(), -5000)
}

; Startup message
startupMsg := "⚡ Dual Monitor Screenshot Tool loaded!`n"
startupMsg .= "Ctrl+Shift+S: Capture active monitor`n"
startupMsg .= "Ctrl+Shift+A: Capture all monitors`n"
startupMsg .= "Ctrl+Shift+D: Show monitor info"
ToolTip(startupMsg)
SetTimer(() => ToolTip(), -4000)
