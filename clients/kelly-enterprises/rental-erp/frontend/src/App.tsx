// Main App with modular routing and integrated layout
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AuthProvider,
  NavigationProvider,
  MainLayout,
  ConnectedToastContainer,
  ErrorBoundary,
  RouteMonitor
} from './infrastructure';
import { TooltipProvider } from './infrastructure/context/TooltipContext';
import { moduleStateSync } from './infrastructure/store/moduleSync';
import { gaugeRouteConfig, AdminModule } from './modules';
import { inventoryRouteConfig } from './modules/inventory';
import { UserRoutes, UserProvider } from './modules/user';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Main App component with integrated module routing and layout
export function App() {
  // Initialize module state sync with proper cleanup
  useEffect(() => {
    moduleStateSync.initialize();
    
    return () => {
      // Cleanup when app unmounts
      if (moduleStateSync.destroy) {
        moduleStateSync.destroy();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <NavigationProvider>
            <TooltipProvider>
              <RouteMonitor />
              <MainLayout>
              <ErrorBoundary name="App">
                <Routes>
                  {/* Default redirect to gauge module */}
                  <Route path="/" element={<Navigate to="/gauges/list" replace />} />
                  
                  {/* My Gauges shortcut */}
                  <Route path="/dashboard" element={<Navigate to="/gauges/my-gauges" replace />} />
                  
                  {/* Gauge Module Routes */}
                  <Route 
                    path={gaugeRouteConfig.path} 
                    element={
                      <ErrorBoundary name="GaugeModule">
                        {gaugeRouteConfig.element}
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Admin Module Routes */}
                  <Route
                    path="/admin/*"
                    element={
                      <ErrorBoundary name="AdminModule">
                        <AdminModule />
                      </ErrorBoundary>
                    }
                  />

                  {/* Inventory Module Routes */}
                  <Route
                    path={inventoryRouteConfig.path}
                    element={
                      <ErrorBoundary name="InventoryModule">
                        {inventoryRouteConfig.element}
                      </ErrorBoundary>
                    }
                  />

                  {/* User Module Routes */}
                  <Route
                    path="/user/*"
                    element={
                      <ErrorBoundary name="UserModule">
                        <UserProvider>
                          <UserRoutes />
                        </UserProvider>
                      </ErrorBoundary>
                    }
                  />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/gauges/list" replace />} />
                </Routes>
              </ErrorBoundary>
              </MainLayout>

              {/* Global Toast Notifications */}
              <ConnectedToastContainer />
            </TooltipProvider>
          </NavigationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}