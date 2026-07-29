import fs from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const rules = await fs.readFile("./firestore.rules", "utf8");
const testEnv = await initializeTestEnvironment({
  projectId: "appfertilidad-rules-test",
  firestore: { rules },
});

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "usuarios", "doctor-1"), {
      role: "medico",
      nombre: "Médico",
    });
    await setDoc(doc(db, "usuarios", "patient-1"), {
      rol: "paciente",
      nombre: "Paciente",
    });
    await setDoc(doc(db, "usuarios", "patient-2"), {
      rol: "paciente",
      nombre: "Otra paciente",
    });
    await setDoc(doc(db, "usuarios", "patient-1", "tratamientos", "activo"), {
      estado: "activo",
    });
    await setDoc(doc(db, "usuarios", "patient-1", "notificaciones", "dose-1"), {
      medicamento: "FSH",
      confirmada: false,
    });
  });

  const anonymous = testEnv.unauthenticatedContext().firestore();
  const patient = testEnv
    .authenticatedContext("patient-1", { rol: "paciente" })
    .firestore();
  const doctor = testEnv.authenticatedContext("doctor-1").firestore();

  await assertFails(getDoc(doc(anonymous, "usuarios", "patient-1")));
  await assertFails(
    setDoc(doc(anonymous, "usuarios", "anonymous-write"), { role: "medico" })
  );

  await assertSucceeds(getDoc(doc(patient, "usuarios", "patient-1")));
  await assertFails(getDoc(doc(patient, "usuarios", "patient-2")));
  await assertSucceeds(
    getDoc(doc(patient, "usuarios", "patient-1", "tratamientos", "activo"))
  );
  await assertFails(
    updateDoc(doc(patient, "usuarios", "patient-1"), { telefono: "test" })
  );
  await assertSucceeds(
    updateDoc(doc(patient, "usuarios", "patient-1"), {
      aceptoTerminos: true,
    })
  );
  await assertFails(
    updateDoc(doc(patient, "usuarios", "patient-1"), { rol: "medico" })
  );
  await assertFails(
    updateDoc(
      doc(patient, "usuarios", "patient-1", "tratamientos", "activo"),
      { estado: "finalizado" }
    )
  );
  await assertFails(
    setDoc(doc(patient, "usuarios", "patient-1", "citas", "self-created"), {
      motivo: "Control",
    })
  );
  await assertFails(
    setDoc(doc(patient, "usuarios", "patient-1", "notificaciones", "fake"), {
      confirmada: true,
    })
  );
  await assertFails(
    updateDoc(
      doc(patient, "usuarios", "patient-1", "notificaciones", "dose-1"),
      { medicamento: "Otro" }
    )
  );
  await assertSucceeds(
    updateDoc(
      doc(patient, "usuarios", "patient-1", "notificaciones", "dose-1"),
      { confirmada: true }
    )
  );

  await assertSucceeds(getDocs(collection(doctor, "usuarios")));
  await assertSucceeds(
    setDoc(doc(doctor, "usuarios", "patient-2", "historial", "event-1"), {
      tipo: "auditoria",
    })
  );

  console.log("Security rule tests passed.");
} finally {
  await testEnv.cleanup();
}
