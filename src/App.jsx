import "./App.scss";

import { Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./paginas/Dashboard";
import Login from "./paginas/login";
import NuevoPaciente from "./paginas/NuevoPaciente";
import Pacientes from "./paginas/Pacientes";
import PerfilPaciente from "./paginas/PerfilPaciente";
import PrivateRoute from "./componentes/PrivateRoute";
import React from "react";
import Tratamientos from "./paginas/Tratamientos";
import AnalisisYEvolucion from "./paginas/AnalisisYEvolucion";
import HistorialPaciente from "./paginas/HistorialPaciente";
import DetalleTratamiento from "./paginas/DetalleTratamiento";
import EstadisticasIA from "./paginas/EstadisticasIA";
import RecuperarClave from "./paginas/RecuperarClave";
import LayoutPrivado from "./componentes/LayoutPrivado";

const App = () => {
  return (
    <div className="app-container">
      <Routes>
        {/* LOGIN (pública) */}
        <Route path="/" element={<Login />} />

        {/* RECUPERAR CONTRASEÑA (pública) */}
        <Route path="/recuperar-clave" element={<RecuperarClave />} />

        {/* RUTAS PRIVADAS */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <Dashboard />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/pacientes"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <Pacientes />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/pacientes/nuevo"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <NuevoPaciente />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/tratamientos"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <Tratamientos />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/estadisticasIA"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <EstadisticasIA />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/pacientes/:id/perfil"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <PerfilPaciente />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/pacientes/:id/evolucion"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <AnalisisYEvolucion />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/pacientes/:id/historial"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <HistorialPaciente />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        <Route
          path="/tratamientos/:idUsuario/:idTratamiento"
          element={
            <PrivateRoute>
              <LayoutPrivado>
                <DetalleTratamiento />
              </LayoutPrivado>
            </PrivateRoute>
          }
        />

        {/* RUTA DESCONOCIDA */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;
