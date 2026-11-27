import { request, requestBlob } from './http.js';

export const crearPedido = (pedido, signal) =>
  request('/pedidos', {
    method: 'POST',
    body: JSON.stringify(pedido),
    signal,
  });

export const obtenerProximoNumero = async (signal) => {
  const result = await request('/pedidos/proximo-numero', { signal });
  return result.numero;
};
// Abre el PDF del pedido en otra pestaña. formato: 'comprobante' (A4) o 'ticket'.
// La pestaña se abre antes de pedir el PDF para que el navegador no la bloquee como ventana emergente.
export async function abrirPdfPedido(id, formato = 'comprobante') {
  const ruta = formato === 'ticket' ? 'ticket' : 'comprobante';
  const ventana = window.open('', '_blank');

  try {
    const blob = await requestBlob(`/pedidos/${id}/${ruta}`);
    const url = URL.createObjectURL(blob);

    if (ventana) ventana.location.href = url;
    else window.open(url, '_blank');

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    ventana?.close();
    throw error;
  }
}
