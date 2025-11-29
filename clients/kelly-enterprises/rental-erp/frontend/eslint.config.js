import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// Custom rule for infrastructure component enforcement
const infraCustomRules = {
  'prefer-infrastructure-components': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Enforce usage of infrastructure components over custom implementations',
        category: 'Best Practices',
      },
      fixable: null,
      schema: [],
      messages: {
        preferInfrastructureModal: 'Use the infrastructure Modal component instead of custom modal implementation',
        customOverlayDetected: 'Custom overlay detected. Consider using infrastructure Modal component',
      },
    },
    create(context) {
      return {
        JSXElement(node) {
          // Detect custom modal implementations
          if (node.openingElement.name.name === 'div') {
            const classNameAttr = node.openingElement.attributes.find(
              attr => attr.name && attr.name.name === 'className'
            );
            
            if (classNameAttr && classNameAttr.value) {
              const className = classNameAttr.value.value || '';
              const modalPatterns = /modal|overlay|backdrop|dialog/i;
              
              if (modalPatterns.test(className)) {
                context.report({
                  node,
                  messageId: 'customOverlayDetected',
                });
              }
            }
          }
          
          // Check for inline styles that suggest modal usage
          const styleAttr = node.openingElement.attributes.find(
            attr => attr.name && attr.name.name === 'style'
          );
          
          if (styleAttr && styleAttr.value && styleAttr.value.expression) {
            const styleProps = styleAttr.value.expression.properties || [];
            const hasFixedPosition = styleProps.some(prop => 
              prop.key && prop.key.name === 'position' && 
              prop.value && prop.value.value === 'fixed'
            );
            
            if (hasFixedPosition) {
              context.report({
                node,
                messageId: 'customOverlayDetected',
              });
            }
          }
        },
      };
    },
  },

  'no-hardcoded-colors': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Prevent hardcoded color values, enforce CSS custom properties',
        category: 'Best Practices',
      },
      schema: [],
      messages: {
        noHardcodedColors: 'Use CSS custom properties instead of hardcoded colors',
      },
    },
    create(context) {
      return {
        Literal(node) {
          if (typeof node.value === 'string') {
            const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|rgb\(|rgba\(|hsl\(|hsla\(/;
            if (colorPattern.test(node.value)) {
              context.report({
                node,
                messageId: 'noHardcodedColors',
              });
            }
          }
        },
      };
    },
  },

  'no-hardcoded-spacing': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Prevent hardcoded spacing values, enforce CSS spacing variables (--space-*)',
        category: 'Best Practices',
      },
      schema: [],
      messages: {
        noHardcodedSpacing: 'Use CSS spacing variables (var(--space-*)) instead of hardcoded spacing. For {{value}}, use {{suggestion}}',
      },
    },
    create(context) {
      const spacingMap = {
        '2px': 'var(--space-0)',
        '4px': 'var(--space-1)',
        '8px': 'var(--space-2)',
        '12px': 'var(--space-3)',
        '16px': 'var(--space-4)',
        '20px': 'var(--space-5)',
        '24px': 'var(--space-6)',
        '32px': 'var(--space-7)',
        '48px': 'var(--space-8)',
        '64px': 'var(--space-9)',
      };

      return {
        Property(node) {
          // Check if property is a spacing property (padding, margin, gap, etc.)
          const spacingProps = ['padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                                'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                                'gap', 'rowGap', 'columnGap'];

          if (node.key && node.key.name && spacingProps.includes(node.key.name)) {
            // Check if value is a literal with px/rem
            if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
              const spacingPattern = /^(\d+)(px|rem)$/;
              const match = node.value.value.match(spacingPattern);

              if (match) {
                const value = node.value.value;
                const suggestion = spacingMap[value] || 'a CSS spacing variable (--space-0 to --space-9)';

                context.report({
                  node: node.value,
                  messageId: 'noHardcodedSpacing',
                  data: {
                    value,
                    suggestion
                  }
                });
              }
            }
          }
        },
      };
    },
  },

  'prefer-form-section': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Enforce usage of FormSection component for form sections instead of manual styling',
        category: 'Best Practices',
      },
      schema: [],
      messages: {
        useFormSection: 'Use the FormSection component from infrastructure/components instead of manual section styling. Wrap your fields in <FormSection title="Section Title">...</FormSection>',
      },
    },
    create(context) {
      return {
        JSXElement(node) {
          // Check if this is a div with inline styles
          if (node.openingElement.name.name === 'div') {
            const styleAttr = node.openingElement.attributes.find(
              attr => attr.name && attr.name.name === 'style'
            );

            if (styleAttr && styleAttr.value && styleAttr.value.expression) {
              const styleProps = styleAttr.value.expression.properties || [];

              // Check for patterns that suggest manual form section header
              const hasTextTransform = styleProps.some(prop =>
                prop.key && prop.key.name === 'textTransform' &&
                prop.value && prop.value.value === 'uppercase'
              );

              const hasBorderBottom = styleProps.some(prop =>
                prop.key && prop.key.name === 'borderBottom'
              );

              const hasFontWeight = styleProps.some(prop =>
                prop.key && prop.key.name === 'fontWeight' &&
                prop.value && (prop.value.value === 'bold' || prop.value.value === 'var(--font-weight-bold)')
              );

              // If we detect manual section header styling, suggest FormSection
              if (hasTextTransform && hasBorderBottom && hasFontWeight) {
                context.report({
                  node,
                  messageId: 'useFormSection',
                });
              }
            }
          }
        },
      };
    },
  },

  'require-datatable-resetkey': {
    meta: {
      type: 'error',
      docs: {
        description: 'Enforce resetKey prop on all DataTable components for proper filter management',
        category: 'State Management Standards',
      },
      schema: [],
      messages: {
        missingResetKey: 'DataTable component must have a resetKey prop. Use resetKey={location.pathname} for page-level filter reset, or resetKey={searchParams.get("param") || "default"} for query param differentiation.',
      },
    },
    create(context) {
      return {
        JSXOpeningElement(node) {
          // Check if this is a DataTable component
          if (node.name && node.name.name === 'DataTable') {
            // Check if resetKey prop exists
            const hasResetKey = node.attributes.some(attr =>
              attr.type === 'JSXAttribute' &&
              attr.name &&
              attr.name.name === 'resetKey'
            );

            if (!hasResetKey) {
              context.report({
                node,
                messageId: 'missingResetKey',
              });
            }
          }
        },
      };
    },
  },

  'require-location-with-datatable': {
    meta: {
      type: 'error',
      docs: {
        description: 'Enforce useLocation import when DataTable component is used',
        category: 'State Management Standards',
      },
      schema: [],
      messages: {
        missingUseLocation: 'When using DataTable with resetKey={location.pathname}, you must import useLocation from react-router-dom',
      },
    },
    create(context) {
      let hasDataTable = false;
      let hasUseLocation = false;
      let dataTableNode = null;

      return {
        ImportDeclaration(node) {
          if (node.source.value === 'react-router-dom') {
            const hasLocationImport = node.specifiers.some(spec =>
              spec.imported && spec.imported.name === 'useLocation'
            );
            if (hasLocationImport) {
              hasUseLocation = true;
            }
          }
        },
        JSXOpeningElement(node) {
          if (node.name && node.name.name === 'DataTable') {
            hasDataTable = true;
            dataTableNode = node;
          }
        },
        'Program:exit'() {
          // Check if DataTable is used and useLocation is missing
          if (hasDataTable && !hasUseLocation && dataTableNode) {
            // Check if resetKey uses location.pathname
            const resetKeyAttr = dataTableNode.attributes.find(attr =>
              attr.type === 'JSXAttribute' &&
              attr.name &&
              attr.name.name === 'resetKey'
            );

            if (resetKeyAttr && resetKeyAttr.value) {
              const sourceCode = context.getSourceCode();
              const resetKeyValue = sourceCode.getText(resetKeyAttr.value);

              // If resetKey references location, require the import
              if (resetKeyValue.includes('location.pathname')) {
                context.report({
                  node: dataTableNode,
                  messageId: 'missingUseLocation',
                });
              }
            }
          }
        },
      };
    },
  },
};

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react,
      'react-hooks': reactHooks,
      'infrastructure': { rules: infraCustomRules }
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        React: 'readonly'
      }
    },
    rules: {
      // Console statements - warn in development
      'no-console': 'warn',
      
      // Infrastructure enforcement rules
      'infrastructure/prefer-infrastructure-components': 'error',
      'infrastructure/no-hardcoded-colors': 'warn',
      'infrastructure/no-hardcoded-spacing': 'warn',
      'infrastructure/prefer-form-section': 'error',

      // State management standardization rules
      'infrastructure/require-datatable-resetkey': 'error',
      'infrastructure/require-location-with-datatable': 'error',
      
      // Prevent custom modal imports and patterns
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/modal-base.module.css', '**/modal-base.css'],
          message: 'Use the infrastructure Modal component instead of custom modal styles'
        }, {
          group: ['**/*modal*.module.css'],
          message: 'Use the infrastructure Modal component instead of custom modal CSS modules'
        }]
      }],
      
      'no-restricted-syntax': ['error', {
        selector: 'JSXElement > JSXOpeningElement[name.name="div"][attributes.0.name.name="className"][attributes.0.value.value=/modal|overlay|backdrop/i]',
        message: 'Avoid custom modal/overlay divs. Use the infrastructure Modal component.'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='replace'][arguments.0.value='/_/g'][arguments.1.value=' ']",
        message: 'Use EquipmentRules.getDisplayName() instead of direct .replace(/_/g, " ") for equipment types'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='equipment_type'][operator='===']",
        message: 'Use EquipmentRules business methods instead of direct equipment_type comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='ownership_type'][operator='==='][right.value='employee']",
        message: 'Use EquipmentRules.canBeCheckedOut() instead of direct ownership_type checks'
      }, {
        selector: "ConditionalExpression[test.type='BinaryExpression'][test.left.property.name='status'][test.operator='===']",
        message: 'Use StatusRules.getStatusBadgeVariant() instead of direct status comparisons for badge variants'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='status'][operator='==='][right.value='checked_out']",
        message: 'Use StatusRules.isCheckedOut() instead of direct status === \"checked_out\" comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='status'][operator='==='][right.value='out_of_service']",
        message: 'Use StatusRules.isOutOfService() instead of direct status === \"out_of_service\" comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='status'][operator='==='][right.value='pending_qc']",
        message: 'Use StatusRules.isPendingQC() instead of direct status === \"pending_qc\" comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='status'][operator='==='][right.value='available']",
        message: 'Use StatusRules.isAvailable() instead of direct status === \"available\" comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='status'][operator='==='][right.value='maintenance']",
        message: 'Use StatusRules.isInMaintenance() instead of direct status === \"maintenance\" comparisons'
      }, {
        selector: "CallExpression[callee.property.name='toLowerCase'][parent.type='BinaryExpression'][parent.operator='===']",
        message: 'Use StatusRules methods instead of direct status.toLowerCase() comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='calibration_status'][operator='==='][right.value='Expired']",
        message: 'Use StatusRules.isCalibrationExpired() instead of direct calibration_status === \"Expired\" comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='calibration_status'][operator='==='][right.value='Due Soon']",
        message: 'Use StatusRules.isCalibrationDueSoon() instead of direct calibration_status === \"Due Soon\" comparisons'
      }, {
        selector: "ConditionalExpression[test.type='BinaryExpression'][test.left.property.name='calibration_status'][test.operator='===']",
        message: 'Use StatusRules.getCalibrationBadgeVariant() instead of direct calibration_status comparisons for badge variants'
      }, {
        selector: "LogicalExpression[operator='||'][left.type='BinaryExpression'][left.left.property.name='is_sealed'][left.operator='==='][left.right.value=1][right.type='BinaryExpression'][right.left.property.name='is_sealed'][right.operator='==='][right.right.value=true]",
        message: 'Use StatusRules.isSealed() instead of direct is_sealed === 1 || is_sealed === true comparisons'
      }, {
        selector: "LogicalExpression[operator='||'][left.type='BinaryExpression'][left.left.property.name='has_pending_unseal_request'][left.operator='==='][left.right.value=1][right.type='BinaryExpression'][right.left.property.name='has_pending_unseal_request'][right.operator='==='][right.right.value=true]",
        message: 'Use StatusRules.hasPendingUnsealRequest() instead of direct has_pending_unseal_request === 1 || has_pending_unseal_request === true comparisons'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='replace'][arguments.0.value='/_/g'][arguments.1.value=' ']",
        message: 'Use TextFormatRules.formatUnderscoreToSpace() instead of direct .replace(/_/g, " ") formatting'
      }, {
        selector: "BinaryExpression[operator='+'][left.type='CallExpression'][left.callee.property.name='toUpperCase'][right.type='CallExpression'][right.callee.property.name='replace']",
        message: 'Use TextFormatRules.formatToSentenceCase() instead of manual charAt().toUpperCase() + slice().replace() patterns'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='replace'][arguments.0.value='/\\\\\\\\b\\\\\\\\w/g']",
        message: 'Use TextFormatRules.formatToTitleCase() instead of direct .replace(/\\\\b\\\\w/g, ...) formatting'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='CallExpression'][callee.object.callee.property.name='split'][callee.object.arguments.0.value='_'][callee.property.name='map']",
        message: 'Use TextFormatRules.formatSettingKey() instead of manual split("_").map().join() patterns for setting keys'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='charAt'][arguments.0.value=0][parent.type='BinaryExpression'][parent.operator='+']",
        message: 'Use TextFormatRules.formatActionText() instead of manual charAt(0).toUpperCase() + slice() patterns for action formatting'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='role'][operator='==='][right.value='admin']",
        message: 'Use PermissionRules.isAdmin() instead of direct user.role === "admin" comparisons'
      }, {
        selector: "BinaryExpression[left.type='MemberExpression'][left.property.name='role'][operator='==='][right.value='super_admin']",
        message: 'Use PermissionRules.isAdmin() instead of direct user.role === "super_admin" comparisons'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='ArrayExpression'][callee.property.name='some'][arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='LogicalExpression'][arguments.0.body.operator='||']",
        message: 'Use PermissionRules.hasAdminRole() instead of manual userRoles.some() admin checking patterns'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='Identifier'][callee.property.name='includes'][arguments.0.value='gauge.manage']",
        message: 'Use PermissionRules.canManageGauges() instead of direct permissions.includes("gauge.manage") checks'
      }, {
        selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='Identifier'][callee.property.name='includes'][arguments.0.value='calibration.manage']",
        message: 'Use PermissionRules.canManageCalibration() instead of direct permissions.includes("calibration.manage") checks'
      }],
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off', // Requires parserOptions.project which slows down linting
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // React rules
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // General rules
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      'no-undef': 'off' // TypeScript handles this
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    // Allow infrastructure components to use modal patterns
    files: ['src/infrastructure/components/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'infrastructure/prefer-infrastructure-components': 'off',
      'infrastructure/no-hardcoded-colors': 'off',
      'infrastructure/no-hardcoded-spacing': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
      'react/forbid-component-props': 'off',
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Allow business rules in infrastructure business logic
    files: ['src/infrastructure/business/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Test files - less strict enforcement
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'infrastructure/prefer-infrastructure-components': 'warn',
      'no-restricted-imports': 'warn'
    }
  },
  {
    // Storybook files - allow custom patterns for demonstrations
    files: ['**/*.stories.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    rules: {
      'infrastructure/prefer-infrastructure-components': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off'
    }
  }
];