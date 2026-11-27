// Cliente HTTP compartido: agrega el token y convierte los errores de la API en Error con .status.
const apiUrl = import.meta.env.VITE_API_URL || '/api';

export async function request(path, options = {}) {
  const token = sessionStorage.getItem('origenes.token');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(result?.message || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return result;
}

// Igual que request, pero devuelve un Blob (por ejemplo un PDF). Sirve cuando el archivo necesita el token.
export async function requestBlob(path, options = {}) {
  const token = sessionStorage.getItem('origenes.token');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    const error = new Error(result?.message || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.blob();
}
