import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./Header.scss";

const Header = () => {
  const navigate = useNavigate();
  const fechaActual = new Date();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <header className="header">
      <nav className="nav-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/pacientes">Pacientes</NavLink>
        <NavLink to="/turnos">Turnos</NavLink>
        <NavLink to="/tratamientos">Tratamientos</NavLink>
        <NavLink to="/estadisticasIA">Análisis</NavLink>
      </nav>

      <div className="fecha-hoy">
        <Calendar size={18} className="icono-calendario" />
        <span>
          {fechaActual.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="header-actions">
        <button type="button" className="btn-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default Header;
