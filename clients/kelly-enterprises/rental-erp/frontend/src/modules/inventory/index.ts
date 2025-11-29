// Inventory module main exports
export * from './types';
export * from './services';
export * from './pages';
export { InventoryRoutes, inventoryRouteConfig } from './routes';

// Auto-register navigation on module import
import './navigation';
