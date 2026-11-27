import { useState } from 'react';
import { Alert, Button, Col, FormGroup, Input, Label, Row, Table } from 'reactstrap';
import { formatUsd } from '../../utils/moneyInput.js';

const hoy = new Date();
const FORM_PLANILLA = {
  anio: String(hoy.getFullYear()),
  mes: String(hoy.getMonth() + 1),
  quincena: '1',
  sucursalId: '',
};

export default function PayrollSection({
  sucursales = [],
  planillas = [],
  planillaDetalle = null,
  boleta = null,
  onGenerar,
  onSeleccionarPlanilla,
  onRecalcular,
  onVerBoleta,
  onCerrarBoleta,
  enviando,
  error = '',
  sinEmpleados = false,
}) {
  const [form, setForm] = useState(FORM_PLANILLA);
  const cambiar = (campo) => (event) => setForm({ ...form, [campo]: event.target.value });

  const anio = Number(form.anio);
  const mes = Number(form.mes);
  const quincena = Number(form.quincena);
  const valido =
    Number.isInteger(anio) &&
    anio >= 2020 &&
    anio <= 2100 &&
    Number.isInteger(mes) &&
    mes >= 1 &&
    mes <= 12 &&
    (quincena === 1 || quincena === 2);

  async function generar(event) {
    event.preventDefault();
    await onGenerar({
      anio,
      mes,
      quincena,
      sucursalId: form.sucursalId ? Number(form.sucursalId) : null,
    });
  }

  return (
  <section className="rrhh-card">
    <h3>Planilla quincenal</h3>

    {/* El error se muestra aquí mismo: el aviso de arriba de la página queda fuera de vista al bajar. */}
    {error && <Alert color="danger" role="alert">{error}</Alert>}
    {sinEmpleados && !error && (
      <Alert color="warning">
        No hay empleados activos registrados. Registra al menos un empleado antes de generar la planilla.
      </Alert>
    )}

    <form onSubmit={generar} className="mb-3">
      <Row>
        <Col md={3}>
          <FormGroup>
            <Label for="plan-anio">Año</Label>
            <Input id="plan-anio" type="number" value={form.anio} onChange={cambiar('anio')} />
          </FormGroup>
        </Col>
        <Col md={3}>
          <FormGroup>
            <Label for="plan-mes">Mes</Label>
            <Input id="plan-mes" type="number" min="1" max="12" value={form.mes} onChange={cambiar('mes')} />
          </FormGroup>
        </Col>
        <Col md={3}>
          <FormGroup>
            <Label for="plan-quincena">Quincena</Label>
            <Input id="plan-quincena" type="select" value={form.quincena} onChange={cambiar('quincena')}>
              <option value="1">1ra quincena</option>
              <option value="2">2da quincena</option>
            </Input>
          </FormGroup>
        </Col>
        <Col md={3}>
          <FormGroup>
            <Label for="plan-sucursal">Sucursal</Label>
            <Input id="plan-sucursal" type="select" value={form.sucursalId} onChange={cambiar('sucursalId')}>
              <option value="">Todas</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>
              ))}
            </Input>
          </FormGroup>
        </Col>
      </Row>
      <Button type="submit" color="primary" disabled={!valido || enviando}>
        {enviando ? 'Generando...' : 'Generar planilla'}
      </Button>
    </form>

    {planillas.length === 0 ? (
      <p className="rrhh-note">Sin planillas generadas.</p>
    ) : (
      <Table size="sm" responsive className="rrhh-table">
        <thead>
          <tr>
            <th>Período</th>
            <th>Rango</th>
            <th className="text-end">Empleados</th>
            <th className="text-end">Líquido</th>
            <th className="text-end">Acción</th>
          </tr>
        </thead>
        <tbody>
          {planillas.map((item) => (
            <tr key={item.id}>
              <td>{`${item.anio}-${String(item.mes).padStart(2, '0')} · Q${item.quincena}`}</td>
              <td>{`${item.periodoInicio} a ${item.periodoFin}`}</td>
              <td className="text-end">{item.cantidadEmpleados}</td>
              <td className="text-end">{formatUsd(item.totalLiquidoCents)}</td>
              <td className="text-end">
                <Button size="sm" color="secondary" outline disabled={enviando} onClick={() => onSeleccionarPlanilla(item.id)}>
                  Ver
                </Button>
                <Button size="sm" color="warning" outline className="ms-1" disabled={enviando} onClick={() => onRecalcular(item.id)}>
                  Recalcular
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )}

    {planillaDetalle && (
      <div className="mt-3">
        <h4>Detalle planilla #{planillaDetalle.id}</h4>
        <Table size="sm" responsive className="rrhh-table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Cargo</th>
              <th className="text-end">Quincena</th>
              <th className="text-end">ISSS</th>
              <th className="text-end">AFP</th>
              <th className="text-end">Renta</th>
              <th className="text-end">Líquido</th>
              <th className="text-end">Boleta</th>
            </tr>
          </thead>
          <tbody>
            {planillaDetalle.detalle.map((linea) => (
              <tr key={linea.empleadoId}>
                <td>{linea.nombre}</td>
                <td>{linea.cargo}</td>
                <td className="text-end">{formatUsd(linea.salarioCents)}</td>
                <td className="text-end">{formatUsd(linea.isssCents)}</td>
                <td className="text-end">{formatUsd(linea.afpCents)}</td>
                <td className="text-end">{formatUsd(linea.rentaCents)}</td>
                <td className="text-end">{formatUsd(linea.liquidoCents)}</td>
                <td className="text-end">
                  <Button
                    size="sm"
                    color="info"
                    outline
                    disabled={enviando}
                    onClick={() => onVerBoleta(planillaDetalle.id, linea.empleadoId)}
                  >
                    Boleta
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Totales</th>
              <th className="text-end">{formatUsd(planillaDetalle.totales.salarioCents)}</th>
              <th className="text-end">{formatUsd(planillaDetalle.totales.isssCents)}</th>
              <th className="text-end">{formatUsd(planillaDetalle.totales.afpCents)}</th>
              <th className="text-end">{formatUsd(planillaDetalle.totales.rentaCents)}</th>
              <th className="text-end">{formatUsd(planillaDetalle.totales.liquidoCents)}</th>
              <th />
            </tr>
          </tfoot>
        </Table>
      </div>
    )}

    {boleta && (
      <div className="rrhh-boleta mt-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="m-0">Boleta de pago</h4>
          <Button size="sm" color="secondary" outline onClick={onCerrarBoleta}>Cerrar</Button>
        </div>
        <p className="mb-1">
          <strong>{boleta.empleado.nombre}</strong> — DUI: {boleta.empleado.dui} ({boleta.empleado.cargo})
        </p>
        <p className="mb-2 rrhh-note">
          Período: {boleta.periodo.inicio} a {boleta.periodo.fin} (Q{boleta.periodo.quincena}) · Mensual:{' '}
          {formatUsd(boleta.salarioMensualCents)}
        </p>
        <Table size="sm" className="rrhh-table mb-0">
          <tbody>
            <tr><td>Salario quincenal</td><td className="text-end">{formatUsd(boleta.ingresos.salarioQuincenalCents)}</td></tr>
            <tr><td>ISSS</td><td className="text-end">-{formatUsd(boleta.deducciones.isssCents)}</td></tr>
            <tr><td>AFP</td><td className="text-end">-{formatUsd(boleta.deducciones.afpCents)}</td></tr>
            <tr><td>Renta</td><td className="text-end">-{formatUsd(boleta.deducciones.rentaCents)}</td></tr>
            <tr><th>Líquido a pagar</th><th className="text-end">{formatUsd(boleta.liquidoCents)}</th></tr>
          </tbody>
        </Table>
      </div>
    )}
  </section>
);
}