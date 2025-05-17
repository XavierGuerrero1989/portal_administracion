import "./NuevoPaciente.scss";

import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";

import { db } from "../firebase";

const NuevoPaciente = () => {
  const [formData, setFormData] = useState({
    // Identificación
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    email: "",
    telefono: "",

    // Datos clínicos
    altura: "",
    peso: "",
    grupoSanguineo: "",
    fum: "",
    ciclosRegulares: "",

    // Historia reproductiva
    embarazosPrevios: "",
    cantidadEmbarazos: "",
    hijos: "",
    cantidadHijos: "",
    pareja: "",
    nombrePareja: "",

    // Alergias
    tieneAlergias: "",
    detalleAlergias: "",

    // Patologías
    patologias: "",
    medicacionHabitual: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "usuarios"), {
        ...formData,
        fechaCreacion: new Date(),
      });

      alert("Paciente creado correctamente.");
    } catch (error) {
      console.error("Error al guardar paciente:", error);
      alert("Hubo un error al guardar.");
    }
  };

  return (
    <div className="nuevo-paciente">
      <h2>Nuevo paciente</h2>
      <form onSubmit={handleSubmit} className="formulario">

        {/* Identificación */}
        <fieldset>
          <legend>Datos personales</legend>
          <div className="grupo">
            <label>Nombre</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
          </div>
          <div className="grupo">
            <label>Apellido</label>
            <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required />
          </div>
          <div className="grupo">
            <label>DNI</label>
            <input type="text" name="dni" value={formData.dni} onChange={handleChange} />
          </div>
          <div className="grupo">
            <label>Fecha de nacimiento</label>
            <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required />
          </div>
          <div className="grupo">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="grupo">
            <label>Teléfono</label>
            <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} />
          </div>
        </fieldset>

        {/* Datos clínicos */}
        <fieldset>
          <legend>Datos clínicos</legend>
          <div className="grupo">
            <label>Altura (cm)</label>
            <input type="number" name="altura" value={formData.altura} onChange={handleChange} />
          </div>
          <div className="grupo">
            <label>Peso (kg)</label>
            <input type="number" name="peso" value={formData.peso} onChange={handleChange} />
          </div>
          <div className="grupo">
            <label>Grupo sanguíneo</label>
            <input type="text" name="grupoSanguineo" value={formData.grupoSanguineo} onChange={handleChange} />
          </div>
          <div className="grupo">
            <label>FUM (Fecha última menstruación)</label>
            <input type="date" name="fum" value={formData.fum} onChange={handleChange} />
          </div>
          <div className="grupo">
            <label>Ciclos menstruales regulares</label>
            <select name="ciclosRegulares" value={formData.ciclosRegulares} onChange={handleChange}>
              <option value="">Seleccionar</option>
              <option value="sí">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </fieldset>

        {/* Historia reproductiva */}
        <fieldset>
          <legend>Historia reproductiva</legend>
          <div className="grupo">
            <label>¿Tuvo embarazos previos?</label>
            <select name="embarazosPrevios" value={formData.embarazosPrevios} onChange={handleChange}>
              <option value="">Seleccionar</option>
              <option value="sí">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          {formData.embarazosPrevios === "sí" && (
            <div className="grupo">
              <label>¿Cuántos?</label>
              <input type="number" name="cantidadEmbarazos" value={formData.cantidadEmbarazos} onChange={handleChange} />
            </div>
          )}
          <div className="grupo">
            <label>¿Tiene hijos?</label>
            <select name="hijos" value={formData.hijos} onChange={handleChange}>
              <option value="">Seleccionar</option>
              <option value="sí">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          {formData.hijos === "sí" && (
            <div className="grupo">
              <label>¿Cuántos?</label>
              <input type="number" name="cantidadHijos" value={formData.cantidadHijos} onChange={handleChange} />
            </div>
          )}
          <div className="grupo">
            <label>¿Está en pareja?</label>
            <select name="pareja" value={formData.pareja} onChange={handleChange}>
              <option value="">Seleccionar</option>
              <option value="sí">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          {formData.pareja === "sí" && (
            <div className="grupo">
              <label>Nombre de la pareja</label>
              <input type="text" name="nombrePareja" value={formData.nombrePareja} onChange={handleChange} />
            </div>
          )}
        </fieldset>

        {/* Alergias y antecedentes */}
        <fieldset>
          <legend>Alergias y antecedentes</legend>
          <div className="grupo">
            <label>¿Tiene alergias?</label>
            <select name="tieneAlergias" value={formData.tieneAlergias} onChange={handleChange}>
              <option value="">Seleccionar</option>
              <option value="sí">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          {formData.tieneAlergias === "sí" && (
            <div className="grupo">
              <label>¿Cuáles?</label>
              <input type="text" name="detalleAlergias" value={formData.detalleAlergias} onChange={handleChange} />
            </div>
          )}
          <div className="grupo">
            <label>Patologías previas relevantes</label>
            <input type="text" name="patologias" value={formData.patologias} onChange={handleChange} />
          </div>
          <div className="grupo">
            <label>Medicación habitual</label>
            <input type="text" name="medicacionHabitual" value={formData.medicacionHabitual} onChange={handleChange} />
          </div>
        </fieldset>

        <button type="submit" className="btn-guardar">Guardar paciente</button>
      </form>
    </div>
  );
};

export default NuevoPaciente;
