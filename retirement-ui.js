// @ts-ignore

import { ACCOUNT_TYPES } from "./cAccount.js";
import { Calculation, Calculations } from "./cCalculation.js";
import { Inputs } from "./cInputs.js";
import { constsJS_FILING_STATUS } from "./consts.js";
import { calc } from "./retirement-calculator.js";
import * as DefaultUI from "./retirement-ui.js";
import { UIField } from "./UIFields.js";
// import * as popups from "./retirement-popups.js";
import { popupActions } from "./retirement-popups.js";
import { ReportData } from "./rReportData.js";
import {
  exportCSV,
  exportJSON,
  generatePDFReport,
  handleJSONFile,
  importJSON,
} from "./import-export.js";
import { drawChart } from "./chart.js";

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

// const $ = (/** @type {string} */ id) => document.getElementById(id);
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

// /**
//  * @param {string} id
//  * @returns {number}
//  */
// const num = (/** @type {string} */ id) => {
//   const el = $(id);

//   if (el === null || typeof el === "undefined") {
//     console.log(`Element with id '${id}' not found.`);
//     throw new Error(`Element with id '${id}' not found.`);
//   }

//   let val;
//   if (
//     el instanceof HTMLInputElement ||
//     el instanceof HTMLSelectElement ||
//     el instanceof HTMLTextAreaElement
//   ) {
//     val = el.value;
//   } else {
//     val = undefined;
//   }
//   return Number(val || 0);
// };

const pct = (/** @type {number} */ v) => (isNaN(v) ? 0 : Number(v) / 100);
// const fmt = (/** @type {number} */ n) =>
//   n.toLocaleString(undefined, {
//     style: "currency",
//     currency: "USD",
//     maximumFractionDigits: 0,
//   });

// Global variable to store calculations for popup access

/** @type {Calculation[]} */
let calculations = [];

// Helper function to create reusable help icon
/**
 * @param {string} fieldId
 */
function createHelpIcon(fieldId) {
  return `<svg xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                width="1em" height="1em" 
                fill="#7c8db5" 
                class="help-icon"
                onclick="showHelpToast(event, '${fieldId}')"
                style="vertical-align: middle; margin-left: 0.3em;">
            <circle cx="12" cy="12" r="10" stroke="#7c8db5" stroke-width="2" fill="none"/>
            <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5v1" stroke="#7c8db5" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="12" cy="17" r="1" fill="#7c8db5"/>
            </svg>`;
}

// Help toast functionality
/**
 * @type {HTMLDivElement | null}
 */
let currentToast = null;
let currentProgressBar = null;
/**
 * @type {number | null | undefined}
 */
let toastTimer = null;
let progressTimer = null;

/**
 * @typedef {{ title: string; body: string }} HelpText
 */

/**
 * @param {{ stopPropagation: () => void; }} event
 * @param {string | number} fieldId
 */
function showHelpToast(event, fieldId) {
  // Prevent the click from bubbling up to document
  event.stopPropagation();

  /**
   * @type {Record<string, HelpText>}
   */
  const helpTexts = {
    subjectCurrentAge: {
      title: "Current Age",
      body: "Enter your current age in years. This is used as the starting point for all retirement calculations and determines how many years you have until retirement.",
    },
    retireAge: {
      title: "Retirement Age",
      body: "The age at which you plan to retire and stop working. This determines when you'll begin withdrawing from your retirement accounts.",
    },
    endAge: {
      title: "Plan to Age",
      body: "The age until which you want your retirement funds to last. This is typically your expected lifespan or when you want financial security to end.",
    },
    inflation: {
      title: "Inflation Rate",
      body: "The expected annual inflation rate as a percentage. This affects how your spending needs will grow over time and reduces the purchasing power of money.",
    },
    spendingToday: {
      title: "Retirement Spending",
      body: "How much you expect to spend per year in retirement, expressed in today's dollars. This will be adjusted for inflation to your retirement date.",
    },
    spendingDecline: {
      title: "Annual Spending Decline",
      body: "The percentage by which your spending decreases each year in retirement. Many retirees spend less as they age due to reduced activity and travel.",
    },
    partnerAge: {
      title: "Spouse Current Age",
      body: "Your partner's current age in years. Set to 0 if you don't have a partner. This affects Social Security and pension benefit calculations.",
    },
    partnerRetireAge: {
      title: "Spouse Retirement Age",
      body: "The age at which your partner plans to retire. This determines when partner income sources will begin or end.",
    },
    salary: {
      title: "Current Salary",
      body: "Your current annual gross salary before taxes and deductions. This is used to calculate retirement contributions and employer matching.",
    },
    salaryGrowth: {
      title: "Salary Growth Rate",
      body: "The expected annual percentage increase in your salary. This affects future contribution amounts and employer matching over time.",
    },
    subject401kContribution: {
      title: "401k Contribution",
      body: "The percentage (%) of your salary contributed to pre-tax retirement accounts like traditional 401(k) or IRA. These reduce working year taxes but are taxed in retirement.",
    },
    rothPct: {
      title: "Roth Contribution Rate",
      body: "The percentage of your salary contributed to Roth accounts. These are made with after-tax dollars but grow tax-free and are not taxed in retirement.",
    },
    taxablePct: {
      title: "Taxable Savings Rate",
      body: "The percentage of your salary saved in regular taxable investment accounts. These provide flexibility but don't have tax advantages. Note: Interest and dividends earned on these accounts are included in your taxable income each year during working years.",
    },
    subjectEmpMatchCap: {
      title: "Employer Match Cap",
      body: "The maximum percentage (%) of gross wages that your employer will match.",
    },
    subjectEmpMatchRate: {
      title: "Employer Match",
      body: "The percentage (%) rate at which your employer matches contributions. For example, 50% means your employer will contribute $0.50 for every $1.00 you contribute.",
    },
    balPre: {
      title: "Pre-tax Balance",
      body: "Your current balance in pre-tax retirement accounts like traditional 401(k), 403(b), or traditional IRA.",
    },
    balRoth: {
      title: "Roth Balance",
      body: "Your current balance in Roth retirement accounts like Roth 401(k) or Roth IRA. These grow tax-free.",
    },
    startingSavingsBalance: {
      title: "Savings Balance",
      body: "Total savings starting balance for regular taxable investment accounts like brokerage accounts, savings, or CDs.",
    },
    workingYearsSpending: {
      title: "Working Years Spending",
      body: "The amount you expect to spend per year while you are still working, expressed in today's dollars. This will be adjusted for inflation over time.",
    },
    retirementYearsSpending: {
      title: "Retirement Years Spending",
      body: "The amount you expect to spend per year during retirement, expressed in today's dollars. This will be adjusted for inflation to your retirement date.",
    },
    retPre: {
      title: "Pre-tax Return Rate",
      body: "The expected annual return on your pre-tax retirement investments, expressed as a percentage. Typically 6-8% for diversified portfolios.",
    },
    retRoth: {
      title: "Roth Return Rate",
      body: "The expected annual return on your Roth retirement investments. Usually similar to pre-tax returns since they're often in similar investments.",
    },
    retTax: {
      title: "Taxable Return Rate",
      body: "The expected annual return on your taxable investments. May be slightly lower due to tax drag from annual taxes on dividends and capital gains.",
    },
    ssMonthly: {
      title: "Social Security Benefit",
      body: "Your estimated monthly Social Security benefit in the first year you claim it, in today's dollars. Check your Social Security statement for estimates.",
    },
    ssStart: {
      title: "Social Security Start Age",
      body: "The age at which you plan to start claiming Social Security benefits. You can claim as early as 62 or delay until 70 for larger benefits.",
    },
    ssCola: {
      title: "Social Security COLA",
      body: "The annual cost-of-living adjustment for Social Security, typically around 2-3% per year to keep pace with inflation.",
    },
    penMonthly: {
      title: "Pension Benefit",
      body: "Your estimated monthly pension benefit in the first year you receive it. Set to 0 if you don't have a pension.",
    },
    penStart: {
      title: "Pension Start Age",
      body: "The age at which you'll begin receiving pension benefits. This varies by employer and plan type.",
    },
    penCola: {
      title: "Pension COLA",
      body: "The annual cost-of-living adjustment for your pension. Many pensions have no COLA (0%), while others may match inflation.",
    },
    taxPre: {
      title: "Pre-tax Withdrawal Tax Rate",
      body: "The baseline effective tax rate on withdrawals from pre-tax retirement accounts. The calculator uses Taxable Income-based rates for more accuracy when total income is significant, but falls back to this rate as a minimum.",
    },
    taxTaxable: {
      title: "Taxable Withdrawal Tax Rate",
      body: "The effective tax rate on withdrawals from taxable accounts. Usually lower than income tax due to capital gains treatment.",
    },
    taxRoth: {
      title: "Roth Withdrawal Tax Rate",
      body: "The effective tax rate on Roth withdrawals. Typically 0% since Roth withdrawals are tax-free in retirement.",
    },
    taxSS: {
      title: "Social Security Tax Rate",
      body: "The effective tax rate on Social Security benefits. Varies based on total income, typically 0-18.5% of benefits.",
    },
    taxPension: {
      title: "Pension Tax Rate",
      body: "The baseline effective tax rate on pension benefits. When Taxable Income-based calculation is enabled, the calculator uses progressive tax rates based on total income, but falls back to this rate as a minimum. Usually taxed as ordinary income at your marginal tax rate.",
    },
    order: {
      title: "Withdrawal Order Strategy",
      body: "The order in which you'll withdraw from different account types. The default strategy withdraws from Savings first, then 401k, then Roth to optimize taxes. The 50/50 strategy takes equal net amounts from savings and 401k accounts (after Social Security and pension income), automatically grossing up the 401k withdrawal to account for taxes.",
    },
    filingStatus: {
      title: "Tax Filing Status",
      body: "Your tax filing status affects Social Security taxation thresholds and Taxable Income-based tax calculations. Single filers have lower thresholds for SS taxation than married filing jointly.",
    },
    useRMD: {
      title: "Required Minimum Distribution Rules",
      body: "When enabled, enforces mandatory withdrawals from pre-tax retirement accounts (401k, traditional IRA) starting at age 73. RMD amounts are calculated based on IRS life expectancy tables and account balances. These withdrawals are required by law and failure to take them results in significant penalties.",
    },
  };

  if (!Object.prototype.hasOwnProperty.call(helpTexts, fieldId)) {
    return;
  }

  /** @type {HelpText} */
  const helpData = helpTexts[fieldId];
  if (!helpData) {
    return;
  }

  // Remove existing toast if any
  if (currentToast) {
    hideToast(true); // Immediate cleanup when replacing
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-title">${helpData.title}</div>
    <div class="toast-body">${helpData.body}</div>
    <div class="progress-bar"></div>
    `;

  document.body.appendChild(toast);
  currentToast = toast;

  const progressBar = toast.querySelector(".progress-bar");

  if (!progressBar) return;

  currentProgressBar = progressBar;

  // Show toast with animation
  progressTimer = setTimeout(() => {
    toast.classList.add("show");

    if (!(progressBar instanceof HTMLElement)) return;

    // Initialize progress bar to full width without transition
    progressBar.style.transition = "none";
    progressBar.style.width = "100%";

    // After a brief moment, enable transition and start countdown
    setTimeout(() => {
      progressBar.style.transition = "width 10000ms linear";
      progressBar.style.width = "0%";
    }, 50);
  }, 10);

  // Auto-hide after 10 seconds
  toastTimer = setTimeout(() => hideToast(), 10000);
}

function hideToast(immediate = false) {
  if (!currentToast) return;

  // Clear any existing timers
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  currentToast.classList.remove("show");

  if (immediate) {
    // Remove immediately for toast replacement
    if (currentToast && currentToast.parentNode) {
      currentToast.parentNode.removeChild(currentToast);
    }
    currentToast = null;
  } else {
    // Wait for animation to complete for natural dismissal
    setTimeout(() => {
      if (currentToast && currentToast.parentNode) {
        currentToast.parentNode.removeChild(currentToast);
      }
      currentToast = null;
    }, 10000);
  }
}

// Generic toast notification function
/**
 * @param {string} title
 * @param {string} message
 */
function showToast(title, message, type = "info", duration = 5000) {
  // Remove existing toast if any
  if (currentToast) {
    hideToast(true); // Immediate cleanup when replacing
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-title">${title}</div>
    <div class="toast-body">${message}</div>
    <div class="progress-bar"></div>
    `;

  document.body.appendChild(toast);
  currentToast = toast;

  const progressBar = toast.querySelector(".progress-bar");
  currentProgressBar = progressBar;

  // Show toast with animation
  progressTimer = setTimeout(() => {
    toast.classList.add("show");

    if (!(progressBar instanceof HTMLElement)) return;

    // Initialize progress bar to full width without transition
    progressBar.style.transition = "none";
    progressBar.style.width = "100%";

    // After a brief moment, enable transition and start countdown
    setTimeout(() => {
      progressBar.style.transition = `width ${duration}ms linear`;
      progressBar.style.width = "0%";
    }, 50);
  }, 10);

  // Auto-hide after specified duration
  toastTimer = setTimeout(() => hideToast(), duration);
}

document.addEventListener("value-changed", () => {
  doCalculations();
});

// Event listeners for dismissing toast
document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element)) return;

  if (
    currentToast &&
    !currentToast.contains(e.target) &&
    !e.target.closest(".help-icon")
  ) {
    hideToast();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && currentToast) {
    hideToast();
  }

  // Calculate button shortcut: Ctrl+Enter (or Cmd+Enter on Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    doCalculations();
  }
});

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
  const subjectMonthlyPayrollDeductions = num(UIField.SUBJECT_PAYROLL_DEDUCTIONS);
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

  drawChart([]);
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

/**
 * Generate final summary, write table, and update KPIs
 * @param {Inputs | undefined} inputs
 * @param {Calculations | undefined } calculations
 */
function generateOutputAndSummary(inputs, calculations) {
  //, rows) {
  // Write table
  const tbody = $("rows");
  if (!tbody) return;

  if (!calculations) {
    tbody.innerHTML =
      "<tr><td colspan='100%'>No calculations to display</td></tr>";
    return;
  }

  if (!inputs) {
    tbody.innerHTML =
      "<tr><td colspan='100%'>No input data available</td></tr>";
    return;
  }

  tbody.innerHTML = calculations
    .getAllCalculations()
    .map((calculation, index) => {
      // debugger;
      // calculation.dump();
      /** @type {ReportData} */
      const reportData = calculation.reportData;

      let result = `
        <tr>
        <td class="neutral">${reportData.year}</td>
        <td class="neutral">${reportData.demographics_subjectAge}</td>
        
        <!-- THE NEED -->
        <td class="outgoing">${reportData.ask ? reportData.ask.asWholeDollars() : ""}</td>
        
        <!-- NET INCOME (what you actually receive) -->
        <td class="income">${
          reportData.income_combinedTakehomeWages
            ? `<span class="calc-link ss-link" 
                    data-index="${index}"
                    data-action="showSalaryBreakdown">
                  ${reportData.income_combinedTakehomeWages.asWholeDollars()}
                  </span>`
            : ""
        }</td>
        <td class="income">${
          reportData.ss_combinedTakehome
            ? `<span 
                  class="calc-link ss-link" 
                  data-index="${index}" 
                  data-action="showSsBreakdown">
                  ${reportData.ss_combinedTakehome.asWholeDollars()}
                </span>`
            : ""
        }</td>
        <td class="income">${reportData.income_combinedPensionTakehome ? reportData.income_combinedPensionTakehome.asWholeDollars() : ""}</td>
        <td class="income">${
          reportData.income_combined401kTakehome
            ? `<span class="withdrawal-net-link" onclick="showWithdrawalNetBreakdown(${index})">${reportData.income_combined401kTakehome.asWholeDollars()}</span>`
            : ""
        }</td>
        <td class="income">${
          reportData.savings_Withdrawals
            ? reportData.savings_Withdrawals.asWholeDollars()
            : ""
        }</td>
        <td class="income">${
          reportData.income_total_net
            ? // ? calculation.age >= inputs.subjectRetireAge
              `<span class="ss-link" onclick="showTotalNetBreakdown(${index})">${reportData.income_total_net.asWholeDollars()}</span>`
            : // : fmt(reportData.income_total_net)
              ""
        }</td>
        
        <!-- GROSS INCOME (before taxes/deductions) -->
        <td class="income">${
          reportData.income_combinedWagesGross
            ? reportData.income_combinedWagesGross.asWholeDollars()
            : ""
        }</td>
        <td class="income">${
          reportData.income_savingsInterest
            ? reportData.income_savingsInterest.asWholeDollars()
            : ""
        }</td>
        <td class="income">${
          reportData.ss_combinedGross
            ? reportData.ss_combinedGross.asWholeDollars()
            : ""
        }</td>
        <td class="income">${
          reportData.income_combinedPensionGross
            ? reportData.income_combinedPensionGross.asWholeDollars()
            : ""
        }</td>
        <!--
        <td class="income">${
          reportData.income_combined401kGross
            ? reportData.income_combined401kGross.asWholeDollars()
            : ""
        }</td> -->
        <td class="income">${
          reportData.income_combined401kGross
            ? reportData.income_combined401kGross.asWholeDollars()
            : ""
        }</td>
        <td class="income">${
          reportData.income_total_gross
            ? reportData.income_total_gross.asWholeDollars()
            : ""
        }</td> `;

      // <!-- THE BREAKDOWN -->
      // <td class="income">${
      //   calculation.age >= inputs.subjectRetireAge
      //     ? `<span class="taxable-income-link" onclick="showTaxableIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
      //         calculation.taxableIncome || 0
      //       )}</span>`
      //     : calculation.taxableIncome
      //       ? fmt(calculation.taxableIncome)
      //       : ""
      // }</td>
      // <td class="income">${
      //   calculation.nonTaxableIncome
      //     ? calculation.age >= inputs.subjectLifeSpan
      //       ? `<span class="non-taxable-income-link" onclick="showNonTaxableIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
      //           calculation.nonTaxableIncome
      //         )}</span>`
      //       : fmt(calculation.nonTaxableIncome)
      //     : ""
      // }</td>
      // <td class="income">${
      //   calculation.provisionalIncome && calculation.provisionalIncome > 0
      //     ? `<span class="provisional-income-link" onclick="showProvisionalIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
      //         calculation.provisionalIncome
      //       )}</span>`
      //     : calculation.provisionalIncome
      //       ? fmt(calculation.provisionalIncome)
      //       : ""
      // }</td>

      // <!-- TAX INFORMATION -->
      // <td class="neutral">${
      //   calculation.standardDeduction
      //     ? fmt(calculation.standardDeduction)
      //     : ""
      // }</td>
      // <td class="neutral">${
      //   calculation.taxableIncome ? fmt(calculation.taxableIncome) : ""
      // }</td>
      // <td class="outgoing">${
      //   calculation.ssTaxes !== undefined && calculation.ssTaxes !== null
      //     ? fmt(calculation.ssTaxes)
      //     : ""
      // }</td>
      // <td class="outgoing">${
      //   calculation.otherTaxes ? fmt(calculation.otherTaxes) : ""
      // }</td>
      // <td class="outgoing">${
      //   calculation.age >= inputs.subjectRetireAge
      //     ? `<span class="total-taxes-link" onclick="showTotalTaxesBreakdown(${index})" title="Click to see breakdown">${fmt(
      //         calculation.totalTaxes || 0
      //       )}</span>`
      //     : calculation.totalTaxes
      //       ? fmt(calculation.totalTaxes)
      //       : ""
      // }</td>
      // <td class="neutral">${
      //   calculation.effectiveTaxRate
      //     ? calculation.effectiveTaxRate.toFixed(1) + "%"
      //     : ""
      // }</td>

      result += `
        <!-- THE RESULT -->
        <td class="neutral">${
          reportData.savings_Balance
            ? `<span class="savings-balance-link" 
                  onclick="showSavingsBreakdown(${index})" 
                  title="Click to see savings changes">${reportData.savings_Balance.asWholeDollars()}</span>`
            : ""
        }</td>
        <td class="neutral">${reportData.balances_combined401k.asWholeDollars()}</td>
        <td class="neutral">${reportData.balances_combinedRoth.asWholeDollars()}</td>
        <td class="neutral">${reportData.balances_total.asWholeDollars()}</td>
        </tr>`;

      return result;
    })
    .join("");

  const allCalcs = calculations.getAllCalculations();

  tbody.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement|null} */ (
      e.target instanceof HTMLElement ? e.target.closest(".calc-link") : null
    );
    if (!target) return;

    const index = Number(target.dataset.index);
    const action = target.dataset.action;
    if (!action) return;

    const calcObj = allCalcs[index];
    if (!calcObj) return;

    const fn = popupActions[action];
    if (typeof fn === "function") {
      fn(calcObj.reportData);
    } else {
      console.warn(`Popup action '${action}' not registered`);
    }
  });

  // KPIs (Key Performance Indicators)
  const calculation = calculations.getLastCalculation();
  // Find the last age where there's still money, or endAge if money lasts throughout
  const fundedTo =
    calculation.reportData.balances_total > 0
      ? inputs.subjectLifeSpan
      : calculations
          .getAllCalculations()
          .reduce(
            (lastGoodAge, r) =>
              r.reportData.balances_total > 0 ? r.age : lastGoodAge,
            inputs.subjectAge
          );

  const kpiAge = divById("kpiAge");
  if (kpiAge) {
    kpiAge.innerHTML = `${fundedTo} <span class="pill ${
      fundedTo >= inputs.subjectLifeSpan ? "ok" : "alert"
    }">${fundedTo >= inputs.subjectLifeSpan ? "Fully funded" : "Shortfall"}</span>`;
  }

  const kpiEndBal = divById("kpiEndBal");
  if (kpiEndBal) {
    kpiEndBal.textContent = Math.max(
      0,
      calculation.reportData.balances_total
    ).asWholeDollars();
  }

  const kpiDraw = divById("kpiDraw");
  if (kpiDraw) {
    kpiDraw.textContent = `${inputs.subjectRetireAge}`;
  }

  const firstCalculation = calculations.getAllCalculations()[0];
  const kpiTax = divById("kpiTax");
  if (firstCalculation && kpiTax) {
    kpiTax.textContent = `${firstCalculation.reportData.balances_total.asWholeDollars()}`;
  }

  // debugger;
  // Chart (total balance)
  drawChart(
    calculations.getAllCalculations().map((calculation) => ({
      x: calculation.year,
      y: calculation.reportData.balances_total,
      age: calculation.age,
    }))
  );

  // Save rows for export
  // win.__rows = rows;
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
  showHelpToast,
  generateOutputAndSummary,
  doCalculations,
};
