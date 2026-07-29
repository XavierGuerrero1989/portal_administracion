import test from "node:test";
import assert from "node:assert/strict";
import {
  isNotificationCancelled,
  normalizeRole,
  normalizeStudy,
  parseLocalDate,
} from "./domain.js";

test("parseLocalDate conserva el día calendario argentino", () => {
  const parsed = parseLocalDate("2026-07-29");
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 6);
  assert.equal(parsed.getDate(), 29);
});

test("acepta ambas variantes históricas de rol", () => {
  assert.equal(normalizeRole({ role: "medico" }), "medico");
  assert.equal(normalizeRole({ rol: "paciente" }), "paciente");
});

test("reconoce todos los estados de cancelación", () => {
  assert.equal(isNotificationCancelled({ cancelada: true }), true);
  assert.equal(isNotificationCancelled({ estado: "cancelada" }), true);
  assert.equal(
    isNotificationCancelled({ estado: "cancelada_por_finalizacion" }),
    true
  );
  assert.equal(isNotificationCancelled({ estado: "pendiente" }), false);
});

test("normaliza recuentos foliculares antiguos y nuevos", () => {
  assert.equal(normalizeStudy({ foliculos: 8 }).recuentoFolicularTotal, 8);
  assert.equal(normalizeStudy({ recuentoFolicular: 10 }).foliculos, 10);
});
