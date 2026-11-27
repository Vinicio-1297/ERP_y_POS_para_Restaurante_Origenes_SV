const test = require('node:test');
const assert = require('node:assert/strict');

const {
    crearClienteSchema,
    actualizarClienteSchema,
    clienteIdSchema
} = require('../src/schemas/clienteSchemas');

// Comprueba que se puede registrar un cliente con datos fiscales
test('permite crear un cliente con datos fiscales', () => {
    const resultado = crearClienteSchema.safeParse({
        nombre: 'Empresa de Prueba',
        nit: '0614-123456-101-1',
        nrc: '123456-7',
        giro: 'Servicios informáticos',
        direccion: 'San Salvador'
    });

    assert.equal(resultado.success, true);
});

// Los datos fiscales son opcionales para clientes normales
test('permite crear un cliente sin datos fiscales', () => {
    const resultado = crearClienteSchema.safeParse({
        nombre: 'Cliente normal'
    });

    assert.equal(resultado.success, true);
});

test('rechaza un nombre vacío', () => {
    const resultado = crearClienteSchema.safeParse({
        nombre: ''
    });

    assert.equal(resultado.success, false);
});

test('rechaza un correo inválido', () => {
    const resultado = crearClienteSchema.safeParse({
        nombre: 'Cliente',
        correo: 'correo-invalido'
    });

    assert.equal(resultado.success, false);
});

test('permite actualizar únicamente el teléfono', () => {
    const resultado = actualizarClienteSchema.safeParse({
        telefono: '2222-1111'
    });

    assert.equal(resultado.success, true);
});

test('rechaza una actualización vacía', () => {
    const resultado = actualizarClienteSchema.safeParse({});

    assert.equal(resultado.success, false);
});

test('acepta un ID válido', () => {
    const resultado = clienteIdSchema.safeParse({
        id: '1'
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.data.id, 1);
});

test('rechaza un ID negativo', () => {
    const resultado = clienteIdSchema.safeParse({
        id: '-1'
    });

    assert.equal(resultado.success, false);
});