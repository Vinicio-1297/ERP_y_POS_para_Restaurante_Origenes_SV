import { request } from './http.js';

// Alertas de stock del POS: { productos: [{ productoId, estado, disponible, insumoLimitante }], insumos: [...] }
export const obtenerDisponibilidad = (signal) => request('/productos/disponibilidad', { signal });
