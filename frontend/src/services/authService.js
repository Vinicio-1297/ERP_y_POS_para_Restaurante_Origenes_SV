const apiUrl = import.meta.env.VITE_API_URL || '/api';

// iniciar sesion
export async function login({ rol, correo, password }, signal) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rol, correo, password }),
    signal,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
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

// obtener informacion de soporte
export async function obtenerSoporte(signal) {
  const response = await fetch(`${apiUrl}/auth/soporte`, {
    method: 'GET',
    signal,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || 'No se pudo obtener la información de soporte.'
    );
  }

  if (!result?.correo || !result?.mensaje) {
    throw new Error('La API devolvió una respuesta inválida');
  }

  return result;
}