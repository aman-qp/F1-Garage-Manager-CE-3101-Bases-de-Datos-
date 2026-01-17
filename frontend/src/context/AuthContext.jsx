import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  async function verificarSesion() {
    try {
      const res = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUsuario(data);
      } else {
        setIsAuthenticated(false);
        setUsuario(null);
      }
    } catch (err) {
      console.error('Error al verificar sesión:', err);
      setIsAuthenticated(false);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(nombre_usuario, contrasena) {
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre_usuario, contrasena })
      });

      const data = await res.json();

      if (res.ok) {
        setIsAuthenticated(true);
        setUsuario(data.usuario);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        return { success: true, usuario: data.usuario };
      } else {
        return { success: false, message: data.message || 'Credenciales inválidas' };
      }
    } catch (err) {
      console.error('Error en login:', err);
      return { success: false, message: 'No se pudo conectar con el servidor' };
    }
  }

  async function logout() {
    try {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setIsAuthenticated(false);
      setUsuario(null);
      localStorage.removeItem('usuario');
    }
  }

  useEffect(() => {
    verificarSesion();
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      usuario,
      loading,
      login,
      logout,
      verificarSesion
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}