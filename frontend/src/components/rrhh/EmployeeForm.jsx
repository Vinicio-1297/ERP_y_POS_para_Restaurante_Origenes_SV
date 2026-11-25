import { useEffect, useState } from 'react';
import { Button, Col, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { isValidAmount, toCents } from '../../utils/moneyInput.js';

const FORM_VACIO = {
  nombres: '',
  apellidos: '',
  dui: '',
  nit: '',
  cargoId: '',
  sucursalId: '',
  salarioUsd: '',
  fechaIngreso: '',
  telefono: '',
  correo: '',
};

function aFormulario(empleado) {
  if (!empleado) return FORM_VACIO;
  return {
    nombres: empleado.nombres ?? '',
    apellidos: empleado.apellidos ?? '',
    dui: empleado.dui ?? '',
    nit: empleado.nit ?? '',
    cargoId: empleado.cargoId ? String(empleado.cargoId) : '',
    sucursalId: empleado.sucursalId ? String(empleado.sucursalId) : '',
    salarioUsd: empleado.salarioMensualCents != null ? (empleado.salarioMensualCents / 100).toFixed(2) : '',
    fechaIngreso: empleado.fechaIngreso ?? '',
    telefono: empleado.telefono ?? '',
    correo: empleado.correo ?? '',
  };
}

export default function EmployeeForm({
  cargos = [],
  sucursales = [],
  empleadoEditar = null,
  onGuardar,
  onCancelar,
  enviando,
}) {
  const [form, setForm] = useState(() => aFormulario(empleadoEditar));

  useEffect(() => {
    setForm(aFormulario(empleadoEditar));
  }, [empleadoEditar]);

  const cambiar = (campo) => (event) => setForm({ ...form, [campo]: event.target.value });

  const duiValido = /^\d{8}-\d$/.test(form.dui.trim());
  const nitLimpio = form.nit.trim();
  const nitValido = !nitLimpio || /^\d{4}-\d{6}-\d{3}-\d$/.test(nitLimpio);
  const salarioValido = isValidAmount(form.salarioUsd) && Number(form.salarioUsd) > 0;
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(form.fechaIngreso.trim());

  const valido =
    form.nombres.trim().length >= 2 &&
    form.apellidos.trim().length >= 2 &&
    duiValido &&
    nitValido &&
    Boolean(form.cargoId) &&
    salarioValido &&
    fechaValida;

  async function enviar(event) {
    event.preventDefault();
    if (!valido || enviando) return;

    const payload = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      dui: form.dui.trim(),
      nit: nitLimpio || null,
      cargoId: Number(form.cargoId),
      sucursalId: form.sucursalId ? Number(form.sucursalId) : null,
      salarioMensualCents: toCents(form.salarioUsd),
      fechaIngreso: form.fechaIngreso.trim(),
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
    };

    const guardado = await onGuardar(payload, empleadoEditar?.id ?? null);
    if (guardado && !empleadoEditar) setForm(FORM_VACIO);
  }

  return (
    <section className="rrhh-card">
      <h3>{empleadoEditar ? 'Editar empleado' : 'Nuevo empleado'}</h3>
      <Form onSubmit={enviar}>
        <Row>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-nombres">Nombres</Label>
              <Input id="emp-nombres" maxLength={80} value={form.nombres} onChange={cambiar('nombres')} />
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-apellidos">Apellidos</Label>
              <Input id="emp-apellidos" maxLength={80} value={form.apellidos} onChange={cambiar('apellidos')} />
            </FormGroup>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-dui">DUI</Label>
              <Input
                id="emp-dui"
                placeholder="00000000-0"
                maxLength={10}
                value={form.dui}
                onChange={cambiar('dui')}
              />
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-nit">NIT (opcional)</Label>
              <Input
                id="emp-nit"
                placeholder="0000-000000-000-0"
                maxLength={17}
                value={form.nit}
                onChange={cambiar('nit')}
              />
            </FormGroup>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-cargo">Cargo</Label>
              <Input id="emp-cargo" type="select" value={form.cargoId} onChange={cambiar('cargoId')}>
                <option value="">Selecciona un cargo</option>
                {cargos.map((cargo) => (
                  <option key={cargo.id} value={cargo.id}>
                    {cargo.nombre}
                  </option>
                ))}
              </Input>
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-sucursal">Sucursal (opcional)</Label>
              <Input id="emp-sucursal" type="select" value={form.sucursalId} onChange={cambiar('sucursalId')}>
                <option value="">Sin sucursal asignada</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </Input>
            </FormGroup>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-salario">Salario mensual (USD)</Label>
              <Input
                id="emp-salario"
                type="number"
                min="0"
                step="0.01"
                value={form.salarioUsd}
                onChange={cambiar('salarioUsd')}
              />
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-fecha">Fecha de ingreso</Label>
              <Input id="emp-fecha" type="date" value={form.fechaIngreso} onChange={cambiar('fechaIngreso')} />
            </FormGroup>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-telefono">Teléfono (opcional)</Label>
              <Input id="emp-telefono" maxLength={20} value={form.telefono} onChange={cambiar('telefono')} />
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label for="emp-correo">Correo (opcional)</Label>
              <Input id="emp-correo" type="email" maxLength={150} value={form.correo} onChange={cambiar('correo')} />
            </FormGroup>
          </Col>
        </Row>

        <div className="d-flex gap-2">
          <Button type="submit" color="primary" disabled={!valido || enviando}>
            {empleadoEditar ? 'Guardar cambios' : 'Registrar empleado'}
          </Button>
          {empleadoEditar && (
            <Button type="button" color="secondary" outline disabled={enviando} onClick={onCancelar}>
              Cancelar
            </Button>
          )}
        </div>
      </Form>
    </section>
  );
}