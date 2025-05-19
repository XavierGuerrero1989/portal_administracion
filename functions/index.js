const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

admin.initializeApp();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.crearPaciente = functions.https.onCall(async (data, context) => {
  console.log("📥 Datos recibidos en crearPaciente:", data);

  const { email, datosPaciente } = data;

  if (!email || typeof email !== "string") {
    console.error("❌ Email faltante o inválido");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El campo 'email' es obligatorio y debe ser un string válido."
    );
  }

  if (!datosPaciente || typeof datosPaciente !== "object") {
    console.error("❌ datosPaciente faltante o inválido");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Los datos clínicos del paciente son obligatorios."
    );
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      emailVerified: false,
      disabled: false,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      rol: "paciente",
    });

    await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
      ...datosPaciente,
      email,
      rol: "paciente",
      fechaCreacion: new Date(),
    });

    const link = await admin.auth().generatePasswordResetLink(email);

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Bienvenida a FertiApp: Activá tu cuenta",
      html: `
        <p>Hola ${datosPaciente.nombre || "paciente"},</p>
        <p>Has sido registrada/o como paciente en FertiApp.</p>
        <p>Para acceder a la aplicación, hacé clic en el siguiente botón y elegí tu contraseña:</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#00bfa6;color:white;text-decoration:none;border-radius:5px;">Activar mi cuenta</a></p>
        <p>Si no solicitaste esto, podés ignorar el mensaje.</p>
        <p>Gracias,<br>Equipo de FertiApp</p>
      `,
    };

    await sgMail.send(msg);

    console.log("✅ Usuario creado y email enviado correctamente.");
    return { success: true };
  } catch (error) {
    console.error("❌ Error al crear paciente:", error);
    return { success: false, error: error.message };
  }
});
