// Semantic Button Components - Each button has a fixed design, only size can change
import { ButtonHTMLAttributes } from 'react';
import { Button } from './Button';

interface SemanticButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
}

// Navigation buttons
export const CloseButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="secondary" size={size} {...props}>
    Close
  </Button>
);

export const CancelButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="secondary" size={size} {...props}>
    Cancel
  </Button>
);

export const BackButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="secondary" size={size} {...props}>
    Back
  </Button>
);

// Primary action buttons
export const SaveButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="primary" size={size} {...props}>
    Save
  </Button>
);

export const SubmitButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="primary" size={size} {...props}>
    Submit
  </Button>
);

export const ContinueButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="primary" size={size} {...props}>
    Continue
  </Button>
);

export const CheckoutButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="primary" size={size} {...props}>
    Checkout
  </Button>
);

export const CheckinButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="success" size={size} {...props}>
    Checkin
  </Button>
);

export const TransferButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="info" size={size} {...props}>
    Transfer
  </Button>
);

// Success action buttons
export const DoneButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="success" size={size} {...props}>
    Done
  </Button>
);

export const ConfirmButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="success" size={size} {...props}>
    Confirm
  </Button>
);

export const AcceptButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="success" size={size} {...props}>
    Accept
  </Button>
);

export const ApproveButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="success" size={size} {...props}>
    Approve
  </Button>
);

// Danger action buttons
export const DeleteButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="danger" size={size} {...props}>
    Delete
  </Button>
);

export const RemoveButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="danger" size={size} {...props}>
    Remove
  </Button>
);

export const RejectButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="danger" size={size} {...props}>
    Reject
  </Button>
);

export const DeclineButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="danger" size={size} {...props}>
    Decline
  </Button>
);

// Warning action buttons
export const ResetButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="warning" size={size} {...props}>
    Reset
  </Button>
);

export const ClearButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="warning" size={size} {...props}>
    Clear
  </Button>
);

export const RetryButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="warning" size={size} {...props}>
    Retry
  </Button>
);

// Special case buttons with custom text
export const ResetPasswordButton = ({ size = 'md', ...props }: SemanticButtonProps) => (
  <Button variant="warning" size={size} {...props}>
    Reset Password
  </Button>
);