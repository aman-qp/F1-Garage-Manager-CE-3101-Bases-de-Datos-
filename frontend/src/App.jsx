import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Equipos from './pages/Equipos'
import Conductores from './pages/Conductores'
import Patrocinadores from './pages/Patrocinadores'
import Partes from './pages/Partes'
import Inventario from './pages/Inventario'
import Armado from './pages/Armado'
import Presupuesto from './pages/Presupuesto'

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
          <Link to="/usuarios">Usuarios</Link> |{' '}
          <Link to="/equipos">Equipos</Link> |{' '}
          <Link to="/conductores">Conductores</Link> |{' '}
          <Link to="/patrocinadores">Patrocinadores</Link> |{' '}
          <Link to="/presupuesto">Presupuesto</Link> |{' '}
          <Link to="/partes">Partes</Link> |{' '}
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
        <Route path="/" element={<Navigate to="/usuarios" replace />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/conductores" element={<Conductores />} />
        <Route path="/patrocinadores" element={<Patrocinadores />} />
        <Route path="/presupuesto" element={<Presupuesto />} />
        <Route path="/partes" element={<Partes />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/armado" element={<Armado />} />
      </Routes>
    </div>
  )
}