const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.crearPaciente = functions.https.onCall(async (data, context) => {
  const {
    email,
    datosPaciente // viene del formulario React
  } = data;

  try {
    // 1. Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: false,
      disabled: false,
    });

    // 2. Asignar rol como custom claim (opcional pero recomendado)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      rol: "paciente",
    });

    // 3. Guardar perfil clínico en Firestore
    await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
      ...datosPaciente,
      email,
      rol: "paciente",
      fechaCreacion: new Date(),
    });

    // 4. Generar link de creación de contraseña
    const link = await admin.auth().generatePasswordResetLink(email);

    // 5. (Opcional) Enviar el link por email con tu proveedor externo

    // Por ahora devolvemos el link al frontend
    return { success: true, link };
  } catch (error) {
    console.error("Error al crear paciente:", error);
    return { success: false, error: error.message };
  }
});
