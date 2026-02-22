// @ts-ignore

import { ACCOUNT_TYPES } from "./cAccount.js";
import { Calculation, Calculations } from "./cCalculation.js";
import { Inputs } from "./cInputs.js";
import { constsJS_FILING_STATUS } from "./consts.js";
import { calc } from "./retirement-calculator.js";
import * as DefaultUI from "./retirement-ui.js";
import { UIField } from "./UIFields.js";
import {
  exportCSV,
  exportJSON,
  generatePDFReport,
  handleJSONFile,
  importJSON,
} from "./import-export.js";
import {
  buildColumnMenu,
  generateOutputAndSummary,
  loadColumnLayout,
} from "./retirement-summaryrenderer.js";
import { createHelpIcon } from "./retirement-ui-help.js";
import { showToast } from "./retirement-ui-toast.js";
import { PensionAnnuityStorage } from "./cPensionAnnuityStorage.js";
import { PensionAnnuityManager } from "./cPensionAnnuityManager.js";

const STORAGE_KEY = "retirement-calculator-inputs";

/** @type {Record<string, string>} */
let persistedInputs = {};

/** @type {PensionAnnuityStorage|null} */
let pensionStorage = null;

/** @type {PensionAnnuityManager|null} */
let pensionManager = null;

/**
 * @typedef OverrideFieldOptions
 * @property {string} prefix
 * @property {string} gridId
 * @property {string} label
 * @property {string} placeholder
 * @property {(age:number, event:FocusEvent)=>void} onBlur
 * @property {number} startAge
 */

/**
 * @param {string} id
 * @returns {HTMLInputElement | null}
 * @throws {Error} if element is missing or not a text-like input
 */
function inputText(id) {
  const el = $(id);

  // let the caller handle missing element
  if (!el) return el;

  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`Element '${id}' is not an <input>`);
  }

  if (
    el.type === "checkbox" ||
    el.type === "radio" ||
    el.type === "button" ||
    el.type === "submit"
  ) {
    throw new Error(
      `Element '${id}' is an <input type="${el.type}">, not a text input`
    );
  }

  return el;
}

/**
 * @param {string} id
 * @returns {HTMLSelectElement | null}
 * @throws {Error} if element is missing or not a <select>
 */
function select(id) {
  const el = $(id);

  // let the caller handle missing element
  if (!el) return el;

  if (!(el instanceof HTMLSelectElement)) {
    throw new Error(`Element '${id}' is not a <select>`);
  }

  return el;
}

/**
 * @param {string} id
 * @returns {HTMLInputElement | null}
 */
function checkbox(id) {
  const el = $(id);

  // let the caller handle missing element
  if (!el) return el;

  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`Element '${id}' is not an <input>`);
  }

  if (el.type !== "checkbox" && el.type !== "radio") {
    throw new Error(`Element '${id}' is not a checkbox or radio`);
  }
  return el;
}

/**
 * @param {string} id
 * @returns {HTMLDivElement | null}
 * @throws {Error} if element is missing or not a <div>
 */
function divById(id) {
  const el = document.getElementById(id);

  if (!el) {
    return el;
  }

  if (!(el instanceof HTMLDivElement)) {
    throw new Error(`Element with id '${id}' is not a <div>`);
  }

  return el;
}

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T | null}
 */
function $(id) {
  const el = document.getElementById(id);
  if (!el) {
    return null;
  }
  return /** @type {T} */ (el);
}

/**
 * @param {string} id
 * @returns {number}
 */
function num(id) {
  const el = inputText(id);
  if (!el) {
    throw new Error(`Element with id '${id}' not found.`);
  }
  return Number(el.value || 0);
}

const pct = (/** @type {number} */ v) => (isNaN(v) ? 0 : Number(v) / 100);

// Global variable to store calculations for popup access

/** @type {Calculation[]} */
let calculations = [];

document.addEventListener("value-changed", (e) => {
  if (!(e instanceof CustomEvent)) return;

  const { id, value } = e.detail;

  // Persist value
  persistedInputs[id] = value;
  savePersistedInputs();

  markDirty();

  const input = document.getElementById(id);
  input?.classList.add("input-dirty");
});

document.addEventListener("keydown", (e) => {
  // Calculate button shortcut: Ctrl+Enter (or Cmd+Enter on Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    doCalculations();
  }
});

// Add to the existing click event listener in setupEventListeners()
document.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;

  if (target.matches(".pension-row .edit")) {
    const id = target.getAttribute("data-id");
    if (!id) {
      console.log("Pension ID not found for edit action");
      return;
    }
    editPension(id);
  }
  if (target.matches(".pension-row .delete")) {
    const id = target.getAttribute("data-id");
    if (!id) {
      console.log("Pension ID not found for delete action");
      return;
    }
    deletePension(id);
  }
  // Add new handlers for edit form
  if (target.matches(".save-pension")) {
    const id = target.getAttribute("data-id");
    if (!id) {
      console.log("Pension ID not found for save action");
      return;
    }
    savePensionEdit(id);
  }
  if (target.matches(".cancel-pension-edit")) {
    cancelPensionEdit();
  }
});

// Events
// Event listeners will be set up in setupEventListeners() after partials load

function setupEventListeners() {
  $("calcBtn")?.addEventListener("click", doCalculations);
  $("pdfBtn")?.addEventListener("click", generatePDFReport);
  $("csvBtn")?.addEventListener("click", exportCSV);
  $("exportJsonBtn")?.addEventListener("click", exportJSON);
  $("importJsonBtn")?.addEventListener("click", importJSON);
  $("jsonFileInput")?.addEventListener("change", handleJSONFile);
  $("clearBtn")?.addEventListener("click", resetAll);
  $("useCurrentYearValues")?.addEventListener("change", function () {
    updateSpendingFieldsDisplayMode();
  });
  $("useTaxableCurrentYearValues")?.addEventListener("change", function () {
    updateTaxableIncomeFieldsDisplayMode();
  });
  $("useTaxFreeCurrentYearValues")?.addEventListener("change", function () {
    updateTaxFreeIncomeFieldsDisplayMode();
  });

  $("addPensionBtn")?.addEventListener("click", () => {
    if (!pensionManager) return;

    pensionManager.add({
      owner: "subject",
      name: "New Pension",
      startAge: num(UIField.SUBJECT_PENSION_START_AGE),
      monthlyAmount: 0,
      withholdingRate: 0.15,
      survivorshipPercent: 0,
    });

    renderPensionList();

    markDirty();

    doCalculations();
  });
}

/**
 * Edit a pension entry using prompt dialogs
 * @param {string} id - The pension ID to edit
 * @returns {void}
 */



/**
 * Show pension edit modal dialog
 * @param {string} id - The pension ID to edit
 * @returns {void}
 */
function editPension(id) {
  if (!pensionManager) return;
  const pension = pensionManager.getById(id);
  if (!pension) return;

  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'pension-modal-overlay';
  modal.setAttribute('data-editing-id', id);
  
  modal.innerHTML = `
    <div class="pension-modal">
      <div class="pension-modal-header">
        <h3>Edit Pension/Annuity</h3>
        <button class="pension-modal-close" type="button" aria-label="Close">×</button>
      </div>
      
      <div class="pension-modal-body">
        <form class="pension-edit-form" id="pensionEditForm">
          <div class="pension-form-grid">
            <div class="pension-form-field">
              <label for="pension-name-${id}">Pension Name</label>
              <input 
                id="pension-name-${id}" 
                type="text" 
                value="${pension.name}" 
                placeholder="Enter pension name"
                required
              >
            </div>
            
            <div class="pension-form-field">
              <label for="pension-monthly-${id}">Monthly Amount</label>
              <input 
                id="pension-monthly-${id}" 
                type="number" 
                step="100" 
                value="${pension.monthlyAmount}" 
                placeholder="0"
                min="0"
                required
              >
            </div>
            
            <div class="pension-form-field">
              <label for="pension-age-${id}">Start Age</label>
              <input 
                id="pension-age-${id}" 
                type="number" 
                min="50" 
                max="100" 
                value="${pension.startAge}" 
                placeholder="65"
                required
              >
            </div>
            
            <div class="pension-form-field">
              <label for="pension-withholding-${id}">Tax Withholding (%)</label>
              <input 
                id="pension-withholding-${id}" 
                type="number" 
                step="0.5" 
                min="0" 
                max="50" 
                value="${(pension.withholdingRate * 100).toFixed(1)}" 
                placeholder="15.0"
              >
            </div>
            
            <div class="pension-form-field full-width">
              <label for="pension-survivor-${id}">Survivorship Percentage (%)</label>
              <input 
                id="pension-survivor-${id}" 
                type="number" 
                step="5" 
                min="0" 
                max="100" 
                value="${(pension.survivorshipPercent * 100).toFixed(0)}" 
                placeholder="0"
              >
            </div>
          </div>
        </form>
      </div>
      
      <div class="pension-modal-footer">
        <button type="button" class="pension-btn pension-cancel">Cancel</button>
        <button type="button" class="pension-btn pension-save" data-id="${id}">Save Changes</button>
      </div>
    </div>
  `;

  // Add to document
  document.body.appendChild(modal);
  
  // Focus first input
  const nameInput = modal.querySelector(`#pension-name-${id}`);
  if (nameInput instanceof HTMLInputElement) {
    nameInput.focus();
    nameInput.select();
  }
  
  // Prevent background scrolling
  document.body.style.overflow = 'hidden';
}

/**
 * Close pension edit modal
 * @returns {void}
 */
function closePensionModal() {
  const modal = document.querySelector('.pension-modal-overlay');
  if (modal) {
    document.body.removeChild(modal);
    document.body.style.overflow = '';
  }
}

/**
 * Save pension changes from modal form
 * @param {string} id - The pension ID being edited
 * @returns {void}
 */
function savePensionFromModal(id) {
  if (!pensionManager) return;
  
  const pension = pensionManager.getById(id);
  if (!pension) return;

  // Get form values
  const nameInput = document.getElementById(`pension-name-${id}`);
  const monthlyInput = document.getElementById(`pension-monthly-${id}`);
  const ageInput = document.getElementById(`pension-age-${id}`);
  const withholdingInput = document.getElementById(`pension-withholding-${id}`);
  const survivorInput = document.getElementById(`pension-survivor-${id}`);

  if (!(nameInput instanceof HTMLInputElement) ||
      !(monthlyInput instanceof HTMLInputElement) ||
      !(ageInput instanceof HTMLInputElement) ||
      !(withholdingInput instanceof HTMLInputElement) ||
      !(survivorInput instanceof HTMLInputElement)) {
    return;
  }

  // Validate inputs
  const name = nameInput.value.trim();
  const monthlyAmount = parseFloat(monthlyInput.value) || 0;
  const startAge = parseInt(ageInput.value) || pension.startAge;
  const withholdingRate = (parseFloat(withholdingInput.value) || 15) / 100;
  const survivorshipPercent = (parseFloat(survivorInput.value) || 0) / 100;

  if (!name) {
    nameInput.focus();
    showToast("Validation Error", "Pension name is required", "error");
    return;
  }

  if (startAge < 50 || startAge > 100) {
    ageInput.focus();
    showToast("Validation Error", "Start age must be between 50 and 100", "error");
    return;
  }

  // Update the pension
  pensionManager.update({
    ...pension,
    name,
    monthlyAmount,
    startAge,
    withholdingRate,
    survivorshipPercent
  });

  // Close modal and refresh
  closePensionModal();
  renderPensionList();
  markDirty();
  doCalculations();
  
  showToast("Success", "Pension updated successfully", "success");
}

/**
 * Save the pension edit form data
 * @param {string} id - The pension ID being edited
 * @returns {void}
 */
function savePensionEdit(id) {
  if (!pensionManager) return;

  const pension = pensionManager.getById(id);
  if (!pension) return;

  // Get form values
  const nameInput = document.getElementById(`edit-name-${id}`);
  const monthlyInput = document.getElementById(`edit-monthly-${id}`);
  const ageInput = document.getElementById(`edit-age-${id}`);
  const withholdingInput = document.getElementById(`edit-withholding-${id}`);

  if (
    !(nameInput instanceof HTMLInputElement) ||
    !(monthlyInput instanceof HTMLInputElement) ||
    !(ageInput instanceof HTMLInputElement) ||
    !(withholdingInput instanceof HTMLInputElement)
  ) {
    return;
  }

  // Validate inputs
  const name = nameInput.value.trim();
  const monthlyAmount = parseFloat(monthlyInput.value) || 0;
  const startAge = parseInt(ageInput.value) || pension.startAge;
  const withholdingRate = (parseFloat(withholdingInput.value) || 15) / 100;

  if (!name) {
    nameInput.focus();
    showToast("Validation Error", "Pension name is required", "error");
    return;
  }

  if (startAge < 50 || startAge > 100) {
    ageInput.focus();
    showToast(
      "Validation Error",
      "Start age must be between 50 and 100",
      "error"
    );
    return;
  }

  // Update the pension
  pensionManager.update({
    ...pension,
    name,
    monthlyAmount,
    startAge,
    withholdingRate,
  });

  // Refresh the list
  renderPensionList();
  markDirty();
  doCalculations();
}

/**
 * Cancel pension editing and restore the original row
 * @returns {void}
 */
function cancelPensionEdit() {
  const editForm = document.querySelector(".pension-edit-form");
  if (editForm) {
    editForm.remove();
    renderPensionList();
  }
}

/**
 * Delete a pension entry after user confirmation
 * @param {string} id - The pension ID to delete
 * @returns {void}
 */
function deletePension(id) {
  if (!pensionManager) return;

  if (confirm("Delete this pension?")) {
    pensionManager.delete(id);
    renderPensionList();
    markDirty();
    doCalculations();
  }
}

// Initialize help icons
function initializeHelpIcons() {
  // Find all help icon placeholders and replace them with actual help icons
  const placeholders = document.querySelectorAll(".help-icon-placeholder");
  placeholders.forEach((placeholder) => {
    const fieldId = placeholder.getAttribute("data-field");
    if (fieldId) {
      placeholder.innerHTML = createHelpIcon(fieldId);
    }
  });

  // Auto-convert remaining verbose SVG help icons to placeholders (one-time conversion)
  const existingSvgIcons = document.querySelectorAll(
    'svg.help-icon[onclick*="showHelpToast"]'
  );
  existingSvgIcons.forEach((svg) => {
    const onclickAttr = svg.getAttribute("onclick");

    if (!onclickAttr) return;

    const match = onclickAttr.match(
      /showHelpToast\(event,\s*['"]([^'"]+)['"]\)/
    );
    if (match) {
      if (svg.parentNode === null) return;

      const fieldId = match[1];
      const placeholder = document.createElement("span");
      placeholder.className = "help-icon-placeholder";
      placeholder.setAttribute("data-field", fieldId);
      placeholder.innerHTML = createHelpIcon(fieldId);
      svg.parentNode.replaceChild(placeholder, svg);
    }
  });
}

/**
 * Harvest override values from age-based override fields
 *
 * @param {string} prefix
 * @param {number} startAge
 * @param {number} endAge
 * @param {boolean} useCurrentYearMode
 * @param {(value:number, age:number)=>number} inflationFn
 * @returns {{year:number, amount:number}[]}
 */
function harvestAgeOverrides(
  prefix,
  startAge,
  endAge,
  useCurrentYearMode,
  inflationFn
) {
  const result = [];

  for (let age = startAge; age <= endAge; age++) {
    const field = inputText(`${prefix}_${age}`);
    if (!field) continue;

    const raw = parseFloat(field.value);
    if (!raw || isNaN(raw)) continue;

    let amount = raw;

    if (useCurrentYearMode) {
      const stored = field.getAttribute("data-current-year-value");

      const base = stored !== null ? parseFloat(stored) : raw;

      amount = inflationFn(base, age);
    }

    result.push({
      year: age,
      amount,
    });
  }

  return result;
}

/**
 * Parse and validate input parameters for the retirement calculation
 */
/**
 * Parses input parameters from the UI form elements and creates a retirement calculation inputs object
 *
 * @description This function extracts values from various form elements on the page,
 * processes them (converting percentages, parsing numbers), and creates an Inputs object
 * with all the necessary data for retirement calculations.
 *
 * @returns {Inputs} A configured Inputs object containing:
 *   - Personal information (ages, retirement timeline)
 *   - Spouse information (if applicable)
 *   - Employment and contribution data
 *   - Account balances and expected returns
 *   - Income sources (Social Security, pension)
 *   - Tax settings and withdrawal order
 *
 * @throws {Error} Shows a toast error message if inputs are invalid (age validation fails)
 *
 * @example
 * // Parse current form values and create inputs object
 * const inputs = parseInputParameters();
 * if (inputs) {
 *   // Proceed with retirement calculations
 *   calculateRetirement(inputs);
 * }
 *
 * @see {@link IncomeStreams} - The Inputs class constructor for parameter details
 * @see {@link validateInputs} - Validation function used internally
 *
 * @since 1.0.0
 */
function parseInputParameters() {
  // Basic parameters
  // Parse withdrawal order
  // debugger;
  let withdrawalOrder = select("order")
    ?.value.split(",")
    .map((/** @type {string} */ s) => s.trim())
    .filter((/** @type {string | any[]} */ s) => s.length > 0);
  if (withdrawalOrder?.length === 0) {
    withdrawalOrder = [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ];
  }

  // Subject information
  const subjectCurrentAge = num(UIField.SUBJECT_CURRENT_AGE);
  const subjectRetireAge = num(UIField.SUBJECT_RETIRE_AGE);
  const subjectLifeSpan = num(UIField.SUBJECT_LIFESPAN);
  const subject401kStartAge = num(UIField.SUBJECT_401K_START_AGE);
  const subjectPensionStartAge = num(UIField.SUBJECT_PENSION_START_AGE);
  const subjectSsStartAge = num(UIField.SUBJECT_SS_START_AGE);
  const subjectStartingSalary = num(UIField.SUBJECT_SALARY);
  const subjectMonthlyPayrollDeductions = num(
    UIField.SUBJECT_PAYROLL_DEDUCTIONS
  );
  const subjectSalaryGrowthRate = pct(num(UIField.SUBJECT_SALARY_GROWTH));
  const subjectSavingsMonthly = num(UIField.SUBJECT_SAVINGS_MONTHLY);
  const subjectRothMonthly = num(UIField.SUBJECT_ROTH_MONTHLY);
  const subject401kContributionRate = pct(
    num(UIField.SUBJECT_401K_CONTRIBUTION)
  );
  const subjectEmp401kMatchRate = pct(num(UIField.SUBJECT_EMP_MATCH_RATE));
  const subjectEmpMatchCap = pct(num(UIField.SUBJECT_EMP_MATCH_CAP));

  // Partner information
  const partnerCurrentAge = num(UIField.PARTNER_CURRENT_AGE);
  const partnerRetireAge = num(UIField.PARTNER_RETIRE_AGE);
  const partnerLifeSpan = num(UIField.PARTNER_LIFESPAN);
  const partner401kStartAge = num(UIField.PARTNER_401K_START_AGE);
  const partnerPenStartAge = num(UIField.PARTNER_PENSION_START_AGE);
  const partnerSsStartAge = num(UIField.PARTNER_SS_START_AGE);

  const partnerStartingSalary = num(UIField.PARTNER_SALARY);
  const partnerSalaryGrowthRate = pct(num(UIField.PARTNER_SALARY_GROWTH));
  const partnerRothMonthly = num(UIField.PARTNER_ROTH_MONTHLY);
  const partner401kContributionRate = pct(
    num(UIField.PARTNER_401K_CONTRIBUTION)
  );
  const partnerEmpMatchRate = pct(num(UIField.PARTNER_EMP_MATCH_RATE));
  const partnerEmpMatchCap = pct(num(UIField.PARTNER_EMP_MATCH_CAP));

  // Annual spending and growth rates
  const workingYearsSpending = num(UIField.WORKING_YEARS_SPENDING);
  const retirementSpending = num(UIField.RETIREMENT_YEARS_SPENDING);
  const currentYear = num(UIField.CURRENT_YEAR);
  const inflationRate = pct(num(UIField.INFLATION));
  const spendingDecline = pct(num(UIField.SPENDING_DECLINE));
  // Balances and Returns

  const savings = num(UIField.SAVINGS_BALANCE);
  const savingsReturnRate = pct(num(UIField.SAVINGS_RETURN));
  const subject401kStartingBalance = num(UIField.SUBJECT_401K_BALANCE);
  const subject401kReturnRate = pct(num(UIField.SUBJECT_401K_RETURN));
  const partner401kStartingBalance = num(UIField.PARTNER_401K_BALANCE);
  const partner401kReturnRate = pct(num(UIField.PARTNER_401K_RETURN));
  const subjectRothBalance = num(UIField.SUBJECT_ROTH_BALANCE);
  const subjectRothReturnRate = pct(num(UIField.SUBJECT_ROTH_RETURN));
  const partnerRothBalance = num(UIField.PARTNER_ROTH_BALANCE);
  const partnerRothReturnRate = pct(num(UIField.PARTNER_ROTH_RETURN));

  // Social Security
  const subjectSsMonthly = num(UIField.SUBJECT_SS_MONTHLY);
  const partnerSsMonthly = num(UIField.PARTNER_SS_MONTHLY);
  const flatSsWithholdingRate = pct(num(UIField.SS_WITHHOLDING));
  const ssCola = pct(num(UIField.SS_COLA));

  // Pensions
  const subjectPensionMonthly = num(UIField.SUBJECT_PENSION_MONTHLY);
  const subjectPensionWithholdingRate = pct(
    num(UIField.SUBJECT_PENSION_WITHHOLDING)
  );
  const subjectPensionSurvivorship = num(UIField.SUBJECT_PENSION_SURVIVORSHIP);
  const partnerPenMonthly = num(UIField.PARTNER_PENSION_MONTHLY);
  const partnerPensionWithholdings = pct(
    num(UIField.PARTNER_PENSION_WITHHOLDING)
  );

  const partnerPensionSurvivorship = num(UIField.PARTNER_PENSION_SURVIVORSHIP);

  // Witholdings/Taxes
  const filingStatus = select(UIField.FILING_STATUS)?.value || "single";
  const withholdingsDefaultRate = pct(num(UIField.WITHHOLDINGS_DEFAULT));
  const flatWageWithholdingRate = pct(num(UIField.WITHHOLDINGS_WAGES)); // pct(num("flatWageWithholdingRate"));
  const withholdings401k = pct(num(UIField.WITHHOLDINGS_401K));
  // const withholdingsSs = pct(num(UIField.WITHHOLDINGS_SS));
  // const withholdingsPension = pct(num(UIField.WITHHOLDINGS_PENSION));
  const useRMD = checkbox(UIField.USE_RMD)?.checked ?? false;
  // const order = withdrawalOrder;

  /** @type {import("./cInputs.js").RetirementYearSpendingOverride[]} */
  // const retirementYearSpendingOverride = [];
  const retirementYearSpendingOverrides = harvestAgeOverrides(
    "spending",
    subjectRetireAge,
    subjectLifeSpan,
    checkbox("useCurrentYearValues")?.checked ?? false,
    applyInflationToSpendingValue
  ).map((o) => ({
    year: o.year - subjectRetireAge + 1,
    amount: o.amount,
  }));

  const taxableIncomeOverrides = harvestAgeOverrides(
    "taxableIncome",
    subjectCurrentAge,
    subjectLifeSpan,
    checkbox("useTaxableCurrentYearValues")?.checked ?? false,
    applyInflationToIncomeValue
  );

  console.log("taxableIncomeOverrides", taxableIncomeOverrides);

  const taxFreeIncomeOverrides = harvestAgeOverrides(
    "taxFreeIncome",
    subjectCurrentAge,
    subjectLifeSpan,
    checkbox("useTaxFreeCurrentYearValues")?.checked ?? false,
    applyInflationToIncomeValue
  );

  const pensionAnnuities = pensionManager ? pensionManager.getAll() : [];

  /** @type {import("./cInputs.js").InputsOptions} */
  const inputArgs = {
    // Ages / timeline
    startingYear: currentYear,
    initialAgeSubject: subjectCurrentAge,
    initialAgePartner: partnerCurrentAge,
    subjectRetireAge: subjectRetireAge,
    subjectSsStartAge: subjectSsStartAge,
    subjectPensionStartAge: subjectPensionStartAge,
    subject401kStartAge: subject401kStartAge,
    subjectLifeSpan: subjectLifeSpan,

    retirementYearSpendingOverrides: retirementYearSpendingOverrides,
    taxableIncomeOverrides: taxableIncomeOverrides,
    taxFreeIncomeOverrides: taxFreeIncomeOverrides,

    // Spending
    inflationRate: inflationRate,
    spendingToday: workingYearsSpending,
    spendingRetirement: retirementSpending,
    spendingDecline: spendingDecline,

    // Partner information
    partnerRetireAge: partnerRetireAge,
    partnerSsMonthly: partnerSsMonthly,
    partnerSsStartAge: partnerSsStartAge,
    partnerPenMonthly: partnerPenMonthly,
    partnerPenStartAge: partnerPenStartAge,
    partner401kStartAge: partner401kStartAge,
    partnerLifeSpan: partnerLifeSpan,
    // partnerTaxSS: withholdingsSs,
    partnerPensionWithholdings: partnerPensionWithholdings,
    partnerPensionSurvivorship: partnerPensionSurvivorship,

    pensionAnnuities: pensionAnnuities,

    // Employment and contributions
    subjectStartingSalary: subjectStartingSalary,
    subjectCareerMonthlyPayrollDeductions: subjectMonthlyPayrollDeductions,
    partnerStartingSalary: partnerStartingSalary,
    subjectSalaryGrowthRate: subjectSalaryGrowthRate,
    partnerSalaryGrowthRate: partnerSalaryGrowthRate,
    subjectCareer401kContributionRate: subject401kContributionRate,
    subjectRothContributionRate: subjectRothMonthly,
    // taxablePct: taxablePct,
    subjectEmp401kMatchRate: subjectEmp401kMatchRate,
    subject401kContributionRate: subject401kContributionRate,

    // Account balances and returns
    subject401kStartingBalance: subject401kStartingBalance,
    subjectRothStartingBalance: subjectRothBalance,
    partner401kStartingBalance: partner401kStartingBalance,
    partnerRothStartingBalance: partnerRothBalance,
    savingsStartingBalance: savings,

    subject401kInterestRate: subject401kReturnRate,
    subjectRothInterestRate: subjectRothReturnRate,
    partner401kInterestRate: partner401kReturnRate,
    partnerRothInterestRate: partnerRothReturnRate,
    savingsInterestRate: savingsReturnRate,

    // Income sources
    subjectSsMonthly: subjectSsMonthly,
    ssCola: ssCola,
    subjectPensionMonthly: subjectPensionMonthly,
    subjectPensionSurvivorship: subjectPensionSurvivorship,

    // Tax rates and settings
    filingStatus: filingStatus,
    useRMD: useRMD,
    flatSsWithholdingRate: flatSsWithholdingRate,
    flatCareerTrad401kWithholdingRate: withholdings401k,
    flatPensionWithholdingRate: subjectPensionWithholdingRate,
    flatWageWithholdingRate: flatWageWithholdingRate,

    // Withdrawal order
    // order: order,
  };

  console.log(JSON.stringify(inputArgs, null, 2));
  // inputArgs.dump("inputArgs");

  const inputs = new Inputs(inputArgs);

  if (!inputs.isValid()) {
    showToast(
      "Invalid Ages",
      "Please ensure: current age < retirement age < plan age.",
      "error"
    );
  }

  return inputs;
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  persistedInputs = {};

  loadExample();
  doCalculations();

}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {

});

let isDirty = false;

export function markDirty() {
  if (isDirty) return;
  isDirty = true;
  $("calcBtn")?.classList.add("calc-dirty");
}

export function clearDirty() {
  isDirty = false;
  $("calcBtn")?.classList.remove("calc-dirty");

  document
    .querySelectorAll(".input-dirty")
    .forEach((el) => el.classList.remove("input-dirty"));
}

export function getDirty() {
  return isDirty;
}

function doCalculations() {
  // return; // for now
  const calculations = new Calculations();
  const result = calc(calculations, DefaultUI);
  clearDirty();
  generateOutputAndSummary(result?.inputs, result?.calculations);
}

function updateTaxFreeIncomeFieldsDisplayMode() {
  const useTaxableCurrentYearValues = checkbox("useTaxFreeCurrentYearValues");
  if (!useTaxableCurrentYearValues)
    throw new Error("Checkbox useTaxFreeCurrentYearValues not found");
  const useCurrentYear = useTaxableCurrentYearValues.checked;
  const currentAge = num(UIField.SUBJECT_CURRENT_AGE);
  const endAge = num(UIField.SUBJECT_LIFESPAN);

  if (currentAge <= 0 || endAge <= currentAge) return;

  for (let age = currentAge; age <= endAge; age++) {
    const field = inputText(`taxFreeIncome_${age}`);

    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value") ?? "0") || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        field.setAttribute("data-current-year-value", String(currentValue));
      }

      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(currentValue)) {
        const displayValue = parseFloat(field.value);
        const inflatedValue = applyInflationToIncomeValue(displayValue, age);
        field.setAttribute(
          "title",
          `Current year value: $${displayValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
        );
      }
    } else {
      // Switch to inflated mode
      field.placeholder = "0";

      // Clear the stored current year value and tooltips
      field.removeAttribute("data-current-year-value");
      field.removeAttribute("title");
    }
  }

  doCalculations();
}

function loadExample() {
  // debugger;
  const ex = {
    subjectCurrentAge: 60,
    subjectRetireAge: 62,
    subjectLifespan: 95,
    subject401kStartAge: 62,
    subjectPensionStartAge: 65,
    subjectSalary: 174500,
    subjectSalaryGrowth: 2.0,
    subjectSavingsMonthly: 0,
    subjectRothMonthly: 0,
    subject401kContribution: 0,
    subjectEmpMatchRate: 0,
    subjectEmpMatchCap: 0,

    partnerCurrentAge: 56,
    partnerRetireAge: 62,
    partnerLifespan: 98,
    partner401kStartAge: 62,
    partnerPensionStartAge: 65,
    partnerSalary: 0,
    partnerSalaryGrowth: 0,
    partnerRothMonthly: 0,
    partner401kContribution: 0,
    partnerEmpMatchRate: 0,
    partnerEmpMatchCap: 0,

    currentYear: new Date().getFullYear(),
    workingYearsSpending: 100000,
    retirementYearsSpending: 100000,
    inflation: 2.5, //2.5,
    spendingDecline: 1.0,

    startingSavingsBalance: 530000,
    savingsReturnRate: 3.0,
    subject401kStartingBalance: 500000,
    subject401kReturnRate: 3.0,
    partner401kBalance: 115000,
    partner401kReturnRate: 3.0,
    subjectRothBalance: 1000,
    subjectRothReturnRate: 3.0,
    partnerRothBalance: 1000,
    partnerRothReturnRate: 3.0,

    subjectSsStartAge: 62,
    subjectSsMonthly: 2750,

    partnerSsStartAge: 62,
    partnerSsMonthly: 1133,

    ssWithholdingRate: 20,
    ssCola: 2.5,

    subjectPensionMonthly: 3700,
    subjectPensionWithholdingRate: 20,
    subjectPensionSurvivorship: 50,
    partnerPensionMonthly: 500,
    partnerPensionWithholdingRate: 20,
    partnerPensionSurvivorship: 50,

    filingStatus: constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY,
    withholdingsDefaultRate: 15,
    withholdingsWages: 15,
    withholdings401k: 18,
    // withholdingsSS: 15,
    withholdingsPension: 18,
  };
  // const ex = {
  //   currentAge: 60,
  //   retireAge: 62,
  //   endAge: 90,
  //   inflation: 2.5,
  //   spendingToday: 95000,
  //   spendingDecline: 1.0,
  //   partnerAge: 56,
  //   partnerRetireAge: 62,
  //   partnerSsMonthly: 1000,
  //   partnerSsStart: 62,
  //   partnerSsCola: 0.0,
  //   partnerPenMonthly: 500,
  //   partnerPenStart: 65,
  //   partnerPenCola: 0,
  //   partnerTaxSS: 10,
  //   partnerTaxPension: 20,
  //   salary: 174500,
  //   salaryGrowth: 2.0,
  //   pretaxPct: 0,
  //   rothPct: 0,
  //   taxablePct: 35,
  //   matchCap: 0,
  //   matchRate: 0,
  //   balPre: 600000,
  //   balRoth: 0,
  //   balSavings: 500000,
  //   retPre: 3.0,
  //   retRoth: 0.0,
  //   retTax: 3.0,
  //   ssMonthly: 2500,
  //   ssStart: 62,
  //   ssCola: 2.5,
  //   penMonthly: 3500,
  //   penStart: 65,
  //   penCola: 0,
  //   taxPre: 15,
  //   taxTaxable: 0,
  //   taxRoth: 0,
  //   taxSS: 10,
  //   taxPension: 15,
  //   order: "taxable,pretax,roth",
  //   filingStatus: "married",
  //   useRMD: true,
  // };
  for (const [k, v] of Object.entries(ex)) {
    const el = $(k);
    if (el instanceof HTMLInputElement) {
      el.value = String(v);
    } else if (el instanceof HTMLSelectElement) {
      el.value = String(v);
    } else {
      console.warn(`Element with id '${k}' not found or not an input/select`);
    }
  }
}

// Annual Spending Details Functions
function regenerateSpendingFields() {
  generateOverrideFields({
    prefix: "spending",
    gridId: "spendingDetailsGrid",
    label: "spending ($)",
    placeholder: "Auto",
    onBlur: handleSpendingFieldChange,
    startAge: num(UIField.SUBJECT_RETIRE_AGE),
  });
}

/**
 * @param {any} age
 */
function getSpendingOverride(age) {
  let result = 0;

  const field = inputText(`spending_${age}`);
  if (field && field.value) {
    const value = parseFloat(field.value);
    if (isNaN(value)) {
      // console.log(`getSpendingOverride(${age}): Invalid number in field`);
      setSpendingFieldValue(age);
      return result;
    }
    const useCurrentYearValues = checkbox("useCurrentYearValues");
    const useCurrentYear = useCurrentYearValues && useCurrentYearValues.checked;
    const fieldValue = Number(field.value);

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      const value = parseFloat(storedCurrentYearValue ?? "0");
      if (storedCurrentYearValue && !isNaN(value)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToSpendingValue(
          Number(storedCurrentYearValue),
          age
        );
        // console.log(`  Using stored current year value ${storedCurrentYearValue} → inflated ${inflatedValue}`);
        result = inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToSpendingValue(fieldValue, age);
        // console.log(`  Using field value as current year ${fieldValue} → inflated ${inflatedValue}`);
        result = inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      // console.log(`  Using field value as future dollars: ${fieldValue}`);
      result = fieldValue;
    }
  }
  setSpendingFieldValue(age);
  return result.asCurrency();
}

/**
 * @param {any} age
 */
function setSpendingFieldValue(age) {
  const field = inputText(`spending_${age}`);
  if (field) {
    field.placeholder = `Auto`;
  }
}

/**
 * @param {number} currentYearValue
 * @param {number} targetAge
 */
function applyInflationToSpendingValue(currentYearValue, targetAge) {
  if (!currentYearValue) return 0;
  const currentAgeField = inputText(UIField.SUBJECT_CURRENT_AGE);
  const currentAge = (currentAgeField && parseInt(currentAgeField.value)) || 0;
  const yearsFromNow = targetAge - currentAge;

  const inflationField = inputText(UIField.INFLATION);
  const inflationRate =
    (inflationField && parseFloat(inflationField.value) / 100) || 0.025;

  return currentYearValue * Math.pow(1 + inflationRate, yearsFromNow);
}

/**
 * @param {number} age
 * @param {FocusEvent} event
 */
function handleSpendingFieldChange(age, event) {
  const target = /** @type {HTMLInputElement} */ (event.target);
  const inputValue = parseFloat(target.value) || 0;

  const useCurrentYearValuesCheckbox = checkbox("useCurrentYearValues");
  const useCurrentYear =
    useCurrentYearValuesCheckbox && useCurrentYearValuesCheckbox.checked;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    // The user sees what they typed, but we store it for inflation calculation
    target.setAttribute("data-current-year-value", String(inputValue));

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToSpendingValue(inputValue, age);
    target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    target.removeAttribute("data-current-year-value");
    target.removeAttribute("title");
  }

  target.dispatchEvent(
    new CustomEvent("value-changed", {
      bubbles: true,
      detail: {
        id: target.id,
        value: target.value,
      },
    })
  );
}

function updateSpendingFieldsDisplayMode() {
  const useCurrentYearValuesCheckbox = checkbox("useCurrentYearValues");
  const useCurrentYear =
    useCurrentYearValuesCheckbox && useCurrentYearValuesCheckbox.checked;
  const retireAge = num("retireAge");
  const endAge = num("endAge");

  if (retireAge <= 0 || endAge <= retireAge) return;

  for (let age = retireAge; age <= endAge; age++) {
    const field = inputText(`spending_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value") ?? "0") || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        // When switching to current year mode, assume the current field value
        // is already in current year dollars (user entered it as such)
        // Store it as the current year value without conversion
        field.setAttribute("data-current-year-value", String(currentValue));
      }

      const value = parseFloat(field.value);
      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(value)) {
        const inflatedValue = applyInflationToSpendingValue(value, age);
        field.setAttribute(
          "title",
          `Current year value: $${value.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
        );
      }
    } else {
      // Switch to inflated mode
      field.placeholder = "Future $";

      // Don't change the field value - let the user keep what they typed
      // Just clear the stored current year value and tooltips
      field.removeAttribute("data-current-year-value");
      field.removeAttribute("title");
    }
  }

  doCalculations();
}

/**
 * Generic override field generator
 * Used by spending, taxable income, and tax-free income
 *
 * @param {OverrideFieldOptions} options
 */
function generateOverrideFields(options) {
  const startAge = options.startAge;
  const endAge = num(UIField.SUBJECT_LIFESPAN);

  if (startAge <= 0 || endAge <= startAge) return;

  const grid = $(options.gridId);
  if (!grid) return;

  grid.innerHTML = "";

  for (let age = startAge; age <= endAge; age++) {
    const id = `${options.prefix}_${age}`;

    const div = document.createElement("div");

    div.innerHTML = `
      <label for="${id}">
        Age ${age} ${options.label}
      </label>
      <input
        id="${id}"
        type="number"
        step="1000"
        placeholder="${options.placeholder}"
      />
    `;

    grid.appendChild(div);

    const field = inputText(id);
    if (!field) continue;

    // Restore persisted value
    if (persistedInputs[id] !== undefined) {
      field.value = persistedInputs[id];
    }

    // Persist on input
    field.addEventListener("input", () => {
      field.dispatchEvent(
        new CustomEvent("value-changed", {
          bubbles: true,
          detail: {
            id,
            value: field.value,
          },
        })
      );
    });

    // inflation handler
    field.addEventListener("blur", (event) => options.onBlur(age, event));
  }

  attachDirtyTracking(grid);
}

// Taxable Income Adjustments Functions
function regenerateTaxableIncomeFields() {
  generateOverrideFields({
    prefix: "taxableIncome",
    gridId: "taxableIncomeDetailsGrid",
    label: "taxable income ($)",
    placeholder: "0",
    onBlur: handleTaxableIncomeFieldChange,
    startAge: num(UIField.SUBJECT_CURRENT_AGE),
  });
}

/**
 * @param {any} age
 */
function getTaxableIncomeOverride(age) {
  const field = inputText(`taxableIncome_${age}`);
  let result = 0;
  if (field && field.value) {
    const fieldValue = parseFloat(field.value);
    if (isNaN(fieldValue)) {
      return 0;
    }

    const useTaxableCurrentYearValues = checkbox("useTaxableCurrentYearValues");

    const useCurrentYear =
      useTaxableCurrentYearValues && useTaxableCurrentYearValues.checked;

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      const storedCurrentYearValueNumber = parseFloat(
        storedCurrentYearValue ?? "0"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValueNumber)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(
          Number(storedCurrentYearValue),
          age
        );
        result = inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(fieldValue, age);
        result = inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      result = fieldValue;
    }
  }
  return result.asCurrency(); // Default to 0 if no override specified
}

/**
 * @param {number} age
 * @param {FocusEvent} event
 */
function handleTaxableIncomeFieldChange(age, event) {
  const useTaxableCurrentYearValues = checkbox("useTaxableCurrentYearValues");

  const useCurrentYear =
    useTaxableCurrentYearValues && useTaxableCurrentYearValues.checked;
  const target = /** @type {HTMLInputElement} */ (event.target);
  const inputValue = parseFloat(target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    target.setAttribute("data-current-year-value", String(inputValue));

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToIncomeValue(inputValue, age);
    target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    target.removeAttribute("data-current-year-value");
    target.removeAttribute("title");
  }

  target.dispatchEvent(
    new CustomEvent("value-changed", {
      bubbles: true,
      detail: {
        id: target.id,
        value: target.value,
      },
    })
  );

  // Trigger recalculation
  // doCalculations();
}

function updateTaxableIncomeFieldsDisplayMode() {
  const useTaxableCurrentYearValues = checkbox(
    UIField.USE_TAXABLE_CURRENT_YEAR_VALUES
  );
  const useCurrentYear =
    useTaxableCurrentYearValues && useTaxableCurrentYearValues.checked;
  const currentAge = num(UIField.SUBJECT_CURRENT_AGE);
  const endAge = num(UIField.SUBJECT_LIFESPAN);

  if (currentAge <= 0 || endAge <= currentAge) return;

  for (let age = currentAge; age <= endAge; age++) {
    const field = inputText(`taxableIncome_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue = parseFloat(
      field.getAttribute("data-current-year-value") ?? "0"
    );

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        field.setAttribute("data-current-year-value", String(currentValue));
      }

      const value = parseFloat(field.value);
      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(value)) {
        const displayValue = parseFloat(field.value);
        const inflatedValue = applyInflationToIncomeValue(displayValue, age);
        field.setAttribute(
          "title",
          `Current year value: $${displayValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
        );
      }
    } else {
      // Switch to inflated mode
      field.placeholder = "0";

      // Clear the stored current year value and tooltips
      field.removeAttribute("data-current-year-value");
      field.removeAttribute("title");
    }
  }

  doCalculations();
}

// Tax-free Income Adjustments Functions
function regenerateTaxFreeIncomeFields() {
  generateOverrideFields({
    prefix: "taxFreeIncome",
    gridId: "taxFreeIncomeDetailsGrid",
    label: "tax-free income ($)",
    placeholder: "0",
    onBlur: handleTaxFreeIncomeFieldChange,
    startAge: num(UIField.SUBJECT_CURRENT_AGE),
  });
}

/**
 * @param {any} age
 */
function getTaxFreeIncomeOverride(age) {
  const field = inputText(`taxFreeIncome_${age}`);
  let result = 0;
  if (field && field.value) {
    const fieldValue = parseFloat(field.value);

    if (isNaN(fieldValue)) {
      // console.log(`getTaxFreeIncomeOverride(${age}): Invalid number in field`);
      return 0;
    }
    const useTaxFreeCurrentYearValues = checkbox("useTaxFreeCurrentYearValues");
    const useCurrentYear =
      useTaxFreeCurrentYearValues && useTaxFreeCurrentYearValues.checked;

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      const storedCurrentYearValueNumber = parseFloat(
        storedCurrentYearValue ?? "0"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValueNumber)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(
          Number(storedCurrentYearValue),
          age
        );
        result = inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(fieldValue, age);
        result = inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      result = fieldValue;
    }
  }
  return result.asCurrency();
}

/**
 * @param {number} age
 * @param {FocusEvent} event
 */
function handleTaxFreeIncomeFieldChange(age, event) {
  const useTaxFreeCurrentYearValues = checkbox("useTaxFreeCurrentYearValues");
  const useCurrentYear =
    useTaxFreeCurrentYearValues && useTaxFreeCurrentYearValues.checked;
  const target = /** @type {HTMLInputElement} */ (event.target);
  const inputValue = parseFloat(target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    target.setAttribute("data-current-year-value", String(inputValue));
    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToIncomeValue(inputValue, age);
    target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    target.removeAttribute("data-current-year-value");
    target.removeAttribute("title");
  }

  target.dispatchEvent(
    new CustomEvent("value-changed", {
      bubbles: true,
      detail: {
        id: target.id,
        value: target.value,
      },
    })
  );
}

// Helper function for income inflation (similar to spending inflation)
/**
 * @param {number} currentYearValue
 * @param {number} targetAge
 */
function applyInflationToIncomeValue(currentYearValue, targetAge) {
  if (!currentYearValue) return 0;

  const currentAgeField = inputText(UIField.SUBJECT_CURRENT_AGE);
  if (!currentAgeField) return 0;

  const currentAge = parseInt(currentAgeField.value) || 0;
  const yearsFromNow = targetAge - currentAge;
  const inflationField = inputText(UIField.INFLATION);
  if (!inflationField) return 0;
  const inflationRate = parseFloat(inflationField.value) / 100 || 0.025;
  return currentYearValue * Math.pow(1 + inflationRate, yearsFromNow);
}

/**
 * @param {any} hostSelector
 * @param {RequestInfo | URL} url
 */
async function loadPartial(hostSelector, url) {
  const host = document.querySelector(hostSelector);
  const html = await fetch(url).then((r) => r.text());
  host.insertAdjacentHTML("beforeend", html);
}

/**
 * @param {ParentNode} [root=document]
 */
function attachDirtyTracking(root = document) {
  root.querySelectorAll("input, select, textarea").forEach((el) => {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      el.dataset.prevValue = el.value;

      el.addEventListener("blur", () => {
        if (el.value !== el.dataset.prevValue) {
          el.dataset.prevValue = el.value;

          markDirty();
        }
      });
    }
  });
}

function loadPersistedInputs() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    persistedInputs = json ? JSON.parse(json) : {};
  } catch {
    persistedInputs = {};
  }
}

function savePersistedInputs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedInputs));
}

function restorePersistedInputs() {
  Object.entries(persistedInputs).forEach(([id, value]) => {
    const el = document.getElementById(id);

    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      el.value = value;
    }
  });
}

function renderPensionList() {
  const container = $("pensionList");
  if (!container) return;

  if (!pensionManager) return;

  const list = pensionManager.getAll();
  container.innerHTML = "";

  list.forEach((item) => {
    const row = document.createElement("div");
    row.className = "pension-row";

    row.innerHTML = `
      <div class="pension-info">
        <strong>${item.name}</strong>
        <div class="pension-details">$${item.monthlyAmount.asCurrency()}/mo starting age ${item.startAge}
        </div>
      </div>

      <div class="pension-actions">
        <button class="pension-btn pension-edit edit" data-id="${item.id}" title="Modify pension details">
          <span class="btn-icon">📝</span>
          <span class="btn-text">Edit</span>
        </button>
        <button class="pension-btn pension-delete delete" data-id="${item.id}" title="Remove pension">
          <span class="btn-icon">❌</span>
          <span class="btn-text">Remove</span>
        </button>
      </div>
    `;

    container.appendChild(row);
  });
}

function initUI() {
  loadPersistedInputs(); // ← ADD THIS FIRST

  pensionStorage = new PensionAnnuityStorage(
    persistedInputs,
    savePersistedInputs
  );

  pensionManager = new PensionAnnuityManager(pensionStorage);

  // Set up event listeners after partials are loaded
  setupEventListeners();

  loadColumnLayout();
  buildColumnMenu();
  initializeHelpIcons();
  loadExample();
  regenerateSpendingFields();
  regenerateTaxableIncomeFields();
  regenerateTaxFreeIncomeFields();
  restorePersistedInputs(); // ← ADD THIS AFTER UI EXISTS
  renderPensionList();
  doCalculations();
  attachDirtyTracking();
}

/** @type {Map<HTMLElement, ResizeObserver>} */
const detailsObservers = new Map();

/**
 * Forces all open <details> panels to recompute animated height.
 * @param {ParentNode} [root=document]
 */
function resyncAllOpenDetails(root = document) {
  root.querySelectorAll("details[open]").forEach((details) => {
    // Find the content element inside every open details section
    const content = /** @type {HTMLElement} */ (
      details.querySelector(".content")
    );
    if (!content) return;

    // Cancel any in-flight animations
    content.getAnimations().forEach((a) => a.cancel());

    // 🔑 RELEASE height back to layout engine
    content.style.height = "auto";
    content.style.opacity = "";
  });
}

export {
  parseInputParameters,
  resetAll,
  loadExample,
  regenerateTaxableIncomeFields,
  updateTaxableIncomeFieldsDisplayMode,
  regenerateTaxFreeIncomeFields,
  updateTaxFreeIncomeFieldsDisplayMode,
  regenerateSpendingFields,
  updateSpendingFieldsDisplayMode,
  getSpendingOverride,
  getTaxFreeIncomeOverride,
  getTaxableIncomeOverride,
  loadPartial,
  initUI,
  resyncAllOpenDetails,
  detailsObservers,
  doCalculations,
};
