// componentes/ConfirmModal.jsx
import React from "react";
import "./ConfirmModal.scss";

const ConfirmModal = ({ isOpen, onCancel, onConfirm, titulo, mensaje }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{titulo || "Confirmar acción"}</h3>
        <p>{mensaje || "¿Estás seguro de que querés continuar?"}</p>
        <div className="botones">
          <button className="cancelar" onClick={onCancel}>
            Cancelar
          </button>
          <button className="confirmar" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
