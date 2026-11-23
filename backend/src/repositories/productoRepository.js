// Acceso a datos de productos: solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

// El texto ignora tildes y mayúsculas gracias al collation Latin1_General_CI_AI
// (CI = case insensitive, AI = accent insensitive), así "te" encuentra "Té".
// "texto" ya debe venir con los comodines del LIKE escapados (ver escaparLike en utils/totales.js).
async function buscar({ categoriaId, textoLike } = {}, transaccion) {
  const request = await crearRequest(transaccion);

  // Solo se agregan condiciones fijas; los valores del usuario van SIEMPRE como parámetros (@...).
  const condiciones = ['p.activo = 1'];

  if (categoriaId) {
    request.input('categoriaId', sql.Int, categoriaId);
    condiciones.push('p.categoria_id = @categoriaId');
  }

  if (textoLike) {
    request.input('texto', sql.NVarChar(120), `%${textoLike}%`);
    condiciones.push("p.nombre COLLATE Latin1_General_CI_AI LIKE @texto ESCAPE '\\'");
  }

  const resultado = await request.query(`
    SELECT p.id,
           p.nombre,
           p.precio_cents AS precioCents,
           p.categoria_id AS categoriaId,
           p.imagen_url   AS imagenUrl,
           p.sucursal
    FROM dbo.productos p
    WHERE ${condiciones.join(' AND ')}
    ORDER BY p.id
  `);

  return resultado.recordset;
}

// Productos activos con esos ids (los que no existan simplemente no vienen en el resultado).
async function buscarPorIds(ids, transaccion) {
  const request = await crearRequest(transaccion);

  // Los marcadores @p0, @p1... los genera este código; los valores van como parámetros.
  const marcadores = ids.map((id, indice) => {
    request.input(`p${indice}`, sql.Int, id);
    return `@p${indice}`;
  });

  const resultado = await request.query(`
    SELECT id, nombre, precio_cents AS precioCents
    FROM dbo.productos
    WHERE activo = 1 AND id IN (${marcadores.join(', ')})
  `);

  return resultado.recordset;
}

module.exports = { buscar, buscarPorIds };
