/**
 * @typedef ConfirmModalDeps
 * @property {(title:string, message:string, kind:"success"|"error"|"info") => void} showToast
 */

let activeOverlay = null;
let activeKeydownHandler = null;

/**
 * @param {{
 *   title: string,
 *   message: string,
 *   confirmText?: string,
 *   cancelText?: string,
 *   onConfirm: () => void
 * }} args
 */
export function openConfirmModal(args) {
  closeConfirmModal();

  const overlay = document.createElement("div");
  overlay.className = "pension-modal-overlay"; // reuse same overlay style

  overlay.innerHTML = `
    <div class="pension-modal" role="dialog" aria-modal="true">
      <div class="pension-modal-header">
        <h3>${escapeHtml(args.title)}</h3>
        <button class="pension-modal-close" type="button" aria-label="Close">×</button>
      </div>

      <div class="pension-modal-body">
        <p style="margin:0; font-size:14px;">
          ${escapeHtml(args.message)}
        </p>
      </div>

      <div class="pension-modal-footer">
        <button type="button" class="pension-btn pension-cancel">
          ${args.cancelText ?? "Cancel"}
        </button>
        <button type="button" class="pension-btn pension-delete-confirm">
          ${args.confirmText ?? "Delete"}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  activeOverlay = overlay;

  const close = () => closeConfirmModal();

  overlay
    .querySelector(".pension-modal-close")
    ?.addEventListener("click", close);

  overlay.querySelector(".pension-cancel")?.addEventListener("click", close);

  overlay
    .querySelector(".pension-delete-confirm")
    ?.addEventListener("click", () => {
      args.onConfirm();
      closeConfirmModal();
    });

  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });

  activeKeydownHandler = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter") {
      args.onConfirm();
      closeConfirmModal();
    }
  };

  document.addEventListener("keydown", activeKeydownHandler);
}

export function closeConfirmModal() {
  if (activeKeydownHandler) {
    document.removeEventListener("keydown", activeKeydownHandler);
    activeKeydownHandler = null;
  }

  if (!activeOverlay) return;

  activeOverlay.remove();
  activeOverlay = null;
  document.body.style.overflow = "";
}

/**
 * @param {unknown} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
