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
import { generateOutputAndSummary } from "./retirement-summaryrenderer.js";
import { createHelpIcon } from "./retirement-ui-help.js";
import { showToast } from "./retirement-ui-toast.js";

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


document.addEventListener("value-changed", () => {
  doCalculations();
});


// document.addEventListener("keydown", (e) => {
//   // Calculate button shortcut: Ctrl+Enter (or Cmd+Enter on Mac)
//   if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
//     e.preventDefault();
//     doCalculations();
//   }
// });

// Events
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
  const withholdingsSs = pct(num(UIField.WITHHOLDINGS_SS));
  const withholdingsPension = pct(num(UIField.WITHHOLDINGS_PENSION));
  const useRMD = checkbox(UIField.USE_RMD)?.checked ?? false;
  // const order = withdrawalOrder;

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

    // Spending
    inflationRate: inflationRate,
    spendingToday: workingYearsSpending,
    spendingDecline: spendingDecline,

    // Partner information
    partnerRetireAge: partnerRetireAge,
    partnerSsMonthly: partnerSsMonthly,
    partnerSsStartAge: partnerSsStartAge,
    partnerPenMonthly: partnerPenMonthly,
    partnerPenStartAge: partnerPenStartAge,
    partner401kStartAge: partner401kStartAge,
    partnerTaxSS: withholdingsSs,
    partnerPensionWithholdings: partnerPensionWithholdings,

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
  document
    .querySelectorAll("input")
    .forEach((i) => (i.value = i.defaultValue ?? ""));

  const order = select("order");
  if (order) {
    order.value = "taxable,pretax,roth";
  }

  const filingStatus = select("filingStatus");
  if (filingStatus) {
    filingStatus.value = "single";
  }

  // Clear spending override fields
  const grid = divById("spendingDetailsGrid");
  if (grid) {
    grid.innerHTML = "";
  }
  // Clear income adjustment fields
  const taxableGrid = divById("taxableIncomeDetailsGrid");
  if (taxableGrid) {
    taxableGrid.innerHTML = "";
  }
  const taxFreeGrid = divById("taxFreeIncomeDetailsGrid");
  if (taxFreeGrid) {
    taxFreeGrid.innerHTML = "";
  }
  const rows = divById("rows");
  if (rows) {
    rows.innerHTML = "";
  }
  const kpiAge = divById("kpiAge");
  if (kpiAge) {
    kpiAge.textContent = "—";
  }

  const kpiEndBal = divById("kpiEndBal");
  if (kpiEndBal) {
    kpiEndBal.textContent = "—";
  }

  const kpiDraw = divById("kpiDraw");
  if (kpiDraw) {
    kpiDraw.textContent = "—";
  }

  const kpiTax = divById("kpiTax");
  if (kpiTax) {
    kpiTax.textContent = "—";
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // First render
  // initUI();
});

function doCalculations() {
  // return; // for now
  const calculations = new Calculations();
  const result = calc(calculations, DefaultUI);
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
    subjectLifeSpan: 90,
    subject401kStartAge: 62,
    subjectPensionStartAge: 65,
    subjectSsStartAge: 62,
    subjectSalary: 174500,
    subjectSalaryGrowth: 2.0,
    subjectSavingsMonthly: 0,
    subjectRothMonthly: 0,
    subject401kContribution: 0,
    subjectEmpMatchRate: 0,
    subjectEmpMatchCap: 0,

    partnerCurrentAge: 56,
    partnerRetireAge: 62,
    partnerLifeSpan: 90,
    partner401kStartAge: 62,
    partnerPensionStartAge: 65,
    partnerSsStartAge: 62,
    partnerSalary: 0,
    partnerSalaryGrowth: 0,
    partnerRothMonthly: 0,
    partner401kContribution: 0,
    partnerEmpMatchRate: 0,
    partnerEmpMatchCap: 0,

    currentYear: new Date().getFullYear(),
    workingYearsSpending: 100000,
    retirementYearsSpending: 100000,
    inflation: 2.0, //2.5,
    spendingDecline: 0.0,

    startingSavingsBalance: 500000,
    savingsReturnRate: 3.0,
    subject401kStartingBalance: 600000,
    subject401kReturnRate: 3.0,
    partner401kStartingBalance: 0,
    partner401kReturnRate: 0.0,
    subjectRothBalance: 1000,
    subjectRothReturnRate: 3.0,
    partnerRothBalance: 1000,
    partnerRothReturnRate: 3.0,

    subjectSsMonthly: 2500,
    partnerSsMonthly: 1000,
    ssWithholdingRate: 20,
    ssCola: 2.5,

    subjectPensionMonthly: 3500,
    subjectPensionWithholdingRate: 20,
    subjectPensionSurvivorship: 50,
    partnerPensionMonthly: 500,
    partnerPensionWithholding: 20,
    partnerPensionSurvivorship: 50,

    filingStatus: constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY,
    withholdingsDefaultRate: 15,
    withholdingWages: 20,
    withholdings401k: 20,
    withholdingsSs: 10,
    withholdingsPension: 20,
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
    }
  }
}

// Annual Spending Details Functions
function regenerateSpendingFields() {
  const retireAge = num(UIField.SUBJECT_RETIRE_AGE);
  const endAge = num(UIField.SUBJECT_LIFESPAN);

  // Only generate if ages are valid
  if (retireAge <= 0 || endAge <= retireAge) {
    return;
  }

  const grid = $("spendingDetailsGrid");
  if (!grid) return;
  grid.innerHTML = ""; // Clear existing fields

  // Generate input fields for each retirement year
  for (let age = retireAge; age <= endAge; age++) {
    const div = document.createElement("div");
    div.innerHTML = `
        <label for="spending_${age}">Age ${age} spending ($)</label>
        <input id="spending_${age}" type="number" step="1000" placeholder="Auto" />
    `;
    grid.appendChild(div);

    // Add event listener for inflation adjustment
    const field = $(`spending_${age}`);
    if (!field) continue;
    field.addEventListener("blur", (event) =>
      handleSpendingFieldChange(age, event)
    );
  }
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

  // Trigger recalculation
  doCalculations();
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

// Taxable Income Adjustments Functions
function regenerateTaxableIncomeFields() {
  const currentAge = num(UIField.SUBJECT_CURRENT_AGE);
  const endAge = num(UIField.SUBJECT_LIFESPAN);

  // Only generate if ages are valid
  if (currentAge <= 0 || endAge <= currentAge) {
    return;
  }

  const grid = $("taxableIncomeDetailsGrid");
  if (!grid) return;

  grid.innerHTML = ""; // Clear existing fields

  // Generate input fields for each year from current age to end age
  for (let age = currentAge; age <= endAge; age++) {
    const div = document.createElement("div");
    div.innerHTML = `
        <label for="taxableIncome_${age}">Age ${age} taxable income ($)</label>
        <input id="taxableIncome_${age}" type="number" step="1000" placeholder="0" />
    `;
    grid.appendChild(div);

    // Add event listener for inflation adjustment
    const field = $(`taxableIncome_${age}`);
    if (!field) continue;
    field.addEventListener("blur", (event) =>
      handleTaxableIncomeFieldChange(age, event)
    );
  }
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
      // console.log(`getTaxableIncomeOverride(${age}): Invalid number in field`);
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

  // Trigger recalculation
  doCalculations();
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
  const currentAge = num(UIField.SUBJECT_CURRENT_AGE);
  const endAge = num(UIField.SUBJECT_LIFESPAN);

  // Only generate if ages are valid
  if (currentAge <= 0 || endAge <= currentAge) {
    return;
  }

  const grid = $("taxFreeIncomeDetailsGrid");
  if (!grid) return;

  grid.innerHTML = ""; // Clear existing fields

  // Generate input fields for each year from current age to end age
  for (let age = currentAge; age <= endAge; age++) {
    const div = document.createElement("div");
    div.innerHTML = `
        <label for="taxFreeIncome_${age}">Age ${age} tax-free income ($)</label>
        <input id="taxFreeIncome_${age}" type="number" step="1000" placeholder="0" />
    `;
    grid.appendChild(div);

    // Add event listener for inflation adjustment
    const field = $(`taxFreeIncome_${age}`);
    if (!field) continue;
    field.addEventListener("blur", (event) =>
      handleTaxFreeIncomeFieldChange(age, event)
    );
  }
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

  // Trigger recalculation
  doCalculations();
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

function initUI() {
  initializeHelpIcons();
  loadExample();
  doCalculations();
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
