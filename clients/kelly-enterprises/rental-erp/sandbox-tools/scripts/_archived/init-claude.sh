#!/bin/bash

echo "Starting Claude in SANDBOX with --dangerously-skip-permissions..."
echo

# Navigate to the SANDBOX directory
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox

# Run claude with the dangerous permissions flag and initial prompt
claude --dangerously-skip-permissions 'read claude/CLAUDE.md and supporting documents then wait for instructions'

echo
echo "Claude session ended."