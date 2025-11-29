# Claude Startup Scripts

This directory contains scripts to quickly initialize Claude with `--dangerously-skip-permissions` flag in Ubuntu WSL.

## Available Scripts

### 🚀 claude-ubuntu-tab.bat
- Opens Claude in a new tab of existing Windows Terminal
- Sets custom tab title "Claude - Fire-Proof ERP"
- Preferred method if Windows Terminal is already running

### 🔧 claude-ubuntu-smart.bat
- Automatically detects if Windows Terminal is available
- Opens in tab if Terminal is running, otherwise uses WSL directly
- Most versatile option

### 💻 claude-ubuntu-tab.ps1
- PowerShell version with enhanced Terminal detection
- Provides colored output and status messages
- Run with: `powershell -ExecutionPolicy Bypass -File claude-ubuntu-tab.ps1`

### 🐧 init-claude.sh
- Shell script for use within WSL/Ubuntu
- Run directly from Linux: `./init-claude.sh`

## Usage

From Windows:
- Double-click any `.bat` file
- Right-click `.ps1` file and select "Run with PowerShell"

From WSL/Ubuntu:
```bash
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP/claude/startup
./init-claude.sh
```

## What These Scripts Do

1. Open Ubuntu WSL environment
2. Navigate to Fire-Proof-ERP project directory
3. Run `claude init --dangerously-skip-permissions`
4. Keep terminal open for continued use

The `--dangerously-skip-permissions` flag bypasses permission checks during Claude initialization, useful for development environments.