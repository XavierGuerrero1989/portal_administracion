// functions/index.js

// 🔥 Firebase Functions v2 (para onCall)
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// ⚙️ Functions v1 (para eliminarPacienteConTodo y otras cosas HTTP)
const functions = require("firebase-functions");

// 🌐 CORS para funciones HTTP clásicas
const cors = require("cors")({ origin: true });

// Inicializar Firebase Admin
admin.initializeApp();

/* ──────────────────────────────────────────────────────────────
    📌 crearPacienteBasico (CALLABLE, SIN ENVÍO DE MAIL)
    - Lo llama el portal con httpsCallable
    - Crea usuario en Auth
    - Crea documento en /usuarios
    - NO envía email (lo hará luego Firebase Auth con "Olvidé mi contraseña")
   ────────────────────────────────────────────────────────────── */
exports.crearPacienteBasico = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    console.log("📥 Datos recibidos en crearPacienteBasico:", request.data);

    const { email, dni, nombre, apellido } = request.data || {};

    // Validación básica
    if (!email || typeof email !== "string" || !dni || typeof dni !== "string") {
      console.warn("❌ Faltan campos obligatorios o formato incorrecto:", {
        email,
        dni,
      });
      throw new HttpsError(
        "invalid-argument",
        "Email y DNI son campos obligatorios."
      );
    }

    try {
      /* ────────────────────────────────
         1️⃣ Verificar duplicado por DNI
      ──────────────────────────────── */
      const snapshot = await admin
        .firestore()
        .collection("usuarios")
        .where("dni", "==", dni)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        console.warn("⚠️ Ya existe un paciente con ese DNI:", dni);
        throw new HttpsError(
          "already-exists",
          "Ya existe un paciente con ese DNI."
        );
      }

      /* ────────────────────────────────
         2️⃣ Crear usuario en Auth
      ──────────────────────────────── */
      const userRecord = await admin.auth().createUser({
        email,
        emailVerified: false,
        disabled: false,
      });

      console.log("✅ Usuario creado en Auth:", userRecord.uid);

      // Asignar rol custom
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        rol: "paciente",
      });

      /* ────────────────────────────────
         3️⃣ Guardar datos básicos en Firestore
      ──────────────────────────────── */
      await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
        nombre,
        apellido,
        dni,
        email,
        rol: "paciente",
        fechaCreacion: new Date(),
      });

      console.log("✅ Documento de usuario creado en Firestore:", userRecord.uid);

      /* ────────────────────────────────
         4️⃣ Fin — sin envío de email
      ──────────────────────────────── */

      return {
        success: true,
        uid: userRecord.uid,
        emailSent: false, // explícito para el frontend
      };
    } catch (error) {
      console.error("❌ Error en crearPacienteBasico:", error);
      throw new HttpsError("internal", error.message || "Error interno.");
    }
  }
);

/* ──────────────────────────────────────────────────────────────
    🗑️ eliminarPacienteConTodo (HTTP + CORS)
    - Igual que lo tenías antes
   ────────────────────────────────────────────────────────────── */
exports.eliminarPacienteConTodo = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "DELETE") {
      return res.status(405).send("Método no permitido");
    }

    const id = req.query.id;

    if (!id) {
      return res.status(400).json({ error: "ID de paciente no proporcionado" });
    }

    try {
      const db = admin.firestore();
      const userRef = db.collection("usuarios").doc(id);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        return res.status(404).json({ error: "Paciente no encontrado" });
      }

      // 🔥 1. Eliminar subcolecciones dentro de tratamientos
      const tratamientosSnap = await userRef.collection("tratamientos").get();
      for (const doc of tratamientosSnap.docs) {
        const tratamientoRef = userRef.collection("tratamientos").doc(doc.id);
        const subcollections = await tratamientoRef.listCollections();
        for (const subcol of subcollections) {
          const subSnap = await subcol.get();
          for (const subDoc of subSnap.docs) {
            await subDoc.ref.delete();
          }
        }
        await tratamientoRef.delete();
      }

      // 🔥 2. Eliminar otras subcolecciones del paciente
      const otrasSubcolecciones = await userRef.listCollections();
      for (const subcol of otrasSubcolecciones) {
        if (subcol.id !== "tratamientos") {
          const subSnap = await subcol.get();
          for (const subDoc of subSnap.docs) {
            await subDoc.ref.delete();
          }
        }
      }

      // 🔥 3. Eliminar documento principal
      await userRef.delete();

      // 🔥 4. Eliminar usuario de Auth
      try {
        await admin.auth().deleteUser(id);
      } catch (authError) {
        console.warn(
          "⚠️ No se pudo eliminar en Auth (puede no existir):",
          authError.message
        );
      }

      return res.status(200).json({
        mensaje: "Paciente eliminado correctamente con todos sus datos.",
      });
    } catch (error) {
      console.error("❌ Error al eliminar paciente:", error);
      return res
        .status(500)
        .json({ error: "Error interno al eliminar el paciente." });
    }
  });
});
