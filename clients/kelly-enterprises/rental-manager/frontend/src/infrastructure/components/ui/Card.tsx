// Card UI component
import { HTMLAttributes, forwardRef } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'compact' | 'default' | 'spacious';
}

export const Card = forwardRef<
  HTMLDivElement,
  CardProps
>(({ className = '', size = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={`${styles.card} ${styles[`card${size.charAt(0).toUpperCase() + size.slice(1)}`]} ${className}`}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`${styles.cardHeader} ${className}`}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={`${styles.cardTitle} ${className}`}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`${styles.cardContent} ${className}`} {...props} />
));
CardContent.displayName = 'CardContent';