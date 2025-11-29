// Gauge module main exports
export * from './types';
export * from './context';
export * from './hooks';
export * from './services';
export * from './pages';
export { GaugeRoutes, gaugeRouteConfig } from './routes';

// Components (explicit export to avoid naming conflicts)
export { 
  GaugeRow, 
  SummaryCards, 
  GaugeModalManager, 
  QCApprovalsModal 
} from './components';
export { GaugeFilters as GaugeFiltersComponent } from './components';

// Auto-register navigation on module import
import './navigation';