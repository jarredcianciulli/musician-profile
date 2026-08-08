/** Lead helpers for studio-api KV payload */

export function newLeadId() {
  return `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertLead(leads, incoming) {
  const list = Array.isArray(leads) ? [...leads] : [];
  const email = (incoming.email || "").trim().toLowerCase();
  const phone = (incoming.phone || "").trim();
  const key =
    incoming.reservationId ||
    (email && incoming.source
      ? `${incoming.source}:${email}:${incoming.slotStart || ""}`
      : "");

  if (key) {
    const idx = list.findIndex(
      (l) =>
        (incoming.reservationId && l.reservationId === incoming.reservationId) ||
        (email &&
          l.email === email &&
          l.source === incoming.source &&
          (l.slotStart || "") === (incoming.slotStart || "") &&
          l.status === "new")
    );
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...incoming,
        email: email || list[idx].email,
        phone: phone || list[idx].phone,
        updatedAt: new Date().toISOString(),
      };
      return list;
    }
  }

  list.unshift({
    id: incoming.id || newLeadId(),
    createdAt: incoming.createdAt || new Date().toISOString(),
    status: incoming.status || "new",
    ...incoming,
    email: email || undefined,
    phone: phone || undefined,
  });
  return list.slice(0, 500);
}

export function leadFromReservation(reservation, source, cancelReason) {
  return {
    source,
    status: "new",
    name: reservation.name || "",
    email: reservation.email || "",
    phone: reservation.phone || "",
    slotStart: reservation.start || "",
    slotEnd: reservation.end || "",
    durationMinutes: reservation.durationMinutes,
    format: reservation.format,
    reservationId: reservation.id,
    notes: reservation.notes || "",
    cancelReason: cancelReason || undefined,
  };
}
