# Frontend Standards - Fire-Proof ERP Platform

**Version**: 1.0.0
**Last Updated**: 2025-11-07
**Status**: Production Standard

## Overview

This documentation defines the **mandatory** frontend standards for the Fire-Proof ERP Platform. All frontend development must adhere to these standards to ensure consistency, accessibility, security, and maintainability.

## Critical Principles

### 1. Centralized Components First
**ALL UI elements MUST use centralized infrastructure components.** Creating raw HTML elements (`<button>`, `<input>`, `<textarea>`, etc.) is **strictly prohibited**.

### 2. No Direct API Calls
**ALL HTTP requests MUST use the centralized `apiClient`.** Direct `fetch()` calls bypass authentication, error handling, and audit systems.

### 3. Modular Architecture
Each module (gauge, admin, user, inventory) is self-contained with its own:
- Pages
- Components
- Services
- Types
- State management

### 4. ERP Core Integration
Frontend modules **must** import shared services from `/erp-core/src/core/`:
- Authentication
- API client
- Navigation
- Notifications

## Documentation Structure

### Core Standards
1. **[UI Components System](./01-UI-Components-System.md)** - Centralized component library
2. **[State Management](./02-State-Management.md)** - Zustand patterns and module organization
3. **[Styling Architecture](./03-Styling-Architecture.md)** - CSS Modules and design tokens
4. **[ERP Core Integration](./04-ERP-Core-Integration.md)** - Shared services usage

### Implementation Guides
5. **[Component Usage Examples](./05-Component-Usage-Examples.md)** - Real-world examples
6. **[Migration Guide](./06-Migration-Guide.md)** - Converting legacy code to standards
7. **[Common Patterns](./07-Common-Patterns.md)** - Frequently used patterns

## Quick Reference

### Component Import Pattern
```typescript
// ✅ CORRECT - Import from centralized components
import { Button, FormInput, Modal } from '../../infrastructure/components';

// ❌ WRONG - Never create raw HTML elements
<button>Click me</button>
<input type="text" />
```

### API Client Pattern
```typescript
// ✅ CORRECT - Use centralized API client
import { apiClient } from '../../infrastructure/api/client';
const response = await apiClient.post('/auth/login', credentials);

// ❌ WRONG - Never use direct fetch
const response = await fetch('/api/auth/login', { method: 'POST' });
```

### State Management Pattern
```typescript
// ✅ CORRECT - Use Zustand store with selectors
import { useGaugeState, useGaugeActions } from '../../infrastructure/store';
const { selectedGaugeId } = useGaugeState();
const { setSelectedGauge } = useGaugeActions();

// ❌ WRONG - Don't create separate state management
const [gauge, setGauge] = useState(null);
```

### ERP Core Services Pattern
```typescript
// ✅ CORRECT - Import from ERP core
import { isAuthenticated } from '../../erp-core/src/core/auth/authService';
import { apiClient } from '../../erp-core/src/core/data/apiClient';

// ❌ WRONG - Don't duplicate ERP core functionality
const customAuth = () => { /* custom logic */ };
```

## Key Benefits

### Double-Click Protection
All `Button` components include automatic double-click prevention (1-second cooldown by default).

### Consistent Accessibility
Infrastructure components include:
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support

### Automatic Authentication
The `apiClient` automatically:
- Includes httpOnly cookies
- Handles 401 redirects
- Manages session expiration
- Provides consistent error handling

### Design System Consistency
CSS Modules ensure:
- Consistent spacing and sizing
- Unified color palette
- Standard typography
- Responsive breakpoints

## Enforcement

### Code Quality Tools
```bash
# Validate architecture rules
npm run architecture:validate

# Check infrastructure usage
npm run architecture:report

# Full validation
npm run validate:all
```

### Architecture Rules
The project includes automated enforcement via ESLint rules:
- No raw `<button>` elements (use `Button` component)
- No raw form elements (use `FormInput`, `FormCheckbox`, etc.)
- No raw section headers (use `FormSection` component)
- No direct `fetch()` calls (use `apiClient`)
- No `window.confirm()` or `window.alert()` (use `Modal` component)

### Review Checklist
Before submitting code for review:
- [ ] All buttons use `Button` component
- [ ] All form inputs use `FormInput/FormCheckbox/FormTextarea`
- [ ] All form sections use `FormSection` component
- [ ] All API calls use `apiClient`
- [ ] All modals use `Modal` component
- [ ] State management uses Zustand store
- [ ] ERP core services imported correctly
- [ ] No raw HTML elements created
- [ ] Architecture validation passes
- [ ] No TypeScript errors

## File Locations

### Infrastructure Components
```
/frontend/src/infrastructure/components/
├── Button.tsx                 # Button component
├── FormInput.tsx             # Text input component
├── FormCheckbox.tsx          # Checkbox component
├── FormTextarea.tsx          # Textarea component
├── FormSection.tsx           # Form section component
├── Modal.tsx                 # Modal/dialog component
├── SemanticButtons.tsx       # Semantic button variants
├── DataTable.tsx             # Data table component
└── index.ts                  # Component exports
```

### State Management
```
/frontend/src/infrastructure/store/
├── index.ts                  # Main Zustand store
└── moduleSync.ts             # Module synchronization
```

### API Client
```
/frontend/src/infrastructure/api/
└── client.ts                 # Centralized API client
```

### ERP Core Services
```
/erp-core/src/core/
├── auth/                     # Authentication services
├── data/                     # API client, cache, events
├── navigation/               # Navigation utilities
└── notifications/            # Notification system
```

## Support and Questions

### Documentation
- **Architecture Overview**: `/erp-core-docs/system architecture/Fireproof Docs 2.0/`
- **Component Library**: `/frontend/src/infrastructure/components/`
- **CLAUDE.md**: Project-level standards and constraints

### Getting Help
1. Review relevant documentation section
2. Check migration guide for conversion examples
3. Review real-world usage in `/frontend/src/modules/`
4. Consult architecture validation output

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-07 | Initial frontend standards documentation |

## Related Documentation
- [UI Components System](./01-UI-Components-System.md)
- [State Management](./02-State-Management.md)
- [Styling Architecture](./03-Styling-Architecture.md)
- [ERP Core Integration](./04-ERP-Core-Integration.md)
