import './App.css';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Clients from './pages/Clients';
import TasksKanban from './pages/TasksKanban';
import DashboardEnhanced from './pages/DashboardEnhanced';
import CustomCursor from './components/CustomCursor';

const CURSOR_MODE_STORAGE_KEY = 'nano_cursor_mode';

const resolveCursorMode = (value) => (value === 'default' ? 'default' : 'custom');

function CursorRouteController() {
  const location = useLocation();
  const [cursorMode, setCursorMode] = useState(() => {
    if (typeof window === 'undefined') {
      return 'custom';
    }

    return resolveCursorMode(
      window.localStorage.getItem(CURSOR_MODE_STORAGE_KEY) || 'custom',
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncCursorMode = (nextValue) => {
      setCursorMode(resolveCursorMode(nextValue));
    };

    const handleStorage = (event) => {
      if (event.key === CURSOR_MODE_STORAGE_KEY) {
        syncCursorMode(event.newValue || 'custom');
      }
    };

    const handleCursorModeChange = (event) => {
      syncCursorMode(event.detail?.mode || 'custom');
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('nano-cursor-mode-change', handleCursorModeChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nano-cursor-mode-change', handleCursorModeChange);
    };
  }, []);

  const enableCustomCursor = location.pathname === '/' && cursorMode === 'custom';

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const appliedMode = enableCustomCursor ? 'custom' : 'default';
    document.documentElement.dataset.cursorMode = appliedMode;
    document.body.dataset.cursorMode = appliedMode;

    return () => {
      delete document.documentElement.dataset.cursorMode;
      delete document.body.dataset.cursorMode;
    };
  }, [enableCustomCursor]);

  if (!enableCustomCursor) {
    return null;
  }

  return <CustomCursor />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <CursorRouteController />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/billing"
                element={(
                  <ProtectedRoute>
                    <Billing />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/dashboard"
                element={(
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/analytics"
                element={(
                  <ProtectedRoute>
                    <DashboardEnhanced />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/clients"
                element={(
                  <ProtectedRoute>
                    <Clients />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/tasks"
                element={(
                  <ProtectedRoute>
                    <TasksKanban />
                  </ProtectedRoute>
                )}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </WorkspaceProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
