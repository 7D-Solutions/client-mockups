import React, { forwardRef, useState, useRef } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Tooltip, TooltipPosition } from './Tooltip';
import { logger } from '../utils/logger';

interface FileInputProps {
  accept?: string;
  onChange?: (file: File | null) => void;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  buttonVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  buttonSize?: 'sm' | 'md' | 'lg';
  selectedFileName?: string;
  label?: string;
  enableDragDrop?: boolean;
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({
    accept,
    onChange,
    buttonText = 'Upload File',
    buttonIcon = <Icon name="upload" />,
    buttonVariant = 'secondary',
    buttonSize = 'sm',
    selectedFileName,
    label,
    enableDragDrop = true,
    tooltip,
    tooltipPosition = 'top'
  }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const internalRef = useRef<HTMLInputElement>(null);
    const fileInputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      onChange?.(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (enableDragDrop) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!enableDragDrop) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];

        // Check if file type matches accept attribute
        if (accept) {
          const acceptedTypes = accept.split(',').map(t => t.trim());
          const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
          const fileMimeType = file.type;

          const isAccepted = acceptedTypes.some(type => {
            if (type.startsWith('.')) {
              return fileExtension === type.toLowerCase();
            }
            return fileMimeType.match(new RegExp(type.replace('*', '.*')));
          });

          if (!isAccepted) {
            logger.warn(`File type ${fileExtension} not accepted. Expected: ${accept}`);
            return;
          }
        }

        onChange?.(file);
      }
    };

    if (enableDragDrop) {
      const dragDropArea = (
        <div>
          {label && (
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: '600',
              color: 'var(--color-text)'
            }}>
              {label}
              {tooltip && (
                <span style={{ marginLeft: '6px', display: 'inline-flex' }}>
                  <Tooltip content={tooltip} position="top">
                    <Icon name="info-circle" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', cursor: 'help' }} />
                  </Tooltip>
                </span>
              )}
            </label>
          )}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--color-border)',
              borderRadius: 'var(--border-radius)',
              padding: 'var(--space-6)',
              textAlign: 'center',
              backgroundColor: isDragging ? 'var(--color-primary-light)' : 'var(--color-background)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            <Icon name="upload" style={{ fontSize: '2rem', marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)' }} />
            <p style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              {isDragging ? 'Drop file here' : 'Drag and drop file here'}
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              or
            </p>
            <Button
              type="button"
              variant={buttonVariant}
              size={buttonSize}
              icon={buttonIcon}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              {buttonText}
            </Button>
            {selectedFileName && (
              <div style={{
                marginTop: 'var(--space-3)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-success)',
                fontWeight: '600'
              }}>
                ✓ Selected: {selectedFileName}
              </div>
            )}
            {accept && (
              <p style={{
                marginTop: 'var(--space-2)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)'
              }}>
                Accepted files: {accept}
              </p>
            )}
          </div>
        </div>
      );

      return tooltip ? (
        <Tooltip content={tooltip} position={tooltipPosition}>
          {dragDropArea}
        </Tooltip>
      ) : (
        dragDropArea
      );
    }

    // Legacy mode without drag and drop
    const legacyContent = (
      <>
        {label && (
          <label style={{
            display: 'block',
            marginBottom: 'var(--space-2)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: '600'
          }}>
            {label}
            {tooltip && (
              <span style={{ marginLeft: '6px', display: 'inline-flex' }}>
                <Tooltip content={tooltip} position="top">
                  <Icon name="info-circle" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', cursor: 'help' }} />
                </Tooltip>
              </span>
            )}
          </label>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          icon={buttonIcon}
          onClick={() => fileInputRef.current?.click()}
        >
          {buttonText}
        </Button>
        {selectedFileName && (
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Selected: {selectedFileName}
          </div>
        )}
      </>
    );

    return tooltip ? (
      <Tooltip content={tooltip} position={tooltipPosition}>
        {legacyContent}
      </Tooltip>
    ) : (
      legacyContent
    );
  }
);

FileInput.displayName = 'FileInput';