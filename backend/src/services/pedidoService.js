// Lógica de negocio del POS. Aquí NO hay SQL: las consultas viven en repositories/.
const { ejecutarEnTransaccion } = require('../config/transaccion');
const correlativoRepository = require('../repositories/correlativoRepository');
const pedidoRepository = require('../repositories/pedidoRepository');
const productoRepository = require('../repositories/productoRepository');
const { httpError } = require('../utils/httpError');
const { agruparItems, calcularTotales, formatearNumero } = require('../utils/totales');
const { rangoDeFechas } = require('../utils/fechas');

// Hasta que Back B agregue sucursales al login, todo el POS trabaja con una sola.
const SUCURSAL_DEFECTO = 'Restaurante';

// Solo referencia visual para "Pedido #0001". El número definitivo lo asigna crearPedido.
async function obtenerProximoNumero(sucursal = SUCURSAL_DEFECTO) {
  const ultimo = await correlativoRepository.obtenerUltimo('pedido', sucursal);
  return { numero: formatearNumero((ultimo ?? 0) + 1) };
}

async function siguienteCorrelativo(tipo, sucursal, transaccion) {
  const numero = await correlativoRepository.incrementar(tipo, sucursal, transaccion);

  if (numero === null) {
    throw new Error(`Correlativo "${tipo}" no configurado para la sucursal "${sucursal}". Ejecuta npm run db:pos`);
  }

  return numero;
}

// datos: body ya validado por Zod. contexto: { usuarioId, sucursal } (salen del token JWT).
async function crearPedido(datos, { usuarioId = null, sucursal = SUCURSAL_DEFECTO } = {}) {
  const itemsAgrupados = agruparItems(datos.items);

  // Todo lo que sigue es "todo o nada": si algo falla se deshace y no se gasta ningún correlativo.
  return ejecutarEnTransaccion(async (transaccion) => {
    // 1. Traer los productos del pedido (los precios SIEMPRE vienen de la base, nunca del front).
    const productos = await productoRepository.buscarPorIds(
      itemsAgrupados.map((item) => item.productoId),
      transaccion,
    );
    const productosPorId = new Map(productos.map((producto) => [producto.id, producto]));

    // 2. Validar que todos existan y armar las líneas con el precio real.
    const lineas = itemsAgrupados.map((item) => {
      const producto = productosPorId.get(item.productoId);
      if (!producto) {
        throw httpError(400, `El producto ${item.productoId} no existe o no está disponible`);
      }
      return { ...producto, productoId: item.productoId, cantidad: item.cantidad };
    });

    // 3. Calcular subtotal, IVA (13%) y total en el servidor.
    const { subtotalCents, ivaCents, totalCents } = calcularTotales(lineas);

    // TODO (decisión del equipo): aquí se llamará a descontarStockPorVenta(transaccion, lineas) de Back C
    //   y se validará que la caja esté abierta (409 si está cerrada) con el módulo de Back D.

    // 4. Correlativos: número de pedido y número del comprobante (cada tipo con su propio contador).
    const numero = await siguienteCorrelativo('pedido', sucursal, transaccion);
    const numeroComprobante = await siguienteCorrelativo(datos.tipoComprobante, sucursal, transaccion);

    // 5. Guardar el pedido y su detalle.
    const { id, fecha } = await pedidoRepository.insertar(
      {
        numero,
        sucursal,
        tipoServicio: datos.tipoServicio,
        tipoComprobante: datos.tipoComprobante,
        numeroComprobante,
        metodoPago: datos.metodoPago,
        proveedorDigital: datos.proveedorDigital,
        subtotalCents,
        ivaCents,
        totalCents,
        usuarioId,
      },
      transaccion,
    );

    for (const linea of lineas) {
      await pedidoRepository.insertarDetalle(
        {
          pedidoId: id,
          productoId: linea.productoId,
          nombre: linea.nombre,
          cantidad: linea.cantidad,
          precioUnitCents: linea.precioCents,
          subtotalCents: linea.precioCents * linea.cantidad,
        },
        transaccion,
      );
    }

    return {
      id,
      numero: formatearNumero(numero),
      subtotalCents,
      ivaCents,
      totalCents,
      fecha, // se serializa como ISO 8601 en UTC, p. ej. "2026-11-22T18:09:00.000Z"
      // Campos extra (no están en el contrato original) útiles para imprimir el comprobante:
      tipoComprobante: datos.tipoComprobante,
      numeroComprobante: formatearNumero(numeroComprobante, 6),
    };
  });
}

// Da formato de salida a una fila de la base: números con ceros a la izquierda.
function darFormato(fila) {
  return {
    ...fila,
    numero: formatearNumero(fila.numero),
    numeroComprobante: formatearNumero(fila.numeroComprobante, 6),
  };
}

// filtros: ya validados por Zod (texto). Devuelve { total, pagina, limite, pedidos }.
async function listarPedidos(filtros = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;

  let rango;
  try {
    rango = rangoDeFechas(filtros.desde, filtros.hasta);
  } catch (error) {
    throw httpError(400, error.message);
  }

  const { filas, total } = await pedidoRepository.listar({
    sucursal: filtros.sucursal,
    desde: rango.desde,
    hasta: rango.hasta,
    tipoComprobante: filtros.tipoComprobante,
    metodoPago: filtros.metodoPago,
    estado: filtros.estado,
    offset: (pagina - 1) * limite,
    limite,
  });

  return { total, pagina, limite, pedidos: filas.map(darFormato) };
}

// Un pedido con sus líneas. 404 si no existe.
async function obtenerPedido(id) {
  const pedido = await pedidoRepository.obtenerPorId(id);
  if (!pedido) {
    throw httpError(404, 'Pedido no encontrado');
  }

  const items = await pedidoRepository.obtenerDetalle(id);
  return { ...darFormato(pedido), items };
}

// Anula el pedido (no lo borra). 404 si no existe, 409 si ya estaba anulado.
async function anularPedido(id, { usuarioId = null, motivo } = {}) {
  return ejecutarEnTransaccion(async (transaccion) => {
    const anulado = await pedidoRepository.anular({ id, usuarioId, motivo }, transaccion);

    if (!anulado) {
      const existente = await pedidoRepository.obtenerPorId(id, transaccion);
      if (!existente) {
        throw httpError(404, 'Pedido no encontrado');
      }
      throw httpError(409, 'El pedido ya estaba anulado');
    }

    // TODO (Back C): aquí se devolverá el stock de cada línea (revertirStockPorAnulacion(transaccion, lineas)).
    //   Va dentro de esta transacción para que la anulación y la devolución de stock sean "todo o nada".
    // Los correlativos (pedido y comprobante) NO se reutilizan: el documento anulado sigue existiendo.

    const pedido = await pedidoRepository.obtenerPorId(id, transaccion);
    return darFormato(pedido);
  });
}

module.exports = {
  SUCURSAL_DEFECTO,
  obtenerProximoNumero,
  crearPedido,
  listarPedidos,
  obtenerPedido,
  anularPedido,
};
