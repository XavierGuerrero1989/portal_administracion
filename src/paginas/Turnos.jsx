import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { normalizeRole, parseLocalDate } from "../utils/domain";
import "./Turnos.scss";

const Turnos = () => {
  const [pacientes, setPacientes] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    pacienteId: "",
    fecha: "",
    hora: "",
    motivo: "",
  });

  const cargar = async () => {
    const usuarios = await getDocs(collection(db, "usuarios"));
    const listaPacientes = usuarios.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => normalizeRole(item) === "paciente")
      .sort((a, b) =>
        `${a.apellido || ""} ${a.nombre || ""}`.localeCompare(
          `${b.apellido || ""} ${b.nombre || ""}`
        )
      );
    setPacientes(listaPacientes);

    const listaTurnos = [];
    await Promise.all(
      listaPacientes.map(async (paciente) => {
        const snapshot = await getDocs(
          collection(db, "usuarios", paciente.id, "citas")
        );
        snapshot.forEach((item) =>
          listaTurnos.push({
            id: item.id,
            pacienteId: paciente.id,
            paciente: `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim(),
            ...item.data(),
          })
        );
      })
    );
    listaTurnos.sort(
      (a, b) =>
        (parseLocalDate(a.fecha)?.getTime() || 0) -
        (parseLocalDate(b.fecha)?.getTime() || 0)
    );
    setTurnos(listaTurnos);
  };

  useEffect(() => {
    cargar().catch(console.error);
  }, []);

  const proximos = useMemo(() => {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    return turnos.filter(
      (turno) =>
        turno.estado !== "cancelado" &&
        (parseLocalDate(turno.fecha)?.getTime() || 0) >= inicioHoy.getTime()
    );
  }, [turnos]);

  const crear = async (event) => {
    event.preventDefault();
    if (!form.pacienteId || !form.fecha || !form.hora || !form.motivo.trim()) {
      alert("Completá paciente, fecha, hora y motivo.");
      return;
    }
    setGuardando(true);
    try {
      const fecha = parseLocalDate(form.fecha);
      const [hour, minute] = form.hora.split(":").map(Number);
      fecha.setHours(hour, minute, 0, 0);
      await addDoc(collection(db, "usuarios", form.pacienteId, "citas"), {
        fecha: Timestamp.fromDate(fecha),
        hora: form.hora,
        motivo: form.motivo.trim(),
        estado: "programado",
        createdAt: serverTimestamp(),
      });
      setForm({ pacienteId: "", fecha: "", hora: "", motivo: "" });
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = async (turno) => {
    if (!window.confirm("¿Cancelar este turno?")) return;
    await updateDoc(
      doc(db, "usuarios", turno.pacienteId, "citas", turno.id),
      { estado: "cancelado", canceladoEn: serverTimestamp() }
    );
    await cargar();
  };

  return (
    <main className="turnos-page">
      <h1>Agenda de turnos</h1>
      <form className="turnos-form" onSubmit={crear}>
        <select
          value={form.pacienteId}
          onChange={(e) => setForm({ ...form, pacienteId: e.target.value })}
          required
        >
          <option value="">Seleccionar paciente</option>
          {pacientes.map((paciente) => (
            <option key={paciente.id} value={paciente.id}>
              {paciente.apellido}, {paciente.nombre} · DNI {paciente.dni || "-"}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          required
        />
        <input
          type="time"
          value={form.hora}
          onChange={(e) => setForm({ ...form, hora: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Motivo o tipo de control"
          value={form.motivo}
          onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          required
        />
        <button disabled={guardando}>
          {guardando ? "Guardando…" : "Agendar turno"}
        </button>
      </form>

      <section className="turnos-lista">
        <h2>Próximos turnos</h2>
        {proximos.length === 0 ? (
          <p>No hay turnos programados.</p>
        ) : (
          proximos.map((turno) => (
            <article key={`${turno.pacienteId}-${turno.id}`}>
              <div>
                <strong>{turno.paciente}</strong>
                <span>
                  {parseLocalDate(turno.fecha)?.toLocaleDateString("es-AR")} ·{" "}
                  {turno.hora} · {turno.motivo}
                </span>
              </div>
              <button type="button" onClick={() => cancelar(turno)}>
                Cancelar
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
};

export default Turnos;
