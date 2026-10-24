/** Soft gate: edit URL only works after clicking Edit on the detail page. */
const KEY = "bss_admin_student_edit";
const TTL_MS = 30 * 60 * 1000;

type Gate = { id: string; exp: number };

export function grantStudentEditAccess(enrollmentId: string) {
  if (typeof sessionStorage === "undefined") return;
  const gate: Gate = { id: enrollmentId, exp: Date.now() + TTL_MS };
  sessionStorage.setItem(KEY, JSON.stringify(gate));
}

export function consumeStudentEditAccess(enrollmentId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const gate = JSON.parse(raw) as Gate;
    if (!gate?.id || gate.id !== enrollmentId) return false;
    if (Date.now() > Number(gate.exp || 0)) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearStudentEditAccess() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
}
