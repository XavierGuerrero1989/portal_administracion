import "./FormularioInfoPaciente.scss";

import React, { useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import Loader from "./Loader";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const FormularioInfoPaciente = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    dniConfirmado: "",
    telefono: "",
    fechaNacimiento: "",
    altura: "",
    peso: "",
    grupoSanguineo: "",
    fum: "",
    ciclosRegulares: "",
    duracionCiclo: "",
    ritmoMenstrual: "",
    // Gestas
    gestasG: "",
    gestasP: "",
    gestasC: "",
    gestasA: "",
    gestasE: "",
    dismenorrea: "",
    dispareunia: "",
    pareja: "",
    nombrePareja: "",
    tieneAlergias: "",
    detalleAlergias: "",
    antecedentesQuirurgicos: "",
    detalleAntecedentesQuirurgicos: "",
    patologias: "",
    medicacionHabitual: "",
    // Tratamientos previos
    tratamientosFIVPrevios: "",
    tratamientosIIUPrevios: "",
    tratamientosCrioOvulosPrevios: "",
    tratamientosTransferenciaEmbrionariaPrevios: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.dniConfirmado.trim()) {
      alert("❌ No se recibió el DNI del paciente.");
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "usuarios"),
        where("dni", "==", formData.dniConfirmado.trim())
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert("❌ No se encontró un usuario con ese DNI.");
        setLoading(false);
        return;
      }

      const docId = snapshot.docs[0].id;

      // setDoc con merge crea automáticamente los campos que no existan
      await setDoc(
        doc(db, "usuarios", docId),
        {
          ...formData,
        },
        { merge: true }
      );

      alert("✅ Datos clínicos guardados correctamente.");
      navigate("/dashboard");
    } catch (error) {
      console.error("❌ Error al guardar los datos clínicos:", error);
      alert("❌ Error al guardar los datos clínicos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="formulario-info" onSubmit={handleGuardar}>
      <h3>Información clínica</h3>

      <label>DNI del paciente</label>
      <input
        type="text"
        name="dniConfirmado"
        placeholder="DNI"
        value={formData.dniConfirmado}
        onChange={handleChange}
        required
      />

      <label>Teléfono</label>
      <input
        type="text"
        name="telefono"
        placeholder="Teléfono"
        value={formData.telefono}
        onChange={handleChange}
      />

      <label>Fecha de nacimiento</label>
      <input
        type="date"
        name="fechaNacimiento"
        value={formData.fechaNacimiento}
        onChange={handleChange}
      />

      <div className="fila-dos-columnas">
        <div>
          <label>Altura (cm)</label>
          <input
            type="number"
            name="altura"
            placeholder="Altura"
            value={formData.altura}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Peso (kg)</label>
          <input
            type="number"
            name="peso"
            placeholder="Peso"
            value={formData.peso}
            onChange={handleChange}
          />
        </div>
      </div>

      <label>Grupo sanguíneo</label>
      <input
        type="text"
        name="grupoSanguineo"
        placeholder="Grupo sanguíneo"
        value={formData.grupoSanguineo}
        onChange={handleChange}
      />

      <label>Fecha de última menstruación (FUM)</label>
      <input
        type="date"
        name="fum"
        value={formData.fum}
        onChange={handleChange}
      />

      <label>¿Ciclos menstruales regulares?</label>
      <select
        name="ciclosRegulares"
        value={formData.ciclosRegulares}
        onChange={handleChange}
      >
        <option value="">Seleccionar</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>

      {formData.ciclosRegulares === "si" && (
        <input
          type="number"
          name="duracionCiclo"
          placeholder="Duración del ciclo (días)"
          value={formData.duracionCiclo}
          onChange={handleChange}
        />
      )}

      <label>Ritmo menstrual (ej. 2/28)</label>
      <input
        type="text"
        name="ritmoMenstrual"
        placeholder="Ritmo menstrual"
        value={formData.ritmoMenstrual}
        onChange={handleChange}
      />

      <label>Gestas (G / P / C / A / E)</label>
      <div className="gestas-grid">
        <div className="gesta-item">
          <span>G</span>
          <input
            type="number"
            min="0"
            name="gestasG"
            value={formData.gestasG}
            onChange={handleChange}
          />
        </div>
        <div className="gesta-item">
          <span>P</span>
          <input
            type="number"
            min="0"
            name="gestasP"
            value={formData.gestasP}
            onChange={handleChange}
          />
        </div>
        <div className="gesta-item">
          <span>C</span>
          <input
            type="number"
            min="0"
            name="gestasC"
            value={formData.gestasC}
            onChange={handleChange}
          />
        </div>
        <div className="gesta-item">
          <span>A</span>
          <input
            type="number"
            min="0"
            name="gestasA"
            value={formData.gestasA}
            onChange={handleChange}
          />
        </div>
        <div className="gesta-item">
          <span>E</span>
          <input
            type="number"
            min="0"
            name="gestasE"
            value={formData.gestasE}
            onChange={handleChange}
          />
        </div>
      </div>

      <label>Dismenorrea</label>
      <select
        name="dismenorrea"
        value={formData.dismenorrea}
        onChange={handleChange}
      >
        <option value="">Seleccionar</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>

      <label>Dispareunia</label>
      <select
        name="dispareunia"
        value={formData.dispareunia}
        onChange={handleChange}
      >
        <option value="">Seleccionar</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>

      <label>Pareja</label>
      <select
        name="pareja"
        value={formData.pareja}
        onChange={handleChange}
      >
        <option value="">Seleccionar</option>
        <option value="femenino">Femenino</option>
        <option value="masculino">Masculino</option>
        <option value="sin_pareja">Sin pareja</option>
      </select>

      {formData.pareja && formData.pareja !== "sin_pareja" && (
        <input
          type="text"
          name="nombrePareja"
          placeholder="Nombre de la pareja"
          value={formData.nombrePareja}
          onChange={handleChange}
        />
      )}

      <label>¿Tiene alergias?</label>
      <select
        name="tieneAlergias"
        value={formData.tieneAlergias}
        onChange={handleChange}
      >
        <option value="">Seleccionar</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.tieneAlergias === "si" && (
        <input
          type="text"
          name="detalleAlergias"
          placeholder="¿Cuáles?"
          value={formData.detalleAlergias}
          onChange={handleChange}
        />
      )}

      <label>Antecedentes quirúrgicos</label>
      <select
        name="antecedentesQuirurgicos"
        value={formData.antecedentesQuirurgicos}
        onChange={handleChange}
      >
        <option value="">Seleccionar</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.antecedentesQuirurgicos === "si" && (
        <input
          type="text"
          name="detalleAntecedentesQuirurgicos"
          placeholder="¿Cuáles?"
          value={formData.detalleAntecedentesQuirurgicos}
          onChange={handleChange}
        />
      )}

      <label>Patologías previas relevantes</label>
      <input
        type="text"
        name="patologias"
        placeholder="Patologías"
        value={formData.patologias}
        onChange={handleChange}
      />

      <label>Medicación habitual</label>
      <input
        type="text"
        name="medicacionHabitual"
        placeholder="Medicación habitual"
        value={formData.medicacionHabitual}
        onChange={handleChange}
      />

      <h4>Tratamientos de fertilidad previos</h4>
      <div className="tratamientos-previos-grid">
        <div className="trat-previo-item">
          <span>FIV</span>
          <input
            type="number"
            min="0"
            name="tratamientosFIVPrevios"
            value={formData.tratamientosFIVPrevios}
            onChange={handleChange}
          />
        </div>
        <div className="trat-previo-item">
          <span>IIU</span>
          <input
            type="number"
            min="0"
            name="tratamientosIIUPrevios"
            value={formData.tratamientosIIUPrevios}
            onChange={handleChange}
          />
        </div>
        <div className="trat-previo-item">
          <span>CRIO DE ÓVULOS</span>
          <input
            type="number"
            min="0"
            name="tratamientosCrioOvulosPrevios"
            value={formData.tratamientosCrioOvulosPrevios}
            onChange={handleChange}
          />
        </div>
        <div className="trat-previo-item">
          <span>TRANSFERENCIA EMBRIONARIA</span>
          <input
            type="number"
            min="0"
            name="tratamientosTransferenciaEmbrionariaPrevios"
            value={formData.tratamientosTransferenciaEmbrionariaPrevios}
            onChange={handleChange}
          />
        </div>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? <Loader /> : "GUARDAR DATOS"}
      </button>
    </form>
  );
};

export default FormularioInfoPaciente;
