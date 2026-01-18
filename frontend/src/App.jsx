import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Equipos from './pages/Equipos'
import Conductores from './pages/Conductores'
import Partes from './pages/Partes'
import Inventario from './pages/Inventario'
import Armado from './pages/Armado'
import Presupuesto from './pages/Presupuesto'
import Tienda from './pages/Tienda'

export default function App() {
  const { isAuthenticated, usuario, loading, logout } = useAuth();

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

      <nav style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center' 
      }}>
        <div>
          {/* Solo Admin puede ver Usuarios */}
          {usuario?.rol === 'Admin' && (
            <>
              <Link to="/usuarios">Usuarios</Link> |{' '}
            </>
          )}
          
          <Link to="/equipos">Equipos</Link> |{' '}
          <Link to="/conductores">Conductores</Link> |{' '}
          
          
          {/* Engineer y Admin pueden ver Presupuesto */}
          {(usuario?.rol === 'Admin' || usuario?.rol === 'Engineer') && (
            <>
              <Link to="/presupuesto">Presupuesto</Link> |{' '}
            </>
          )}
          
          {/* Engineer y Admin pueden ver Tienda */}
          {(usuario?.rol === 'Admin' || usuario?.rol === 'Engineer') && (
            <>
              <Link to="/tienda">Tienda</Link> |{' '}
            </>
          )}
          
          {/* Solo Admin puede ver Partes */}
          {usuario?.rol === 'Admin' && (
            <>
              <Link to="/partes">Partes</Link> |{' '}
            </>
          )}
          
          <Link to="/inventario">Inventario</Link> |{' '}
          <Link to="/armado">Armado</Link>
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
        <Route path="/" element={
          usuario?.rol === 'Admin' 
            ? <Navigate to="/usuarios" replace />
            : <Navigate to="/equipos" replace />
        } />
        
        {/* Solo Admin puede acceder a Usuarios */}
        {usuario?.rol === 'Admin' && (
          <Route path="/usuarios" element={<Usuarios />} />
        )}
        
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/conductores" element={<Conductores />} />
        
        
        {/* Engineer y Admin pueden ver Presupuesto */}
        {(usuario?.rol === 'Admin' || usuario?.rol === 'Engineer') && (
          <Route path="/presupuesto" element={<Presupuesto />} />
        )}
        
        {/* Engineer y Admin pueden ver Tienda */}
        {(usuario?.rol === 'Admin' || usuario?.rol === 'Engineer') && (
          <Route path="/tienda" element={<Tienda />} />
        )}
        
        {/* Solo Admin puede ver Partes */}
        {usuario?.rol === 'Admin' && (
          <Route path="/partes" element={<Partes />} />
        )}
        
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/armado" element={<Armado />} />
        
        {/* Ruta 404 o acceso denegado */}
        <Route path="*" element={
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem', 
            color: 'white' 
          }}>
            <h2>Acceso Denegado</h2>
            <p>No tienes permisos para acceder a esta página</p>
          </div>
        } />
      </Routes>
    </div>
  )
}