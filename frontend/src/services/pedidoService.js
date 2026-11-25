const apiUrl = import.meta.env.VITE_API_URL || '/api';

export async function crearPedido(pedido, signal) {
  const token = sessionStorage.getItem('origenes.token');
  const response = await fetch(`${apiUrl}/pedidos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(pedido),
    signal,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `No se pudo registrar la venta (HTTP ${response.status})`);
  }

  return result;
}