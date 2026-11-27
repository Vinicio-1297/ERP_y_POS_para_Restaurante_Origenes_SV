import { Button, Col, FormGroup, Input, Label, Row, Table } from 'reactstrap';
import { formatUsd } from '../../utils/moneyInput.js';

export default function EmployeeTable({
  empleados = [],
  cargos = [],
  sucursales = [],
  filtros,
  onCambiarFiltro,
  onEditar,
  onDesactivar,
  onReactivar,
  onVerBoleta,
  planillaActivaId = null,
  enviando,
}) {
  const cambiar = (campo) => (event) => onCambiarFiltro(campo, event.target.value);

  return (
    <section className="rrhh-card">
      <h3>Empleados</h3>

      <Row className="mb-3">
        <Col md={4}>
          <FormGroup>
            <Label for="filtro-q">Buscar (nombre o DUI)</Label>
            <Input id="filtro-q" value={filtros.q} onChange={cambiar('q')} />
          </FormGroup>
        </Col>
        <Col md={3}>
          <FormGroup>
            <Label for="filtro-cargo">Cargo</Label>
            <Input id="filtro-cargo" type="select" value={filtros.cargoId} onChange={cambiar('cargoId')}>
              <option value="">Todos</option>
              {cargos.map((cargo) => (
                <option key={cargo.id} value={cargo.id}>{cargo.nombre}</option>
              ))}
            </Input>
          </FormGroup>
        </Col>
        <Col md={3}>
          <FormGroup>
            <Label for="filtro-sucursal">Sucursal</Label>
            <Input id="filtro-sucursal" type="select" value={filtros.sucursalId} onChange={cambiar('sucursalId')}>
              <option value="">Todas</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>
              ))}
            </Input>
          </FormGroup>
        </Col>
        <Col md={2}>
          <FormGroup>
            <Label for="filtro-activo">Estado</Label>
            <Input id="filtro-activo" type="select" value={filtros.activo} onChange={cambiar('activo')}>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
              <option value="">Todos</option>
            </Input>
          </FormGroup>
        </Col>
      </Row>

      {empleados.length === 0 ? (
        <p className="rrhh-note">No hay empleados para mostrar.</p>
      ) : (
        <Table size="sm" responsive className="rrhh-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DUI</th>
              <th>Cargo</th>
              <th>Sucursal</th>
              <th className="text-end">Salario</th>
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp) => (
              <tr key={emp.id}>
                <td>{`${emp.nombres} ${emp.apellidos}`}</td>
                <td>{emp.dui}</td>
                <td>{emp.cargo}</td>
                <td>{emp.sucursal || 'Sin asignar'}</td>
                <td className="text-end">{formatUsd(emp.salarioMensualCents)}</td>
                <td>{emp.activo ? 'Activo' : 'Inactivo'}</td>
                <td className="text-end">
                  <div className="d-flex justify-content-end gap-1">
                    <Button size="sm" color="secondary" outline disabled={enviando} onClick={() => onEditar(emp)}>
                      Editar
                    </Button>
                    {emp.activo ? (
                      <Button size="sm" color="danger" outline disabled={enviando} onClick={() => onDesactivar(emp.id)}>
                        Baja
                      </Button>
                    ) : (
                      <Button size="sm" color="success" outline disabled={enviando} onClick={() => onReactivar(emp.id)}>
                        Reactivar
                      </Button>
                    )}
                    {planillaActivaId && (
                      <Button
                        size="sm"
                        color="primary"
                        outline
                        disabled={enviando}
                        onClick={() => onVerBoleta(planillaActivaId, emp.id)}
                      >
                        Boleta
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}