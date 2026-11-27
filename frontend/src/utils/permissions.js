const ROLES = {
  ADMIN: 'administrador',
  MANAGER: 'gerente',
  CASHIER: 'cajero',
};

const MODULES = {
  POS: 'pos',
  INVENTARIO: 'inventario',
  RECETAS: 'recetas',
  COMPRAS: 'compras',
  PROVEEDORES: 'proveedores',
  CUENTAS_POR_PAGAR: 'cuentas-por-pagar',
  CAJA: 'caja',
  RRHH: 'rrhh',
};

export function getCurrentUser() {
  try {
    return JSON.parse(
      sessionStorage.getItem('origenes.usuario')
    ) || null;
  } catch {
    return null;
  }
}

export function getCurrentRole() {
  return getCurrentUser()?.rol?.toLowerCase() || null;
}

export function isAdmin() {
  return getCurrentRole() === ROLES.ADMIN;
}

export function isManager() {
  return getCurrentRole() === ROLES.MANAGER;
}

export function isCashier() {
  return getCurrentRole() === ROLES.CASHIER;
}

// Acceso de visualización a los módulos.
export function canAccessModule(module) {
  const role = getCurrentRole();

  if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true;
  }

  if (role === ROLES.CASHIER) {
    return module === MODULES.POS || module === MODULES.CAJA;
  }

  return false;
}

// Permiso para realizar pedidos.
export function canCreateOrders() {
  return (
    isAdmin() ||
    isManager() ||
    isCashier()
  );
}

// Permisos del inventario.
export function canCreateInventoryArticle() {
  return isAdmin() || isManager();
}

export function canEditInventoryArticle() {
  return isAdmin();
}

export function canDeleteInventoryArticle() {
  return isAdmin();
}

// Permisos generales de modificación.
export function canEdit() {
  return isAdmin();
}

export function canDelete() {
  return isAdmin();
}

export function canManage() {
  return isAdmin();
}

// Compras: administrador y gerente reciben; solo el administrador anula.
export function canReceivePurchases() {
  return isAdmin() || isManager();
}

export function canCancelPurchases() {
  return isAdmin();
}

// Administrador y gerente pueden registrar abonos.
export function canRegisterPayments() {
  return isAdmin() || isManager();
}

// Permiso para agregar información administrativa.
export function canCreate(module) {
  if (isAdmin()) return true;

  if (
    isManager() &&
    (
      module === MODULES.INVENTARIO ||
      module === MODULES.COMPRAS ||
      module === MODULES.CUENTAS_POR_PAGAR
    )
  ) {
    return true;
  }

  if (module === MODULES.POS) {
    return canCreateOrders();
  }

  return false;
}

export { ROLES, MODULES };