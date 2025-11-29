import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Tenants from './pages/Tenants';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Transactions from './pages/Transactions';
import Messages from './pages/Messages';
import Applications from './pages/Applications';

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Create router with future flags enabled
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'properties',
        element: <Properties />,
      },
      {
        path: 'tenants',
        element: <Tenants />,
      },
      {
        path: 'payments',
        element: <Payments />,
      },
      {
        path: 'expenses',
        element: <Expenses />,
      },
      {
        path: 'transactions',
        element: <Transactions />,
      },
      {
        path: 'messages',
        element: <Messages />,
      },
      {
        path: 'applications',
        element: <Applications />,
      },
    ],
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
