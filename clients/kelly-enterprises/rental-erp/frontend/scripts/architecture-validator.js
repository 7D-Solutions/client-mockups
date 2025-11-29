#!/usr/bin/env node

/**
 * Architecture Validator
 * Validates frontend architecture compliance and generates reports
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ArchitectureValidator {
  constructor() {
    this.srcPath = path.join(__dirname, '../src');
    this.violations = [];
    this.stats = {
      totalFiles: 0,
      modalImplementations: 0,
      infrastructureUsage: 0,
      customImplementations: 0,
      hardcodedColors: 0,
    };
  }

  async validate() {
    console.log('🔍 Architecture Validation Started...\n');
    
    try {
      await this.scanDirectory(this.srcPath);
      this.generateReport();
      this.checkThresholds();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  async scanDirectory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (entry.name.match(/\.(ts|tsx)$/)) {
        await this.validateFile(fullPath);
      }
    }
  }

  async validateFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.srcPath, filePath);
    
    this.stats.totalFiles++;
    
    // Skip infrastructure components from violations
    const isInfrastructure = relativePath.startsWith('infrastructure/components/');
    
    if (!isInfrastructure) {
      this.checkCustomModalImplementations(content, relativePath);
      this.checkHardcodedColors(content, relativePath);
      this.checkInfrastructureUsage(content, relativePath);
    }
  }

  checkCustomModalImplementations(content, filePath) {
    // Enhanced modal pattern detection
    const modalPatterns = [
      {
        pattern: /className.*['"](.*modal.*overlay.*|.*overlay.*modal.*)['"]/gi,
        message: 'Custom modal overlay className detected',
        suggestion: 'Use infrastructure Modal component instead'
      },
      {
        pattern: /style.*position.*['"]fixed['"]/gi,
        message: 'Fixed positioning detected (likely custom modal)',
        suggestion: 'Remove fixed positioning - infrastructure Modal handles this'
      },
      {
        pattern: /z-index:\s*[9-9][0-9][0-9]/gi,
        message: 'High z-index value detected (likely custom modal)',
        suggestion: 'Remove z-index - infrastructure Modal manages stacking'
      },
      {
        pattern: /createPortal/gi,
        message: 'Direct React Portal usage detected',
        suggestion: 'Use infrastructure Modal which handles portals internally'
      },
      {
        pattern: /\.module\.css.*modal/gi,
        message: 'Custom modal CSS module import detected',
        suggestion: 'Remove custom CSS - use infrastructure Modal styling'
      }
    ];

    modalPatterns.forEach(({ pattern, message, suggestion }) => {
      const matches = content.match(pattern);
      if (matches) {
        this.stats.customImplementations++;
        this.violations.push({
          type: 'custom-modal',
          file: filePath,
          severity: 'error',
          message: `${message}: ${matches[0]}`,
          suggestion
        });
      }
    });

    // Check for modal-like div structures
    const modalDivPattern = /<div[^>]*className[^>]*modal[^>]*>/gi;
    if (modalDivPattern.test(content)) {
      this.stats.modalImplementations++;
    }

    // Check if modal file is using infrastructure
    if (filePath.includes('Modal') && !filePath.startsWith('infrastructure/')) {
      const hasInfrastructureImport = /from.*infrastructure.*Modal/.test(content);
      const hasModalUsage = /<Modal[\s>]/.test(content);
      
      if (hasModalUsage && !hasInfrastructureImport) {
        this.violations.push({
          type: 'missing-infrastructure',
          file: filePath,
          severity: 'error',
          message: 'Modal usage without infrastructure import',
          suggestion: 'Import Modal from infrastructure: import { Modal } from "../infrastructure/components"'
        });
      }
    }
  }

  checkHardcodedColors(content, filePath) {
    const colorPatterns = [
      /#[A-Fa-f0-9]{6}|#[A-Fa-f0-9]{3}/g,
      /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,
      /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,
    ];

    colorPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        this.stats.hardcodedColors += matches.length;
        this.violations.push({
          type: 'hardcoded-color',
          file: filePath,
          severity: 'warning',
          message: `Hardcoded color values found: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`,
          suggestion: 'Use CSS custom properties from design system'
        });
      }
    });
  }

  checkInfrastructureUsage(content, filePath) {
    const infrastructureImports = [
      /import.*Modal.*from.*infrastructure/g,
      /import.*Button.*from.*infrastructure/g,
      /import.*Card.*from.*infrastructure/g,
    ];

    const hasInfrastructureImport = infrastructureImports.some(pattern => 
      pattern.test(content)
    );

    if (hasInfrastructureImport) {
      this.stats.infrastructureUsage++;
    }
  }

  generateReport() {
    console.log('📊 Architecture Validation Report');
    console.log('================================\n');
    
    // Overall stats
    console.log('📈 Overall Statistics:');
    console.log(`   Total Files Scanned: ${this.stats.totalFiles}`);
    console.log(`   Infrastructure Usage: ${this.stats.infrastructureUsage} files`);
    console.log(`   Custom Implementations: ${this.stats.customImplementations}`);
    console.log(`   Modal Implementations: ${this.stats.modalImplementations}`);
    console.log(`   Hardcoded Colors: ${this.stats.hardcodedColors}`);
    console.log('');

    // Calculate compliance percentage
    const complianceRate = this.stats.totalFiles > 0 
      ? (this.stats.infrastructureUsage / this.stats.totalFiles * 100).toFixed(1)
      : 0;
    
    console.log(`🎯 Infrastructure Adoption Rate: ${complianceRate}%`);
    console.log('');

    // Violations summary
    if (this.violations.length > 0) {
      console.log('⚠️  Architecture Violations:');
      console.log('');
      
      const violationsByType = this.violations.reduce((acc, violation) => {
        acc[violation.type] = (acc[violation.type] || 0) + 1;
        return acc;
      }, {});

      Object.entries(violationsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} violations`);
      });
      console.log('');

      // Show first few violations for each type
      const typesSeen = new Set();
      this.violations.slice(0, 10).forEach(violation => {
        if (!typesSeen.has(violation.type)) {
          typesSeen.add(violation.type);
          console.log(`❌ ${violation.file}`);
          console.log(`   ${violation.message}`);
          console.log(`   💡 ${violation.suggestion}`);
          console.log('');
        }
      });

      if (this.violations.length > 10) {
        console.log(`   ... and ${this.violations.length - 10} more violations`);
        console.log('');
      }
    } else {
      console.log('✅ No architecture violations found!');
      console.log('');
    }

    // Recommendations
    this.generateRecommendations(complianceRate);
  }

  generateRecommendations(complianceRate) {
    console.log('💡 Recommendations:');
    console.log('');

    if (complianceRate < 50) {
      console.log('🚨 CRITICAL: Low infrastructure adoption rate');
      console.log('   1. Start migrating custom modal implementations');
      console.log('   2. Create component usage guidelines');
      console.log('   3. Set up automated validation in CI/CD');
    } else if (complianceRate < 80) {
      console.log('⚠️  MODERATE: Room for improvement');
      console.log('   1. Continue modal migration efforts');
      console.log('   2. Enforce pre-commit hooks');
      console.log('   3. Add ESLint rules for remaining violations');
    } else {
      console.log('✅ GOOD: High infrastructure adoption rate');
      console.log('   1. Maintain current standards');
      console.log('   2. Monitor for regressions');
      console.log('   3. Share success with other teams');
    }

    console.log('');
    console.log('📚 Next Steps:');
    console.log('   • Run `npm run lint:fix` to auto-fix some violations');
    console.log('   • Review infrastructure component documentation');
    console.log('   • Schedule architecture review session');
    console.log('');
  }

  checkThresholds() {
    const complianceRate = this.stats.totalFiles > 0 
      ? (this.stats.infrastructureUsage / this.stats.totalFiles * 100)
      : 0;

    const errorViolations = this.violations.filter(v => v.severity === 'error').length;
    
    // Set thresholds
    const MIN_COMPLIANCE_RATE = 60; // 60% minimum
    const MAX_ERROR_VIOLATIONS = 5; // Max 5 error violations

    if (complianceRate < MIN_COMPLIANCE_RATE) {
      console.log(`❌ FAILED: Infrastructure adoption rate (${complianceRate.toFixed(1)}%) below threshold (${MIN_COMPLIANCE_RATE}%)`);
      process.exit(1);
    }

    if (errorViolations > MAX_ERROR_VIOLATIONS) {
      console.log(`❌ FAILED: Too many error violations (${errorViolations} > ${MAX_ERROR_VIOLATIONS})`);
      process.exit(1);
    }

    console.log('✅ Architecture validation passed!');
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ArchitectureValidator();
  validator.validate().catch(console.error);
}

export default ArchitectureValidator;