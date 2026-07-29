import React, { useEffect, useState } from "react";

import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const PrivateRoute = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUsuario(null);
        setLoading(false);
        return;
      }

      try {
        const [token, profile] = await Promise.all([
          user.getIdTokenResult(),
          getDoc(doc(db, "usuarios", user.uid)),
        ]);
        const data = profile.exists() ? profile.data() : {};
        const role =
          token.claims.role ||
          token.claims.rol ||
          data.role ||
          data.rol;

        if (role !== "medico") {
          await signOut(auth);
          setUsuario(null);
        } else {
          setUsuario(user);
        }
      } catch {
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null; // o un Loader si preferís

  return usuario ? children : <Navigate to="/" />;
};

export default PrivateRoute;
