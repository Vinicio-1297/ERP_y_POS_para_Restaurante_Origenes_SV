import { Table } from 'reactstrap';
import { formatUsd } from '../../utils/moneyInput.js';

export default function ResumenTurno({ resumen, movimientos }) {
  const { ventas, esperado } = resumen;
  const filasVentas = [
    ['Efectivo', ventas.efectivoCents],
    ['Tarjeta', ventas.tarjetaCents],
    ['Digital', ventas.digitalCents],
  ];

  return (
    <section className="caja-card">
      <h2>Turno en curso</h2>
      <p>
        Abierto el {new Date(resumen.fechaApertura).toLocaleString('es-SV')} con {formatUsd(resumen.montoAperturaCents)}.{' '}
        {ventas.cantidadPedidos} pedidos en el turno.
      </p>

      <Table size="sm" className="caja-table">
        <thead>
          <tr><th>Método</th><th className="text-end">Ventas</th><th className="text-end">Esperado en caja</th></tr>
        </thead>
        <tbody>
          {filasVentas.map(([nombre, cents], index) => (
            <tr key={nombre}>
              <td>{nombre}</td>
              <td className="text-end">{formatUsd(cents)}</td>
              <td className="text-end">{formatUsd([esperado.efectivoCents, esperado.tarjetaCents, esperado.digitalCents][index])}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="caja-note">
        Digital incluye Bitcoin {formatUsd(ventas.bitcoinCents)} y Chivo {formatUsd(ventas.chivoCents)}. El efectivo esperado suma
        apertura, ventas e ingresos, y resta egresos.
      </p>

      <h3>Movimientos</h3>
      {movimientos.length === 0 ? (
        <p className="caja-note">Sin movimientos en este turno.</p>
      ) : (
        <Table size="sm" className="caja-table">
          <thead>
            <tr><th>Hora</th><th>Tipo</th><th>Concepto</th><th className="text-end">Monto</th></tr>
          </thead>
          <tbody>
            {movimientos.map((movimiento) => (
              <tr key={movimiento.id}>
                <td>{new Date(movimiento.fecha).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
                <td>{movimiento.concepto}</td>
                <td className="text-end">{formatUsd(movimiento.montoCents)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
