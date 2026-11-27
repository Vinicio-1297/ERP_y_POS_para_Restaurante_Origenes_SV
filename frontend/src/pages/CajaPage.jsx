import { useCallback, useEffect, useState } from 'react';
import { Alert, Button } from 'reactstrap';
import AperturaCajaForm from '../components/caja/AperturaCajaForm.jsx';
import CierreCajaForm from '../components/caja/CierreCajaForm.jsx';
import MovimientoForm from '../components/caja/MovimientoForm.jsx';
import ResultadoCierre from '../components/caja/ResultadoCierre.jsx';
import ResumenTurno from '../components/caja/ResumenTurno.jsx';
import {
  abrirCaja, cerrarCaja, getMovimientos, getResumen, getTurnoActual, registrarMovimiento,
} from '../services/cajaService.js';
import '../styles/caja.css';

export default function CajaPage() {
  const [fase, setFase] = useState('cargando'); // cargando | cerrada | abierta | error
  const [resumen, setResumen] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarTurno = useCallback(async (signal) => {
    try {
      await getTurnoActual(signal); // 404 = no hay caja abierta
      const [datosResumen, datosMovimientos] = await Promise.all([getResumen(signal), getMovimientos(signal)]);
      setResumen(datosResumen);
      setMovimientos(datosMovimientos);
      setFase('abierta');
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (err.status === 404) {
        setFase('cerrada');
        return;
      }
      setError(err.message);
      setFase('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargarTurno(controller.signal);
    return () => controller.abort();
  }, [cargarTurno]);

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

  const handleAbrir = (montoCents) =>
    ejecutar(async () => {
      await abrirCaja(montoCents);
      setResultado(null);
      await cargarTurno();
    });

  const handleMovimiento = (datos) =>
    ejecutar(async () => {
      await registrarMovimiento(datos);
      await cargarTurno();
    });

  const handleCerrar = (datos) =>
    ejecutar(async () => {
      setResultado(await cerrarCaja(datos));
      setResumen(null);
      setMovimientos([]);
      setFase('cerrada');
    });

  if (fase === 'cargando') return <p className="caja-page">Cargando caja…</p>;

  return (
    <div className="caja-page">
      <h1>Caja</h1>
      {error && <Alert color="danger">{error}</Alert>}

      {fase === 'error' && (
        <Button color="primary" onClick={() => { setError(''); setFase('cargando'); cargarTurno(); }}>
          Reintentar
        </Button>
      )}

      {fase === 'cerrada' && (
        <>
          {resultado && <ResultadoCierre resultado={resultado} />}
          <AperturaCajaForm onAbrir={handleAbrir} enviando={enviando} />
        </>
      )}

      {fase === 'abierta' && resumen && (
        <div className="caja-grid">
          <ResumenTurno resumen={resumen} movimientos={movimientos} />
          <div className="caja-side">
            <MovimientoForm onRegistrar={handleMovimiento} enviando={enviando} />
            <CierreCajaForm onCerrar={handleCerrar} enviando={enviando} />
          </div>
        </div>
      )}
    </div>
  );
}
