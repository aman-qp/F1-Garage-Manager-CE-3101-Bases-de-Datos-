import { Routes, Route, Link } from 'react-router-dom'
import Header from './components/Header'
import Usuarios from './pages/Usuarios'
import Equipos from './pages/Equipos'
import Conductores from './pages/Conductores'
import Patrocinadores from './pages/Patrocinadores'
import Partes from './pages/Partes'
import Inventario from './pages/Inventario'
import Armado from './pages/Armado'


export default function App() {
  
  return (
    <div className="app-container">
      <Header />

      <nav style={{ marginBottom: '20px' }}>
        <Link to="/">Usuarios</Link> |{' '}
        <Link to="/equipos">Equipos</Link> |{' '}
        <Link to="/conductores">Conductores</Link> |{' '}
        <Link to="/patrocinadores">Patrocinadores</Link> |{' '}
        <Link to="/partes">Partes</Link> |{' '}
        <Link to="/inventario">Inventario</Link> |{' '}
        <Link to="/armado">Armado</Link>
        
      </nav>

      <Routes>
        <Route path="/" element={<Usuarios />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/conductores" element={<Conductores />} />
        <Route path="/patrocinadores" element={<Patrocinadores />} />
        <Route path="/partes" element={<Partes />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/armado" element={<Armado />} />
      </Routes>
    </div>
  )
}






