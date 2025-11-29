# React Component Template

**Category**: Implementation Templates
**Purpose**: Standard template for creating new React components
**Last Updated**: 2025-11-07

---

## Overview

This template provides the standard structure for creating new React components in the Fire-Proof ERP application. Follow this pattern to ensure consistency, type safety, and proper integration with the infrastructure.

**When to Use**:
- Creating new reusable components
- Building module-specific UI components
- Extending infrastructure components

**Location Pattern**:
- Infrastructure components: `/frontend/src/infrastructure/components/`
- Module components: `/frontend/src/modules/{module}/components/`

---

## Basic Component Template

### Component File Structure

```
ComponentName/
├── ComponentName.tsx           # Component implementation
├── ComponentName.module.css    # CSS Module (if needed)
├── index.ts                    # Export file
└── ComponentName.stories.tsx   # Storybook (optional)
```

### Component Implementation

**File**: `ComponentName.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Button, LoadingSpinner } from '../../../infrastructure/components';
import { useLogger } from '../../../infrastructure/utils/logger';
import styles from './ComponentName.module.css';

/**
 * Props interface for ComponentName
 *
 * TODO: Add comprehensive prop descriptions
 */
export interface ComponentNameProps {
  /**
   * TODO: Describe this prop
   */
  title: string;

  /**
   * TODO: Describe this prop
   */
  data?: any;

  /**
   * Callback when action is performed
   */
  onAction?: (result: any) => void;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Show loading state
   */
  loading?: boolean;

  /**
   * Disable component
   */
  disabled?: boolean;
}

/**
 * ComponentName - TODO: Brief component description
 *
 * TODO: Detailed component description explaining:
 * - Primary purpose
 * - Use cases
 * - Key features
 * - Integration requirements
 *
 * @example
 * ```tsx
 * <ComponentName
 *   title="Example Title"
 *   data={myData}
 *   onAction={handleAction}
 * />
 * ```
 */
export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  data,
  onAction,
  className = '',
  loading = false,
  disabled = false
}) => {
  // Logger for component
  const logger = useLogger('ComponentName');

  // Local state
  const [internalState, setInternalState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    // TODO: Add effect logic
    logger.info('Component mounted', { title });

    return () => {
      // Cleanup
      logger.info('Component unmounting');
    };
  }, []);

  // Event handlers
  const handleClick = () => {
    try {
      logger.info('Action triggered', { title });

      // TODO: Add business logic
      const result = { success: true };

      onAction?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.errorWithStack('Action failed', err instanceof Error ? err : new Error(errorMessage));
      setError(errorMessage);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <Button onClick={() => setError(null)} variant="secondary">
          Dismiss
        </Button>
      </div>
    );
  }

  // Main render
  return (
    <div className={`${styles.container} ${className}`}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.content}>
        {/* TODO: Add component content */}
        <p>Component content goes here</p>
      </div>

      <div className={styles.actions}>
        <Button
          onClick={handleClick}
          disabled={disabled}
          variant="primary"
        >
          Perform Action
        </Button>
      </div>
    </div>
  );
};
```

### CSS Module Template

**File**: `ComponentName.module.css`

```css
/* ComponentName styles */

.container {
  /* Layout */
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  /* Spacing */
  padding: var(--space-6);

  /* Visual */
  background: var(--color-background-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);

  /* Typography */
  font-family: var(--font-family-base);
}

.title {
  /* Typography */
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.content {
  /* Layout */
  flex: 1;

  /* Typography */
  color: var(--color-text-secondary);
}

.actions {
  /* Layout */
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);

  /* Spacing */
  margin-top: var(--space-4);
}

.loadingContainer {
  /* Layout */
  display: flex;
  justify-content: center;
  align-items: center;

  /* Sizing */
  min-height: 200px;
}

.errorContainer {
  /* Layout */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);

  /* Spacing */
  padding: var(--space-6);

  /* Visual */
  background: var(--color-background-error);
  border: 1px solid var(--color-border-error);
  border-radius: var(--radius-md);
}

.errorMessage {
  /* Typography */
  color: var(--color-text-error);
  font-weight: var(--font-weight-medium);
  margin: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    padding: var(--space-4);
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
  }
}
```

### Export File

**File**: `index.ts`

```typescript
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName';
```

---

## Advanced Component Patterns

### Component with Form

```typescript
import React, { useState } from 'react';
import { Button, FormInput, FormSection, FormCheckbox } from '../../../infrastructure/components';
import { useLogger } from '../../../infrastructure/utils/logger';
import styles from './ComponentName.module.css';

export interface FormData {
  name: string;
  email: string;
  acceptTerms: boolean;
}

export interface FormComponentProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
}

export const FormComponent: React.FC<FormComponentProps> = ({
  initialData,
  onSubmit
}) => {
  const logger = useLogger('FormComponent');

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    acceptTerms: initialData?.acceptTerms || false
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      logger.warn('Form validation failed', { errors });
      return;
    }

    try {
      setIsSubmitting(true);
      logger.info('Submitting form', { formData });

      await onSubmit(formData);

      logger.info('Form submitted successfully');
    } catch (error) {
      logger.errorWithStack('Form submission failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <FormSection title="User Information">
        <div className={styles.formGrid}>
          <FormInput
            label="Name"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            error={errors.name}
            required
          />

          <FormInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            error={errors.email}
            required
          />
        </div>
      </FormSection>

      <FormCheckbox
        label="I accept the terms and conditions"
        checked={formData.acceptTerms}
        onChange={(checked) => setFormData({ ...formData, acceptTerms: checked })}
        error={errors.acceptTerms}
      />

      <div className={styles.actions}>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Submit
        </Button>
      </div>
    </form>
  );
};
```

### Component with Data Fetching

```typescript
import React, { useState, useEffect } from 'react';
import { LoadingSpinner, Alert } from '../../../infrastructure/components';
import { apiClient } from '../../../infrastructure/api/client';
import { useLogger } from '../../../infrastructure/utils/logger';
import styles from './ComponentName.module.css';

export interface DataItem {
  id: string;
  name: string;
  // TODO: Add other fields
}

export interface DataListComponentProps {
  category?: string;
  onItemClick?: (item: DataItem) => void;
}

export const DataListComponent: React.FC<DataListComponentProps> = ({
  category,
  onItemClick
}) => {
  const logger = useLogger('DataListComponent');

  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [category]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Loading data', { category });

      const response = await apiClient.get<DataItem[]>('/api/data', {
        params: { category }
      });

      setData(response.data);
      logger.info('Data loaded successfully', { count: response.data.length });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      logger.errorWithStack('Failed to load data', err instanceof Error ? err : new Error(errorMessage));
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert type="error" title="Error">
        {error}
      </Alert>
    );
  }

  if (data.length === 0) {
    return (
      <Alert type="info" title="No Data">
        No items found
      </Alert>
    );
  }

  return (
    <div className={styles.dataList}>
      {data.map((item) => (
        <div
          key={item.id}
          className={styles.dataItem}
          onClick={() => onItemClick?.(item)}
        >
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  );
};
```

### Component with Context

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLogger } from '../../../infrastructure/utils/logger';

interface ComponentContextValue {
  value: string;
  setValue: (value: string) => void;
  isActive: boolean;
}

const ComponentContext = createContext<ComponentContextValue | undefined>(undefined);

export interface ComponentProviderProps {
  children: ReactNode;
  initialValue?: string;
}

export const ComponentProvider: React.FC<ComponentProviderProps> = ({
  children,
  initialValue = ''
}) => {
  const logger = useLogger('ComponentProvider');
  const [value, setValue] = useState(initialValue);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    logger.info('Provider initialized', { initialValue });
    setIsActive(true);

    return () => {
      logger.info('Provider cleanup');
      setIsActive(false);
    };
  }, []);

  const contextValue: ComponentContextValue = {
    value,
    setValue,
    isActive
  };

  return (
    <ComponentContext.Provider value={contextValue}>
      {children}
    </ComponentContext.Provider>
  );
};

export const useComponent = (): ComponentContextValue => {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error('useComponent must be used within ComponentProvider');
  }
  return context;
};
```

---

## Component Testing

### Unit Test Template

**File**: `ComponentName.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders with title', () => {
    render(<ComponentName title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onAction when button clicked', () => {
    const handleAction = jest.fn();

    render(
      <ComponentName
        title="Test"
        onAction={handleAction}
      />
    );

    fireEvent.click(screen.getByText('Perform Action'));

    expect(handleAction).toHaveBeenCalledWith({ success: true });
  });

  it('shows loading state', () => {
    render(<ComponentName title="Test" loading={true} />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('disables button when disabled prop is true', () => {
    render(<ComponentName title="Test" disabled={true} />);

    expect(screen.getByText('Perform Action')).toBeDisabled();
  });

  it('handles errors gracefully', async () => {
    const handleAction = jest.fn().mockRejectedValue(new Error('Test error'));

    render(
      <ComponentName
        title="Test"
        onAction={handleAction}
      />
    );

    fireEvent.click(screen.getByText('Perform Action'));

    await waitFor(() => {
      expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });
  });
});
```

---

## Best Practices

### 1. Use Infrastructure Components

```typescript
// ❌ BAD - Raw HTML
<button onClick={handleClick}>Click Me</button>
<input type="text" value={name} onChange={(e) => setName(e.target.value)} />

// ✅ GOOD - Infrastructure components
<Button onClick={handleClick}>Click Me</Button>
<FormInput value={name} onChange={setName} />
```

### 2. Proper TypeScript Types

```typescript
// ❌ BAD - Any types
const [data, setData] = useState<any>(null);

// ✅ GOOD - Specific types
interface User {
  id: string;
  name: string;
  email: string;
}
const [user, setUser] = useState<User | null>(null);
```

### 3. Use Logger

```typescript
// ❌ BAD - Console.log
console.log('Component mounted');

// ✅ GOOD - Logger
const logger = useLogger('ComponentName');
logger.info('Component mounted', { props });
```

### 4. Error Handling

```typescript
// ❌ BAD - Silent failure
try {
  await apiClient.post('/api/data', data);
} catch (error) {
  // Nothing
}

// ✅ GOOD - Proper error handling
try {
  await apiClient.post('/api/data', data);
  logger.info('Data saved successfully');
} catch (error) {
  logger.errorWithStack('Failed to save data', error instanceof Error ? error : new Error(String(error)));
  setError(error instanceof Error ? error.message : 'Save failed');
}
```

### 5. CSS Modules

```typescript
// ❌ BAD - Inline styles
<div style={{ padding: '20px', background: '#fff' }}>

// ✅ GOOD - CSS Modules with design tokens
<div className={styles.container}>

// ComponentName.module.css
.container {
  padding: var(--space-5);
  background: var(--color-background-primary);
}
```

### 6. Accessibility

```tsx
// ✅ GOOD - Semantic HTML and ARIA
<button
  onClick={handleClick}
  aria-label="Close dialog"
  aria-pressed={isActive}
>
  <Icon name="close" aria-hidden="true" />
</button>
```

---

## Checklist

Before submitting your component:

- [ ] Component file created with proper naming (PascalCase)
- [ ] TypeScript interfaces defined for props
- [ ] JSDoc comments added for component and props
- [ ] Logger imported and used for events
- [ ] Infrastructure components used (no raw HTML)
- [ ] CSS Module created with design tokens
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Accessibility attributes added
- [ ] Unit tests written
- [ ] Export file (index.ts) created
- [ ] Component added to module/infrastructure index
- [ ] Responsive design considered

---

## Reference

### Related Documentation

- [UI Components System](../01-Frontend-Standards/01-UI-Components-System.md)
- [Styling Architecture](../01-Frontend-Standards/03-Styling-Architecture.md)
- [Component Usage Examples](../01-Frontend-Standards/05-Component-Usage-Examples.md)

### Design Tokens

- Spacing: `--space-{1-8}` (4px increments)
- Colors: `--color-{category}-{variant}`
- Typography: `--font-{size|weight|family}-{value}`
- Radius: `--radius-{sm|md|lg|full}`

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
