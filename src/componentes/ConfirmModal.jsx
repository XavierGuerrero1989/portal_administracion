import React from "react";
import "./ConfirmModal.scss";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  mensaje,
  mensajeExito,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{titulo || "Confirmar acción"}</h3>
        {mensajeExito ? (
          <p className="mensaje-exito">✅ {mensajeExito}</p>
        ) : (
          <>
            <p>{mensaje || "¿Estás seguro de que querés continuar?"}</p>
            <div className="botones">
              <button className="cancelar" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button className="confirmar" onClick={onConfirm} disabled={loading}>
                {loading ? "Eliminando..." : "Confirmar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmModal;

