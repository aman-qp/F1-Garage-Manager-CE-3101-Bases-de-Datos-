import { useLocation } from 'react-router-dom'
import f1Logo from '../assets/logo.png'

export default function Header() {
  const location = useLocation()

  const titles = {
    '/': 'Gestión de Usuarios',
    '/equipos': 'Equipos F1',
    '/conductores': 'Conductores',
    '/patrocinadores': 'Patrocinadores',
    '/partes': 'Partes del Auto',
    '/inventario': 'Inventario',
    '/armado': 'Armado'
  }

  const title = titles[location.pathname] || 'F1 Garage Manager'

  console.log('PATH ACTUAL:', location.pathname)

  return (
    <header className="f1-header">
      <div className="f1-header-content">
        <img src={f1Logo} alt="F1 Logo" className="f1-logo" />

        <div>
          <h1>{title}</h1>
          <span className="f1-subtitle">F1 Garage Manager</span>
        </div>
      </div>
    </header>
  )
}
