// Admin module exports
export { AdminModule } from './index.tsx';
export { useAdmin } from './context';
export type { 
  User as AdminUser, 
  Role, 
  Permission, 
  AdminState, 
  CreateUserData, 
  UpdateUserData, 
  CreateRoleData, 
  UpdateRoleData, 
  AuditLog, 
  SystemSettings as AdminSystemSettings 
} from './types';
export * from './services';
export * from './pages';

// Auto-register navigation on module import
import './navigation';