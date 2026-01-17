import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

export default function Login() {
  const [form, setForm] = useState({
    nombre_usuario: '',
    contrasena: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(''); // Limpiar error al escribir
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(form.nombre_usuario, form.contrasena);

    if (result.success) {
      // Redirigir según el rol
      if (result.usuario.rol === 'Admin') {
        navigate('/usuarios');
      } else if (result.usuario.rol === 'Engineer') {
        navigate('/presupuesto');
      } else {
        navigate('/usuarios');
      }
    } else {
      setError(result.message);
    }

    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>F1 Garage Manager</h1>
          <p>Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              name="nombre_usuario"
              value={form.nombre_usuario}
              onChange={handleChange}
              required
              autoFocus
              placeholder="Ingresa tu usuario"
              className="login-input"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="contrasena"
              value={form.contrasena}
              onChange={handleChange}
              required
              placeholder="Ingresa tu contraseña"
              className="login-input"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="login-footer">
          <p>Usuario por defecto: <strong>admin</strong></p>
          <p>Contraseña: <strong>admin123</strong></p>
        </div>
      </div>
    </div>
  );
}