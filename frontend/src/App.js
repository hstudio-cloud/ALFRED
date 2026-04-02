import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import TasksKanban from './pages/TasksKanban';
import DashboardEnhanced from './pages/DashboardEnhanced';
import CustomCursor from './components/CustomCursor';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <CustomCursor />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

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
