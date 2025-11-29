#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all TypeScript and JSX files
const files = glob.sync('src/**/*.{tsx,jsx}', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

let totalUpdates = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Remove variant prop from Button components
  // Pattern 1: variant="value"
  content = content.replace(/<Button([^>]*)\s+variant="[^"]*"([^>]*)/g, '<Button$1$2');
  
  // Pattern 2: variant='value'
  content = content.replace(/<Button([^>]*)\s+variant='[^']*'([^>]*)/g, '<Button$1$2');
  
  // Pattern 3: variant={variable}
  content = content.replace(/<Button([^>]*)\s+variant=\{[^}]*\}([^>]*)/g, '<Button$1$2');
  
  // Clean up any double spaces that might have been created
  content = content.replace(/<Button\s+/g, '<Button ');
  content = content.replace(/\s+>/g, '>');
  content = content.replace(/\s+\/>/g, ' />');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${path.relative(process.cwd(), file)}`);
    totalUpdates++;
  }
});

console.log(`\nTotal files updated: ${totalUpdates}`);
console.log('All Button variant props have been removed!');