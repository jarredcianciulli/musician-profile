/** Reference-counted scroll lock for stacked/multiple modals. */
let lockCount = 0;
let savedScrollY = 0;

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const { body, documentElement } = document;
    body.dataset.scrollLocked = "1";
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    // iOS / rubber-band: pin body so background can't move
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  const { body, documentElement } = document;
  body.style.overflow = "";
  documentElement.style.overflow = "";
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  delete body.dataset.scrollLocked;
  window.scrollTo(0, savedScrollY);
}
