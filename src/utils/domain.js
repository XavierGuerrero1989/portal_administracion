export const parseLocalDate = (value) => {
  if (!value) return null;
  if (value?.toDate instanceof Function) return value.toDate();
  if (value instanceof Date) return new Date(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isNotificationCancelled = (notification) =>
  notification?.cancelada === true ||
  ["cancelada", "cancelada_por_finalizacion"].includes(notification?.estado);

export const normalizeRole = (profile) =>
  String(profile?.role || profile?.rol || "").trim().toLowerCase();

export const normalizeStudy = (study) => {
  const follicleCount =
    study?.recuentoFolicularTotal ??
    study?.recuentoFolicular ??
    study?.foliculos ??
    "";

  return {
    ...study,
    recuentoFolicularTotal: follicleCount,
    recuentoFolicular: follicleCount,
    foliculos: follicleCount,
  };
};
