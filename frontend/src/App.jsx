import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Equipos from './pages/Equipos';
import Conductores from './pages/Conductores';
import Partes from './pages/Partes';
import Inventario from './pages/Inventario';
import Armado from './pages/Armado';
import Presupuesto from './pages/Presupuesto';
import Tienda from './pages/Tienda';
import PerfilDriver from './pages/PerfilDriver';
import Simulacion from './pages/Simulacion';
import CircuitosAdmin from './pages/Circuito';
import Reportes from './pages/Reportes';


export default function App() {
  const { isAuthenticated, usuario, loading, logout } = useAuth();

  // Loader global mientras AuthContext valida sesión
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

  // Si no hay sesión, solo permitir /login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Header />

      {/* NAV */}
      <nav style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center' 
      }}>
        <div>
          {/* DRIVER: SOLO ve su Perfil */}
          {usuario?.rol === 'Driver' ? (
            <Link to="/perfil-driver">Mi Perfil</Link>
          ) : (
            <>
              {/* Solo Admin */}
              {usuario?.rol === 'Admin' && (
                <>
                  <Link to="/usuarios">Usuarios</Link> |{' '}
                  <Link to="/equipos">Equipos</Link> |{' '}
                  <Link to="/partes">Partes</Link> |{' '}
                  <Link to="/circuito">Circuitos</Link> |{' '}
                  <Link to="/simulacion">Simulación</Link> |{' '}
                  <Link to="/reportes">Reportes</Link> |{' '}
                </>
              )}

              {/* Admin y Engineer */}
              <Link to="/conductores">Conductores</Link> |{' '}
              <Link to="/presupuesto">Presupuesto</Link> |{' '}
              <Link to="/tienda">Tienda</Link> |{' '}
              <Link to="/inventario">Inventario</Link> |{' '}
              <Link to="/armado">Armado</Link> |{' '}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
            {usuario?.nombre_usuario} ({usuario?.rol})
          </span>

          <button 
            onClick={logout}
            style={{
              background: '#dc2626',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <Routes>
        {/* Ruta por defecto según rol */}
        <Route
          path="/"
          element={
            usuario?.rol === 'Admin'
              ? <Navigate to="/usuarios" replace />
              : usuario?.rol === 'Engineer'
                ? <Navigate to="/conductores" replace />
                : <Navigate to="/perfil-driver" replace />
          }
        />

        {/* DRIVER */}
        <Route
          path="/perfil-driver"
          element={
            <ProtectedRoute roles={['Driver']}>
              <PerfilDriver />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={['Admin']}>
              <Usuarios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/equipos"
          element={
            <ProtectedRoute roles={['Admin']}>
              <Equipos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/partes"
          element={
            <ProtectedRoute roles={['Admin']}>
              <Partes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/circuito"
          element={
            <ProtectedRoute roles={['Admin']}>
              <CircuitosAdmin />
            </ProtectedRoute>
          }
        />

        {/* ADMIN + ENGINEER */}
        <Route
          path="/conductores"
          element={
            <ProtectedRoute roles={['Admin', 'Engineer']}>
              <Conductores />
            </ProtectedRoute>
          }
        />

        <Route
          path="/presupuesto"
          element={
            <ProtectedRoute roles={['Admin', 'Engineer']}>
              <Presupuesto />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tienda"
          element={
            <ProtectedRoute roles={['Admin', 'Engineer']}>
              <Tienda />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventario"
          element={
            <ProtectedRoute roles={['Admin', 'Engineer']}>
              <Inventario />
            </ProtectedRoute>
          }
        />

        <Route
          path="/armado"
          element={
            <ProtectedRoute roles={['Admin', 'Engineer']}>
              <Armado />
            </ProtectedRoute>
          }
        />

        <Route
          path="/simulacion"
          element={
            <ProtectedRoute roles={['Admin', 'Engineer']}>
              <Simulacion />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reportes"
          element={
            <ProtectedRoute roles={['Admin']}>
              <Reportes />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div style={{ 
              textAlign: 'center', 
              padding: '4rem', 
              color: 'white' 
            }}>
              <h2>Página no encontrada</h2>
              <p>La ruta no existe.</p>
            </div>
          }
        />
      </Routes>
    </div>
  );
}
