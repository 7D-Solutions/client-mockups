import React from 'react';
import { Icon } from '../../../infrastructure/components';

export function TestIcons() {
  const testIcons = [
    'sign-out-alt',
    'sign-in-alt', 
    'check-circle',
    'times-circle',
    'exchange-alt',
    'cog',
    'users',
    'map-marker-alt',
    'history'
  ];

  return (
    <div style={{ padding: 'var(--space-5)' }}>
      <h3>Icon Test</h3>
      {testIcons.map(iconName => (
        <div key={iconName} style={{ margin: 'var(--space-2) 0' }}>
          <Icon name={iconName as any} /> {iconName}
        </div>
      ))}
    </div>
  );
}