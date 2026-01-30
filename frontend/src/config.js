// Configuración de la API
// Detecta automáticamente si se accede desde localhost o desde otra máquina en la red

export const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001'  // Acceso desde la misma máquina
  : `http://${window.location.hostname}:3001`;  // Acceso desde otra máquina en la red   