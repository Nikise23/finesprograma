import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LibrosMatrizPage from './pages/LibrosMatrizPage';
import ComisionesPage from './pages/ComisionesPage';
import ComisionDetailPage from './pages/ComisionDetailPage';
import EstudiantesPage from './pages/EstudiantesPage';
import DocentesPage from './pages/DocentesPage';
import EstructuraPage from './pages/EstructuraPage';
import ReportesPage from './pages/ReportesPage';
import TrayectoriasPage from './pages/TrayectoriasPage';
import UsuariosPage from './pages/UsuariosPage';
import type { Rol } from './services/api';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.rol)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="estructura" element={
          <RoleRoute roles={['ADMIN', 'ADMINISTRATIVO']}><EstructuraPage /></RoleRoute>
        } />
        <Route path="comisiones" element={
          <RoleRoute roles={['DOCENTE']}><ComisionesPage /></RoleRoute>
        } />
        <Route path="comisiones/:id" element={<ComisionDetailPage />} />
        <Route path="estudiantes" element={<EstudiantesPage />} />
        <Route path="trayectorias" element={<TrayectoriasPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="libros-matrices" element={
          <RoleRoute roles={['ADMIN', 'ADMINISTRATIVO']}><LibrosMatrizPage /></RoleRoute>
        } />
        <Route path="docentes" element={
          <RoleRoute roles={['ADMIN', 'ADMINISTRATIVO']}><DocentesPage /></RoleRoute>
        } />
        <Route path="usuarios" element={
          <RoleRoute roles={['ADMIN']}><UsuariosPage /></RoleRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
