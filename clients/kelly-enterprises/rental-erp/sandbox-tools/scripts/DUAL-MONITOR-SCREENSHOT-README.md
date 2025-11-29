# Dual Monitor Screenshot Tool

New script created: `print-screen-dual-monitor.ahk`

## Features

- **Smart Monitor Detection**: Automatically captures the monitor where the active window is located
- **Dual Monitor Support**: Properly handles multiple monitor setups
- **All Monitors Mode**: Can capture entire virtual screen (all monitors combined)
- **Instant Save**: Direct save to file without showing dialog boxes

## Hotkeys

- **Ctrl+Shift+S**: Capture active monitor (the monitor with the current window)
- **Ctrl+Shift+A**: Capture all monitors (entire virtual screen)
- **Ctrl+Shift+D**: Show monitor info and test

## How to Use

### Option 1: Run directly with AutoHotkey v2
1. Make sure AutoHotkey v2 is installed
2. Double-click `print-screen-dual-monitor.ahk`

### Option 2: Compile to .exe
1. Right-click `print-screen-dual-monitor.ahk`
2. Select "Compile Script" (requires Ahk2Exe compiler)
3. Run the generated `print-screen-dual-monitor.exe`

### Option 3: Use Ahk2Exe command line
```batch
"C:\Program Files\AutoHotkey\Compiler\Ahk2Exe.exe" /in "print-screen-dual-monitor.ahk" /out "print-screen-dual-monitor.exe"
```

## What's Different from Original Script

### Original Script Issues:
- Hardcoded to capture Monitor 1 only
- Did not detect which monitor the active window is on
- Did not support capturing all monitors

### New Script Features:
- Detects active window position
- Identifies which monitor contains the active window
- Captures only that monitor (no cropping issues)
- Alternative hotkey to capture all monitors at once
- Shows monitor info for debugging

## Output

Screenshots are saved to:
```
C:\Users\7d.vision\Projects\Fire-Proof-ERP-Sandbox\erp-core-docs\frontend-rebuild\screenshots
```

Filename format: `Screenshot_YYYY-MM-DD_HHMMSS.png`

## Troubleshooting

1. **Press Ctrl+Shift+D** to see:
   - Number of monitors detected
   - Resolution of each monitor
   - Virtual screen dimensions
   - Target directory status

2. **If screenshots are still cropped:**
   - Use Ctrl+Shift+A to capture all monitors
   - Check monitor arrangement in Windows Display Settings
   - Ensure the script detects the correct number of monitors

3. **If the tool doesn't work:**
   - Make sure you're using AutoHotkey v2 (not v1)
   - Check that the target directory exists
   - Try running as administrator
