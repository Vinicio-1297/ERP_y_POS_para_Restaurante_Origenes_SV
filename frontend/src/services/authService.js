const apiUrl = import.meta.env.VITE_API_URL || '/api';
 
// Contrato esperado del backend (aún no implementado): POST /api/auth/login
// Body: { rol, correo, password }  ->  200: { token, usuario: { nombre, rol } }
export async function login({ rol, correo, password }, signal) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rol, correo, password }),
    signal,
  });
  const result = await response.json().catch(() => null);
 
  if (!response.ok) {
    // 401 = credenciales inválidas; cualquier otro error muestra un mensaje genérico.
    throw new Error(
      response.status === 401
        ? 'Correo o contraseña incorrectos'
        : result?.message || 'No se pudo iniciar sesión. Intenta de nuevo.',
    );
  }
 
  if (!result?.token) {
    throw new Error('La API devolvió una respuesta inválida');
  }
 
  return result;
}
 