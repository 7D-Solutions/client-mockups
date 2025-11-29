import React, { useEffect } from 'react';
import { Button, LoadingSpinner } from '../../../../../infrastructure/components';
import { EquipmentRules } from '../../../../../infrastructure/business/equipmentRules';
import { useGaugeState, useGaugeActions, useSharedActions } from '../../../../../infrastructure/store';
import { useGaugeCategoriesQuery } from '../../../hooks/useGaugeQueries';
import type { GaugeCategory } from '../../../types';

export const CategorySelectionStep: React.FC = () => {
  const { createGauge } = useGaugeState();
  const { setGaugeCategory, setCategoriesCache, setCreateGaugeStep } = useGaugeActions();
  const { addNotification } = useSharedActions();
  const { equipmentType, categoryId, categoriesCache, currentStep } = createGauge;

  // Use cached categories if available, otherwise fetch
  const cachedCategories = categoriesCache[equipmentType] || null;
  
  const { 
    data: categoriesResponse, 
    isLoading, 
    error 
  } = useGaugeCategoriesQuery(equipmentType);

  // Cache categories when they're fetched
  useEffect(() => {
    if (categoriesResponse?.data && !cachedCategories) {
      setCategoriesCache(equipmentType, categoriesResponse.data);
    }
  }, [categoriesResponse, equipmentType, cachedCategories, setCategoriesCache]);

  // Show error notification
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load categories',
        message: 'Unable to fetch categories. Please try again.'
      });
    }
  }, [error, addNotification]);

  const categories = cachedCategories || categoriesResponse?.data || [];

  const handleSelect = (category: GaugeCategory) => {
    setGaugeCategory(category.id.toString(), category.name);
    
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCreateGaugeStep(currentStep + 1);
    }, 150);
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '300px' 
      }}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
        <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>
          Failed to load categories. Please try again.
        </p>
        <Button
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>Select Category</h2>
      <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-gray-600)', textAlign: 'center' }}>
        Choose a category for your {EquipmentRules.getDisplayName({ equipment_type: equipmentType })}
      </p>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-4)'
        }}>
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => handleSelect(category)}
              style={{
                cursor: 'pointer',
                padding: 'var(--space-4)',
                border: `2px solid ${categoryId === category.id.toString() ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                backgroundColor: categoryId === category.id.toString() ? 'var(--color-primary-light)' : 'var(--color-white)',
                transition: 'all 0.2s ease',
                boxShadow: categoryId === category.id.toString() ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transform: categoryId === category.id.toString() ? 'translateY(-2px)' : 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                if (categoryId !== category.id.toString()) {
                  e.currentTarget.style.borderColor = 'var(--color-primary-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }
              }}
              onMouseLeave={(e) => {
                if (categoryId !== category.id.toString()) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }
              }}
            >
              <div style={{ fontWeight: '600', fontSize: 'var(--font-size-base)', color: 'var(--color-gray-800)' }}>
                {category.name}
              </div>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-gray-600)',
                marginTop: 'var(--space-1)'
              }}>
                Prefix: {category.prefix}
              </div>
            </div>
          ))}
        </div>
      </div>

      {categories.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-6)',
          color: 'var(--color-gray-600)'
        }}>
          No categories available for this equipment type.
        </div>
      )}
    </div>
  );
};