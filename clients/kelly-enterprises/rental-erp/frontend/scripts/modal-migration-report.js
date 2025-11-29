#!/usr/bin/env node

/**
 * Modal Migration Status Report
 * Analyzes modal component migration status and identifies remaining work
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ModalMigrationReporter {
  constructor() {
    this.srcPath = path.join(__dirname, '../src');
    this.results = {
      totalModals: 0,
      infrastructureCompliant: 0,
      needsMigration: 0,
      customCSSFound: 0,
      modalFiles: [],
      violations: []
    };
  }

  async generateReport() {
    console.log('📊 Modal Migration Status Report');
    console.log('================================\n');
    
    try {
      await this.scanModalFiles();
      await this.analyzeModalUsage();
      this.generateSummary();
      this.generateRecommendations();
    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
      process.exit(1);
    }
  }

  async scanModalFiles() {
    console.log('🔍 Scanning for modal files...\n');
    
    const modalFiles = await this.findModalFiles(this.srcPath);
    this.results.totalModals = modalFiles.length;
    
    for (const filePath of modalFiles) {
      const analysis = await this.analyzeModalFile(filePath);
      this.results.modalFiles.push(analysis);
      
      if (analysis.usesInfrastructure) {
        this.results.infrastructureCompliant++;
      } else {
        this.results.needsMigration++;
      }
      
      if (analysis.hasCustomCSS) {
        this.results.customCSSFound++;
      }
      
      if (analysis.violations.length > 0) {
        this.results.violations.push(...analysis.violations);
      }
    }
  }

  async findModalFiles(dirPath) {
    const modalFiles = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.findModalFiles(fullPath);
        modalFiles.push(...subFiles);
      } else if (entry.name.match(/Modal.*\.tsx$/)) {
        // Skip infrastructure components - they ARE the infrastructure, not consumers
        const relativePath = path.relative(this.srcPath, fullPath);
        if (!relativePath.startsWith('infrastructure/')) {
          modalFiles.push(fullPath);
        }
      }
    }
    
    return modalFiles;
  }

  async analyzeModalFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.srcPath, filePath);
    
    const analysis = {
      path: relativePath,
      usesInfrastructure: false,
      hasCustomCSS: false,
      violations: [],
      migrationStatus: 'unknown'
    };

    // Check if using infrastructure Modal
    const infrastructureImportPatterns = [
      'from \'../infrastructure',
      'from \'../../infrastructure',
      'from \'../../../infrastructure',
      'from "../infrastructure',
      'from "../../infrastructure',
      'from "../../../infrastructure',
      'from \'@infrastructure',
      'from "@infrastructure',
      '@infrastructure/components/Modal',
      'from \'@components\'',  // @components is aliased to infrastructure/components
      'from "@components"',
      'from \'@components\''
    ];
    
    // Check if importing Modal from infrastructure (directly or via @components alias)
    const hasInfrastructureImport = infrastructureImportPatterns.some(pattern => content.includes(pattern));
    const importsModal = content.includes('import { Modal') || content.includes('import {Modal') || 
                        content.includes('import { Modal,') || content.includes('import {Modal,');
    
    if (hasInfrastructureImport && importsModal) {
      analysis.usesInfrastructure = true;
      analysis.migrationStatus = 'migrated';
    }

    // Check for custom CSS imports
    if (content.includes('.module.css')) {
      analysis.hasCustomCSS = true;
      
      if (analysis.usesInfrastructure) {
        analysis.violations.push({
          type: 'legacy-css',
          file: relativePath,
          message: 'Using infrastructure Modal but still importing custom CSS'
        });
      }
    }

    // Check for custom overlay patterns
    if (content.includes('position: fixed') || 
        content.includes('z-index:') ||
        content.includes('modalOverlay') ||
        content.includes('modal-overlay')) {
      analysis.violations.push({
        type: 'custom-overlay',
        file: relativePath,
        message: 'Custom modal overlay implementation detected'
      });
    }

    // Set migration status
    if (!analysis.usesInfrastructure) {
      analysis.migrationStatus = 'needs-migration';
    } else if (analysis.violations.length > 0) {
      analysis.migrationStatus = 'partially-migrated';
    } else {
      analysis.migrationStatus = 'fully-migrated';
    }

    return analysis;
  }

  async analyzeModalUsage() {
    console.log('📈 Analyzing modal usage patterns...\n');
    
    // Additional analysis could be added here
    // For now, we'll just count composition component usage
    
    let compositionUsage = 0;
    for (const modal of this.results.modalFiles) {
      const filePath = path.join(this.srcPath, modal.path);
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (content.includes('Modal.Body') || 
          content.includes('Modal.Actions') || 
          content.includes('Modal.Header')) {
        compositionUsage++;
      }
    }
    
    this.results.compositionUsage = compositionUsage;
  }

  generateSummary() {
    console.log('📊 Migration Summary:');
    console.log(`   Total Modal Files: ${this.results.totalModals}`);
    console.log(`   Infrastructure Compliant: ${this.results.infrastructureCompliant} (${((this.results.infrastructureCompliant / this.results.totalModals) * 100).toFixed(1)}%)`);
    console.log(`   Needs Migration: ${this.results.needsMigration}`);
    console.log(`   Using Composition Components: ${this.results.compositionUsage}`);
    console.log(`   Custom CSS Found: ${this.results.customCSSFound}`);
    console.log(`   Total Violations: ${this.results.violations.length}`);
    console.log('');

    // Status breakdown
    const statusCounts = this.results.modalFiles.reduce((acc, modal) => {
      acc[modal.migrationStatus] = (acc[modal.migrationStatus] || 0) + 1;
      return acc;
    }, {});

    console.log('🎯 Migration Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === 'fully-migrated' ? '✅' : 
                   status === 'partially-migrated' ? '⚠️' : 
                   status === 'needs-migration' ? '❌' : '❓';
      console.log(`   ${emoji} ${status.replace('-', ' ')}: ${count} files`);
    });
    console.log('');

    // Show violations if any
    if (this.results.violations.length > 0) {
      console.log('⚠️  Outstanding Issues:');
      this.results.violations.slice(0, 5).forEach(violation => {
        console.log(`   • ${violation.file}: ${violation.message}`);
      });
      
      if (this.results.violations.length > 5) {
        console.log(`   ... and ${this.results.violations.length - 5} more`);
      }
      console.log('');
    }
    
    // Debug: Show files that need migration
    console.log('\n📋 Files needing migration:');
    this.results.modalFiles
      .filter(modal => modal.migrationStatus === 'needs-migration')
      .forEach(modal => console.log(`   - ${modal.path}`));
  }

  generateRecommendations() {
    const adoptionRate = (this.results.infrastructureCompliant / this.results.totalModals) * 100;
    
    console.log('💡 Recommendations:');
    
    if (adoptionRate >= 95) {
      console.log('🎉 Excellent! Modal migration is nearly complete.');
      console.log('   • Focus on cleaning up remaining violations');
      console.log('   • Consider removing unused CSS files');
      console.log('   • Document migration patterns for future reference');
    } else if (adoptionRate >= 80) {
      console.log('✅ Good progress! Most modals are migrated.');
      console.log('   • Complete remaining modal migrations');
      console.log('   • Address composition component adoption');
      console.log('   • Clean up legacy CSS imports');
    } else if (adoptionRate >= 60) {
      console.log('⚠️  Moderate progress. Continue migration efforts.');
      console.log('   • Prioritize high-traffic modal migrations');
      console.log('   • Create migration templates for common patterns');
      console.log('   • Consider pair programming for complex modals');
    } else {
      console.log('🚨 Low adoption rate. Intensive migration needed.');
      console.log('   • Establish migration sprint focused on modals');
      console.log('   • Create automated migration tools');
      console.log('   • Review architectural governance enforcement');
    }

    console.log('');
    console.log('🔧 Next Actions:');
    
    if (this.results.needsMigration > 0) {
      console.log(`   1. Migrate ${this.results.needsMigration} remaining modal(s) to infrastructure`);
    }
    
    if (this.results.customCSSFound > 0) {
      console.log(`   2. Remove ${this.results.customCSSFound} custom CSS file(s)`);
    }
    
    if (this.results.violations.length > 0) {
      console.log(`   3. Fix ${this.results.violations.length} architectural violation(s)`);
    }
    
    const uncomposedModals = this.results.infrastructureCompliant - this.results.compositionUsage;
    if (uncomposedModals > 0) {
      console.log(`   4. Adopt composition components in ${uncomposedModals} modal(s)`);
    }

    console.log('   5. Run ESLint to verify no new violations');
    console.log('   6. Update documentation with migration patterns');
    console.log('');
  }
}

// Run report generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const reporter = new ModalMigrationReporter();
  reporter.generateReport().catch(console.error);
}

export default ModalMigrationReporter;