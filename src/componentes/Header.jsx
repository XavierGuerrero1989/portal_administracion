import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Calendar, Bell } from "lucide-react";
import "./Header.scss";

import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

const Header = () => {
  const fechaActual = new Date();
  const navigate = useNavigate();

  const [notificaciones, setNotificaciones] = useState([]);
  const [showModalNotificaciones, setShowModalNotificaciones] = useState(false);

  const formatearFecha = (fecha) => {
    return fecha.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const hayNotificaciones = notificaciones.length > 0;

  useEffect(() => {
    // Escucha en tiempo real a la colección "notificaciones"
    const q = query(
      collection(db, "notificaciones"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const datos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotificaciones(datos);
      },
      (error) => {
        console.error("Error al cargar notificaciones:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // volvemos al login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const toggleModalNotificaciones = () => {
    if (!hayNotificaciones) return; // si no hay, no abre nada
    setShowModalNotificaciones((prev) => !prev);
  };

  return (
    <>
      <header className="header">
        <nav className="nav-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/pacientes">Pacientes</NavLink>
          <NavLink to="/tratamientos">Tratamientos</NavLink>
          <NavLink to="/estadisticasIA">Estadísticas IA</NavLink>
        </nav>

        <div className="fecha-hoy">
          <Calendar size={18} className="icono-calendario" />
          <span>{formatearFecha(fechaActual)}</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`btn-icon btn-notificaciones ${
              hayNotificaciones ? "btn-notificaciones--active" : ""
            }`}
            onClick={toggleModalNotificaciones}
            title={
              hayNotificaciones
                ? "Ver notificaciones"
                : "No hay notificaciones"
            }
          >
            <Bell className={`icono-campana ${hayNotificaciones ? "activa" : ""}`} />
          </button>

          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* MODAL DE NOTIFICACIONES */}
      {showModalNotificaciones && (
        <div
          className="notifications-backdrop"
          onClick={() => setShowModalNotificaciones(false)}
        >
          <div
            className="notifications-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Notificaciones</h3>

            {notificaciones.length === 0 ? (
              <p className="sin-notificaciones">
                No hay notificaciones disponibles.
              </p>
            ) : (
              <ul className="lista-notificaciones">
                {notificaciones.map((notif) => (
                  <li key={notif.id} className="item-notificacion">
                    <h4>{notif.titulo || "Notificación"}</h4>
                    {notif.mensaje && <p>{notif.mensaje}</p>}
                    {notif.createdAt && (
                      <span className="fecha-notificacion">
                        {new Date(
                          notif.createdAt.seconds * 1000
                        ).toLocaleString("es-AR")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="btn-cerrar-modal"
              onClick={() => setShowModalNotificaciones(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
