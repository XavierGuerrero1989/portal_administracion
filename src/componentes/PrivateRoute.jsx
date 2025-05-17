import React, { useEffect, useState } from "react";

import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const PrivateRoute = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null; // o un Loader si preferís

  return usuario ? children : <Navigate to="/" />;
};

export default PrivateRoute;
