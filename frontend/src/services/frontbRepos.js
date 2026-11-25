import { STORE_KEYS, loadRows, saveRows } from '../utils/frontbUtils.js';

export const inventarioService = {
  list: () => loadRows(STORE_KEYS.inventario),
  save: (rows) => saveRows(STORE_KEYS.inventario, rows),
};
export const recetasService = {
  list: () => loadRows(STORE_KEYS.recetas),
  save: (rows) => saveRows(STORE_KEYS.recetas, rows),
};
export const comprasService = {
  list: () => loadRows(STORE_KEYS.compras),
  save: (rows) => saveRows(STORE_KEYS.compras, rows),
};
export const proveedoresService = {
  list: () => loadRows(STORE_KEYS.proveedores),
  save: (rows) => saveRows(STORE_KEYS.proveedores, rows),
};
export const cuentasPorPagarService = {
  list: () => loadRows(STORE_KEYS.cuentas),
  save: (rows) => saveRows(STORE_KEYS.cuentas, rows),
};
