/** Reference-counted scroll lock for stacked/multiple modals. */
let lockCount = 0;
let savedPaddingRight = "";

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    const { body, documentElement } = document;
    const scrollbarGap = window.innerWidth - documentElement.clientWidth;

    body.dataset.scrollLocked = "1";
    savedPaddingRight = body.style.paddingRight;
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    // Do not use position:fixed + negative top — that offsets the page and
    // pulls fixed nav (and open mobile menus) off-screen when scrolled.
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
  documentElement.style.overscrollBehavior = "";
  body.style.overscrollBehavior = "";
  body.style.paddingRight = savedPaddingRight;
  savedPaddingRight = "";
  delete body.dataset.scrollLocked;
}
