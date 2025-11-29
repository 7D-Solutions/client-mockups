#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Starting import migration...\n');

// Define import mappings
const IMPORT_MAPPINGS = [
  // Five-level imports
  { pattern: /from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/infrastructure/g, replacement: "from '@infrastructure" },
  { pattern: /import\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/infrastructure/g, replacement: "import '@infrastructure" },
  
  // Four-level imports
  { pattern: /from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/infrastructure/g, replacement: "from '@infrastructure" },
  { pattern: /import\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/infrastructure/g, replacement: "import '@infrastructure" },
  
  // Triple-level imports
  { pattern: /from\s+['"]\.\.\/\.\.\/\.\.\/infrastructure/g, replacement: "from '@infrastructure" },
  { pattern: /import\s+['"]\.\.\/\.\.\/\.\.\/infrastructure/g, replacement: "import '@infrastructure" },
  
  // Double-level imports
  { pattern: /from\s+['"]\.\.\/\.\.\/infrastructure/g, replacement: "from '@infrastructure" },
  { pattern: /import\s+['"]\.\.\/\.\.\/infrastructure/g, replacement: "import '@infrastructure" },
  
  // Single-level imports
  { pattern: /from\s+['"]\.\.\/infrastructure/g, replacement: "from '@infrastructure" },
  { pattern: /import\s+['"]\.\.\/infrastructure/g, replacement: "import '@infrastructure" },
  
  // Module imports
  { pattern: /from\s+['"]\.\.\/\.\.\/\.\.\/modules/g, replacement: "from '@modules" },
  { pattern: /from\s+['"]\.\.\/\.\.\/modules/g, replacement: "from '@modules" },
  { pattern: /from\s+['"]\.\.\/modules/g, replacement: "from '@modules" },
  
  // Common component imports (special handling)
  { pattern: /from\s+['"]@infrastructure\/components['"]/g, replacement: "from '@components'" },
];

// Find all TypeScript and JavaScript files
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
  cwd: path.resolve(__dirname, '..'),
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

console.log(`Found ${files.length} files to process\n`);

let totalUpdates = 0;
const updatedFiles = [];

files.forEach(filePath => {
  const fullPath = path.join(path.resolve(__dirname, '..'), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let updates = 0;
  
  IMPORT_MAPPINGS.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      updates += matches.length;
      content = content.replace(pattern, replacement);
    }
  });
  
  if (updates > 0) {
    fs.writeFileSync(fullPath, content);
    updatedFiles.push({ path: filePath, updates });
    totalUpdates += updates;
    console.log(`✅ Updated ${filePath} (${updates} imports)`);
  }
});

console.log('\n📊 Migration Summary:');
console.log(`   Total files processed: ${files.length}`);
console.log(`   Files updated: ${updatedFiles.length}`);
console.log(`   Total imports migrated: ${totalUpdates}`);

if (updatedFiles.length > 0) {
  console.log('\n📝 Updated files:');
  updatedFiles.forEach(({ path, updates }) => {
    console.log(`   - ${path} (${updates} imports)`);
  });
}

console.log('\n🎉 Import migration complete!');
console.log('\n💡 Next steps:');
console.log('   1. Run "npm run dev" to test the changes');
console.log('   2. Run "npm test" to ensure tests still pass');
console.log('   3. Commit the changes\n');