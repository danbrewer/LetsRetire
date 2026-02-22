// retirement-ui-pension-modal.js

/**
 * @typedef {import("./cPensionAnnuityManager.js").PensionAnnuityManager} PensionAnnuityManager
 */

/**
 * @typedef PensionModalDeps
 * @property {() => void} renderPensionList
 * @property {() => void} markDirty
 * @property {() => void} doCalculations
 * @property {(title:string, message:string, kind:"success"|"error"|"info") => void} showToast
 */

/**
 * @typedef PensionDraft
 * @property {"subject"|"partner"} owner
 * @property {string} name
 * @property {number} startAge
 * @property {number} monthlyAmount
 * @property {number} withholdingRate   // 0..1
 * @property {number} survivorshipPercent // 0..1
 */

/** @type {HTMLElement|null} */
let activeOverlay = null;

/** @type {((e: KeyboardEvent) => void) | null} */
let activeKeydownHandler = null;

export function closePensionModal() {
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
 * Create modal: DOES NOT create a pension until Save.
 *
 * @param {PensionAnnuityManager} pensionManager
 * @param {PensionDraft} defaults
 * @param {PensionModalDeps} deps
 */
export function openPensionCreateModal(pensionManager, defaults, deps) {
  closePensionModal();

  /** @type {import("./cPensionAnnuityStorage.js").PensionAnnuityCreate} */
  const draft = {
    owner: defaults.owner ?? "subject",
    name: defaults.name ?? "New Pension",
    startAge: defaults.startAge ?? 65,
    monthlyAmount: defaults.monthlyAmount ?? 0,
    withholdingRate: defaults.withholdingRate ?? 0.15,
    survivorshipPercent: defaults.survivorshipPercent ?? 0,
  };

  const overlay = buildModalDom({
    mode: "create",
    title: "Add Pension/Annuity",
    // create mode uses a synthetic id suffix for input ids to avoid collisions
    inputKey: "new",
    values: draft,
  });

  document.body.appendChild(overlay);
  activeOverlay = overlay;
  document.body.style.overflow = "hidden";

  wireModalEvents({
    overlay,
    onSave: () => saveCreate(pensionManager, draft, deps),
    deps,
  });

  focusName("new");
}

/**
 * Edit modal: edits an existing pension by id.
 *
 * @param {PensionAnnuityManager} pensionManager
 * @param {string} id
 * @param {PensionModalDeps} deps
 */
export function openPensionEditModal(pensionManager, id, deps) {
  const pension = pensionManager.getById(id);
  if (!pension) return;

  closePensionModal();

  const overlay = buildModalDom({
    mode: "edit",
    title: "Edit Pension/Annuity",
    inputKey: id,
    values: {
      owner: pension.owner,
      name: pension.name,
      startAge: pension.startAge,
      monthlyAmount: pension.monthlyAmount,
      withholdingRate: pension.withholdingRate,
      survivorshipPercent: pension.survivorshipPercent,
    },
  });

  document.body.appendChild(overlay);
  activeOverlay = overlay;
  document.body.style.overflow = "hidden";

  wireModalEvents({
    overlay,
    onSave: () => saveEdit(pensionManager, id, deps),
    deps,
  });

  focusName(id);
}

/**
 * @param {"new"|string} inputKey
 */
function focusName(inputKey) {
  const nameInput = document.getElementById(`pension-name-${inputKey}`);
  if (nameInput instanceof HTMLInputElement) {
    nameInput.focus();
    nameInput.select();
  }
}

/**
 * @typedef BuildModalArgs
 * @property {"create"|"edit"} mode
 * @property {string} title
 * @property {string} inputKey
 * @property {import("./cPensionAnnuityStorage.js").PensionAnnuityCreate | import("./cPensionAnnuityStorage.js").PensionAnnuity} values
 */

/** @param {BuildModalArgs} args */
function buildModalDom(args) {
  const { title, inputKey, values } = args;

  const overlay = document.createElement("div");
  overlay.className = "pension-modal-overlay";
  overlay.setAttribute("data-mode", args.mode);

  overlay.innerHTML = `
    <div class="pension-modal" role="dialog" aria-modal="true" aria-labelledby="pensionModalTitle">
      <div class="pension-modal-header">
        <h3 id="pensionModalTitle">${escapeHtml(title)}</h3>
        <button class="pension-modal-close" type="button" aria-label="Close">×</button>
      </div>

      <div class="pension-modal-body">
        <form class="pension-edit-form" id="pensionEditForm">
          <div class="pension-form-grid">
            <div class="pension-form-field full-width">
                <label>Owner</label>

                <div class="owner-segmented" tabindex="0">
                    <div class="owner-highlight"></div>

                    <button
                    type="button"
                    class="owner-option ${values.owner === "subject" ? "active" : ""}"
                    data-owner="subject">
                    Subject
                    </button>

                    <button
                    type="button"
                    class="owner-option ${values.owner === "partner" ? "active" : ""}"
                    data-owner="partner">
                    Partner
                    </button>
                </div>
            </div>
            <div class="pension-form-field">
              <label for="pension-name-${inputKey}">Pension Name</label>
              <input
                id="pension-name-${inputKey}"
                type="text"
                value="${escapeHtml(values.name)}"
                placeholder="Enter pension name"
                required
              >
            </div>

            <div class="pension-form-field">
              <label for="pension-monthly-${inputKey}">Monthly Amount</label>
              <input
                id="pension-monthly-${inputKey}"
                type="number"
                step="100"
                value="${Number(values.monthlyAmount) || 0}"
                placeholder="0"
                min="0"
                required
              >
            </div>

            <div class="pension-form-field">
              <label for="pension-age-${inputKey}">Start Age</label>
              <input
                id="pension-age-${inputKey}"
                type="number"
                min="50"
                max="100"
                value="${Number(values.startAge) || 65}"
                placeholder="65"
                required
              >
            </div>

            <div class="pension-form-field">
              <label for="pension-withholding-${inputKey}">Tax Withholding (%)</label>
              <input
                id="pension-withholding-${inputKey}"
                type="number"
                step="0.5"
                min="0"
                max="50"
                value="${((Number(values.withholdingRate) || 0) * 100).toFixed(1)}"
                placeholder="15.0"
              >
            </div>

            <div class="pension-form-field full-width">
              <label for="pension-survivor-${inputKey}">Survivorship Percentage (%)</label>
              <input
                id="pension-survivor-${inputKey}"
                type="number"
                step="5"
                min="0"
                max="100"
                value="${((Number(values.survivorshipPercent) || 0) * 100).toFixed(0)}"
                placeholder="0"
              >
            </div>
          </div>
        </form>
      </div>

      <div class="pension-modal-footer">
        <button type="button" class="pension-btn pension-cancel">Cancel</button>
        <button type="button" class="pension-btn pension-save">Save Changes</button>
      </div>
    </div>
  `;

  return overlay;
}

/**
 * @param {{ overlay: HTMLElement, onSave: () => void, deps: PensionModalDeps }} args
 */
function wireModalEvents(args) {
  const { overlay, onSave } = args;

  const onClose = () => closePensionModal();

  overlay
    .querySelector(".pension-modal-close")
    ?.addEventListener("click", onClose);
  overlay.querySelector(".pension-cancel")?.addEventListener("click", onClose);
  overlay.querySelector(".pension-save")?.addEventListener("click", onSave);

  // click outside closes
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) onClose();
  });

  // ESC closes, Ctrl/Cmd+Enter saves
  activeKeydownHandler = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave();
  };

const segmented = overlay.querySelector(".owner-segmented");
const highlight = overlay.querySelector(".owner-highlight");
const buttons = overlay.querySelectorAll(".owner-option");

    /**
     * @param {string | undefined} owner
     */
function setOwner(owner) {
  buttons.forEach((btn) => {
    if (btn instanceof HTMLButtonElement) {
      btn.classList.toggle("active", btn.dataset.owner === owner);
    }
  });

  if (!(highlight instanceof HTMLElement)) return;

  highlight.style.transform =
    owner === "partner" ? "translateX(100%)" : "translateX(0)";
}

/* ---- INITIAL STATE ---- */
const initialActive = overlay.querySelector(".owner-option.active");

if (initialActive instanceof HTMLButtonElement) {
  setOwner(initialActive.dataset.owner || "subject");
} else if (buttons.length > 0 && buttons[0] instanceof HTMLButtonElement) {
  setOwner(buttons[0].dataset.owner || "subject");
}

/* ---- CLICK ---- */
buttons.forEach((btn) => {
  if (!(btn instanceof HTMLButtonElement)) return;

  btn.addEventListener("click", () => {
    setOwner(btn.dataset.owner || "subject");
  });
});

/* ---- ARROW KEYS ---- */
if (segmented) {
  segmented.addEventListener("keydown", (e) => {
    if (!(e instanceof KeyboardEvent)) return;

    const activeBtn = overlay.querySelector(".owner-option.active");
    if (!(activeBtn instanceof HTMLButtonElement)) return;

    const buttonArray = Array.from(buttons).filter(
      (b) => b instanceof HTMLButtonElement
    );

    const currentIndex = buttonArray.indexOf(activeBtn);

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();

      let newIndex = currentIndex;

      if (e.key === "ArrowRight") {
        newIndex = Math.min(currentIndex + 1, buttonArray.length - 1);
      }

      if (e.key === "ArrowLeft") {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      const nextBtn = buttonArray[newIndex];
      if (nextBtn) {
        setOwner(nextBtn.dataset.owner || "subject");
      }
    }
  });
}

  document.addEventListener("keydown", activeKeydownHandler);
}

/**
 * Create-save: reads values from "new" inputs and calls add()
 *
 * @param {PensionAnnuityManager} pensionManager
 * @param {PensionDraft} defaults
 * @param {PensionModalDeps} deps
 */
function saveCreate(pensionManager, defaults, deps) {
  const values = readFormValues("new", defaults, deps);
  if (!values) return;

  pensionManager.add(values); // ✅ created ONLY here
  closePensionModal();

  deps.renderPensionList();
  deps.markDirty();
  deps.doCalculations();
  deps.showToast("Success", "Pension added successfully", "success");
}

/**
 * Edit-save: reads values from "${id}" inputs and calls update()
 *
 * @param {PensionAnnuityManager} pensionManager
 * @param {string} id
 * @param {PensionModalDeps} deps
 */
function saveEdit(pensionManager, id, deps) {
  const existing = pensionManager.getById(id);
  if (!existing) return;

  const values = readFormValues(id, existing, deps);
  if (!values) return;

  pensionManager.update({ ...existing, ...values });
  closePensionModal();

  deps.renderPensionList();
  deps.markDirty();
  deps.doCalculations();
  deps.showToast("Success", "Pension updated successfully", "success");
}

/**
 * @param {string} inputKey
 * @param {PensionDraft} fallback
 * @param {PensionModalDeps} deps
 * @returns {PensionDraft|null}
 */
function readFormValues(inputKey, fallback, deps) {
  const nameInput = document.getElementById(`pension-name-${inputKey}`);
  const monthlyInput = document.getElementById(`pension-monthly-${inputKey}`);
  const ageInput = document.getElementById(`pension-age-${inputKey}`);
  const withholdingInput = document.getElementById(
    `pension-withholding-${inputKey}`
  );
  const survivorInput = document.getElementById(`pension-survivor-${inputKey}`);

  if (!(nameInput instanceof HTMLInputElement)) return null;
  if (!(monthlyInput instanceof HTMLInputElement)) return null;
  if (!(ageInput instanceof HTMLInputElement)) return null;
  if (!(withholdingInput instanceof HTMLInputElement)) return null;
  if (!(survivorInput instanceof HTMLInputElement)) return null;

  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    deps.showToast("Validation Error", "Pension name is required", "error");
    return null;
  }

  const monthlyAmount = clampNumber(
    parseFloat(monthlyInput.value) || 0,
    0,
    1e9
  );
  const startAge = clampNumber(
    parseInt(ageInput.value) || fallback.startAge,
    50,
    100
  );

  // blank => keep existing/default value
  const withholdingPctRaw = withholdingInput.value.trim();
  const withholdingRate =
    withholdingPctRaw === ""
      ? fallback.withholdingRate
      : clampNumber(parseFloat(withholdingPctRaw) || 0, 0, 50) / 100;

  const survivorPctRaw = survivorInput.value.trim();
  const survivorshipPercent =
    survivorPctRaw === ""
      ? fallback.survivorshipPercent
      : clampNumber(parseFloat(survivorPctRaw) || 0, 0, 100) / 100;

  const activeOwnerBtn = activeOverlay?.querySelector(".owner-option.active");

  let owner = fallback.owner;

  if (activeOwnerBtn instanceof HTMLButtonElement) {
    owner = activeOwnerBtn.dataset.owner === "partner" ? "partner" : "subject";
  }

  return {
    owner,
    name,
    startAge,
    monthlyAmount,
    withholdingRate,
    survivorshipPercent,
  };
}

/**
 * @param {number | unknown} v
 * @param {number} min
 * @param {number} max
 */
function clampNumber(v, min, max) {
  if (Number.isNaN(v)) return min;
  if (typeof v !== "number") return min;

  return Math.min(max, Math.max(min, v));
}

// no replaceAll => avoids ES2021 lib requirement
/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
