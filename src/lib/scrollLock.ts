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
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  clearScrollLockStyles();
}

/** Force-clear lock (bfcache return from Stripe, etc.). */
export function forceUnlockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  clearScrollLockStyles();
}

function clearScrollLockStyles() {
  const { body, documentElement } = document;
  body.style.overflow = "";
  documentElement.style.overflow = "";
  documentElement.style.overscrollBehavior = "";
  body.style.overscrollBehavior = "";
  body.style.paddingRight = savedPaddingRight;
  savedPaddingRight = "";
  delete body.dataset.scrollLocked;
}

function onPageShow(event: PageTransitionEvent) {
  // bfcache restore after Stripe cancel can leave overflow:hidden stuck.
  if (event.persisted) {
    forceUnlockBodyScroll();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", onPageShow);
}
