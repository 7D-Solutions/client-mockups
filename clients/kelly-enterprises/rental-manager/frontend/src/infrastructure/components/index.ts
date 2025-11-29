// Shared component library exports
//
// IMPORTANT: All UI components in this application MUST use these centralized components.
// DO NOT create raw HTML elements (<button>, <input>, <textarea>, etc.) - use these instead.
//
// For Claude Code instances:
// - Use Button component instead of <button> (provides double-click protection)
// - Use FormInput/FormCheckbox/FormTextarea instead of raw form elements
// - Use FormSection component for all form sections (enforces consistent spacing and styling)
// - Use Modal component instead of window.confirm() or window.alert()
// - Use apiClient from ../api/client instead of direct fetch() calls
//
// This ensures consistent UX, accessibility, and prevents bypassing centralized systems.
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export {
  ActionButton,
  InlineActions,
  TableCheckoutButton,
  TableCheckinButton,
  TableTransferButton,
  TableViewButton
} from './ActionButtons';
export { Modal } from './Modal';
export { DetailModal } from './DetailModal';  // Use for detail views with Edit button (auto left-aligned)
export { LoadingSpinner, LoadingOverlay } from './LoadingSpinner';
export { ToastContainer, useToast } from './Toast';
export { ConnectedToastContainer } from './ConnectedToastContainer';
export { MainLayout } from './MainLayout';
export { LoginScreen } from './LoginScreen';
export { UserMenu } from './UserMenu';
export { Sidebar } from './Sidebar';
export { RejectModal } from './RejectModal';
export { Icon } from './Icon';
export type { IconName } from './Icon';
export { PasswordModal } from './PasswordModal';
export { ChangePasswordModal } from './ChangePasswordModal';
export { ModalManager } from './ModalManager';
export { ErrorBoundary } from './ErrorBoundary';
export { FontAwesomeCheck } from './FontAwesomeCheck';

// Form components
export { FormInput } from './FormInput';
export { FormSelect } from './FormSelect';
export { FormTextarea } from './FormTextarea';
export { FormCheckbox } from './FormCheckbox';
export { FormRadio } from './FormRadio';
export { SearchableSelect } from './SearchableSelect';
export type { SelectOption } from './SearchableSelect';
export { SearchableCombobox } from './SearchableCombobox';
export type { ComboboxOption } from './SearchableCombobox';
export { FileInput } from './FileInput';
export { StorageLocationSelect } from './StorageLocationSelect';
export { CalibrationFrequencySelect } from './CalibrationFrequencySelect';
export { FormSection } from './FormSection';

// UI components
export { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';

// Inline elements
export { Tag } from './Tag';
export { Badge } from './Badge';
export { Alert } from './Alert';
export { Tooltip } from './Tooltip';
export type { TooltipPosition } from './Tooltip';
export { TooltipToggle } from './TooltipToggle';
export { GaugeTypeBadge } from './GaugeTypeBadge';
export { GaugeStatusBadge } from './GaugeStatusBadge';

// Typography components
export { DetailRow } from './DetailRow';
export { SectionHeader } from './SectionHeader';
export { InfoCard } from './InfoCard';
export { LocationDisplay } from './LocationDisplay';

// Semantic Button Components
export {
  CloseButton,
  CancelButton,
  BackButton,
  SaveButton,
  SubmitButton,
  ContinueButton,
  CheckoutButton,
  DoneButton,
  ConfirmButton,
  AcceptButton,
  ApproveButton,
  DeleteButton,
  RemoveButton,
  RejectButton,
  DeclineButton,
  ResetButton,
  ClearButton,
  RetryButton,
  ResetPasswordButton
} from './SemanticButtons';

// Data components
export { DataTable } from './DataTable';
export type { DataTableProps, DataTableColumn } from './DataTable';
export { DateRangePicker } from './DateRangePicker';
export type { DateRange, DateRangePickerProps } from './DateRangePicker';
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';
export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb';

// Global monitors
export { RouteMonitor } from './RouteMonitor';