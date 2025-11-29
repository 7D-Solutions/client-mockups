import React, { useState, useEffect } from 'react';
import { Button } from '../../../../../infrastructure/components';
import { logger } from '../../../../../infrastructure/utils/logger';
import styles from './SetIdEditor.module.css';

interface SetIdEditorProps {
  categoryId?: number;
  gaugeType?: string;
  onSetIdChange?: (setId: string) => void;
}

export const SetIdEditor: React.FC<SetIdEditorProps> = ({
  categoryId = 31,
  gaugeType = 'plug',
  onSetIdChange
}) => {
  const [isEditingSetId, setIsEditingSetId] = useState(false);
  const [customSetId, setCustomSetId] = useState('');
  const [nextSetId, setNextSetId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Fetch next available set ID when component mounts
  useEffect(() => {
    const fetchNextSetId = async () => {
      try {
        const response = await fetch(`/api/gauges/v2/next-set-id?category_id=${categoryId}&gauge_type=${gaugeType}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setNextSetId(data.data.next_set_id);
          onSetIdChange?.(data.data.next_set_id);
        } else {
          setNextSetId('SP0001');
          onSetIdChange?.('SP0001');
        }
      } catch (error) {
        logger.error('Failed to fetch next set ID:', error);
        setNextSetId('SP0001');
        onSetIdChange?.('SP0001');
      }
    };

    fetchNextSetId();
  }, [categoryId, gaugeType, onSetIdChange]);

  // Validate custom set ID with debouncing
  useEffect(() => {
    if (!customSetId || customSetId === nextSetId) {
      setValidationError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      try {
        const response = await fetch(`/api/gauges/v2/validate-set-id/${encodeURIComponent(customSetId)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && !data.data.is_available) {
            setValidationError(`Set ID "${customSetId}" already exists (${data.data.existing_count} gauge${data.data.existing_count > 1 ? 's' : ''})`);
          } else {
            setValidationError('');
          }
        }
      } catch (error) {
        logger.error('Failed to validate set ID:', error);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [customSetId, nextSetId]);

  const handleEditSetId = () => {
    setCustomSetId(nextSetId);
    setValidationError('');
    setIsEditingSetId(true);
  };

  const handleSaveSetId = () => {
    if (customSetId.trim() && !validationError) {
      setNextSetId(customSetId.trim());
      onSetIdChange?.(customSetId.trim());
      setIsEditingSetId(false);
    }
  };

  const handleCancelEdit = () => {
    setCustomSetId('');
    setValidationError('');
    setIsEditingSetId(false);
  };

  return (
    <div className={`${styles.container} ${isEditingSetId ? styles.containerEditing : ''}`}>
      <label className={styles.label}>
        Set ID
      </label>

      {isEditingSetId ? (
        <>
          <div className={styles.editableRow}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={customSetId}
                onChange={(e) => setCustomSetId(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !validationError && customSetId.trim()) {
                    handleSaveSetId();
                  }
                }}
                className={`${styles.input} ${validationError ? styles.inputError : ''}`}
                autoFocus
              />
            </div>
            <div className={styles.buttonGroup}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveSetId}
                disabled={!customSetId.trim() || !!validationError || isValidating}
              >
                {isValidating ? 'Checking...' : 'Save'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </div>
          </div>
          {validationError && (
            <div className={styles.errorBox}>
              ⚠️ {validationError}
            </div>
          )}
        </>
      ) : (
        <div className={styles.displayBox} onClick={handleEditSetId}>
          <div className={styles.displayValue}>
            {nextSetId || 'Loading...'}
          </div>
          <span className={styles.editIcon}>✎</span>
        </div>
      )}
    </div>
  );
};
