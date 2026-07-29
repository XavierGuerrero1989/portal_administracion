const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

async function requireDoctor(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debés iniciar sesión.");
  }

  const tokenRole = request.auth.token.role || request.auth.token.rol;
  if (tokenRole === "medico") return request.auth.uid;

  const profile = await db.collection("usuarios").doc(request.auth.uid).get();
  const profileData = profile.exists ? profile.data() : {};
  if (profileData.role !== "medico" && profileData.rol !== "medico") {
    throw new HttpsError(
      "permission-denied",
      "Solo el personal médico autorizado puede realizar esta operación."
    );
  }

  return request.auth.uid;
}

function normalizedText(value, maxLength) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

exports.crearPacienteBasico = onCall(
  {
    region: "us-central1",
    enforceAppCheck: false,
  },
  async (request) => {
    const actorUid = await requireDoctor(request);
    const email = normalizedText(request.data?.email, 254).toLowerCase();
    const dni = normalizedText(request.data?.dni, 32);
    const nombre = normalizedText(request.data?.nombre, 100);
    const apellido = normalizedText(request.data?.apellido, 100);

    if (!email || !dni || !nombre || !apellido) {
      throw new HttpsError(
        "invalid-argument",
        "Nombre, apellido, email y DNI son obligatorios."
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "El email no es válido.");
    }

    const duplicateDni = await db
      .collection("usuarios")
      .where("dni", "==", dni)
      .limit(1)
      .get();
    if (!duplicateDni.empty) {
      throw new HttpsError(
        "already-exists",
        "Ya existe un paciente con ese DNI."
      );
    }

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        emailVerified: false,
        disabled: false,
      });
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        rol: "paciente",
      });
      await db.collection("usuarios").doc(userRecord.uid).set({
        nombre,
        apellido,
        dni,
        email,
        rol: "paciente",
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        creadoPor: actorUid,
      });

      return {
        success: true,
        uid: userRecord.uid,
        emailSent: false,
      };
    } catch (error) {
      if (userRecord?.uid) {
        await admin.auth().deleteUser(userRecord.uid).catch(() => {});
      }
      if (error instanceof HttpsError) throw error;
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Ya existe una cuenta con ese email."
        );
      }
      console.error("crearPacienteBasico failed", {
        code: error.code || "unknown",
      });
      throw new HttpsError("internal", "No se pudo crear la paciente.");
    }
  }
);

exports.eliminarPacienteConTodo = onCall(
  {
    region: "us-central1",
    enforceAppCheck: false,
  },
  async (request) => {
    const actorUid = await requireDoctor(request);
    const id = normalizedText(request.data?.id, 128);

    if (!id || id === actorUid) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador de paciente no es válido."
      );
    }

    const userRef = db.collection("usuarios").doc(id);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "Paciente no encontrado.");
    }

    const userData = userSnap.data();
    if (userData.role === "medico" || userData.rol === "medico") {
      throw new HttpsError(
        "failed-precondition",
        "No se puede eliminar una cuenta médica desde este flujo."
      );
    }

    try {
      await db.collection("auditoria").add({
        accion: "eliminar_paciente",
        actorUid,
        pacienteUid: id,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.recursiveDelete(userRef);
      await admin.auth().deleteUser(id);
      return { success: true };
    } catch (error) {
      console.error("eliminarPacienteConTodo failed", {
        code: error.code || "unknown",
      });
      throw new HttpsError(
        "internal",
        "No se pudo completar la eliminación del paciente."
      );
    }
  }
);
