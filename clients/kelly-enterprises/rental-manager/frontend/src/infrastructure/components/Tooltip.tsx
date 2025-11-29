import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';
import { useTooltips } from '../context/TooltipContext';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
}

export function Tooltip({
  children,
  content,
  position = 'top',
  delay = 300,
  disabled = false
}: TooltipProps) {
  const { tooltipsEnabled } = useTooltips();
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calculate tooltip position using actual measured dimensions
  const calculatePosition = () => {
    if (!wrapperRef.current || !tooltipRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 4;
    const padding = 10;

    let top = 0;
    let left = 0;

    // Calculate base position using actual tooltip dimensions
    if (position === 'top') {
      // Position bottom of tooltip 'spacing' pixels above element
      top = rect.top - tooltipRect.height - spacing;
      left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    } else if (position === 'bottom') {
      top = rect.bottom + spacing;
      left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    } else if (position === 'left') {
      top = rect.top + rect.height / 2 - tooltipRect.height / 2;
      left = rect.left - tooltipRect.width - spacing;
    } else if (position === 'right') {
      top = rect.top + rect.height / 2 - tooltipRect.height / 2;
      left = rect.right + spacing;
    }

    // Adjust for viewport boundaries
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal adjustment
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    // Vertical adjustment
    if (top < padding) {
      top = padding;
    } else if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999
    });
  };

  useEffect(() => {
    if (isVisible) {
      // Use RAF to ensure tooltip is rendered and measured
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    if (disabled || !content) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const shouldShowTooltip = !disabled && content && tooltipsEnabled;

  return (
    <>
      <div
        ref={wrapperRef}
        className={styles.tooltipWrapper}
        onMouseEnter={shouldShowTooltip ? handleMouseEnter : undefined}
        onMouseLeave={shouldShowTooltip ? handleMouseLeave : undefined}
      >
        {children}
      </div>
      {shouldShowTooltip && isVisible && createPortal(
        <div
          ref={tooltipRef}
          className={styles.tooltipFixed}
          style={tooltipStyle}
          role="tooltip"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
