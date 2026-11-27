import { useCallback, useEffect, useState } from 'react';
import { Alert, Button } from 'reactstrap';
import EmployeeForm from '../components/rrhh/EmployeeForm.jsx';
import EmployeeTable from '../components/rrhh/EmployeeTable.jsx';
import PayrollSection from '../components/rrhh/PayrollSection.jsx';
import {
  actualizarEmpleado,
  crearEmpleado,
  desactivarEmpleado,
  getCargos,
  getEmpleados,
  getSucursales,
  reactivarEmpleado,
} from '../services/employeeService.js';
import {
  generarPlanilla,
  getBoletaEmpleado,
  getPlanillaDetalle,
  getPlanillas,
  recalcularPlanilla,
} from '../services/payrollService.js';
import '../styles/rrhh.css';

const FILTROS_INICIALES = { q: '', cargoId: '', sucursalId: '', activo: 'true' };

export default function RrhhPage() {
  const [fase, setFase] = useState('cargando'); // cargando | listo | error
  const [cargos, setCargos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [empleadoEditar, setEmpleadoEditar] = useState(null);

  const [planillas, setPlanillas] = useState([]);
  const [planillaDetalle, setPlanillaDetalle] = useState(null);
  const [boleta, setBoleta] = useState(null);

  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarEmpleados = useCallback(async (filtrosActuales, signal) => {
    const lista = await getEmpleados(filtrosActuales, signal);
    setEmpleados(lista);
  }, []);

  const cargarPlanillas = useCallback(async (signal) => {
    const lista = await getPlanillas({}, signal);
    setPlanillas(lista);
  }, []);

  const cargarInicial = useCallback(
    async (signal) => {
      try {
        const [datosCargos, datosSucursales] = await Promise.all([
          getCargos(signal),
          getSucursales(signal).catch(() => []),
        ]);
        setCargos(datosCargos);
        setSucursales(datosSucursales);
        await Promise.all([cargarEmpleados(FILTROS_INICIALES, signal), cargarPlanillas(signal)]);
        setFase('listo');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setFase('error');
      }
    },
    [cargarEmpleados, cargarPlanillas],
  );

  useEffect(() => {
    const controller = new AbortController();
    cargarInicial(controller.signal);
    return () => controller.abort();
  }, [cargarInicial]);

  useEffect(() => {
    if (fase !== 'listo') return;
    const controller = new AbortController();
    cargarEmpleados(filtros, controller.signal).catch((err) => {
      if (err.name !== 'AbortError') setError(err.message);
    });
    return () => controller.abort();
  }, [fase, filtros, cargarEmpleados]);

  // Ejecuta una acción del usuario; devuelve true si salió bien.
  async function ejecutar(accion) {
    setEnviando(true);
    setError('');
    try {
      await accion();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  function cambiarFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  const handleGuardarEmpleado = (datos, idEditar) =>
    ejecutar(async () => {
      if (idEditar) {
        await actualizarEmpleado(idEditar, datos);
        setEmpleadoEditar(null);
      } else {
        await crearEmpleado(datos);
      }
      await cargarEmpleados(filtros);
    });

  const handleDesactivar = (id) =>
    ejecutar(async () => {
      if (!window.confirm('¿Dar de baja a este empleado?')) return;
      await desactivarEmpleado(id);
      if (empleadoEditar?.id === id) setEmpleadoEditar(null);
      await cargarEmpleados(filtros);
    });

  const handleReactivar = (id) =>
    ejecutar(async () => {
      await reactivarEmpleado(id);
      await cargarEmpleados(filtros);
    });

  const handleGenerarPlanilla = (datos) =>
    ejecutar(async () => {
      const creada = await generarPlanilla(datos);
      await cargarPlanillas();
      if (creada?.id) {
        setPlanillaDetalle(await getPlanillaDetalle(creada.id));
        setBoleta(null);
      }
    });

  const handleSeleccionarPlanilla = (id) =>
    ejecutar(async () => {
      setPlanillaDetalle(await getPlanillaDetalle(id));
      setBoleta(null);
    });

  
  const handleRecalcularPlanilla = (id) =>
    ejecutar(async () => {
      if (!window.confirm('¿Recalcular esta planilla con los empleados activos actuales?')) return;
      await recalcularPlanilla(id);
      await cargarPlanillas();
      setPlanillaDetalle(await getPlanillaDetalle(id));
      setBoleta(null);
  });


  const handleVerBoleta = (planillaId, empleadoId) =>
    ejecutar(async () => {
      setBoleta(await getBoletaEmpleado(planillaId, empleadoId));
    });

  if (fase === 'cargando') return <p className="rrhh-page">Cargando recursos humanos…</p>;

  return (
    <div className="rrhh-page">
      <h1>Recursos Humanos y Nómina</h1>
      {error && <Alert color="danger">{error}</Alert>}

      {fase === 'error' && (
        <Button
          color="primary"
          onClick={() => {
            setError('');
            setFase('cargando');
            cargarInicial();
          }}
        >
          Reintentar
        </Button>
      )}

      {fase === 'listo' && (
        <>
          <div className="rrhh-grid">
            <EmployeeTable
              empleados={empleados}
              cargos={cargos}
              sucursales={sucursales}
              filtros={filtros}
              onCambiarFiltro={cambiarFiltro}
              onEditar={setEmpleadoEditar}
              onDesactivar={handleDesactivar}
              onReactivar={handleReactivar}
              onVerBoleta={handleVerBoleta}
              planillaActivaId={planillaDetalle?.id ?? null}
              enviando={enviando}
            />
            <EmployeeForm
              cargos={cargos}
              sucursales={sucursales}
              empleadoEditar={empleadoEditar}
              onGuardar={handleGuardarEmpleado}
              onCancelar={() => setEmpleadoEditar(null)}
              enviando={enviando}
            />
          </div>

          <PayrollSection
            sucursales={sucursales}
            planillas={planillas}
            planillaDetalle={planillaDetalle}
            boleta={boleta}
            onGenerar={handleGenerarPlanilla}
            onSeleccionarPlanilla={handleSeleccionarPlanilla}
            onRecalcular={handleRecalcularPlanilla}
            onVerBoleta={handleVerBoleta}
            onCerrarBoleta={() => setBoleta(null)}
            enviando={enviando}
            error={error}
            sinEmpleados={empleados.length === 0}
          />
        </>
      )}
    </div>
  );
}