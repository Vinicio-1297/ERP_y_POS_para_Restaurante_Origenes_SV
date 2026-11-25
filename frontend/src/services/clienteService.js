const apiUrl = import.meta.env.VITE_API_URL || '/api';

export async function listarClientes(signal) {
  const token = sessionStorage.getItem('origenes.token');
  const response = await fetch(`${apiUrl}/clientes`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `No se pudieron cargar los clientes (HTTP ${response.status})`);
  }

  return result;
}