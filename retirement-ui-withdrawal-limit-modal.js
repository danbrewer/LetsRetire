// retirement-ui-pension-modal.js

/**
 * @typedef {import("./cWithdrawalLimitsManager.js").WithdrawalLimitManager} WithdrawalLimitManager
 * @typedef {import("./cWithdrawalLimitsStorage.js").WithdrawalLimit} WithdrawalLimit
 * @typedef {import("./cWithdrawalLimitsStorage.js").WithdrawalLimitCreate} WithdrawalLimitCreate
 */

/**
 * @typedef WithdrawalLimitModalDeps
 * @property {() => void} renderWithdrawalLimitList
 * @property {() => void} markDirty
 * @property {() => void} doCalculations
 * @property {(title:string, message:string, kind:"success"|"error"|"info") => void} showToast
 */

/**
 * @typedef WithdrawalLimitDraft
 * @property {string} name
 * @property {number} year
 * @property {number} amount
 */

/** @type {HTMLElement|null} */
let activeOverlay = null;

/** @type {((e: KeyboardEvent) => void) | null} */
let activeKeydownHandler = null;

export function closeWithdrawalLimitModal() {
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
 * Create modal: DOES NOT create a withdrawal limit until Save.
 *
 * @param {WithdrawalLimitManager} withdrawalLimitManager
 * @param {WithdrawalLimitDraft} defaults
 * @param {WithdrawalLimitModalDeps} deps
 * @param {number} initialYear
 * @param {number} subjectRetireAge
 * @param {number} subjectLifeSpan
 * @param {number} partnerRetireAge
 * @param {number} partnerLifeSpan
 */
export function openWithdrawalLimitCreateModal(
  withdrawalLimitManager,
  defaults,
  deps,
  initialYear,
  subjectRetireAge,
  subjectLifeSpan,
  partnerRetireAge,
  partnerLifeSpan
) {
  closeWithdrawalLimitModal();

  /** @type {WithdrawalLimitCreate} */
  const draft = {
    name: defaults.name ?? "New Withdrawal Limit",
    year: defaults.year,
    amount: defaults.amount,
  };

  const overlay = buildModalDom({
    mode: "create",
    title: "Add Withdrawal Limit",
    // create mode uses a synthetic id suffix for input ids to avoid collisions
    inputKey: "new",
    values: draft,
    manager: withdrawalLimitManager,
    initialYear,
    subjectRetireAge,
    subjectLifeSpan,
    partnerRetireAge,
    partnerLifeSpan,
  });

  document.body.appendChild(overlay);
  activeOverlay = overlay;
  document.body.style.overflow = "hidden";

  wireModalEvents({
    overlay,
    onSave: () => saveCreate(withdrawalLimitManager, draft, deps),
    deps,
  });

  focusName("new");
}

/**
 * Edit modal: edits an existing withdrawal limit by id.
 *
 * @param {WithdrawalLimitManager} withdrawalLimitManager
 * @param {string} id
 * @param {WithdrawalLimitModalDeps} deps
 * @param {number} initialYear
 * @param {number} subjectRetireAge
 * @param {number} subjectLifeSpan
 * @param {number} partnerRetireAge
 * @param {number} partnerLifeSpan
 */
export function openWithdrawalLimitEditModal(
  withdrawalLimitManager,
  id,
  deps,
  initialYear,
  subjectRetireAge,
  subjectLifeSpan,
  partnerRetireAge,
  partnerLifeSpan
) {
  const withdrawalLimit = withdrawalLimitManager.getById(id);
  if (!withdrawalLimit) return;

  closeWithdrawalLimitModal();

  const overlay = buildModalDom({
    mode: "edit",
    title: "Edit Withdrawal Limit",
    inputKey: id,
    values: {
      name: withdrawalLimit.name,
      year: withdrawalLimit.year,
      amount: withdrawalLimit.amount,
    },
    manager: withdrawalLimitManager,
    initialYear,
    subjectRetireAge,
    subjectLifeSpan,
    partnerRetireAge,
    partnerLifeSpan,
  });

  document.body.appendChild(overlay);
  activeOverlay = overlay;
  document.body.style.overflow = "hidden";

  wireModalEvents({
    overlay,
    onSave: () => saveEdit(withdrawalLimitManager, id, deps),
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
 * @property {WithdrawalLimitCreate | WithdrawalLimit} values
 * @property {WithdrawalLimitManager} manager
 * @property {number} initialYear
 * @property {number} subjectRetireAge
 * @property {number} subjectLifeSpan
 * @property {number} partnerRetireAge
 * @property {number} partnerLifeSpan
 */

/** @param {BuildModalArgs} args */
function buildModalDom(args) {
  const {
    title,
    inputKey,
    values,
    manager,
    mode,
    initialYear,
    subjectRetireAge,
    subjectLifeSpan,
    partnerRetireAge,
    partnerLifeSpan,
  } = args;

  // Generate available years (only retirement years, exclude existing years)
  const existingYears = new Set(manager.getAll().map((limit) => limit.year));
  const currentYear = initialYear || new Date().getFullYear();

  // Calculate retirement year range - fallback to reasonable defaults if parameters not provided
  let retirementYears = [];

  if (
    subjectRetireAge &&
    subjectLifeSpan &&
    partnerRetireAge &&
    partnerLifeSpan
  ) {
    // Use provided retirement data to calculate precise range
    const earliestRetirement = Math.min(subjectRetireAge, partnerRetireAge);
    const latestLifespan = Math.max(subjectLifeSpan, partnerLifeSpan);

    // Generate years covering typical retirement period
    const startYear = currentYear;
    const retirementPeriod = Math.max(latestLifespan - earliestRetirement, 20);
    const endYear = currentYear + Math.min(retirementPeriod + 10, 50); // Cap at 50 years

    for (let year = startYear; year <= endYear; year++) {
      retirementYears.push(year);
    }
  } else {
    // Fallback: generate next 30 years (typical retirement planning horizon)
    for (let i = 0; i < 30; i++) {
      retirementYears.push(currentYear + i);
    }
  }

  let availableYears = retirementYears.filter(
    (year) => !existingYears.has(year)
  );

  // When editing, include the current value's year even if it's "taken"
  if (mode === "edit" && values.year && !availableYears.includes(values.year)) {
    availableYears.push(values.year);
    availableYears.sort((a, b) => a - b);
  }

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

            <div class="pension-form-field">
              <label for="withdrawal-limit-year-${inputKey}">Year</label>
              <select
                id="withdrawal-limit-year-${inputKey}"
                required
              >
                ${availableYears
                  .map(
                    (year) =>
                      `<option value="${year}" ${values.year === year ? "selected" : ""}>${year}</option>`
                  )
                  .join("")}
              </select>
              </div>
             <div class="pension-form-field">
              <label for="withdrawal-limit-amount-${inputKey}">Limit</label>
              <input
                id="withdrawal-limit-amount-${inputKey}"
                type="number"
                step="100"
                value="${Number(values.amount) || 0}"
                placeholder="0"
                min="0"
                required >
            </div>  
             <div class="pension-form-field full-width">
              <label for="withdrawal-limit-name-${inputKey}">Comments</label>
              <input
                id="withdrawal-limit-name-${inputKey}"
                type="text"
                value="${escapeHtml(values.name)}"
                placeholder="Enter comments"
                required
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
 * @param {{ overlay: HTMLElement, onSave: () => void, deps: WithdrawalLimitModalDeps }} args
 */
function wireModalEvents(args) {
  const { overlay, onSave } = args;

  const onClose = () => closeWithdrawalLimitModal();

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
          /* @ts-ignore */
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
 * @param {WithdrawalLimitManager} withdrawalLimitManager
 * @param {WithdrawalLimitDraft} defaults
 * @param {WithdrawalLimitModalDeps} deps
 */
function saveCreate(withdrawalLimitManager, defaults, deps) {
  const values = readFormValues("new", defaults, deps);
  if (!values) return;

  withdrawalLimitManager.add(values); // ✅ created ONLY here
  closeWithdrawalLimitModal();

  deps.renderWithdrawalLimitList();
  deps.markDirty();
  deps.doCalculations();
  deps.showToast("Success", "Withdrawal limit added successfully", "success");
}

/**
 * Edit-save: reads values from "${id}" inputs and calls update()
 *
 * @param {WithdrawalLimitManager} withdrawalLimitManager
 * @param {string} id
 * @param {WithdrawalLimitModalDeps} deps
 */
function saveEdit(withdrawalLimitManager, id, deps) {
  const existing = withdrawalLimitManager.getById(id);
  if (!existing) return;

  const values = readFormValues(id, existing, deps);
  if (!values) return;

  withdrawalLimitManager.update({ ...existing, ...values });
  closeWithdrawalLimitModal();

  deps.renderWithdrawalLimitList();
  deps.markDirty();
  deps.doCalculations();
  deps.showToast("Success", "Withdrawal limit updated successfully", "success");
}

/**
 * @param {string} inputKey
 * @param {WithdrawalLimitDraft} fallback
 * @param {WithdrawalLimitModalDeps} deps
 * @returns {WithdrawalLimitDraft|null}
 */
function readFormValues(inputKey, fallback, deps) {
  const nameInput = document.getElementById(
    `withdrawal-limit-name-${inputKey}`
  );
  const amountInput = document.getElementById(
    `withdrawal-limit-amount-${inputKey}`
  );
  const yearSelect = document.getElementById(
    `withdrawal-limit-year-${inputKey}`
  );

  if (!(nameInput instanceof HTMLInputElement)) return null;
  if (!(amountInput instanceof HTMLInputElement)) return null;
  if (!(yearSelect instanceof HTMLSelectElement)) return null;

  const name = nameInput.value.trim();

  if (!name) {
    nameInput.focus();
    deps.showToast("Validation Error", "Withdrawal name is required", "error");
    return null;
  }

  let year = parseInt(yearSelect.value) || fallback.year;

  let amount = clampNumber(
    parseFloat(amountInput.value.trim()) || 0,
    0,
    1000000
  );

  return {
    name,
    year,
    amount,
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
