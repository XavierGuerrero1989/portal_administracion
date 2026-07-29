import fs from "node:fs/promises";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = JSON.parse(
  await fs.readFile(
    "/Volumes/FERTIDISK/FERTIAPP/portal_administracion/serviceAccountKey.json",
    "utf8"
  )
);
const firebaseConfigSource = await fs.readFile("./src/firebase.js", "utf8");
const apiKey = firebaseConfigSource.match(/apiKey:\s*["']([^"']+)/)?.[1];
if (!apiKey) throw new Error("Firebase API key not found.");

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const doctorUid = "UM631YGTWlhTpO6PxDAt2nIfR6n2";
const patientUid = "aM0CwARKZXMgRLnmG5Yo29M3uEp2";

async function idTokenFor(uid) {
  const customToken = await auth.createCustomToken(uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);
  return body.idToken;
}

async function readUser(requesterToken, targetUid) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/appfertilidad/databases/(default)/documents/usuarios/${targetUid}`,
    { headers: { authorization: `Bearer ${requesterToken}` } }
  );
  return response.status;
}

const [doctorToken, patientToken] = await Promise.all([
  idTokenFor(doctorUid),
  idTokenFor(patientUid),
]);
const results = {
  doctorReadsPatient: await readUser(doctorToken, patientUid),
  patientReadsSelf: await readUser(patientToken, patientUid),
  patientReadsDoctor: await readUser(patientToken, doctorUid),
};
console.log(JSON.stringify(results, null, 2));
if (
  results.doctorReadsPatient !== 200 ||
  results.patientReadsSelf !== 200 ||
  results.patientReadsDoctor !== 403
) {
  process.exit(1);
}
