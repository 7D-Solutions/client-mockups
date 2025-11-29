#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const srcPath = path.join(__dirname, '../src');
const distPath = path.join(__dirname, '../dist');
const reportPath = path.join(__dirname, '../css-bundle-report.json');

// Thresholds (in KB)
const THRESHOLDS = {
  totalSize: 100,        // Total CSS bundle size
  largestFile: 30,       // Largest individual CSS file
  moduleAverage: 3,      // Average CSS module size
};

// Analyze CSS files in development
function analyzeDevelopmentCSS() {
  const cssFiles = [];
  
  // Find all CSS files
  function findCSS(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        findCSS(filePath);
      } else if (file.endsWith('.css')) {
        cssFiles.push({
          path: path.relative(srcPath, filePath),
          size: stat.size,
          sizeKB: (stat.size / 1024).toFixed(2),
          type: file.includes('.module.css') ? 'module' : 'global'
        });
      }
    });
  }
  
  findCSS(srcPath);
  return cssFiles;
}

// Analyze production build
function analyzeProductionCSS() {
  if (!fs.existsSync(distPath)) {
    return null;
  }
  
  const cssFiles = [];
  const assetPath = path.join(distPath, 'assets');
  
  if (fs.existsSync(assetPath)) {
    const files = fs.readdirSync(assetPath);
    files.forEach(file => {
      if (file.endsWith('.css')) {
        const filePath = path.join(assetPath, file);
        const stat = fs.statSync(filePath);
        cssFiles.push({
          path: file,
          size: stat.size,
          sizeKB: (stat.size / 1024).toFixed(2),
          type: 'bundled'
        });
      }
    });
  }
  
  return cssFiles;
}

// Generate report
function generateReport() {
  console.log('📊 CSS Bundle Monitor\n');
  
  // Development analysis
  const devFiles = analyzeDevelopmentCSS();
  const moduleFiles = devFiles.filter(f => f.type === 'module');
  const globalFiles = devFiles.filter(f => f.type === 'global');
  
  const totalDevSize = devFiles.reduce((sum, f) => sum + f.size, 0);
  const totalDevSizeKB = (totalDevSize / 1024).toFixed(2);
  
  console.log('Development CSS:');
  console.log(`  Total Size: ${totalDevSizeKB} KB`);
  console.log(`  Files: ${devFiles.length} (${globalFiles.length} global, ${moduleFiles.length} modules)`);
  console.log(`  Largest File: ${devFiles.sort((a, b) => b.size - a.size)[0]?.path} (${devFiles[0]?.sizeKB} KB)`);
  
  if (moduleFiles.length > 0) {
    const avgModuleSize = (moduleFiles.reduce((sum, f) => sum + f.size, 0) / moduleFiles.length / 1024).toFixed(2);
    console.log(`  Average Module Size: ${avgModuleSize} KB`);
  }
  
  // Production analysis
  const prodFiles = analyzeProductionCSS();
  if (prodFiles) {
    const totalProdSize = prodFiles.reduce((sum, f) => sum + f.size, 0);
    const totalProdSizeKB = (totalProdSize / 1024).toFixed(2);
    
    console.log('\nProduction CSS:');
    console.log(`  Total Size: ${totalProdSizeKB} KB`);
    console.log(`  Files: ${prodFiles.length}`);
    prodFiles.forEach(f => {
      console.log(`    - ${f.path}: ${f.sizeKB} KB`);
    });
  } else {
    console.log('\nProduction build not found. Run "npm run build" to analyze production CSS.');
  }
  
  // Threshold checks
  console.log('\n⚠️  Threshold Checks:');
  const issues = [];
  
  if (totalDevSizeKB > THRESHOLDS.totalSize) {
    issues.push(`Total CSS size (${totalDevSizeKB} KB) exceeds threshold (${THRESHOLDS.totalSize} KB)`);
    console.log(`  ❌ Total size exceeds ${THRESHOLDS.totalSize} KB`);
  } else {
    console.log(`  ✅ Total size within threshold`);
  }
  
  const largestFile = devFiles.sort((a, b) => b.size - a.size)[0];
  if (largestFile && parseFloat(largestFile.sizeKB) > THRESHOLDS.largestFile) {
    issues.push(`Largest file ${largestFile.path} (${largestFile.sizeKB} KB) exceeds threshold (${THRESHOLDS.largestFile} KB)`);
    console.log(`  ❌ Largest file exceeds ${THRESHOLDS.largestFile} KB`);
  } else {
    console.log(`  ✅ Largest file within threshold`);
  }
  
  if (moduleFiles.length > 0) {
    const avgModuleSize = moduleFiles.reduce((sum, f) => sum + f.size, 0) / moduleFiles.length / 1024;
    if (avgModuleSize > THRESHOLDS.moduleAverage) {
      issues.push(`Average module size (${avgModuleSize.toFixed(2)} KB) exceeds threshold (${THRESHOLDS.moduleAverage} KB)`);
      console.log(`  ❌ Average module size exceeds ${THRESHOLDS.moduleAverage} KB`);
    } else {
      console.log(`  ✅ Average module size within threshold`);
    }
  }
  
  // Top 5 largest files
  console.log('\n📁 Top 5 Largest CSS Files:');
  devFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.path} (${f.sizeKB} KB)`);
    });
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    development: {
      totalSize: totalDevSize,
      totalSizeKB: totalDevSizeKB,
      fileCount: devFiles.length,
      globalFiles: globalFiles.length,
      moduleFiles: moduleFiles.length,
      files: devFiles
    },
    production: prodFiles ? {
      totalSize: prodFiles.reduce((sum, f) => sum + f.size, 0),
      files: prodFiles
    } : null,
    thresholds: THRESHOLDS,
    issues
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${path.relative(process.cwd(), reportPath)}`);
  
  // Exit with error if thresholds exceeded
  if (issues.length > 0) {
    console.log('\n❌ CSS bundle size thresholds exceeded!');
    process.exit(1);
  } else {
    console.log('\n✅ All CSS bundle size checks passed!');
  }
}

// Run the monitor
generateReport();