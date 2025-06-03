// functions/index.js
const { https } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true }); // Habilita CORS

admin.initializeApp();

exports.crearPacienteBasico = https.onCall(
  {
    secrets: ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"],
  },
  async (data, context) => {
    console.log("📥 Datos recibidos:", data);

    const { email, dni, nombre, apellido } = data.data;

    if (!email || typeof email !== "string" || !dni || typeof dni !== "string") {
      console.warn("❌ Faltan campos obligatorios:", { email, dni });
      throw new https.HttpsError(
        "invalid-argument",
        "Email y DNI son campos obligatorios."
      );
    }

    try {
      // Verificamos duplicados por DNI
      const snapshot = await admin.firestore()
        .collection("usuarios")
        .where("dni", "==", dni)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        throw new https.HttpsError("already-exists", "Ya existe un paciente con ese DNI.");
      }

      // Crear usuario en Auth
      const userRecord = await admin.auth().createUser({
        email,
        emailVerified: false,
        disabled: false,
      });

      // Asignar rol
      await admin.auth().setCustomUserClaims(userRecord.uid, { rol: "paciente" });

      // Guardar en Firestore
      await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
        nombre,
        apellido,
        dni,
        email,
        rol: "paciente",
        fechaCreacion: new Date(),
      });

      // Generar link y enviar email
      const link = await admin.auth().generatePasswordResetLink(email);
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Bienvenida a FertiApp: Activá tu cuenta",
        html: `
          <p>Hola ${nombre},</p>
          <p>Has sido registrada/o como paciente en FertiApp.</p>
          <p>Para acceder a la aplicación, hacé clic en el siguiente botón y elegí tu contraseña:</p>
          <p><a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#00bfa6;color:white;text-decoration:none;border-radius:5px;">Activar mi cuenta</a></p>
          <p>Gracias,<br>Equipo de FertiApp</p>
        `,
      };

      try {
        console.log("📬 Preparando email para:", email);
        await sgMail.send(msg);
        console.log("✅ Email enviado a:", email);
      } catch (sendError) {
        console.error("❌ Error al enviar email:", sendError.response?.body || sendError.message);
        throw new https.HttpsError("internal", "Error al enviar el correo.");
      }

      return { success: true, uid: userRecord.uid };
    } catch (error) {
      console.error("❌ Error en crearPacienteBasico:", error);
      throw new https.HttpsError("internal", error.message);
    }
  }
);

// 🗑️ ELIMINAR PACIENTE CON TODO
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
        console.warn("⚠️ No se pudo eliminar en Auth (puede no existir):", authError.message);
      }

      return res.status(200).json({ mensaje: "Paciente eliminado correctamente con todos sus datos." });
    } catch (error) {
      console.error("❌ Error al eliminar paciente:", error);
      return res.status(500).json({ error: "Error interno al eliminar el paciente." });
    }
  });
});