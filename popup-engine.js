// @ts-check

/**
 * Popup Engine
 *
 * JSDOM-compliant popup creation and lifecycle management.
 * Does not depend on CSS, layout, or browser-specific APIs.
 */

/**
 * @typedef PopupInstance
 * @property {(html:string)=>void} setContent
 * @property {(title:string)=>void} setTitle
 * @property {()=>void} show
 * @property {()=>void} hide
 * @property {HTMLElement} root
 */

/** @type {Map<string, PopupInstance>} */
const popupRegistry = new Map();

/** @type {Set<HTMLElement>} */
const activePopups = new Set();

/** Ensure Escape handler registered only once */
let escapeHandlerRegistered = false;

function registerEscapeHandler() {
  if (escapeHandlerRegistered) return;
  escapeHandlerRegistered = true;

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    // Close most recently opened popup
    const popupArray = Array.from(activePopups);

    if (popupArray.length === 0) return;

    const topPopup = popupArray[popupArray.length - 1];

    if (topPopup) {
      topPopup.classList.remove("show");
      activePopups.delete(topPopup);
    }
  });
}

/**
 * Ensure popup exists.
 * Creates it if necessary.
 *
 * Safe for JSDOM and browsers.
 *
 * @param {string} id Unique popup id ("ss", "tax", etc)
 * @param {string} defaultTitle
 * @returns {PopupInstance}
 */
export function ensurePopup(id, defaultTitle) {
  const popupId = `popup-${id}`;

  /** @type {HTMLElement|null} */
  let root = document.getElementById(popupId);

  if (!root) {
    root = document.createElement("div");
    root.id = popupId;

    // ✅ USE YOUR EXISTING CSS CLASS
    root.className = "ss-popup";

    root.innerHTML = `
      <div class="ss-popup-content">
        <div class="ss-popup-header">
          <h3 class="ss-popup-title">${defaultTitle}</h3>
          <button class="ss-popup-close">&times;</button>
        </div>
        <div class="ss-popup-body"></div>
      </div>
    `;

    document.body.appendChild(root);

    const closeBtn = root.querySelector(".ss-popup-close");

    closeBtn?.addEventListener("click", () => {
      root?.classList.remove("show");
    });

    root.addEventListener("click", (e) => {
      if (e.target === root) {
        root?.classList.remove("show");
      }
    });
  }

  const titleEl = root.querySelector(".ss-popup-title");
  const bodyEl = root.querySelector(".ss-popup-body");

  return {
    root,

    setTitle(title) {
      if (titleEl) titleEl.textContent = title;
    },

    setContent(html) {
      if (bodyEl) bodyEl.innerHTML = html;
    },

    show() {
      registerEscapeHandler();
      root?.classList.add("show"); // ✅ THIS matches your CSS
      activePopups.add(root);
    },

    hide() {
      root?.classList.remove("show");
      activePopups.delete(root);
    },
  };
}

/**
 * Close all popups
 */
export function closeAllPopups() {
  popupRegistry.forEach((popup) => popup.hide());
}

/**
 * Get popup if exists
 *
 * @param {string} id
 * @returns {PopupInstance|null}
 */
export function getPopup(id) {
  return popupRegistry.get(`popup-${id}`) || null;
}
