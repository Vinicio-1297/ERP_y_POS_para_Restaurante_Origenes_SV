
const PDFDocument = require('pdfkit');
const { obtenerPedido } = require('./pedidoService');

function formatearDinero(centavos) {
  return `$${(centavos / 100).toFixed(2)}`;
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleString('es-SV', {
    timeZone: 'America/El_Salvador',
  });
}

function obtenerTitulo(pedido) {
  return pedido.tipoComprobante === 'credito-fiscal'
    ? 'Comprobante de Crédito Fiscal'
    : 'Factura de Consumidor Final';
}

function obtenerAncho(doc) {
  return doc.page.width
    - doc.page.margins.left
    - doc.page.margins.right;
}

function obtenerLimiteInferior(doc) {
  return doc.page.height - doc.page.margins.bottom;
}

// Comprueba si existe espacio suficiente antes de dibujar contenido.
function asegurarEspacio(doc, altura) {
  if (doc.y + altura > obtenerLimiteInferior(doc)) {
    doc.addPage();
  }

  doc.x = doc.page.margins.left;
}

// Escribe utilizando todo el ancho disponible de la página.
function escribirTexto(doc, texto, opciones = {}) {
  doc.text(texto, doc.page.margins.left, doc.y, {
    width: obtenerAncho(doc),
    ...opciones,
  });
}

function dibujarEncabezado(doc, pedido, esTicket) {
  doc.font('Helvetica-Bold')
    .fontSize(esTicket ? 14 : 23);

  escribirTexto(doc, 'Orígenes SV', {
    align: 'center',
  });

  doc.font('Helvetica')
    .fontSize(10);

  escribirTexto(doc, `Sucursal: ${pedido.sucursal}`, {
    align: 'center',
  });

  doc.moveDown();

  doc.font('Helvetica-Bold')
    .fontSize(esTicket ? 11 : 17);

  escribirTexto(doc, obtenerTitulo(pedido), {
    align: 'center',
  });

  doc.moveDown();
}

function dibujarAnulacion(doc, pedido) {
  if (pedido.estado !== 'anulado') return;

  doc.fillColor('#B91C1C')
    .font('Helvetica-Bold')
    .fontSize(18);

  escribirTexto(doc, '*** COMPROBANTE ANULADO ***', {
    align: 'center',
  });

  doc.fillColor('#000000');
  doc.moveDown(0.5);

  if (pedido.motivoAnulacion) {
    doc.font('Helvetica')
      .fontSize(9);

    escribirTexto(doc, `Motivo: ${pedido.motivoAnulacion}`);
  }

  doc.moveDown();
}

function dibujarInformacion(doc, pedido) {
  doc.font('Helvetica')
    .fontSize(10);

  escribirTexto(doc, `Comprobante: ${pedido.numeroComprobante}`);
  escribirTexto(doc, `Pedido: ${pedido.numero}`);
  escribirTexto(doc, `Fecha: ${formatearFecha(pedido.fecha)}`);
  escribirTexto(doc, `Servicio: ${pedido.tipoServicio}`);
  escribirTexto(doc, `Método de pago: ${pedido.metodoPago}`);

  if (pedido.proveedorDigital) {
    escribirTexto(
      doc,
      `Proveedor digital: ${pedido.proveedorDigital}`
    );
  }

  doc.moveDown();

  // Datos fiscales almacenados al momento de la venta.
  if (pedido.tipoComprobante === 'credito-fiscal') {
    doc.font('Helvetica-Bold');

    escribirTexto(doc, 'Datos del cliente');

    doc.font('Helvetica');

    escribirTexto(
      doc,
      `Nombre: ${pedido.clienteNombre || 'No registrado'}`
    );

    escribirTexto(
      doc,
      `NIT: ${pedido.clienteNit || 'No registrado'}`
    );

    escribirTexto(
      doc,
      `NRC: ${pedido.clienteNrc || 'No registrado'}`
    );

    escribirTexto(
      doc,
      `Giro: ${pedido.clienteGiro || 'No registrado'}`
    );

    escribirTexto(
      doc,
      `Dirección: ${pedido.clienteDireccion || 'No registrada'}`
    );

    doc.moveDown();
  } else if (pedido.clienteNombre) {
    escribirTexto(doc, `Cliente: ${pedido.clienteNombre}`);
    doc.moveDown();
  }
}

function dibujarProductosTicket(doc, pedido) {
  doc.font('Helvetica-Bold')
    .fontSize(10);

  escribirTexto(doc, 'Detalle de productos');

  doc.moveDown(0.5);

  for (const item of pedido.items) {
    doc.font('Helvetica-Bold')
      .fontSize(10);

    escribirTexto(doc, item.nombre);

    doc.font('Helvetica');

    escribirTexto(
      doc,
      `${item.cantidad} x ${formatearDinero(item.precioUnitCents)}`
    );

    escribirTexto(doc, formatearDinero(item.subtotalCents), {
      align: 'right',
    });

    doc.moveDown(0.5);
  }
}

// Dibuja el encabezado de la tabla en la página actual.
function dibujarEncabezadoTabla(doc, columnas, x, ancho) {
  const y = doc.y;

  doc.rect(x, y, ancho, 25)
    .fill('#E8E8E8');

  doc.fillColor('#000000')
    .font('Helvetica-Bold')
    .fontSize(9);

  doc.text('Cant.', columnas.cantidad + 4, y + 8, {
    width: 35,
  });

  doc.text('Descripción', columnas.descripcion, y + 8, {
    width: 250,
  });

  doc.text('P. unitario', columnas.precio, y + 8, {
    width: 85,
  });

  doc.text('Subtotal', columnas.subtotal, y + 8, {
    width: 100,
  });

  doc.x = x;
  doc.y = y + 25;
}

// Identifica el pedido en las páginas adicionales.
function dibujarContinuacion(doc, pedido) {
  doc.font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000000');

  escribirTexto(doc, 'Orígenes SV', {
    align: 'center',
  });

  doc.font('Helvetica')
    .fontSize(9);

  escribirTexto(
    doc,
    `Comprobante: ${pedido.numeroComprobante} | Pedido: ${pedido.numero}`,
    { align: 'center' }
  );

  if (pedido.estado === 'anulado') {
    doc.fillColor('#B91C1C')
      .font('Helvetica-Bold');

    escribirTexto(doc, 'COMPROBANTE ANULADO', {
      align: 'center',
    });

    doc.fillColor('#000000');
  }

  doc.moveDown();
}

function dibujarProductosComprobante(doc, pedido) {
  const x = doc.page.margins.left;
  const ancho = obtenerAncho(doc);

  const columnas = {
    cantidad: x,
    descripcion: x + 42,
    precio: x + 310,
    subtotal: x + 405,
  };

  // Evita dejar el encabezado de la tabla al final de una página.
  if (doc.y + 55 > obtenerLimiteInferior(doc)) {
    doc.addPage();
    dibujarContinuacion(doc, pedido);
  }

  dibujarEncabezadoTabla(doc, columnas, x, ancho);

  for (const item of pedido.items) {
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#000000');

    const alto = Math.max(
      30,
      doc.heightOfString(item.nombre, {
        width: 250,
      }) + 16
    );

    // Si la fila no cabe, continúa en una página nueva.
    if (doc.y + alto > obtenerLimiteInferior(doc)) {
      doc.addPage();

      dibujarContinuacion(doc, pedido);
      dibujarEncabezadoTabla(doc, columnas, x, ancho);
    }

    const y = doc.y;

    doc.font('Helvetica')
      .fontSize(9);

    doc.text(String(item.cantidad), columnas.cantidad + 4, y + 8, {
      width: 35,
    });

    doc.text(item.nombre, columnas.descripcion, y + 8, {
      width: 250,
    });

    doc.text(
      formatearDinero(item.precioUnitCents),
      columnas.precio,
      y + 8,
      { width: 85 }
    );

    doc.text(
      formatearDinero(item.subtotalCents),
      columnas.subtotal,
      y + 8,
      { width: 100 }
    );

    doc.moveTo(x, y + alto)
      .lineTo(x + ancho, y + alto)
      .strokeColor('#CCCCCC')
      .stroke();

    doc.x = x;
    doc.y = y + alto;
  }

  doc.y += 15;
}

function dibujarTotales(doc, pedido) {
  doc.font('Helvetica')
    .fontSize(10);

  escribirTexto(
    doc,
    `Subtotal: ${formatearDinero(pedido.subtotalCents)}`,
    { align: 'right' }
  );

  escribirTexto(
    doc,
    `IVA (13%): ${formatearDinero(pedido.ivaCents)}`,
    { align: 'right' }
  );

  doc.font('Helvetica-Bold')
    .fontSize(15);

  escribirTexto(
    doc,
    `Total: ${formatearDinero(pedido.totalCents)}`,
    { align: 'right' }
  );
}

function dibujarPie(doc) {
  doc.moveDown(2);

  doc.font('Helvetica')
    .fontSize(10);

  escribirTexto(doc, '¡Gracias por su compra!', {
    align: 'center',
  });

  doc.moveDown();

  doc.fontSize(8);

  escribirTexto(
    doc,
    'Documento de uso académico. Sin validez fiscal.',
    { align: 'center' }
  );
}

// Dibuja todo el contenido del ticket.
function dibujarTicket(doc, pedido) {
  dibujarEncabezado(doc, pedido, true);
  dibujarAnulacion(doc, pedido);
  dibujarInformacion(doc, pedido);
  dibujarProductosTicket(doc, pedido);

  doc.moveDown();

  dibujarTotales(doc, pedido);
  dibujarPie(doc);
}

// Calcula la altura utilizando el contenido real del ticket.
function calcularAlturaTicket(pedido) {
  const temporal = new PDFDocument({
    size: [226.77, 14400],
    margin: 15,
  });

  // Descarta los datos del documento utilizado para medir.
  temporal.resume();

  dibujarTicket(temporal, pedido);

  const altura = Math.ceil(temporal.y + 20);

  temporal.end();

  return Math.max(altura, 250);
}

// Dibuja el comprobante A4 con paginación.
function dibujarComprobante(doc, pedido) {
  dibujarEncabezado(doc, pedido, false);
  dibujarAnulacion(doc, pedido);
  dibujarInformacion(doc, pedido);
  dibujarProductosComprobante(doc, pedido);

  // Mantiene juntos los totales y el pie del comprobante.
  if (doc.y + 115 > obtenerLimiteInferior(doc)) {
    doc.addPage();
    dibujarContinuacion(doc, pedido);
  }

  asegurarEspacio(doc, 115);

  dibujarTotales(doc, pedido);
  dibujarPie(doc);
}

async function generarPdf(id, formato = 'comprobante') {
  const pedido = await obtenerPedido(id);
  const esTicket = formato === 'ticket';

  const opciones = esTicket
    ? {
        size: [226.77, calcularAlturaTicket(pedido)],
        margin: 15,
      }
    : {
        size: 'A4',
        margin: 40,
      };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(opciones);
    const fragmentos = [];

    doc.on('data', (fragmento) => fragmentos.push(fragmento));
    doc.on('end', () => resolve(Buffer.concat(fragmentos)));
    doc.on('error', reject);

    if (esTicket) {
      dibujarTicket(doc, pedido);
    } else {
      dibujarComprobante(doc, pedido);
    }

    doc.end();
  });
}

module.exports = {
  generarPdf,
};
