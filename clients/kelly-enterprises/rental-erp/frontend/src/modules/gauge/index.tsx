// Gauge module bootstrap
import { GaugeRoutes } from './routes';
import { GaugeProvider } from './context';

export const GaugeModule = () => {
  return (
    <GaugeProvider>
      <GaugeRoutes />
    </GaugeProvider>
  );
};

export * from './types';
export * from './services';
export * from './hooks';
export * from './context';