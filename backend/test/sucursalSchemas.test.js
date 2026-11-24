const test = require('node:test');
const assert = require('node:assert/strict');

const {
    crearSucursalSchema,
    actualizarSucursalSchema,
    sucursalIdSchema
} = require('../src/schemas/sucursalSchemas');

// Comprueba que se puede registrar una sucursal
test('permite crear una sucursal válida', () => {
    const resultado = crearSucursalSchema.safeParse({
        nombre: 'Sucursal de Prueba',
        direccion: 'San Salvador',
        telefono: '2222-3333'
    });

    assert.equal(resultado.success, true);
});

test('permite crear una sucursal sin teléfono', () => {
    const resultado = crearSucursalSchema.safeParse({
        nombre: 'Sucursal de Prueba',
        direccion: 'San Salvador'
    });

    assert.equal(resultado.success, true);
});

test('rechaza una sucursal sin nombre', () => {
    const resultado = crearSucursalSchema.safeParse({
        direccion: 'San Salvador'
    });

    assert.equal(resultado.success, false);
});

test('rechaza una dirección vacía', () => {
    const resultado = crearSucursalSchema.safeParse({
        nombre: 'Sucursal de Prueba',
        direccion: ''
    });

    assert.equal(resultado.success, false);
});

test('permite actualizar la dirección y el teléfono', () => {
    const resultado = actualizarSucursalSchema.safeParse({
        direccion: 'Santa Tecla',
        telefono: '2222-4444'
    });

    assert.equal(resultado.success, true);
});

// Evita inconsistencias con las tablas del POS
test('rechaza modificar el nombre de una sucursal', () => {
    const resultado = actualizarSucursalSchema.safeParse({
        nombre: 'Nuevo nombre'
    });

    assert.equal(resultado.success, false);
});

test('rechaza una actualización vacía', () => {
    const resultado = actualizarSucursalSchema.safeParse({});

    assert.equal(resultado.success, false);
});

test('acepta un ID válido', () => {
    const resultado = sucursalIdSchema.safeParse({
        id: '2'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.id, 2);
});

test('rechaza un ID igual a cero', () => {
    const resultado = sucursalIdSchema.safeParse({
        id: '0'
    });

    assert.equal(resultado.success, false);
});