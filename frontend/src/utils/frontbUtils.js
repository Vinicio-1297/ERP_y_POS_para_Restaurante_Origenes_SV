// Utilidades exclusivas de Front B. No modifican las utilidades compartidas con POS.
export const STORE_KEYS = Object.freeze({
  inventario: 'origenes_inventario_feature_v1',
  recetas: 'origenes_recetas_feature_v1',
  compras: 'origenes_compras_feature_v1',
  proveedores: 'origenes_proveedores_feature_v1',
  cuentas: 'origenes_frontb_cuentas_por_pagar_v1',
});

export function loadRows(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRows(key, rows) {
  // El almacenamiento local es temporal; Back C implementará la persistencia real.
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent('frontb:changed', { detail: { key } }));
    return true;
  } catch (error) {
    console.error('No se pudo guardar Front B en este navegador:', error);
    return false;
  }
}

export function subscribeRows(key, callback) {
  const onChange = (event) => { if (event.detail?.key === key) callback(); };
  const onStorage = (event) => { if (event.key === key) callback(); };
  window.addEventListener('frontb:changed', onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('frontb:changed', onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export const newFrontBId = (prefix = 'frontb') =>
  globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Convierte dólares escritos como texto a centavos ENTEROS, sin multiplicaciones de float.
// null indica entrada inválida; 0 es válido si el campo lo permite.
export function dollarsToCents(input) {
  const value = String(input ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, decimals = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

// Compatibilidad con los registros anteriores que usaban dólares decimales.
export function oldDollarsToCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

export function formatMoney(cents) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
}

export function centsFor(entity, centsField, oldField) {
  return Number.isSafeInteger(entity?.[centsField]) && entity[centsField] >= 0
    ? entity[centsField]
    : oldDollarsToCents(entity?.[oldField]);
}

export function validQuantity(qty, unit, allowZero = false) {
  const value = Number(qty);
  return String(qty ?? '').trim() !== '' && Number.isFinite(value) &&
    (allowZero ? value >= 0 : value > 0) &&
    (unit !== 'unidad' || Number.isInteger(value));
}

export function suggestedPurchase(item) {
  const min = Number(item.minimo) || 0;
  const stock = Number(item.stock) || 0;
  // Meta orientativa: volver a 2 x el mínimo, o 1 unidad si mínimo es cero.
  const target = min > 0 ? min * 2 : 1;
  const missing = Math.max(0, target - stock);
  const rounded = item.unidad === 'unidad' ? Math.ceil(missing) : Math.ceil(missing * 1000) / 1000;
  return rounded;
}
