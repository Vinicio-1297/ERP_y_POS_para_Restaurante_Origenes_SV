
// Logica de negocio del POS.
const { ejecutarEnTransaccion } = require('../config/transaccion');
const correlativoRepository = require('../repositories/correlativoRepository');
const pedidoRepository = require('../repositories/pedidoRepository');
const productoRepository = require('../repositories/productoRepository');
const clienteRepository = require('../repositories/clienteRepository');
const recetaRepository = require('../repositories/recetaRepository');
const inventarioRepository = require('../repositories/inventarioRepository');
const inventarioService = require('./inventarioService');

const { httpError } = require('../utils/httpError');
const {
  agruparItems,
  calcularTotales,
  formatearNumero
} = require('../utils/totales');
const { rangoDeFechas } = require('../utils/fechas');

const SUCURSAL_DEFECTO = 'Restaurante';

// Por ahora el POS trabaja con la sucursal Restaurante.
const SUCURSAL_INVENTARIO_ID = 1;

// Obtener el siguiente numero visual del pedido.
async function obtenerProximoNumero(sucursal = SUCURSAL_DEFECTO) {
  const ultimo = await correlativoRepository.obtenerUltimo(
    'pedido',
    sucursal
  );

  return {
    numero: formatearNumero((ultimo ?? 0) + 1)
  };
}

async function siguienteCorrelativo(tipo, sucursal, transaccion) {
  const numero = await correlativoRepository.incrementar(
    tipo,
    sucursal,
    transaccion
  );

  if (numero === null) {
    throw new Error(
      `Correlativo "${tipo}" no configurado para la sucursal "${sucursal}". Ejecuta npm run db:pos`
    );
  }

  return numero;
}

// Validar al cliente y obtener sus datos para el comprobante.
async function obtenerDatosCliente(datos) {
  if (datos.clienteId == null) {
    if (datos.tipoComprobante === 'credito-fiscal') {
      throw httpError(400, 'El credito fiscal requiere un cliente');
    }

    return {};
  }

  const cliente = await clienteRepository.buscarPorId(datos.clienteId);

  if (!cliente || !cliente.activo) {
    throw httpError(404, 'Cliente no encontrado o inactivo');
  }

  if (datos.tipoComprobante === 'credito-fiscal') {
    const campos = [
      cliente.nombre,
      cliente.nit,
      cliente.nrc,
      cliente.giro,
      cliente.direccion,
    ];

    if (campos.some((campo) => !campo || !campo.trim())) {
      throw httpError(
        400,
        'El cliente no tiene sus datos fiscales completos'
      );
    }
  }

  return {
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    clienteNit: cliente.nit,
    clienteNrc: cliente.nrc,
    clienteGiro: cliente.giro,
    clienteDireccion: cliente.direccion,
  };
}

// Calcular y descontar los ingredientes de las recetas.
async function descontarIngredientes(
  lineas,
  pedidoId,
  usuarioId,
  transaccion
) {
  const productosElaborados = lineas.filter(
    (linea) => linea.tipoProducto === 'elaborado'
  );

  const productosReventa = lineas.filter(
    (linea) => linea.tipoProducto === 'reventa'
  );

  if (
    productosElaborados.length + productosReventa.length !== lineas.length
  ) {
    throw httpError(
      409,
      'Existe un producto sin tipo valido. Verifica tipo_producto.'
    );
  }

  if (productosElaborados.length === 0) {
    return;
  }

  const ids = productosElaborados.map(
    (producto) => producto.productoId
  );

  const detalles = await recetaRepository.obtenerPorProductos(
    ids,
    transaccion
  );

  const productosConReceta = new Set(
    detalles.map((detalle) => detalle.productoId)
  );

  for (const producto of productosElaborados) {
    if (!productosConReceta.has(producto.productoId)) {
      throw httpError(
        409,
        `El producto "${producto.nombre}" no tiene una receta activa con ingredientes`
      );
    }
  }

  // Agrupar el consumo por insumo para no descontar varias veces
  // el mismo ingrediente cuando aparece en distintas recetas.
  const consumos = new Map();

  for (const detalle of detalles) {
    const linea = productosElaborados.find(
      (producto) => producto.productoId === detalle.productoId
    );

    if (!linea) {
      continue;
    }

    const rendimiento = Number(detalle.rendimiento);
    const cantidadReceta = Number(detalle.cantidad);

    if (
      !Number.isFinite(rendimiento) ||
      rendimiento <= 0 ||
      !Number.isFinite(cantidadReceta) ||
      cantidadReceta <= 0
    ) {
      throw httpError(
        409,
        `La receta del producto "${linea.nombre}" tiene cantidades invalidas`
      );
    }

    // Cantidad del ingrediente por unidad vendida.
    const consumo =
      (cantidadReceta / rendimiento) * linea.cantidad;

    const anterior = consumos.get(detalle.insumoId) ?? 0;

    consumos.set(detalle.insumoId, anterior + consumo);
  }

  // Aplicar movimientos en orden estable para reducir conflictos.
  const insumosOrdenados = [...consumos.entries()]
    .sort((a, b) => a[0] - b[0]);

  for (const [insumoId, consumoOriginal] of insumosOrdenados) {
    const consumo = Math.round(consumoOriginal * 1000) / 1000;

    if (
      !Number.isFinite(consumo) ||
      consumo <= 0 ||
      Math.abs(consumoOriginal - consumo) > 0.0000001
    ) {
      throw httpError(
        409,
        `El consumo calculado del insumo ${insumoId} supera la precision permitida de 3 decimales`
      );
    }

    await inventarioService.aplicarMovimiento(
      {
        insumoId,
        sucursalId: SUCURSAL_INVENTARIO_ID,
        usuarioId,
        tipo: 'salida',
        cantidad: consumo,
        referenciaTipo: 'pedido',
        referenciaId: pedidoId,
        motivo: 'Consumo de ingredientes por venta',
      },
      transaccion
    );
  }
}

// Crear un pedido y descontar inventario en una sola transaccion.
async function crearPedido(
  datos,
  { usuarioId = null, sucursal = SUCURSAL_DEFECTO } = {}
) {
  const itemsAgrupados = agruparItems(datos.items);
  const datosCliente = await obtenerDatosCliente(datos);

  return ejecutarEnTransaccion(async (transaccion) => {
    // 1. Consultar productos activos y sus precios reales.
    const productos = await productoRepository.buscarPorIds(
      itemsAgrupados.map((item) => item.productoId),
      transaccion
    );

    const productosPorId = new Map(
      productos.map((producto) => [producto.id, producto])
    );

    // 2. Validar productos y preparar lineas.
    const lineas = itemsAgrupados.map((item) => {
      const producto = productosPorId.get(item.productoId);

      if (!producto) {
        throw httpError(
          400,
          `El producto ${item.productoId} no existe o no esta disponible`
        );
      }

      return {
        ...producto,
        productoId: item.productoId,
        cantidad: item.cantidad,
      };
    });

    // 3. Calcular subtotal, IVA y total.
    const {
      subtotalCents,
      ivaCents,
      totalCents
    } = calcularTotales(lineas);

    // 4. Obtener correlativos.
    const numero = await siguienteCorrelativo(
      'pedido',
      sucursal,
      transaccion
    );

    const numeroComprobante = await siguienteCorrelativo(
      datos.tipoComprobante,
      sucursal,
      transaccion
    );

    // 5. Insertar encabezado del pedido.
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
        ...datosCliente,
      },
      transaccion
    );

    // 6. Insertar detalle.
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
        transaccion
      );
    }

    // 7. Descontar ingredientes de productos elaborados.
    await descontarIngredientes(
      lineas,
      id,
      usuarioId,
      transaccion
    );

    return {
      id,
      numero: formatearNumero(numero),
      subtotalCents,
      ivaCents,
      totalCents,
      fecha,
      tipoComprobante: datos.tipoComprobante,
      numeroComprobante: formatearNumero(numeroComprobante, 6),
    };
  });
}

// Dar formato de salida a una fila de pedido.
function darFormato(fila) {
  return {
    ...fila,
    numero: formatearNumero(fila.numero),
    numeroComprobante: formatearNumero(
      fila.numeroComprobante,
      6
    ),
  };
}

// Listar pedidos con filtros y paginacion.
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

  return {
    total,
    pagina,
    limite,
    pedidos: filas.map(darFormato),
  };
}

// Obtener un pedido con sus lineas.
async function obtenerPedido(id) {
  const pedido = await pedidoRepository.obtenerPorId(id);

  if (!pedido) {
    throw httpError(404, 'Pedido no encontrado');
  }

  const items = await pedidoRepository.obtenerDetalle(id);

  return {
    ...darFormato(pedido),
    items,
  };
}

// Devolver exactamente los ingredientes descontados por la venta.
async function devolverIngredientes(
  pedidoId,
  usuarioId,
  transaccion
) {
  const movimientos =
    await inventarioRepository.listarSalidasPorPedido(
      pedidoId,
      transaccion
    );

  for (const movimiento of movimientos) {
    await inventarioService.aplicarMovimiento(
      {
        insumoId: movimiento.insumoId,
        sucursalId: movimiento.sucursalId,
        usuarioId,
        tipo: 'devolucion',
        cantidad: Number(movimiento.cantidad),
        referenciaTipo: 'pedido',
        referenciaId: pedidoId,
        motivo: 'Devolucion de ingredientes por anulacion',
      },
      transaccion
    );
  }
}

// Anular un pedido y devolver sus ingredientes.
async function anularPedido(
  id,
  { usuarioId = null, motivo } = {}
) {
  return ejecutarEnTransaccion(async (transaccion) => {
    const anulado = await pedidoRepository.anular(
      { id, usuarioId, motivo },
      transaccion
    );

    if (!anulado) {
      const existente = await pedidoRepository.obtenerPorId(
        id,
        transaccion
      );

      if (!existente) {
        throw httpError(404, 'Pedido no encontrado');
      }

      throw httpError(409, 'El pedido ya estaba anulado');
    }

    // Devolver los movimientos originales de la venta.
    await devolverIngredientes(
      id,
      usuarioId,
      transaccion
    );

    const pedido = await pedidoRepository.obtenerPorId(
      id,
      transaccion
    );

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
