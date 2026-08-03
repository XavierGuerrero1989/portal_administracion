import "./EstadisticasIA.scss";

import {
  AlertCircle,
  BarChart3,
  CalendarRange,
  Download,
  FlaskConical,
  Info,
  Microscope,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Loader from "../componentes/Loader";
import { db } from "../firebase";
import { normalizeRole, parseLocalDate } from "../utils/domain";

const parseFecha = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor?.toDate === "function") return valor.toDate();
  if (typeof valor?.seconds === "number") return new Date(valor.seconds * 1000);
  return parseLocalDate(valor);
};

const calcularEdad = (fechaNacimiento) => {
  const nacimiento = parseFecha(fechaNacimiento);
  if (!nacimiento) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad >= 0 && edad < 120 ? edad : null;
};

const normalizarEstado = (tratamiento) => {
  const estado = String(tratamiento.estado || "").toLowerCase();
  if (estado) return estado;
  return tratamiento.tratamientoId === "activo" ? "activo" : "finalizado";
};

const esCancelado = (tratamiento) => {
  const tipo = String(tratamiento.tipoFinalizacion || "").toLowerCase();
  return tipo.includes("cancel") || Boolean(tratamiento.motivoCancelacion);
};

const esPuncion = (tratamiento) =>
  String(tratamiento.tipoFinalizacion || "").toLowerCase().includes("punc");

const obtenerResultado = (tratamiento) =>
  tratamiento.resultadoClinico ??
  tratamiento.resultado ??
  tratamiento.embarazoClinico ??
  tratamiento.transferenciaResultado ??
  null;

const normalizarMedicamentos = (tratamiento) => {
  const fuentes = [
    tratamiento.medicamentosPlanificados,
    tratamiento.fsh,
    tratamiento.hmg,
    tratamiento.antagonista,
    tratamiento.viaOral,
  ];
  return fuentes
    .flatMap((fuente) => (Array.isArray(fuente) ? fuente : fuente ? [fuente] : []))
    .map((medicamento) =>
      typeof medicamento === "string"
        ? medicamento
        : medicamento?.nombre || medicamento?.nombreComercial || medicamento?.medicamento
    )
    .filter(Boolean);
};

const diasEntre = (inicio, fin) => {
  if (!inicio || !fin) return null;
  return Math.max(0, Math.round((fin - inicio) / 86400000));
};

const porcentaje = (parte, total) => (total ? `${((parte / total) * 100).toFixed(1)}%` : "—");
const mesKey = (fecha) =>
  fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}` : null;
const mesLabel = (key) => {
  const [anio, mes] = key.split("-");
  return new Date(Number(anio), Number(mes) - 1, 1).toLocaleDateString("es-AR", {
    month: "short",
    year: "2-digit",
  });
};

const agruparContar = (lista, obtenerClave) => {
  const mapa = new Map();
  lista.forEach((item) => {
    const clave = obtenerClave(item) || "Sin especificar";
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
  });
  return [...mapa.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
};

const EstadisticasIA = () => {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [periodo, setPeriodo] = useState("12");
  const [tipo, setTipo] = useState("todos");
  const [rangoEdad, setRangoEdad] = useState("todos");
  const [pacienteSeleccionada, setPacienteSeleccionada] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const listaPacientes = usuariosSnapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => normalizeRole(item) === "paciente")
          .map((paciente) => ({ ...paciente, edad: calcularEdad(paciente.fechaNacimiento) }));

        const listaTratamientos = [];
        await Promise.all(
          listaPacientes.map(async (paciente) => {
            const snapshot = await getDocs(
              collection(db, "usuarios", paciente.id, "tratamientos")
            );
            snapshot.forEach((item) => {
              const data = item.data();
              const inicio = parseFecha(data.fechaInicio || data.createdAt || data.creadoEn);
              const fin = parseFecha(data.fechaFin);
              listaTratamientos.push({
                ...data,
                pacienteId: paciente.id,
                tratamientoId: item.id,
                paciente: `${paciente.apellido || ""}, ${paciente.nombre || ""}`.replace(/^,\s*/, ""),
                edad: paciente.edad,
                diagnostico:
                  data.diagnostico || data.diagnosticoPrincipal || paciente.diagnosticoPrincipal || paciente.diagnostico || "Sin especificar",
                tipo: data.tipoTratamiento || data.tipo || "Sin especificar",
                estadoNormalizado: normalizarEstado({ ...data, tratamientoId: item.id }),
                inicio,
                fin,
                duracion: diasEntre(inicio, fin),
                medicamentos: normalizarMedicamentos(data),
                estudios: Array.isArray(data.estudiosClinicos) ? data.estudiosClinicos : [],
                resultadoDocumentado: obtenerResultado(data),
              });
            });
          })
        );

        setPacientes(listaPacientes.sort((a, b) => `${a.apellido || ""}`.localeCompare(`${b.apellido || ""}`)));
        setTratamientos(listaTratamientos);
      } catch (err) {
        console.error("Error cargando análisis:", err);
        setError("No se pudieron cargar los datos de análisis.");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const tiposDisponibles = useMemo(
    () => [...new Set(tratamientos.map((item) => item.tipo))].sort(),
    [tratamientos]
  );

  const filtrados = useMemo(() => {
    const limite = new Date();
    if (periodo !== "todos") limite.setMonth(limite.getMonth() - Number(periodo));

    return tratamientos.filter((item) => {
      if (periodo !== "todos" && (!item.inicio || item.inicio < limite)) return false;
      if (tipo !== "todos" && item.tipo !== tipo) return false;
      if (rangoEdad !== "todos") {
        if (item.edad == null) return false;
        if (rangoEdad === "menor35" && item.edad >= 35) return false;
        if (rangoEdad === "35a39" && (item.edad < 35 || item.edad > 39)) return false;
        if (rangoEdad === "40omas" && item.edad < 40) return false;
      }
      return true;
    });
  }, [tratamientos, periodo, tipo, rangoEdad]);

  const finalizados = filtrados.filter((item) => item.estadoNormalizado === "finalizado");
  const cancelados = finalizados.filter(esCancelado);
  const punciones = finalizados.filter(esPuncion);
  const resultadosDocumentados = filtrados.filter((item) => item.resultadoDocumentado !== null);

  const tendencia = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach((item) => {
      const claveInicio = mesKey(item.inicio);
      if (claveInicio) {
        const actual = mapa.get(claveInicio) || { iniciados: 0, finalizados: 0, cancelados: 0 };
        actual.iniciados += 1;
        mapa.set(claveInicio, actual);
      }
      const claveFin = mesKey(item.fin);
      if (claveFin) {
        const actual = mapa.get(claveFin) || { iniciados: 0, finalizados: 0, cancelados: 0 };
        actual.finalizados += 1;
        if (esCancelado(item)) actual.cancelados += 1;
        mapa.set(claveFin, actual);
      }
    });
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valores]) => ({ mes: mesLabel(mes), ...valores }));
  }, [filtrados]);

  const porTipo = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach((item) => {
      const actual = mapa.get(item.tipo) || { tipo: item.tipo, total: 0, finalizados: 0, cancelados: 0, punciones: 0 };
      actual.total += 1;
      if (item.estadoNormalizado === "finalizado") actual.finalizados += 1;
      if (esCancelado(item)) actual.cancelados += 1;
      if (esPuncion(item)) actual.punciones += 1;
      mapa.set(item.tipo, actual);
    });
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [filtrados]);

  const edades = useMemo(() => {
    const rangos = { "< 30": 0, "30–34": 0, "35–39": 0, "40–44": 0, "45+": 0, "Sin dato": 0 };
    const ids = new Set(filtrados.map((item) => item.pacienteId));
    pacientes.filter((item) => ids.has(item.id)).forEach((paciente) => {
      if (paciente.edad == null) rangos["Sin dato"] += 1;
      else if (paciente.edad < 30) rangos["< 30"] += 1;
      else if (paciente.edad < 35) rangos["30–34"] += 1;
      else if (paciente.edad < 40) rangos["35–39"] += 1;
      else if (paciente.edad < 45) rangos["40–44"] += 1;
      else rangos["45+"] += 1;
    });
    return Object.entries(rangos).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }, [filtrados, pacientes]);

  const diagnosticos = useMemo(() => agruparContar(filtrados, (item) => item.diagnostico).slice(0, 7), [filtrados]);
  const medicamentos = useMemo(
    () => agruparContar(filtrados.flatMap((item) => item.medicamentos), (item) => item).slice(0, 8),
    [filtrados]
  );

  const ciclosPaciente = useMemo(
    () => tratamientos.filter((item) => item.pacienteId === pacienteSeleccionada).sort((a, b) => (b.inicio || 0) - (a.inicio || 0)),
    [tratamientos, pacienteSeleccionada]
  );

  const calidad = useMemo(() => ({
    sinNacimiento: pacientes.filter((item) => item.edad == null).length,
    sinDiagnostico: tratamientos.filter((item) => item.diagnostico === "Sin especificar").length,
    sinTipo: tratamientos.filter((item) => item.tipo === "Sin especificar").length,
    finalizadosSinFecha: tratamientos.filter((item) => item.estadoNormalizado === "finalizado" && !item.fin).length,
    sinResultado: tratamientos.filter((item) => item.estadoNormalizado === "finalizado" && item.resultadoDocumentado === null).length,
  }), [pacientes, tratamientos]);

  const duraciones = finalizados.map((item) => item.duracion).filter((item) => item != null);
  const duracionPromedio = duraciones.length
    ? (duraciones.reduce((total, item) => total + item, 0) / duraciones.length).toFixed(1)
    : "—";

  const exportar = () => {
    const filas = [
      ["Indicador", "Valor"],
      ["Ciclos incluidos", filtrados.length],
      ["Finalizados", finalizados.length],
      ["Cancelados", cancelados.length],
      ["Punciones", punciones.length],
      ["Duración promedio (días)", duracionPromedio],
      ["Resultados clínicos documentados", resultadosDocumentados.length],
      [],
      ["Tipo", "Ciclos", "Finalizados", "Cancelados", "Punciones"],
      ...porTipo.map((item) => [item.tipo, item.total, item.finalizados, item.cancelados, item.punciones]),
    ];
    const csv = filas.map((fila) => fila.map((celda) => `"${String(celda ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = `fertiapp-analisis-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  if (cargando) return <Loader />;

  return (
    <main className="analysis-page">
      <header className="analysis-header">
        <div>
          <span className="analysis-eyebrow">Análisis clínico y estadístico</span>
          <h1>Resultados y evolución</h1>
          <p>Información descriptiva para acompañar el criterio del equipo tratante.</p>
        </div>
        <button className="export-button" onClick={exportar}><Download size={18} /> Exportar informe</button>
      </header>

      <div className="analysis-notice"><Info size={18} /><span>Los resultados se muestran como datos observados. No constituyen una recomendación terapéutica y las muestras menores a 5 ciclos deben interpretarse con cautela.</span></div>
      {error && <div className="analysis-error">{error}</div>}

      <section className="analysis-filters" aria-label="Filtros de análisis">
        <label><CalendarRange size={17} /><span>Período</span><select value={periodo} onChange={(e) => setPeriodo(e.target.value)}><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option><option value="24">Últimos 24 meses</option><option value="todos">Todo el historial</option></select></label>
        <label><FlaskConical size={17} /><span>Tratamiento</span><select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="todos">Todos</option>{tiposDisponibles.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><Users size={17} /><span>Edad</span><select value={rangoEdad} onChange={(e) => setRangoEdad(e.target.value)}><option value="todos">Todas</option><option value="menor35">Menor de 35</option><option value="35a39">35 a 39</option><option value="40omas">40 o más</option></select></label>
        <button onClick={() => { setPeriodo("12"); setTipo("todos"); setRangoEdad("todos"); }}><RefreshCcw size={17} /> Restablecer</button>
      </section>

      <section className="analysis-kpis">
        <article><BarChart3 size={21} /><div><strong>{filtrados.length}</strong><span>Ciclos incluidos</span></div></article>
        <article><ShieldCheck size={21} /><div><strong>{porcentaje(finalizados.length, filtrados.length)}</strong><span>Finalización documentada</span></div></article>
        <article><AlertCircle size={21} /><div><strong>{porcentaje(cancelados.length, finalizados.length)}</strong><span>Cancelación entre finalizados</span></div></article>
        <article><Microscope size={21} /><div><strong>{duracionPromedio}</strong><span>Días promedio por ciclo finalizado</span></div></article>
      </section>

      <div className="analysis-grid two-columns">
        <section className="analysis-card chart-card">
          <div className="card-heading"><div><span>Tendencia</span><h2>Evolución de ciclos</h2></div></div>
          {tendencia.length ? <ResponsiveContainer width="100%" height={285}><LineChart data={tendencia}><CartesianGrid strokeDasharray="3 3" stroke="#e7ebf1" /><XAxis dataKey="mes" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="iniciados" name="Iniciados" stroke="#7b20d4" strokeWidth={3} /><Line type="monotone" dataKey="finalizados" name="Finalizados" stroke="#24a884" strokeWidth={3} /><Line type="monotone" dataKey="cancelados" name="Cancelados" stroke="#e8405d" strokeWidth={2} /></LineChart></ResponsiveContainer> : <div className="analysis-empty">No hay datos suficientes para el período.</div>}
        </section>
        <section className="analysis-card chart-card">
          <div className="card-heading"><div><span>Población</span><h2>Distribución por edad</h2></div></div>
          <ResponsiveContainer width="100%" height={285}><BarChart data={edades}><CartesianGrid strokeDasharray="3 3" stroke="#e7ebf1" /><XAxis dataKey="nombre" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="cantidad" name="Pacientes" fill="#4bd5ff" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer>
        </section>
      </div>

      <section className="analysis-card">
        <div className="card-heading"><div><span>Resultados</span><h2>Comparación por tipo de tratamiento</h2></div><small>Cantidades absolutas y porcentajes sobre cada grupo</small></div>
        <div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>Tratamiento</th><th>Ciclos</th><th>Finalizados</th><th>Cancelados</th><th>Punciones</th><th>Lectura</th></tr></thead><tbody>{porTipo.length ? porTipo.map((item) => <tr key={item.tipo}><td><strong>{item.tipo}</strong></td><td>{item.total}</td><td>{item.finalizados} · {porcentaje(item.finalizados, item.total)}</td><td>{item.cancelados} · {porcentaje(item.cancelados, item.finalizados)}</td><td>{item.punciones} · {porcentaje(item.punciones, item.finalizados)}</td><td>{item.total < 5 ? <span className="sample-warning">Muestra pequeña</span> : <span className="sample-ok">Descriptivo</span>}</td></tr>) : <tr><td colSpan="6">No hay ciclos para los filtros seleccionados.</td></tr>}</tbody></table></div>
      </section>

      <div className="analysis-grid two-columns">
        <section className="analysis-card ranking-card"><div className="card-heading"><div><span>Indicaciones</span><h2>Diagnósticos registrados</h2></div></div><div className="ranking-list">{diagnosticos.map((item) => <div key={item.nombre}><span>{item.nombre}</span><strong>{item.cantidad}</strong><i style={{ width: `${(item.cantidad / Math.max(diagnosticos[0]?.cantidad || 1, 1)) * 100}%` }} /></div>)}</div></section>
        <section className="analysis-card ranking-card"><div className="card-heading"><div><span>Protocolos</span><h2>Medicaciones más utilizadas</h2></div></div><div className="ranking-list">{medicamentos.length ? medicamentos.map((item) => <div key={item.nombre}><span>{item.nombre}</span><strong>{item.cantidad}</strong><i style={{ width: `${(item.cantidad / Math.max(medicamentos[0]?.cantidad || 1, 1)) * 100}%` }} /></div>) : <div className="analysis-empty">No hay medicaciones documentadas.</div>}</div></section>
      </div>

      <section className="analysis-card individual-card">
        <div className="card-heading"><div><span>Análisis individual</span><h2>Comparación de ciclos de una paciente</h2></div></div>
        <label className="patient-search"><Search size={18} /><select value={pacienteSeleccionada} onChange={(e) => setPacienteSeleccionada(e.target.value)}><option value="">Seleccionar paciente</option>{pacientes.map((item) => <option key={item.id} value={item.id}>{item.apellido}, {item.nombre} · DNI {item.dni || "—"}</option>)}</select></label>
        {!pacienteSeleccionada ? <div className="analysis-empty">Seleccioná una paciente para comparar sus ciclos.</div> : <div className="cycle-grid">{ciclosPaciente.map((ciclo, index) => <article key={ciclo.tratamientoId}><span className="cycle-number">Ciclo {ciclosPaciente.length - index}</span><h3>{ciclo.tipo}</h3><dl><div><dt>Inicio</dt><dd>{ciclo.inicio?.toLocaleDateString("es-AR") || "—"}</dd></div><div><dt>Estado</dt><dd>{ciclo.estadoNormalizado}</dd></div><div><dt>Duración</dt><dd>{ciclo.duracion != null ? `${ciclo.duracion} días` : "—"}</dd></div><div><dt>Controles</dt><dd>{ciclo.estudios.length}</dd></div><div><dt>Finalización</dt><dd>{ciclo.tipoFinalizacion || "—"}</dd></div><div><dt>Resultado clínico</dt><dd>{ciclo.resultadoDocumentado ?? "Sin documentar"}</dd></div></dl></article>)}</div>}
      </section>

      <section className="analysis-card data-quality-card">
        <div className="card-heading"><div><span>Confiabilidad</span><h2>Calidad y completitud de los datos</h2></div><small>Estos faltantes condicionan cualquier interpretación estadística.</small></div>
        <div className="quality-grid"><article><strong>{calidad.sinNacimiento}</strong><span>Pacientes sin fecha de nacimiento</span></article><article><strong>{calidad.sinDiagnostico}</strong><span>Ciclos sin diagnóstico</span></article><article><strong>{calidad.sinTipo}</strong><span>Ciclos sin tipo</span></article><article><strong>{calidad.finalizadosSinFecha}</strong><span>Finalizados sin fecha de cierre</span></article><article><strong>{calidad.sinResultado}</strong><span>Finalizados sin resultado clínico</span></article><article className="coverage"><strong>{porcentaje(resultadosDocumentados.length, tratamientos.length)}</strong><span>Cobertura de resultado clínico</span></article></div>
      </section>
    </main>
  );
};

export default EstadisticasIA;
