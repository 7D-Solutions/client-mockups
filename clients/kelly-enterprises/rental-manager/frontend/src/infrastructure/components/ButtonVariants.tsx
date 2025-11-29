// Fixed-style button components - variants are frozen, only size can be changed
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';

interface FixedButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

// Primary button - for main actions (blue)
export const PrimaryButton = ({ size = 'md', ...props }: FixedButtonProps) => (
  <Button variant="primary" size={size} {...props} />
);

// Secondary button - for dismissive/neutral actions (gray)
export const SecondaryButton = ({ size = 'md', ...props }: FixedButtonProps) => (
  <Button variant="secondary" size={size} {...props} />
);

// Success button - for positive/completion actions (green)
export const SuccessButton = ({ size = 'md', ...props }: FixedButtonProps) => (
  <Button variant="success" size={size} {...props} />
);

// Danger button - for destructive actions (red)
export const DangerButton = ({ size = 'md', ...props }: FixedButtonProps) => (
  <Button variant="danger" size={size} {...props} />
);

// Warning button - for cautionary actions (yellow)
export const WarningButton = ({ size = 'md', ...props }: FixedButtonProps) => (
  <Button variant="warning" size={size} {...props} />
);

// Info button - for informational actions (blue variant)
export const InfoButton = ({ size = 'md', ...props }: FixedButtonProps) => (
  <Button variant="info" size={size} {...props} />
);

// Outline button - for tertiary actions (transparent with border)
export const OutlineButton = ({ size = 'md', ...props }: FixedButtonProps) => (
  <Button variant="outline" size={size} {...props} />
);

// Specific purpose buttons with appropriate styles
export const CloseButton = SecondaryButton;
export const CancelButton = SecondaryButton;
export const SaveButton = SuccessButton;
export const DeleteButton = DangerButton;
export const EditButton = OutlineButton;
export const SubmitButton = PrimaryButton;
export const CreateButton = PrimaryButton;
export const AddButton = PrimaryButton;