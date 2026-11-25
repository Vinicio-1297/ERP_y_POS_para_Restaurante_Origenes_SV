import { Table } from 'reactstrap';
import { formatUsd } from '../../utils/moneyInput.js';

// Diferencia = contado - esperado: positiva sobra, negativa falta.
function estado(diferenciaCents) {
  if (diferenciaCents === 0) return { texto: 'Cuadra', clase: 'caja-diff--ok' };
  return diferenciaCents > 0
    ? { texto: `Sobrante ${formatUsd(diferenciaCents)}`, clase: 'caja-diff--sobra' }
    : { texto: `Faltante ${formatUsd(Math.abs(diferenciaCents))}`, clase: 'caja-diff--falta' };
}

export default function ResultadoCierre({ resultado }) {
  const { esperado } = resultado.resumen;
  const filas = [
    ['Efectivo', esperado.efectivoCents, resultado.diferencias.efectivoCents],
    ['Tarjeta', esperado.tarjetaCents, resultado.diferencias.tarjetaCents],
    ['Digital (Bitcoin/Chivo)', esperado.digitalCents, resultado.diferencias.digitalCents],
  ];

  return (
    <section className="caja-card">
      <h2>Caja cerrada</h2>
      <Table size="sm" className="caja-table">
        <thead>
          <tr><th>Método</th><th className="text-end">Esperado</th><th className="text-end">Contado</th><th>Resultado</th></tr>
        </thead>
        <tbody>
          {filas.map(([nombre, esperadoCents, diferencia]) => {
            const { texto, clase } = estado(diferencia);
            return (
              <tr key={nombre}>
                <td>{nombre}</td>
                <td className="text-end">{formatUsd(esperadoCents)}</td>
                <td className="text-end">{formatUsd(esperadoCents + diferencia)}</td>
                <td className={clase}>{texto}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </section>
  );
}
