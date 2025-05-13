import React from "react";
import { NavLink } from "react-router-dom";
import { Calendar } from "lucide-react"; // Ícono de calendario
import "./Header.scss";

const Header = () => {
  const fechaActual = new Date();

  const formatearFecha = (fecha) => {
    return fecha.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <header className="header">
      <nav className="nav-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/pacientes">Pacientes</NavLink>
        <NavLink to="/tratamientos">Tratamientos</NavLink>
        <NavLink to="/estudios">Estudios</NavLink>
      </nav>

      <div className="fecha-hoy">
        <Calendar size={18} className="icono" />
        <span>{formatearFecha(fechaActual)}</span>
      </div>
    </header>
  );
};

export default Header;
