#!/bin/bash
# Hook Switcher - Choose your protection level

echo "=== CLAUDE HOOK SWITCHER ==="
echo "Current deletion hook in settings.json:"
grep -A2 -B2 "no-delete.py\|buddy-smart-delete.py" /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/.claude/settings.json || echo "No deletion hook found"
echo ""
echo "Which protection level do you want?"
echo "1) PARANOID (no-delete.py) - Blocks almost everything"
echo "2) SMART (buddy-smart-delete.py) - Protects critical, allows cleanup"  
echo "3) BACKUP current settings and switch to SMART"
echo ""
read -p "Choose (1-3): " choice

SETTINGS_FILE="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/.claude/settings.json"
HOOK_DIR="/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/.claude/hooks"

case $choice in
    1)
        echo "Switching to PARANOID protection..."
        sed -i 's|buddy-smart-delete.py|no-delete.py|g' "$SETTINGS_FILE"
        echo "✓ PARANOID mode active - Nothing can be deleted!"
        ;;
    2)
        echo "Switching to SMART protection..."
        sed -i 's|no-delete.py|buddy-smart-delete.py|g' "$SETTINGS_FILE"
        echo "✓ SMART mode active - BUDDIES can clean, critical files protected!"
        ;;
    3)
        echo "Creating backup and switching to SMART..."
        cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        sed -i 's|no-delete.py|buddy-smart-delete.py|g' "$SETTINGS_FILE"
        echo "✓ Backup created and SMART mode active!"
        ;;
    *)
        echo "Invalid choice. No changes made."
        exit 1
        ;;
esac

echo ""
echo "Updated settings.json:"
grep -A2 -B2 "no-delete.py\|buddy-smart-delete.py" "$SETTINGS_FILE"
echo ""
echo "⚠️  IMPORTANT: You must restart Claude for changes to take effect!"