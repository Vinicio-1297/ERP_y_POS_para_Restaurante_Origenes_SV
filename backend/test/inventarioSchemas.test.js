const test = require('node:test');
const assert = require('node:assert/strict');

const {
    inventarioIdSchema,
    inventarioQuerySchema,
    crearInsumoSchema,
    actualizarInsumoSchema,
    ajusteInventarioSchema,
    stockMinimoSchema,
    movimientosQuerySchema
} = require('../src/schemas/inventarioSchemas');

// datos base para las pruebas
const insumoBase = {
    nombre: 'Harina de maiz',
    tipo: 'insumo',
    categoria: 'Granos y harinas',
    unidad: 'g',
    stockMinimo: 500
};

const reventaBase = {
    nombre: 'Botella de agua',
    tipo: 'reventa',
    categoria: 'Bebidas',
    unidad: 'unidad',
    codigo: 'AGUA001',
    precioVentaCents: 100,
    stockMinimo: 10
};

const ajusteBase = {
    sucursalId: 1,
    tipo: 'ajuste_entrada',
    cantidad: 1000,
    motivo: 'Carga de inventario'
};

// pruebas de registro de articulos
test('permite crear un insumo valido', () => {
    const resultado = crearInsumoSchema.safeParse(insumoBase);

    assert.equal(resultado.success, true);
});

test('permite crear un articulo de reventa valido', () => {
    const resultado = crearInsumoSchema.safeParse(reventaBase);

    assert.equal(resultado.success, true);
});

test('asigna valores predeterminados al crear un insumo', () => {
    const resultado = crearInsumoSchema.safeParse({
        nombre: 'Harina',
        categoria: 'Granos y harinas',
        unidad: 'g'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.tipo, 'insumo');
    assert.equal(resultado.data.stockMinimo, 0);
});

test('rechaza un articulo sin nombre', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        nombre: ''
    });

    assert.equal(resultado.success, false);
});

test('rechaza una categoria vacia', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        categoria: ''
    });

    assert.equal(resultado.success, false);
});

test('rechaza un tipo de articulo invalido', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        tipo: 'desconocido'
    });

    assert.equal(resultado.success, false);
});

test('rechaza una unidad de medida invalida', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        unidad: 'caja'
    });

    assert.equal(resultado.success, false);
});

test('rechaza un stock minimo negativo', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        stockMinimo: -100
    });

    assert.equal(resultado.success, false);
});

test('permite un stock minimo con tres decimales', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        unidad: 'kg',
        stockMinimo: 1.125
    });

    assert.equal(resultado.success, true);
});

test('rechaza un stock minimo con mas de tres decimales', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        stockMinimo: 1.1234
    });

    assert.equal(resultado.success, false);
});

test('rechaza cantidades fraccionarias por unidad', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...reventaBase,
        stockMinimo: 2.5
    });

    assert.equal(resultado.success, false);
});

test('rechaza un articulo de reventa sin codigo', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...reventaBase,
        codigo: undefined
    });

    assert.equal(resultado.success, false);
});

test('rechaza un articulo de reventa sin precio', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...reventaBase,
        precioVentaCents: undefined
    });

    assert.equal(resultado.success, false);
});

test('rechaza un precio de venta igual a cero', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...reventaBase,
        precioVentaCents: 0
    });

    assert.equal(resultado.success, false);
});

test('rechaza datos de reventa en un insumo', () => {
    const resultado = crearInsumoSchema.safeParse({
        ...insumoBase,
        codigo: 'HARINA001',
        precioVentaCents: 100
    });

    assert.equal(resultado.success, false);
});

// pruebas de actualizacion de articulos
test('permite actualizar el nombre y la categoria', () => {
    const resultado = actualizarInsumoSchema.safeParse({
        nombre: 'Harina integral',
        categoria: 'Harinas'
    });

    assert.equal(resultado.success, true);
});

test('rechaza una actualizacion vacia', () => {
    const resultado = actualizarInsumoSchema.safeParse({});

    assert.equal(resultado.success, false);
});

test('rechaza modificar la unidad de medida', () => {
    const resultado = actualizarInsumoSchema.safeParse({
        unidad: 'kg'
    });

    assert.equal(resultado.success, false);
});

test('rechaza modificar el tipo de articulo', () => {
    const resultado = actualizarInsumoSchema.safeParse({
        tipo: 'reventa'
    });

    assert.equal(resultado.success, false);
});

test('rechaza modificar existencias directamente', () => {
    const resultado = actualizarInsumoSchema.safeParse({
        cantidad: 500
    });

    assert.equal(resultado.success, false);
});

// pruebas de ajustes de inventario
test('permite registrar una entrada de inventario', () => {
    const resultado = ajusteInventarioSchema.safeParse(ajusteBase);

    assert.equal(resultado.success, true);
});

test('permite registrar una salida de inventario', () => {
    const resultado = ajusteInventarioSchema.safeParse({
        ...ajusteBase,
        tipo: 'ajuste_salida'
    });

    assert.equal(resultado.success, true);
});

test('rechaza un ajuste con cantidad igual a cero', () => {
    const resultado = ajusteInventarioSchema.safeParse({
        ...ajusteBase,
        cantidad: 0
    });

    assert.equal(resultado.success, false);
});

test('rechaza un ajuste con cantidad negativa', () => {
    const resultado = ajusteInventarioSchema.safeParse({
        ...ajusteBase,
        cantidad: -500
    });

    assert.equal(resultado.success, false);
});

test('rechaza un ajuste sin motivo', () => {
    const resultado = ajusteInventarioSchema.safeParse({
        ...ajusteBase,
        motivo: ''
    });

    assert.equal(resultado.success, false);
});

test('rechaza un ajuste con tipo invalido', () => {
    const resultado = ajusteInventarioSchema.safeParse({
        ...ajusteBase,
        tipo: 'devolucion'
    });

    assert.equal(resultado.success, false);
});

test('rechaza un ajuste con sucursal invalida', () => {
    const resultado = ajusteInventarioSchema.safeParse({
        ...ajusteBase,
        sucursalId: 0
    });

    assert.equal(resultado.success, false);
});

// pruebas de stock minimo
test('permite modificar el stock minimo', () => {
    const resultado = stockMinimoSchema.safeParse({
        sucursalId: 1,
        stockMinimo: 500
    });

    assert.equal(resultado.success, true);
});

test('permite establecer el stock minimo en cero', () => {
    const resultado = stockMinimoSchema.safeParse({
        sucursalId: 1,
        stockMinimo: 0
    });

    assert.equal(resultado.success, true);
});

test('rechaza modificar el stock minimo con un valor negativo', () => {
    const resultado = stockMinimoSchema.safeParse({
        sucursalId: 1,
        stockMinimo: -100
    });

    assert.equal(resultado.success, false);
});

// pruebas de identificadores
test('acepta un identificador valido', () => {
    const resultado = inventarioIdSchema.safeParse({
        id: '1'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.id, 1);
});

test('rechaza un identificador igual a cero', () => {
    const resultado = inventarioIdSchema.safeParse({
        id: '0'
    });

    assert.equal(resultado.success, false);
});

test('rechaza un identificador fuera del rango de sql server', () => {
    const resultado = inventarioIdSchema.safeParse({
        id: '2147483648'
    });

    assert.equal(resultado.success, false);
});

// pruebas de filtros
test('permite consultar el inventario sin filtros', () => {
    const resultado = inventarioQuerySchema.safeParse({});

    assert.equal(resultado.success, true);
});

test('permite filtrar por sucursal y tipo de articulo', () => {
    const resultado = inventarioQuerySchema.safeParse({
        sucursalId: '1',
        tipo: 'insumo'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.sucursalId, 1);
});

test('convierte correctamente el filtro activo verdadero', () => {
    const resultado = inventarioQuerySchema.safeParse({
        activo: 'true'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.activo, true);
});

test('convierte correctamente el filtro activo falso', () => {
    const resultado = inventarioQuerySchema.safeParse({
        activo: 'false'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.activo, false);
});

test('rechaza un filtro activo invalido', () => {
    const resultado = inventarioQuerySchema.safeParse({
        activo: 'incorrecto'
    });

    assert.equal(resultado.success, false);
});

test('permite consultar movimientos por sucursal', () => {
    const resultado = movimientosQuerySchema.safeParse({
        sucursalId: '1'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.sucursalId, 1);
});

test('rechaza consultar movimientos con sucursal invalida', () => {
    const resultado = movimientosQuerySchema.safeParse({
        sucursalId: '-1'
    });

    assert.equal(resultado.success, false);
});