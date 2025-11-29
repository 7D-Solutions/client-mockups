#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const srcPath = path.join(__dirname, '../src');
const outputPath = path.join(__dirname, '../docs/styles');
const tokensPath = path.join(srcPath, 'styles/tokens.css');

// Ensure output directory exists
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

// Parse CSS tokens
function parseTokens(cssContent) {
  const tokens = {
    colors: {},
    spacing: {},
    zIndex: {},
    other: {}
  };

  const tokenRegex = /--([\w-]+):\s*([^;]+);/g;
  let match;

  while ((match = tokenRegex.exec(cssContent)) !== null) {
    const [, name, value] = match;
    
    if (name.includes('color')) {
      tokens.colors[name] = value.trim();
    } else if (name.includes('space')) {
      tokens.spacing[name] = value.trim();
    } else if (name.includes('z-')) {
      tokens.zIndex[name] = value.trim();
    } else {
      tokens.other[name] = value.trim();
    }
  }

  return tokens;
}

// Find all CSS module files
function findCSSModules(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findCSSModules(filePath, fileList);
    } else if (file.endsWith('.module.css')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract component styles info
function analyzeModuleCSS(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const componentName = path.basename(filePath, '.module.css');
  
  // Extract class names
  const classNames = [];
  const classRegex = /\.([a-zA-Z][\w-]*)\s*{/g;
  let match;
  
  while ((match = classRegex.exec(content)) !== null) {
    if (!classNames.includes(match[1])) {
      classNames.push(match[1]);
    }
  }
  
  // Extract CSS variables used
  const varsUsed = [];
  const varRegex = /var\(--([^)]+)\)/g;
  
  while ((match = varRegex.exec(content)) !== null) {
    if (!varsUsed.includes(match[1])) {
      varsUsed.push(match[1]);
    }
  }
  
  return {
    component: componentName,
    path: path.relative(srcPath, filePath),
    classNames,
    varsUsed,
    size: content.length
  };
}

// Generate documentation
function generateDocs() {
  console.log('🎨 Generating style documentation...');
  
  // Parse tokens
  const tokensContent = fs.readFileSync(tokensPath, 'utf8');
  const tokens = parseTokens(tokensContent);
  
  // Find and analyze CSS modules
  const cssModules = findCSSModules(srcPath);
  const moduleAnalysis = cssModules.map(analyzeModuleCSS);
  
  // Generate tokens documentation
  let tokensDocs = '# Design Tokens\n\n';
  tokensDocs += 'Auto-generated from `/src/styles/tokens.css`\n\n';
  
  tokensDocs += '## Colors\n\n';
  tokensDocs += '| Token | Value |\n';
  tokensDocs += '|-------|-------|\n';
  Object.entries(tokens.colors).forEach(([name, value]) => {
    tokensDocs += `| \`--${name}\` | \`${value}\` |\n`;
  });
  
  tokensDocs += '\n## Spacing\n\n';
  tokensDocs += '| Token | Value |\n';
  tokensDocs += '|-------|-------|\n';
  Object.entries(tokens.spacing).forEach(([name, value]) => {
    tokensDocs += `| \`--${name}\` | \`${value}\` |\n`;
  });
  
  tokensDocs += '\n## Z-Index\n\n';
  tokensDocs += '| Token | Value |\n';
  tokensDocs += '|-------|-------|\n';
  Object.entries(tokens.zIndex).forEach(([name, value]) => {
    tokensDocs += `| \`--${name}\` | \`${value}\` |\n`;
  });
  
  fs.writeFileSync(path.join(outputPath, 'tokens.md'), tokensDocs);
  
  // Generate component styles documentation
  let componentDocs = '# Component Styles\n\n';
  componentDocs += 'Auto-generated CSS module analysis\n\n';
  componentDocs += `Total CSS modules: ${moduleAnalysis.length}\n\n`;
  
  moduleAnalysis
    .sort((a, b) => a.component.localeCompare(b.component))
    .forEach(module => {
      componentDocs += `## ${module.component}\n\n`;
      componentDocs += `- **Path**: \`${module.path}\`\n`;
      componentDocs += `- **Size**: ${(module.size / 1024).toFixed(2)} KB\n`;
      componentDocs += `- **Classes**: ${module.classNames.length}\n`;
      componentDocs += `- **CSS Variables**: ${module.varsUsed.length}\n\n`;
      
      if (module.classNames.length > 0) {
        componentDocs += '### Available Classes\n';
        module.classNames.forEach(className => {
          componentDocs += `- \`.${className}\`\n`;
        });
        componentDocs += '\n';
      }
      
      if (module.varsUsed.length > 0) {
        componentDocs += '### CSS Variables Used\n';
        module.varsUsed.forEach(varName => {
          componentDocs += `- \`--${varName}\`\n`;
        });
        componentDocs += '\n';
      }
    });
  
  fs.writeFileSync(path.join(outputPath, 'components.md'), componentDocs);
  
  // Generate summary
  const totalSize = moduleAnalysis.reduce((sum, m) => sum + m.size, 0);
  const totalClasses = moduleAnalysis.reduce((sum, m) => sum + m.classNames.length, 0);
  
  let summaryDocs = '# Style Documentation Summary\n\n';
  summaryDocs += `Generated on: ${new Date().toISOString()}\n\n`;
  summaryDocs += '## Statistics\n\n';
  summaryDocs += `- **Total CSS Modules**: ${moduleAnalysis.length}\n`;
  summaryDocs += `- **Total CSS Size**: ${(totalSize / 1024).toFixed(2)} KB\n`;
  summaryDocs += `- **Total Classes**: ${totalClasses}\n`;
  summaryDocs += `- **Average Classes per Module**: ${(totalClasses / moduleAnalysis.length).toFixed(1)}\n`;
  summaryDocs += `- **Design Tokens**: ${Object.keys(tokens.colors).length + Object.keys(tokens.spacing).length + Object.keys(tokens.zIndex).length}\n\n`;
  
  summaryDocs += '## Documentation Files\n\n';
  summaryDocs += '- [Design Tokens](./tokens.md)\n';
  summaryDocs += '- [Component Styles](./components.md)\n';
  
  fs.writeFileSync(path.join(outputPath, 'README.md'), summaryDocs);
  
  console.log(`✅ Documentation generated in ${outputPath}`);
  console.log(`   - tokens.md`);
  console.log(`   - components.md`);
  console.log(`   - README.md`);
}

// Run generation
generateDocs();