import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DefinitionsCatalogPage } from './pages/DefinitionsCatalogPage';
import { DefinitionDetailPage } from './pages/DefinitionDetailPage';
import { StartWorkflowPage } from './pages/StartWorkflowPage';
import { ExecutionDetailPage } from './pages/ExecutionDetailPage';
import { HealthPage } from './pages/HealthPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/definitions"
        element={
          <ProtectedRoute>
            <DefinitionsCatalogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/definitions/:name"
        element={
          <ProtectedRoute>
            <DefinitionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflows/start"
        element={
          <ProtectedRoute>
            <StartWorkflowPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflows/:id"
        element={
          <ProtectedRoute>
            <ExecutionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <HealthPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
