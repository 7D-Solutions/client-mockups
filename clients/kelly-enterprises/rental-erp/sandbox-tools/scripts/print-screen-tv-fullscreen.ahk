; Full Screen Screenshot Tool - Captures entire screen including all edges
; Hotkey: Ctrl+Shift+S - Capture complete full screen
; Hotkey: Ctrl+Shift+D - Show monitor info

; Set the target directory
TargetDir := "C:\Users\7d.vision\Projects\Fire-Proof-ERP-Sandbox\erp-core-docs\frontend-rebuild\screenshots"

; Capture full screen
^+s::
{
    CaptureFullScreen()
}

CaptureFullScreen() {
    global TargetDir

    ; Get active window to determine which monitor
    hwnd := WinGetID("A")
    WinGetPos(&winX, &winY, , , hwnd)

    ; Find which monitor contains this window
    MonitorCount := MonitorGetCount()
    targetMonitor := 1

    Loop MonitorCount {
        MonitorGet(A_Index, &Left, &Top, &Right, &Bottom)
        if (winX >= Left && winX < Right && winY >= Top && winY < Bottom) {
            targetMonitor := A_Index
            break
        }
    }

    ; Get FULL monitor dimensions - no adjustments
    MonitorGet(targetMonitor, &Left, &Top, &Right, &Bottom)
    Width := Right - Left
    Height := Bottom - Top

    ; Generate filename with timestamp
    Timestamp := FormatTime(A_Now, "yyyy-MM-dd_HHmmss")
    Filename := "Screenshot_" . Timestamp . ".png"
    FullPath := TargetDir . "\" . Filename

    ; Show message
    ToolTip("📸 Capturing Full Screen Monitor " . targetMonitor . "...`n" . Width . "x" . Height)

    ; Capture screen
    CaptureScreen(Left, Top, Width, Height, FullPath, targetMonitor)
}

CaptureScreen(Left, Top, Width, Height, FullPath, MonitorNum) {
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
        ToolTip("✅ Full screen captured!`nMonitor " . MonitorNum . ": " . Width . "x" . Height . "`n" . Filename . "`nPath copied to clipboard")
        SetTimer(() => ToolTip(), -2500)
    } else {
        ToolTip("❌ Failed to save screenshot")
        SetTimer(() => ToolTip(), -2000)
    }
}

; Monitor info hotkey
^+d::
{
    global TargetDir

    info := "📺 Full Screen Screenshot Tool`n`n"

    ; Check directory
    if FileExist(TargetDir) {
        info .= "✅ Directory: OK`n`n"
    } else {
        info .= "❌ Directory not found!`n`n"
    }

    ; Get active window's monitor
    hwnd := WinGetID("A")
    WinGetPos(&winX, &winY, , , hwnd)

    ; Show monitor count and dimensions
    MonitorCount := MonitorGetCount()
    info .= "Monitors detected: " . MonitorCount . "`n`n"

    Loop MonitorCount {
        MonitorGet(A_Index, &Left, &Top, &Right, &Bottom)
        Width := Right - Left
        Height := Bottom - Top

        ; Check if active window is on this monitor
        isActive := (winX >= Left && winX < Right && winY >= Top && winY < Bottom)
        marker := isActive ? "👉 " : "   "

        info .= marker . "Monitor " . A_Index . ": " . Width . "x" . Height
        info .= " at (" . Left . "," . Top . ")`n"
    }

    ; Virtual screen info
    VirtScreenLeft := SysGet(76)
    VirtScreenTop := SysGet(77)
    VirtScreenWidth := SysGet(78)
    VirtScreenHeight := SysGet(79)
    info .= "`nVirtual Screen: " . VirtScreenWidth . "x" . VirtScreenHeight

    ToolTip(info)
    SetTimer(() => ToolTip(), -6000)
}

; Startup message
ToolTip("📺 Full Screen Screenshot Tool loaded!`n`nCtrl+Shift+S: Capture full screen`nCtrl+Shift+D: Monitor info`n`nCaptures entire screen - no cropping")
SetTimer(() => ToolTip(), -4000)
