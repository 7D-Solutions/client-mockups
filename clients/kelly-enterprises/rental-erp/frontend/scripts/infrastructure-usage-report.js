#!/usr/bin/env node

/**
 * Infrastructure Usage Report Generator
 * Analyzes infrastructure component adoption and generates detailed reports
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InfrastructureUsageReporter {
  constructor() {
    this.srcPath = path.join(__dirname, '../src');
    this.reportData = {
      components: {},
      modules: {},
      files: [],
      violations: [],
      migrations: []
    };
    this.stats = {
      totalFiles: 0,
      infrastructureFiles: 0,
      moduleFiles: 0,
      customImplementations: 0,
      migrationCandidates: 0
    };
  }

  async generateReport() {
    console.log('📊 Generating Infrastructure Usage Report...\n');
    
    try {
      await this.scanDirectory(this.srcPath);
      await this.generateDetailedReport();
      await this.saveMigrationPlan();
    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
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
        await this.analyzeFile(fullPath);
      }
    }
  }

  async analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.srcPath, filePath);
    
    this.stats.totalFiles++;
    
    const fileData = {
      path: relativePath,
      type: this.categorizeFile(relativePath),
      infrastructureUsage: this.analyzeInfrastructureUsage(content),
      customImplementations: this.findCustomImplementations(content),
      migrationOpportunities: this.identifyMigrationOpportunities(content, relativePath)
    };

    this.reportData.files.push(fileData);
    
    // Update statistics
    if (fileData.type === 'infrastructure') {
      this.stats.infrastructureFiles++;
    } else if (fileData.type === 'module') {
      this.stats.moduleFiles++;
    }

    if (fileData.customImplementations.length > 0) {
      this.stats.customImplementations++;
    }

    if (fileData.migrationOpportunities.length > 0) {
      this.stats.migrationCandidates++;
      this.reportData.migrations.push({
        file: relativePath,
        opportunities: fileData.migrationOpportunities
      });
    }
  }

  categorizeFile(filePath) {
    if (filePath.startsWith('infrastructure/')) return 'infrastructure';
    if (filePath.startsWith('modules/')) return 'module';
    if (filePath.startsWith('pages/')) return 'page';
    return 'other';
  }

  analyzeInfrastructureUsage(content) {
    const components = [];
    const patterns = [
      { name: 'Modal', pattern: /import.*Modal.*from.*infrastructure/g },
      { name: 'Button', pattern: /import.*Button.*from.*infrastructure/g },
      { name: 'Card', pattern: /import.*Card.*from.*infrastructure/g },
      { name: 'FormInput', pattern: /import.*FormInput.*from.*infrastructure/g },
      { name: 'FormSelect', pattern: /import.*FormSelect.*from.*infrastructure/g },
      { name: 'FormTextarea', pattern: /import.*FormTextarea.*from.*infrastructure/g },
    ];

    patterns.forEach(({ name, pattern }) => {
      if (pattern.test(content)) {
        components.push(name);
      }
    });

    return components;
  }

  findCustomImplementations(content) {
    const implementations = [];
    
    // Custom modal patterns
    const modalPatterns = [
      { type: 'custom-modal', pattern: /className.*['"](.*modal.*|.*overlay.*|.*backdrop.*)['"]/gi },
      { type: 'fixed-positioning', pattern: /position:\s*['"]fixed['"]/gi },
      { type: 'z-index-override', pattern: /z-index:\s*\d+/gi },
    ];

    modalPatterns.forEach(({ type, pattern }) => {
      const matches = content.match(pattern);
      if (matches) {
        implementations.push({
          type,
          examples: matches.slice(0, 3), // First 3 examples
          count: matches.length
        });
      }
    });

    return implementations;
  }

  identifyMigrationOpportunities(content, filePath) {
    const opportunities = [];

    // Custom modal to infrastructure Modal
    if (/className.*modal/gi.test(content) && !/import.*Modal.*from.*infrastructure/g.test(content)) {
      opportunities.push({
        type: 'modal-migration',
        priority: 'high',
        description: 'Convert custom modal implementation to infrastructure Modal',
        estimatedEffort: this.estimateModalMigrationEffort(content),
        benefits: ['Accessibility compliance', 'Consistent styling', 'Reduced maintenance']
      });
    }

    // Custom button to infrastructure Button
    if (/className.*button/gi.test(content) && !/import.*Button.*from.*infrastructure/g.test(content)) {
      opportunities.push({
        type: 'button-migration',
        priority: 'medium',
        description: 'Convert custom button implementation to infrastructure Button',
        estimatedEffort: 'low',
        benefits: ['Consistent styling', 'Built-in variants', 'Accessibility features']
      });
    }

    // Hardcoded colors to CSS custom properties
    const colorMatches = content.match(/#[A-Fa-f0-9]{6}|#[A-Fa-f0-9]{3}|rgb\(|rgba\(/g);
    if (colorMatches && colorMatches.length > 0) {
      opportunities.push({
        type: 'color-migration',
        priority: 'low',
        description: `Replace ${colorMatches.length} hardcoded color(s) with design system tokens`,
        estimatedEffort: 'low',
        benefits: ['Theme consistency', 'Easy theme switching', 'Design system compliance']
      });
    }

    return opportunities;
  }

  estimateModalMigrationEffort(content) {
    const lines = content.split('\n').length;
    const complexity = content.match(/modal/gi)?.length || 0;
    
    if (lines > 300 && complexity > 10) return 'high';
    if (lines > 100 && complexity > 5) return 'medium';
    return 'low';
  }

  async generateDetailedReport() {
    const timestamp = new Date().toISOString();
    
    console.log('📈 Infrastructure Usage Report');
    console.log('==============================\n');
    
    // Executive Summary
    console.log('🎯 Executive Summary:');
    const adoptionRate = this.calculateAdoptionRate();
    console.log(`   Infrastructure Adoption Rate: ${adoptionRate}%`);
    console.log(`   Total Files Analyzed: ${this.stats.totalFiles}`);
    console.log(`   Files Using Infrastructure: ${this.stats.infrastructureFiles}`);
    console.log(`   Files with Custom Implementations: ${this.stats.customImplementations}`);
    console.log(`   Migration Candidates: ${this.stats.migrationCandidates}`);
    console.log('');

    // Component Usage Analysis
    console.log('🧩 Component Usage Analysis:');
    const componentUsage = this.analyzeComponentUsage();
    Object.entries(componentUsage).forEach(([component, usage]) => {
      console.log(`   ${component}: ${usage.count} files (${usage.percentage}%)`);
    });
    console.log('');

    // Top Migration Opportunities
    console.log('🔄 Top Migration Opportunities:');
    const topMigrations = this.reportData.migrations
      .sort((a, b) => b.opportunities.length - a.opportunities.length)
      .slice(0, 5);

    topMigrations.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.file}`);
      migration.opportunities.forEach(opp => {
        console.log(`      • ${opp.description} (${opp.priority} priority)`);
      });
    });
    console.log('');

    // Module Breakdown
    console.log('📁 Module Breakdown:');
    const moduleStats = this.analyzeModuleStats();
    Object.entries(moduleStats).forEach(([module, stats]) => {
      console.log(`   ${module}:`);
      console.log(`     Files: ${stats.files}`);
      console.log(`     Infrastructure Usage: ${stats.adoption}%`);
      console.log(`     Migration Candidates: ${stats.candidates}`);
    });
    console.log('');

    // Recommendations
    this.generateRecommendations(adoptionRate);

    // Save detailed JSON report
    const reportPath = path.join(__dirname, '../reports/infrastructure-usage-report.json');
    await this.ensureDirectoryExists(path.dirname(reportPath));
    
    const detailedReport = {
      timestamp,
      summary: {
        adoptionRate,
        totalFiles: this.stats.totalFiles,
        infrastructureFiles: this.stats.infrastructureFiles,
        customImplementations: this.stats.customImplementations,
        migrationCandidates: this.stats.migrationCandidates
      },
      componentUsage,
      moduleStats,
      migrations: this.reportData.migrations,
      files: this.reportData.files
    };

    await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  calculateAdoptionRate() {
    if (this.stats.totalFiles === 0) return 0;
    return ((this.stats.infrastructureFiles / this.stats.totalFiles) * 100).toFixed(1);
  }

  analyzeComponentUsage() {
    const usage = {};
    
    this.reportData.files.forEach(file => {
      file.infrastructureUsage.forEach(component => {
        if (!usage[component]) {
          usage[component] = { count: 0, percentage: 0 };
        }
        usage[component].count++;
      });
    });

    // Calculate percentages
    Object.keys(usage).forEach(component => {
      usage[component].percentage = ((usage[component].count / this.stats.totalFiles) * 100).toFixed(1);
    });

    return usage;
  }

  analyzeModuleStats() {
    const modules = {};
    
    this.reportData.files
      .filter(file => file.type === 'module')
      .forEach(file => {
        const moduleName = file.path.split('/')[1] || 'unknown';
        
        if (!modules[moduleName]) {
          modules[moduleName] = {
            files: 0,
            infrastructureFiles: 0,
            candidates: 0
          };
        }
        
        modules[moduleName].files++;
        if (file.infrastructureUsage.length > 0) {
          modules[moduleName].infrastructureFiles++;
        }
        if (file.migrationOpportunities.length > 0) {
          modules[moduleName].candidates++;
        }
      });

    // Calculate adoption rates
    Object.keys(modules).forEach(module => {
      const stats = modules[module];
      stats.adoption = stats.files > 0 
        ? ((stats.infrastructureFiles / stats.files) * 100).toFixed(1)
        : 0;
    });

    return modules;
  }

  generateRecommendations(adoptionRate) {
    console.log('💡 Strategic Recommendations:');
    console.log('');

    if (adoptionRate < 40) {
      console.log('🚨 CRITICAL ACTION REQUIRED:');
      console.log('   1. Immediate infrastructure migration initiative');
      console.log('   2. Stop all new custom component development');
      console.log('   3. Mandatory architecture training for team');
      console.log('   4. Weekly migration progress reviews');
    } else if (adoptionRate < 70) {
      console.log('⚠️  ACCELERATED MIGRATION NEEDED:');
      console.log('   1. Prioritize high-impact migration opportunities');
      console.log('   2. Implement stricter pre-commit validation');
      console.log('   3. Create migration templates and tools');
      console.log('   4. Assign architecture champions per module');
    } else if (adoptionRate < 90) {
      console.log('✅ GOOD PROGRESS - CONTINUE MOMENTUM:');
      console.log('   1. Focus on remaining migration candidates');
      console.log('   2. Strengthen governance processes');
      console.log('   3. Share success stories and best practices');
      console.log('   4. Monitor for regression prevention');
    } else {
      console.log('🎉 EXCELLENT INFRASTRUCTURE ADOPTION:');
      console.log('   1. Maintain current high standards');
      console.log('   2. Become architecture reference for other teams');
      console.log('   3. Continuously improve infrastructure components');
      console.log('   4. Mentor other teams on architecture patterns');
    }

    console.log('');
    console.log('📋 Immediate Action Items:');
    console.log('   • Review top migration opportunities');
    console.log('   • Schedule architecture review sessions');
    console.log('   • Update development guidelines');
    console.log('   • Run architecture validation in CI/CD');
    console.log('');
  }

  async saveMigrationPlan() {
    const migrationPlan = {
      generated: new Date().toISOString(),
      summary: {
        totalCandidates: this.stats.migrationCandidates,
        highPriority: this.reportData.migrations.filter(m => 
          m.opportunities.some(o => o.priority === 'high')
        ).length,
        estimatedEffort: this.calculateTotalEffort()
      },
      phases: this.createMigrationPhases(),
      candidates: this.reportData.migrations
    };

    const planPath = path.join(__dirname, '../reports/migration-plan.json');
    await this.ensureDirectoryExists(path.dirname(planPath));
    await fs.writeFile(planPath, JSON.stringify(migrationPlan, null, 2));
    
    console.log(`📋 Migration plan saved to: ${planPath}`);
  }

  calculateTotalEffort() {
    const efforts = { low: 0, medium: 0, high: 0 };
    
    this.reportData.migrations.forEach(migration => {
      migration.opportunities.forEach(opp => {
        efforts[opp.estimatedEffort || 'medium']++;
      });
    });

    return efforts;
  }

  createMigrationPhases() {
    const highPriority = [];
    const mediumPriority = [];
    const lowPriority = [];

    this.reportData.migrations.forEach(migration => {
      const hasHigh = migration.opportunities.some(o => o.priority === 'high');
      const hasMedium = migration.opportunities.some(o => o.priority === 'medium');
      
      if (hasHigh) {
        highPriority.push(migration.file);
      } else if (hasMedium) {
        mediumPriority.push(migration.file);
      } else {
        lowPriority.push(migration.file);
      }
    });

    return {
      phase1: { name: 'Critical Migrations', files: highPriority },
      phase2: { name: 'Standard Migrations', files: mediumPriority },
      phase3: { name: 'Cleanup and Polish', files: lowPriority }
    };
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory already exists or other error - ignore
    }
  }
}

// Run report generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const reporter = new InfrastructureUsageReporter();
  reporter.generateReport().catch(console.error);
}

export default InfrastructureUsageReporter;