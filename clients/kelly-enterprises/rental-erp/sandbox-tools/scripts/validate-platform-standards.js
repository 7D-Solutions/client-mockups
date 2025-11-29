#!/usr/bin/env node

/**
 * Platform Standards Validator
 *
 * Purpose: Discover what has been standardized and find violations
 * Output: Accurate data for documentation generation
 *
 * Usage: node sandbox-tools/scripts/validate-platform-standards.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const FRONTEND_ROOT = path.join(ROOT, 'frontend/src');
const BACKEND_ROOT = path.join(ROOT, 'backend/src');

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  standards: {
    frontend: {},
    backend: {}
  },
  violations: [],
  compliance: {},
  gaps: []
};

/**
 * Discover standardized frontend components
 */
function discoverFrontendStandards() {
  console.log('📚 Discovering frontend standards...');

  const componentIndexPath = path.join(FRONTEND_ROOT, 'infrastructure/components/index.ts');

  if (!fs.existsSync(componentIndexPath)) {
    console.error('❌ Component index not found:', componentIndexPath);
    return {};
  }

  const content = fs.readFileSync(componentIndexPath, 'utf8');

  // Parse exports
  const exportPattern = /export\s+{\s*([^}]+)\s*}/g;
  const exports = [];
  let match;

  while ((match = exportPattern.exec(content)) !== null) {
    const items = match[1]
      .split(',')
      .map(item => item.trim())
      .filter(item => item && !item.startsWith('//'));
    exports.push(...items);
  }

  // Also catch individual exports
  const singleExportPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  const reExports = [];
  while ((match = singleExportPattern.exec(content)) !== null) {
    reExports.push(match[1]);
  }

  console.log(`  ✓ Found ${exports.length} exported components`);

  return {
    components: exports,
    source: 'infrastructure/components/index.ts',
    count: exports.length
  };
}

/**
 * Discover standardized backend utilities
 */
function discoverBackendStandards() {
  console.log('📚 Discovering backend standards...');

  const standards = {
    repositories: [],
    middleware: [],
    utilities: []
  };

  // Find all repositories extending BaseRepository
  const reposPath = path.join(BACKEND_ROOT, 'modules');

  try {
    const repos = execSync(
      `find "${reposPath}" -name "*Repository.js" -type f`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    for (const repo of repos) {
      const content = fs.readFileSync(repo, 'utf8');
      if (content.includes('extends BaseRepository')) {
        standards.repositories.push(path.relative(BACKEND_ROOT, repo));
      }
    }

    console.log(`  ✓ Found ${standards.repositories.length} repositories using BaseRepository`);
  } catch (error) {
    console.error('  ⚠️  Error scanning repositories:', error.message);
  }

  // Find infrastructure middleware
  const middlewarePath = path.join(BACKEND_ROOT, 'infrastructure/middleware');
  if (fs.existsSync(middlewarePath)) {
    standards.middleware = fs.readdirSync(middlewarePath)
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace('.js', ''));

    console.log(`  ✓ Found ${standards.middleware.length} middleware modules`);
  }

  // Check for specific utilities
  const utilPaths = [
    'infrastructure/utils/pagination.js',
    'infrastructure/utils/logger.js',
    'infrastructure/audit/auditService.js'
  ];

  for (const utilPath of utilPaths) {
    const fullPath = path.join(BACKEND_ROOT, utilPath);
    if (fs.existsSync(fullPath)) {
      standards.utilities.push(utilPath);
    }
  }

  console.log(`  ✓ Found ${standards.utilities.length} standard utilities`);

  return standards;
}

/**
 * Find violations - direct fetch() calls instead of apiClient
 */
function findFetchViolations() {
  console.log('\n🔍 Scanning for fetch() violations...');

  const violations = [];
  const modulesPath = path.join(FRONTEND_ROOT, 'modules');

  try {
    // Find all .tsx and .ts files in modules
    const files = execSync(
      `find "${modulesPath}" -type f \\( -name "*.tsx" -o -name "*.ts" \\)`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      // Check if file uses apiClient (correct pattern)
      const usesApiClient = content.includes('apiClient');

      // Find fetch() calls
      lines.forEach((line, index) => {
        // Match actual fetch() calls, not refetch() or other function calls
        const hasFetchCall = /\bfetch\s*\(/.test(line);

        if (hasFetchCall && !line.trim().startsWith('//')) {
          // Exclude service files that correctly use apiClient elsewhere
          if (file.includes('/services/') && usesApiClient) {
            return; // Skip - service file using apiClient is correct
          }

          violations.push({
            type: 'direct_fetch',
            file: path.relative(ROOT, file),
            line: index + 1,
            code: line.trim(),
            severity: 'critical',
            suggestion: 'Use apiClient from infrastructure/api/client'
          });
        }
      });
    }

    console.log(`  ${violations.length > 0 ? '❌' : '✓'} Found ${violations.length} direct fetch() calls`);
  } catch (error) {
    console.error('  ⚠️  Error scanning for fetch:', error.message);
  }

  return violations;
}

/**
 * Find violations - window.confirm/alert instead of Modal
 */
function findWindowDialogViolations() {
  console.log('🔍 Scanning for window.confirm/alert violations...');

  const violations = [];
  const modulesPath = path.join(FRONTEND_ROOT, 'modules');

  try {
    const files = execSync(
      `find "${modulesPath}" -type f \\( -name "*.tsx" -o -name "*.ts" \\)`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//')) return;

        if (line.includes('window.confirm') || line.includes('window.alert')) {
          violations.push({
            type: 'window_dialog',
            file: path.relative(ROOT, file),
            line: index + 1,
            code: line.trim(),
            severity: 'high',
            suggestion: 'Use Modal component from infrastructure/components'
          });
        }
      });
    }

    console.log(`  ${violations.length > 0 ? '❌' : '✓'} Found ${violations.length} window.confirm/alert calls`);
  } catch (error) {
    console.error('  ⚠️  Error scanning for window dialogs:', error.message);
  }

  return violations;
}

/**
 * Find violations - console.log instead of logger
 */
function findConsoleLogViolations() {
  console.log('🔍 Scanning for console.log violations (backend)...');

  const violations = [];
  const modulesPath = path.join(BACKEND_ROOT, 'modules');

  try {
    const files = execSync(
      `find "${modulesPath}" -type f -name "*.js"`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if ((line.includes('console.log') || line.includes('console.error')) &&
            !line.trim().startsWith('//')) {
          violations.push({
            type: 'console_log',
            file: path.relative(ROOT, file),
            line: index + 1,
            code: line.trim(),
            severity: 'medium',
            suggestion: 'Use logger from infrastructure/utils/logger'
          });
        }
      });
    }

    console.log(`  ${violations.length > 0 ? '❌' : '✓'} Found ${violations.length} console.log calls`);
  } catch (error) {
    console.error('  ⚠️  Error scanning for console.log:', error.message);
  }

  return violations;
}

/**
 * Find violations - raw HTML buttons/forms instead of components
 */
function findRawHTMLViolations() {
  console.log('🔍 Scanning for raw HTML element violations...');

  const violations = [];
  const modulesPath = path.join(FRONTEND_ROOT, 'modules');

  try {
    const files = execSync(
      `find "${modulesPath}" -type f -name "*.tsx"`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);

    const patterns = [
      { regex: /<button[^>]*>/gi, component: 'Button', severity: 'high' },
      { regex: /<input[^>]*type="text"/gi, component: 'FormInput', severity: 'medium' },
      { regex: /<input[^>]*type="checkbox"/gi, component: 'FormCheckbox', severity: 'medium' },
      { regex: /<textarea[^>]*>/gi, component: 'FormTextarea', severity: 'medium' },
      { regex: /<table[^>]*>/gi, component: 'DataTable', severity: 'high' }
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      // Check if file imports infrastructure components
      const importsInfrastructure = content.includes('infrastructure/components');

      patterns.forEach(({ regex, component, severity }) => {
        lines.forEach((line, index) => {
          if (regex.test(line) && !line.trim().startsWith('//')) {
            violations.push({
              type: 'raw_html',
              element: component,
              file: path.relative(ROOT, file),
              line: index + 1,
              code: line.trim().substring(0, 80),
              severity,
              suggestion: `Use ${component} from infrastructure/components`
            });
          }
        });
      });
    }

    console.log(`  ${violations.length > 0 ? '❌' : '✓'} Found ${violations.length} raw HTML elements`);
  } catch (error) {
    console.error('  ⚠️  Error scanning for raw HTML:', error.message);
  }

  return violations;
}

/**
 * Calculate compliance metrics
 */
function calculateCompliance(violations) {
  console.log('\n📊 Calculating compliance metrics...');

  const violationsByType = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {});

  const violationsBySeverity = violations.reduce((acc, v) => {
    acc[v.severity] = (acc[v.severity] || 0) + 1;
    return acc;
  }, {});

  // Calculate module-level compliance
  const violationsByModule = violations.reduce((acc, v) => {
    const module = v.file.split('/')[2]; // Extract module name from path
    if (module) {
      acc[module] = (acc[module] || []);
      acc[module].push(v);
    }
    return acc;
  }, {});

  return {
    totalViolations: violations.length,
    byType: violationsByType,
    bySeverity: violationsBySeverity,
    byModule: Object.entries(violationsByModule).map(([module, viols]) => ({
      module,
      violations: viols.length,
      types: [...new Set(viols.map(v => v.type))]
    })).sort((a, b) => b.violations - a.violations)
  };
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Platform Standards Validator\n');
  console.log('═'.repeat(60));

  // Discover standards
  results.standards.frontend = discoverFrontendStandards();
  results.standards.backend = discoverBackendStandards();

  // Find violations
  console.log('\n═'.repeat(60));
  results.violations = [
    ...findFetchViolations(),
    ...findWindowDialogViolations(),
    ...findConsoleLogViolations(),
    ...findRawHTMLViolations()
  ];

  // Calculate compliance
  console.log('═'.repeat(60));
  results.compliance = calculateCompliance(results.violations);

  // Output results
  const outputPath = path.join(__dirname, 'validation-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log('\n✅ Validation complete!');
  console.log(`📄 Results saved to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total violations: ${results.violations.length}`);
  console.log(`   Critical: ${results.compliance.bySeverity.critical || 0}`);
  console.log(`   High: ${results.compliance.bySeverity.high || 0}`);
  console.log(`   Medium: ${results.compliance.bySeverity.medium || 0}`);

  if (results.compliance.byModule.length > 0) {
    console.log(`\n   Top violators:`);
    results.compliance.byModule.slice(0, 5).forEach(m => {
      console.log(`     - ${m.module}: ${m.violations} violations`);
    });
  }

  console.log('\n═'.repeat(60));
}

// Run
main();
