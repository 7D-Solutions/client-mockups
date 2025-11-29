# Claude Code Hooks Documentation

## Overview

Claude Code hooks are scripts that run before, during, or after tool executions to provide additional validation, security, or functionality. This directory contains hooks that prevent dangerous operations and ensure safe code execution.

## How Hooks Work

### Hook Execution Flow
1. **User requests tool execution** (e.g., Bash command)
2. **Claude calls PreToolUse hooks** with tool information
3. **Hook script validates the request** and returns exit code
4. **Claude proceeds or blocks** based on hook response
5. **Tool executes** (if allowed) or error is shown (if blocked)

### Hook Input/Output Interface

#### Input (stdin)
Hooks receive JSON data via stdin with this structure:
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /dangerous/path",
    "description": "Delete files"
  }
}
```

#### Output (exit codes)
- **Exit 0**: Allow tool execution
- **Exit 1 or 2**: Block tool execution
- **stderr**: Error message displayed to user

## Hook Configuration

### Settings Location
Hook configuration is defined in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /path/to/hook-script.py"
          }
        ]
      }
    ]
  }
}
```

### Hook Types
- **PreToolUse**: Runs before tool execution (most common)
- **PostToolUse**: Runs after successful tool execution
- **OnToolError**: Runs when tool execution fails

### Matchers
- `".*"`: Match all tools
- `"Bash"`: Match only Bash tool
- `"Edit|Write"`: Match Edit or Write tools

## Creating a Hook

### 1. Basic Hook Template

```python
#!/usr/bin/env python3
import sys
import json
import os

def main():
    try:
        # Read hook input from stdin
        data = json.load(sys.stdin)
        
        tool_name = data.get("tool_name", "")
        tool_input = data.get("tool_input", {})
        
        # Your validation logic here
        if should_block_operation(tool_name, tool_input):
            print("BLOCKED: Operation not allowed", file=sys.stderr)
            sys.exit(2)  # Block execution
        
        # Allow operation
        sys.exit(0)
        
    except Exception as e:
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)  # Allow on hook errors to prevent blocking everything

def should_block_operation(tool_name, tool_input):
    # Implement your logic here
    return False

if __name__ == "__main__":
    main()
```

### 2. Make Hook Executable

```bash
chmod +x /path/to/your-hook.py
```

### 3. Configure in Settings

Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /absolute/path/to/your-hook.py"
          }
        ]
      }
    ]
  }
}
```

## Tool-Specific Hook Examples

### Bash Command Validation

```python
if tool_name == "Bash":
    cmd = tool_input.get("command", "").strip().lower()
    
    dangerous_patterns = ['rm -rf', 'format c:', 'dd if=/dev/zero']
    
    for pattern in dangerous_patterns:
        if pattern in cmd:
            print(f"BLOCKED: Dangerous command '{pattern}' not allowed", file=sys.stderr)
            sys.exit(2)
```

### File Edit Protection

```python
elif tool_name == "Edit":
    old_string = tool_input.get("old_string", "")
    new_string = tool_input.get("new_string", "")
    
    # Prevent content deletion
    if old_string.strip() and not new_string.strip():
        print("BLOCKED: Cannot delete file contents", file=sys.stderr)
        sys.exit(2)
```

### Write Tool Validation

```python
elif tool_name == "Write":
    content = tool_input.get("content", "")
    file_path = tool_input.get("file_path", "")
    
    # Prevent overwriting with empty content
    if os.path.exists(file_path) and not content.strip():
        print(f"BLOCKED: Cannot write empty content to '{file_path}'", file=sys.stderr)
        sys.exit(2)
```

## Existing Hooks in This Directory

### 1. `no-delete.py` (Active)
**Purpose**: Comprehensive deletion prevention with smart features
**Features**:
- Blocks dangerous deletion commands (`rm`, `rmdir`, `del`, etc.)
- Prevents `find` with `-delete` flag
- Blocks `truncate` command
- Smart output redirection (allows new files, blocks overwrites)
- Prevents content deletion via Edit/MultiEdit/Write tools

**Configuration**: Currently active via `.claude/settings.json`

### 2. `prevent-all-deletions.py` (Backup)
**Purpose**: Strict deletion prevention
**Features**:
- Blocks ALL output redirection with `>`
- Comprehensive command pattern matching
- Strict file content protection

### 3. `prevent-delete.py` (Legacy)
**Purpose**: Basic deletion prevention
**Features**:
- Simple pattern matching
- Basic Edit/Write protection
- Uses older JSON structure

## Best Practices

### 1. Error Handling
```python
try:
    data = json.load(sys.stdin)
except:
    # Always allow on JSON parsing errors
    sys.exit(0)
```

### 2. Fail-Safe Design
- Default to allowing operations on hook errors
- Use `sys.exit(0)` for unexpected errors
- Only block when certain of danger

### 3. Clear Error Messages
```python
print("BLOCKED: Specific reason why operation was blocked", file=sys.stderr)
```

### 4. Performance Considerations
- Keep validation logic fast
- Avoid expensive operations (file I/O, network calls)
- Cache expensive lookups

### 5. Testing Your Hook

Create a test script:
```bash
#!/bin/bash
echo '{"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}}' | python3 your-hook.py
echo "Exit code: $?"
```

## Security Considerations

### 1. Hook Script Security
- Store hooks in protected directories
- Use absolute paths in configuration
- Validate hook script permissions

### 2. Input Validation
- Always validate JSON input
- Handle malformed data gracefully
- Sanitize strings before pattern matching

### 3. Bypass Prevention
- Consider command variations (`rm`, `RM`, `Rm`)
- Check for command chaining (`rm file; echo ok`)
- Handle quoted strings and escaping

## Common Patterns

### 1. Case-Insensitive Matching
```python
cmd_lower = tool_input.get("command", "").strip().lower()
```

### 2. Pattern Arrays
```python
dangerous_patterns = [
    'rm ', 'rm -', 'rm/', 'rmdir',
    'del ', 'del/', 'erase ', 'rd ',
    'remove-item', 'remove-', 'delete-',
    'unlink', 'shred', 'truncate'
]

for pattern in dangerous_patterns:
    if pattern in cmd_lower:
        # Block operation
```

### 3. File Existence Checking
```python
import os

target_file = extract_file_from_command(cmd)
if os.path.exists(target_file):
    # Block overwrite of existing file
```

### 4. Complex Command Parsing
```python
# Extract file path from redirection
if '>' in cmd and '>>' not in cmd:
    parts = cmd.split('>')
    if len(parts) > 1:
        target_file = parts[1].strip().split()[0]
        target_file = target_file.strip('"\'')  # Remove quotes
```

## Troubleshooting

### Hook Not Running
1. Check file permissions: `ls -la hook-script.py`
2. Verify path in settings.json is absolute
3. Test hook manually: `echo '{}' | python3 hook-script.py`
4. Check Claude settings validation

### Hook Blocking Everything
1. Add debug output: `print(f"Hook received: {data}", file=sys.stderr)`
2. Check for logic errors in validation
3. Ensure `sys.exit(0)` for allowed operations
4. Test with simple operations first

### Hook Not Blocking Dangerous Operations
1. Verify pattern matching logic
2. Check case sensitivity issues
3. Test with actual dangerous commands
4. Review command parsing logic

## Hook Development Workflow

1. **Plan**: Define what operations to block/allow
2. **Template**: Start with basic hook template
3. **Implement**: Add validation logic incrementally
4. **Test**: Test both blocking and allowing cases
5. **Deploy**: Add to settings.json and test in Claude
6. **Monitor**: Watch for false positives/negatives
7. **Iterate**: Refine based on real usage

## Advanced Features

### 1. Conditional Blocking
```python
# Block rm only in certain directories
if 'rm ' in cmd and any(danger_dir in cmd for danger_dir in ['/home', '/var', '/etc']):
    # Block only dangerous rm operations
```

### 2. User Prompts (Future)
```python
# Could prompt user for confirmation
print("WARNING: Dangerous operation detected. Continue? (y/N)", file=sys.stderr)
# Note: Current hook system doesn't support interactive prompts
```

### 3. Logging and Auditing
```python
import datetime

def log_blocked_operation(tool_name, operation):
    with open('/path/to/hook.log', 'a') as f:
        f.write(f"{datetime.now()}: BLOCKED {tool_name}: {operation}\\n")
```

### 4. Configuration Files
```python
import json

def load_hook_config():
    try:
        with open('.claude/hook-config.json', 'r') as f:
            return json.load(f)
    except:
        return {"blocked_patterns": ["rm -rf"]}
```

## Integration with Claude Development

### 1. Session Logging
Document hook activities in session logs:
```markdown
### Security Enforcement ✅
- Hook blocked 3 dangerous rm operations
- Allowed 15 safe file operations
- No false positives detected
```

### 2. Testing Integration
Include hook testing in development workflow:
```markdown
### Hook Verification ✅
- Tested dangerous command blocking: `rm -rf /` → BLOCKED
- Tested safe operations: `ls -la` → ALLOWED
- Verified file overwrite protection works
```

### 3. Continuous Improvement
- Monitor hook effectiveness
- Update patterns based on new threats
- Balance security with usability

---

## Quick Reference

### Common Exit Codes
- `0`: Allow operation
- `1`: Block operation (generic)
- `2`: Block operation (security)

### JSON Structure
```json
{
  "tool_name": "ToolName",
  "tool_input": {
    "parameter": "value"
  }
}
```

### Testing Command
```bash
echo '{"tool_name": "Bash", "tool_input": {"command": "test-command"}}' | python3 hook.py
```

### Configuration Path
```
.claude/settings.json → hooks.PreToolUse[].hooks[].command
```

For questions or issues with hooks, refer to the session logs in `/docs/claude/Session Log/` for troubleshooting examples and solutions.