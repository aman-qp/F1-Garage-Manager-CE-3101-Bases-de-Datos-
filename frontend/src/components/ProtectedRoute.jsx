import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, usuario, loading } = useAuth();

  // Mientras carga sesión
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        Cargando...
      </div>
    );
  }

  // Si no hay sesión
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay roles requeridos y el rol no está permitido
  if (roles && roles.length > 0 && !roles.includes(usuario?.rol)) {
    // Redirección “segura” según rol
    if (usuario?.rol === 'Admin') return <Navigate to="/usuarios" replace />;
    if (usuario?.rol === 'Engineer') return <Navigate to="/conductores" replace />;
    return <Navigate to="/perfil-driver" replace />; // Driver
  }

  return children;
}
