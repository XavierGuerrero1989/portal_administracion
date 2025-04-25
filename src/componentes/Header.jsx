// src/components/Header.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import "./Header.scss";

const Header = () => {
  return (
    <header className="header">
      <nav>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/pacientes">Pacientes</NavLink>
        <NavLink to="/tratamientos">Tratamientos</NavLink>
        <NavLink to="/estudios">Estudios</NavLink>
      </nav>
    </header>
  );
};

export default Header;