const sql = require('mssql');
const { crearRequest } = require('./request');

// consultar los insumos de un proveedor
async function listar(proveedorId, tx) {
  const request = await crearRequest(tx);

  request.input('proveedorId', sql.Int, proveedorId);

  const resultado = await request.query(`
    select i.*
    from dbo.proveedor_insumo pi
    inner join dbo.insumos i
      on i.id = pi.insumo_id
    where pi.proveedor_id = @proveedorId
      and i.activo = 1
      and i.tipo = 'insumo'
    order by i.nombre;
  `);

  return resultado.recordset;
}

// comprobar si un proveedor suministra un insumo
async function existe(proveedorId, insumoId, tx) {
  const request = await crearRequest(tx);

  request.input('proveedorId', sql.Int, proveedorId);
  request.input('insumoId', sql.Int, insumoId);

  const resultado = await request.query(`
    select 1 as existe
    from dbo.proveedor_insumo pi with (holdlock)
    inner join dbo.insumos i with (holdlock)
      on i.id = pi.insumo_id
    where pi.proveedor_id = @proveedorId
      and pi.insumo_id = @insumoId
      and i.activo = 1
      and i.tipo = 'insumo';
  `);

  return resultado.recordset.length > 0;
}

// asignar un insumo al proveedor
async function asignar(proveedorId, insumoId, tx) {
  const request = await crearRequest(tx);

  request.input('proveedorId', sql.Int, proveedorId);
  request.input('insumoId', sql.Int, insumoId);

  await request.query(`
    insert into dbo.proveedor_insumo (
      proveedor_id,
      insumo_id
    )
    select @proveedorId, @insumoId
    where not exists (
      select 1
      from dbo.proveedor_insumo with (updlock, holdlock)
      where proveedor_id = @proveedorId
        and insumo_id = @insumoId
    );
  `);
}

// retirar un insumo del catalogo
async function retirar(proveedorId, insumoId) {
  const request = await crearRequest();

  request.input('proveedorId', sql.Int, proveedorId);
  request.input('insumoId', sql.Int, insumoId);

  await request.query(`
    delete from dbo.proveedor_insumo
    where proveedor_id = @proveedorId
      and insumo_id = @insumoId;
  `);
}

// comprobar que el insumo sea valido
async function insumoActivo(insumoId, tx) {
  const request = await crearRequest(tx);

  request.input('insumoId', sql.Int, insumoId);

  const resultado = await request.query(`
    select id
    from dbo.insumos with (holdlock)
    where id = @insumoId
      and activo = 1
      and tipo = 'insumo';
  `);

  return resultado.recordset.length > 0;
}

module.exports = {
  listar,
  existe,
  asignar,
  retirar,
  insumoActivo,
};