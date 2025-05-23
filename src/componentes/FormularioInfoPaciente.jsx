import "./FormularioInfoPaciente.scss";

import React, { useState } from "react";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";

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
    embarazosPrevios: "",
    cantidadEmbarazos: "",
    hijos: "",
    cantidadHijos: "",
    pareja: "",
    nombrePareja: "",
    tieneAlergias: "",
    detalleAlergias: "",
    procedimientos: "",
    detalleProcedimientos: "",
    patologias: "",
    medicacionHabitual: "",
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
      const q = query(collection(db, "usuarios"), where("dni", "==", formData.dniConfirmado.trim()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert("❌ No se encontró un usuario con ese DNI.");
        setLoading(false);
        return;
      }

      const docId = snapshot.docs[0].id;

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
      <input type="text" name="dniConfirmado" placeholder="DNI" value={formData.dniConfirmado} onChange={handleChange} required />

      <label>Teléfono</label>
      <input type="text" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleChange} />

      <label>Fecha de nacimiento</label>
      <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} />

      <label>Altura (cm)</label>
      <input type="number" name="altura" placeholder="Altura" value={formData.altura} onChange={handleChange} />

      <label>Peso (kg)</label>
      <input type="number" name="peso" placeholder="Peso" value={formData.peso} onChange={handleChange} />

      <label>Grupo sanguíneo</label>
      <input type="text" name="grupoSanguineo" placeholder="Grupo sanguíneo" value={formData.grupoSanguineo} onChange={handleChange} />

      <label>Fecha de última menstruación (FUM)</label>
      <input type="date" name="fum" value={formData.fum} onChange={handleChange} />

      <label>¿Ciclos menstruales regulares?</label>
      <select name="ciclosRegulares" value={formData.ciclosRegulares} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="sí">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.ciclosRegulares === "sí" && (
        <input type="number" name="duracionCiclo" placeholder="Duración del ciclo (días)" value={formData.duracionCiclo} onChange={handleChange} />
      )}

      <label>¿Tuvo embarazos previos?</label>
      <select name="embarazosPrevios" value={formData.embarazosPrevios} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="sí">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.embarazosPrevios === "sí" && (
        <input type="number" name="cantidadEmbarazos" placeholder="¿Cuántos?" value={formData.cantidadEmbarazos} onChange={handleChange} />
      )}

      <label>¿Tiene hijos?</label>
      <select name="hijos" value={formData.hijos} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="sí">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.hijos === "sí" && (
        <input type="number" name="cantidadHijos" placeholder="¿Cuántos?" value={formData.cantidadHijos} onChange={handleChange} />
      )}

      <label>¿Está en pareja?</label>
      <select name="pareja" value={formData.pareja} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="sí">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.pareja === "sí" && (
        <input type="text" name="nombrePareja" placeholder="Nombre de la pareja" value={formData.nombrePareja} onChange={handleChange} />
      )}

      <label>¿Tiene alergias?</label>
      <select name="tieneAlergias" value={formData.tieneAlergias} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="sí">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.tieneAlergias === "sí" && (
        <input type="text" name="detalleAlergias" placeholder="¿Cuáles?" value={formData.detalleAlergias} onChange={handleChange} />
      )}

      <label>¿Tuvo procedimientos quirúrgicos?</label>
      <select name="procedimientos" value={formData.procedimientos} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="sí">Sí</option>
        <option value="no">No</option>
      </select>
      {formData.procedimientos === "sí" && (
        <input type="text" name="detalleProcedimientos" placeholder="¿Cuáles?" value={formData.detalleProcedimientos} onChange={handleChange} />
      )}

      <label>Patologías previas relevantes</label>
      <input type="text" name="patologias" placeholder="Patologías" value={formData.patologias} onChange={handleChange} />

      <label>Medicación habitual</label>
      <input type="text" name="medicacionHabitual" placeholder="Medicación habitual" value={formData.medicacionHabitual} onChange={handleChange} />

      <button type="submit" disabled={loading}>
        {loading ? <Loader /> : "GUARDAR DATOS"}
      </button>
    </form>
  );
};

export default FormularioInfoPaciente;
