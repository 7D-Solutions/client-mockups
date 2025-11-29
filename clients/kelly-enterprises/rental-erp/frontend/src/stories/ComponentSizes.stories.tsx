import type { Meta, StoryObj } from '@storybook/react';
import { Button, Tag, Badge, FormInput, FormSelect, FormTextarea } from '../infrastructure';
import { useState } from 'react';

const meta = {
  title: 'Design System/Component Sizes',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const formSizes = ['sm', 'md', 'lg'] as const;

// Helper component for form controls
function FormControlDemo({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');

  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
      <Button size={size}>
        Button {size.toUpperCase()}
      </Button>
      <FormInput
        fieldSize={size}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={`Input ${size.toUpperCase()}`}
      />
      <FormSelect
        fieldSize={size}
        value={selectValue}
        onChange={(e) => setSelectValue(e.target.value)}
      >
        <option value="">Select {size.toUpperCase()}</option>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </FormSelect>
    </div>
  );
}

export const SizingSystem: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Interactive Controls (Buttons) */}
      <section>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Interactive Controls</h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          {sizes.map((size) => (
            <Button key={size} size={size}>
              Button {size.toUpperCase()}
            </Button>
          ))}
        </div>
      </section>

      {/* Inline Elements (Tags & Badges) */}
      <section>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Inline Elements</h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          {sizes.map((size) => (
            <Tag key={size} size={size} variant="primary">
              Tag {size.toUpperCase()}
            </Tag>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          {sizes.map((size) => (
            <Badge key={size} size={size} variant="primary" count>
              99+
            </Badge>
          ))}
        </div>
      </section>

      {/* Form Controls aligned with Buttons */}
      <section>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Form Controls + Button Alignment</h2>
        {formSizes.map((size) => (
          <div key={size} style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Size: {size.toUpperCase()}
            </h3>
            <FormControlDemo size={size} />
          </div>
        ))}
      </section>

      {/* Visual Comparison */}
      <section>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Visual Size Comparison</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-4)', alignItems: 'center' }}>
          <span>Button + Tag:</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button size="md">Action</Button>
            <Tag size="md" variant="success">Active</Tag>
            <Badge size="md" variant="danger" count>3</Badge>
          </div>
          
          <span>Form + Button:</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <FormInput fieldSize="md" value="" onChange={() => {}} placeholder="Search..." />
            <Button size="md">Search</Button>
          </div>
        </div>
      </section>

      {/* Color Variants */}
      <section>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Color Variants</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {(['success', 'warning', 'danger', 'info', 'primary', 'secondary', 'default'] as const).map((variant) => (
            <Tag key={variant} variant={variant}>
              {variant}
            </Tag>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
          {(['success', 'warning', 'danger', 'info', 'primary', 'secondary', 'default', 'alert'] as const).map((variant) => (
            <Badge key={variant} variant={variant} count>
              9
            </Badge>
          ))}
        </div>
      </section>
    </div>
  ),
};