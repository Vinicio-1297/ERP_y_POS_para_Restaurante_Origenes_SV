const apiUrl = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  const token = sessionStorage.getItem('origenes.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function errorFromResponse(response) {
  const result = await response.json().catch(() => null);
  const baseMessage = result?.message || result?.mensaje || `Error ${response.status}`;
  const authHint = [401, 403].includes(response.status)
    ? ' Iniciá sesión con credenciales reales; el acceso de prueba desde la consola no autoriza cambios en SQL Server.'
    : '';
  const error = new Error(`${baseMessage}${authHint}`);
  error.status = response.status;
  return error;
}

export async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) throw await errorFromResponse(response);
  if (response.status === 204) return null;
  return response.json();
}

export async function requestBlob(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) throw await errorFromResponse(response);
  return response.blob();
}
