// retirement-calculator.js

// --- Added by patch: 2025 elective deferral limits (401k/Roth 401k) ---
const EMPLOYEE_401K_LIMIT_2025 = 23000; // elective deferral
const EMPLOYEE_401K_CATCHUP_50 = 7500; // catch-up age 50+

// Track previous ages to only regenerate spending fields when they change
let lastRetireAge = null;
let lastEndAge = null;
let lastCurrentAge = null;

const $ = (id) => document.getElementById(id);
const pct = (v) => (isNaN(v) ? 0 : Number(v) / 100);
const num = (id) => Number($(id).value || 0);
const fmt = (n) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
const pow1p = (r, n) => Math.pow(1 + r, n);

/**
 * Effective Tax Rate Table and Standard Deductions
 *
 * This table provides estimated effective federal tax rates for different Taxable Income levels.
 * These rates are based on 2025 tax brackets and include proper
 * standard deduction handling.
 *
 * 2025 Standard Deductions:
 * - Single filers: $15,000 (estimated)
 * - Married filing jointly: $32,600
 *
 * Note: These are simplified estimates and do not account for:
 * - State taxes
 * - Itemized deductions beyond standard deduction
 * - Tax credits
 * - FICA taxes on earned income
 * - Capital gains vs ordinary income distinctions
 * - Additional standard deduction for seniors (65+)
 *
 * For accurate tax planning, consult a tax professional.
 */

// 2025 Standard Deductions
const STANDARD_DEDUCTIONS = {
  single: 15000,
  married: 32600,
};
const EFFECTIVE_TAX_RATES = {
  // Taxable Income: Effective Rate (%) - Based on 2025 Married Filing Jointly Tax Brackets
  // 10%: $0 – $23,200, 12%: $23,200 – $94,300, 22%: $94,300 – $201,050, 24%: $201,050+
  // These rates are applied to Taxable Income (after standard deduction)
  0: 0.0,
  5000: 10.0, // $5,000 × 10% = $500 → 10.0%
  10000: 10.0, // $10,000 × 10% = $1,000 → 10.0%
  15000: 10.0, // $15,000 × 10% = $1,500 → 10.0%
  20000: 10.0, // $20,000 × 10% = $2,000 → 10.0%
  23200: 10.0, // $23,200 × 10% = $2,320 → 10.0%
  30000: 10.5, // $2,320 + $6,800×12% = $3,136 → 10.5%
  40000: 10.8, // $2,320 + $16,800×12% = $4,336 → 10.8%
  50000: 11.1, // $2,320 + $26,800×12% = $5,536 → 11.1%
  60000: 11.2, // $2,320 + $36,800×12% = $6,736 → 11.2%
  70000: 11.3, // $2,320 + $46,800×12% = $7,936 → 11.3%
  74900: 11.4, // $2,320 + $51,700×12% = $8,524 → 11.4% (matches your example)
  80000: 11.4, // $2,320 + $56,800×12% = $9,136 → 11.4%
  90000: 11.5, // $2,320 + $66,800×12% = $10,336 → 11.5%
  94300: 11.5, // $2,320 + $71,100×12% = $10,852 → 11.5%
  100000: 12.1, // $10,852 + $5,700×22% = $12,106 → 12.1%
  110000: 12.7, // $10,852 + $15,700×22% = $14,306 → 13.0%
  120000: 13.5, // $10,852 + $25,700×22% = $16,506 → 13.8%
  130000: 14.1, // $10,852 + $35,700×22% = $18,706 → 14.4%
  140000: 14.9, // $10,852 + $45,700×22% = $20,906 → 14.9%
  150000: 15.5, // $10,852 + $55,700×22% = $23,106 → 15.4%
  160000: 16.0, // $10,852 + $65,700×22% = $25,306 → 15.8%
  170000: 16.4, // $10,852 + $75,700×22% = $27,506 → 16.2%
  180000: 16.9, // $10,852 + $85,700×22% = $29,706 → 16.5%
  190000: 17.3, // $10,852 + $95,700×22% = $31,906 → 16.8%
  200000: 17.6, // $10,852 + $105,700×22% = $34,106 → 17.1%
  201050: 17.7, // $10,852 + $106,750×22% = $34,337 → 17.1%
  220000: 18.1, // $34,337 + $18,950×24% = $38,885 → 17.7%
  240000: 18.5, // $34,337 + $38,950×24% = $43,685 → 18.2%
  260000: 18.9, // $34,337 + $58,950×24% = $48,485 → 18.6%
  280000: 19.2, // $34,337 + $78,950×24% = $53,285 → 19.0%
  300000: 19.5, // $34,337 + $98,950×24% = $58,085 → 19.4%
};

/**
 * Calculate Taxable Income by subtracting standard deduction from gross income
 * @param {number} grossIncome - Total gross income
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Adjusted Gross Income (cannot be negative)
 */
function calculateTaxableIncome(grossIncome, filingStatus = "single") {
  const standardDeduction =
    STANDARD_DEDUCTIONS[filingStatus] || STANDARD_DEDUCTIONS.single;
  return Math.max(0, grossIncome - standardDeduction);
}

/**
 * Calculate effective tax rate for a given Taxable Income using linear interpolation
 * @param {number} taxableIncome - Adjusted Gross Income
 * @returns {number} Effective tax rate as a percentage (0-100)
 */
function getEffectiveTaxRate(taxableIncome) {
  // Handle edge cases
  if (taxableIncome <= 0) return 0;
  if (taxableIncome >= 200000) return EFFECTIVE_TAX_RATES[200000];

  // Find the two closest taxable income levels for interpolation
  const taxableIncomeLevels = Object.keys(EFFECTIVE_TAX_RATES)
    .map(Number)
    .sort((a, b) => a - b);

  // Find exact match
  if (EFFECTIVE_TAX_RATES[taxableIncome] !== undefined) {
    return EFFECTIVE_TAX_RATES[taxableIncome];
  }

  // Find interpolation points
  let lowerAgi = 0;
  let upperAgi = 200000;

  for (let i = 0; i < taxableIncomeLevels.length - 1; i++) {
    if (
      taxableIncome >= taxableIncomeLevels[i] &&
      taxableIncome <= taxableIncomeLevels[i + 1]
    ) {
      lowerAgi = taxableIncomeLevels[i];
      upperAgi = taxableIncomeLevels[i + 1];
      break;
    }
  }

  // Linear interpolation
  const lowerRate = EFFECTIVE_TAX_RATES[lowerAgi];
  const upperRate = EFFECTIVE_TAX_RATES[upperAgi];
  const ratio = (taxableIncome - lowerAgi) / (upperAgi - lowerAgi);

  return lowerRate + (upperRate - lowerRate) * ratio;
}

/**
 * Calculate effective tax rate for married filing jointly (approximately 2x the single brackets)
 * @param {number} taxableIncome - Adjusted Gross Income for married couple
 * @returns {number} Effective tax rate as a percentage (0-100)
 */
function getEffectiveTaxRateMarried(taxableIncome) {
  // For married filing jointly, use the same rates as single but on the full Taxable Income
  // The standard deduction is already doubled in calculateTaxableIncome()
  // The tax brackets for MFJ are roughly 2x single brackets, so rates are similar
  return getEffectiveTaxRate(taxableIncome);
}

/**
 * Get tax amount based on gross income and filing status
 * @param {number} grossIncome - Total gross income before standard deduction
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Estimated federal tax amount
 */
function calculateFederalTax(grossIncome, filingStatus = "single") {
  // First calculate Taxable Income by subtracting standard deduction
  const taxableIncome = calculateTaxableIncome(grossIncome, filingStatus);

  // Then get effective rate based on Taxable Income
  const effectiveRate =
    filingStatus === "married"
      ? getEffectiveTaxRateMarried(taxableIncome)
      : getEffectiveTaxRate(taxableIncome);

  // Tax is calculated on the Taxable Income, not gross income
  return taxableIncome * (effectiveRate / 100);
}

/**
 * Get marginal tax rate estimate for additional income
 * @param {number} currentGrossIncome - Current gross income
 * @param {number} additionalIncome - Additional income to evaluate
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Estimated marginal tax rate as percentage
 */
function getMarginalTaxRate(
  currentGrossIncome,
  additionalIncome = 1000,
  filingStatus = "single"
) {
  const currentTax = calculateFederalTax(currentGrossIncome, filingStatus);
  const newTax = calculateFederalTax(
    currentGrossIncome + additionalIncome,
    filingStatus
  );

  return ((newTax - currentTax) / additionalIncome) * 100;
}

/**
 * Display tax calculation examples for reference
 * @param {string} filingStatus - 'single' or 'married'
 */
function displayTaxExamples(filingStatus = "single") {
  // console.log(`\n=== Tax Rate Examples (${filingStatus} filer) ===`);
  // console.log(`Standard Deduction: $${STANDARD_DEDUCTIONS[filingStatus].toLocaleString()}`);
  const testGrossIncomes = [25000, 50000, 75000, 100000, 150000, 200000];

  testGrossIncomes.forEach((grossIncome) => {
    const taxableIncome = calculateTaxableIncome(grossIncome, filingStatus);
    const effectiveRate =
      filingStatus === "married"
        ? getEffectiveTaxRateMarried(taxableIncome)
        : getEffectiveTaxRate(taxableIncome);
    const taxAmount = calculateFederalTax(grossIncome, filingStatus);
    const marginalRate = getMarginalTaxRate(grossIncome, 1000, filingStatus);

    // console.log(`Gross $${grossIncome.toLocaleString()} → Taxable Income $${taxableIncome.toLocaleString()}: Effective ${effectiveRate.toFixed(1)}%, Tax $${Math.round(taxAmount).toLocaleString()}, Marginal ${marginalRate.toFixed(1)}%`);
  });
  // console.log("=================================\n");
}

// Social Security taxation calculation based on provisional income
function calculateSSTaxableAmount(
  ssGross,
  otherTaxableIncome,
  isMarried = false
) {
  if (ssGross <= 0) return 0;

  // Calculate provisional income: Taxable Income + non-taxable interest + 50% of SS benefits
  // For simplicity, we'll assume no non-taxable interest
  const provisionalIncome = otherTaxableIncome + ssGross * 0.5;

  // Set thresholds based on filing status
  const threshold1 = isMarried ? 32000 : 25000; // 0% to 50% transition
  const threshold2 = isMarried ? 44000 : 34000; // 50% to 85% transition

  let taxableAmount = 0;

  if (provisionalIncome <= threshold1) {
    // No SS benefits are taxable
    taxableAmount = 0;
  } else if (provisionalIncome <= threshold2) {
    // Up to 50% of SS benefits are taxable
    const excessIncome = provisionalIncome - threshold1;
    taxableAmount = Math.min(ssGross * 0.5, excessIncome * 0.5);
  } else {
    // Up to 85% of SS benefits are taxable
    // First calculate tier 1 amount (same as if we were in tier 1)
    const tier1ExcessIncome = threshold2 - threshold1; // Full range of tier 1
    const tier1Max = Math.min(ssGross * 0.5, tier1ExcessIncome * 0.5);

    // Then calculate tier 2 amount
    const tier2ExcessIncome = provisionalIncome - threshold2;
    const tier2Amount = Math.min(ssGross * 0.35, tier2ExcessIncome * 0.85); // Additional 35% (85% - 50%)

    taxableAmount = Math.min(ssGross * 0.85, tier1Max + tier2Amount);
  }

  return taxableAmount;
}

// Required Minimum Distribution (RMD) calculation
// Based on IRS Uniform Lifetime Table for 2024+
function calculateRMD(age, accountBalance) {
  if (age < 73 || accountBalance <= 0) return 0;

  // IRS Uniform Lifetime Table (simplified version for common ages)
  const lifeFactor = {
    73: 26.5,
    74: 25.5,
    75: 24.6,
    76: 23.7,
    77: 22.9,
    78: 22.0,
    79: 21.1,
    80: 20.2,
    81: 19.4,
    82: 18.5,
    83: 17.7,
    84: 16.8,
    85: 16.0,
    86: 15.2,
    87: 14.4,
    88: 13.7,
    89: 12.9,
    90: 12.2,
    91: 11.5,
    92: 10.8,
    93: 10.1,
    94: 9.5,
    95: 8.9,
    96: 8.4,
    97: 7.8,
    98: 7.3,
    99: 6.8,
    100: 6.4,
  };

  // For ages beyond 100, use declining factors
  let factor;
  if (age <= 100) {
    factor = lifeFactor[age] || lifeFactor[100];
  } else {
    // Linear decline after 100
    factor = Math.max(1.0, lifeFactor[100] - (age - 100) * 0.1);
  }

  return accountBalance / factor;
}

// Helper function to create reusable help icon
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
let currentToast = null;
let currentProgressBar = null;
let toastTimer = null;
let progressTimer = null;

function showHelpToast(event, fieldId) {
  // Prevent the click from bubbling up to document
  event.stopPropagation();

  const helpTexts = {
    currentAge: {
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
    spouseAge: {
      title: "Spouse Current Age",
      body: "Your spouse's current age in years. Set to 0 if you don't have a spouse. This affects Social Security and pension benefit calculations.",
    },
    spouseRetireAge: {
      title: "Spouse Retirement Age",
      body: "The age at which your spouse plans to retire. This determines when spouse income sources will begin or end.",
    },
    salary: {
      title: "Current Salary",
      body: "Your current annual gross salary before taxes and deductions. This is used to calculate retirement contributions and employer matching.",
    },
    salaryGrowth: {
      title: "Salary Growth Rate",
      body: "The expected annual percentage increase in your salary. This affects future contribution amounts and employer matching over time.",
    },
    pretaxPct: {
      title: "Pre-tax Contribution Rate",
      body: "The percentage of your salary contributed to pre-tax retirement accounts like traditional 401(k) or IRA. These reduce current taxes but are taxed in retirement.",
    },
    rothPct: {
      title: "Roth Contribution Rate",
      body: "The percentage of your salary contributed to Roth accounts. These are made with after-tax dollars but grow tax-free and are not taxed in retirement.",
    },
    taxablePct: {
      title: "Taxable Savings Rate",
      body: "The percentage of your salary saved in regular taxable investment accounts. These provide flexibility but don't have tax advantages. Note: Interest and dividends earned on these accounts are included in your taxable income each year during working years.",
    },
    matchCap: {
      title: "Employer Match Cap",
      body: "The maximum percentage of salary that your employer will match. For example, if your employer matches up to 4% of salary.",
    },
    matchRate: {
      title: "Employer Match Rate",
      body: "The percentage rate at which your employer matches contributions. For example, 50% means they contribute $0.50 for every $1.00 you contribute.",
    },
    balPre: {
      title: "Pre-tax Balance",
      body: "Your current balance in pre-tax retirement accounts like traditional 401(k), 403(b), or traditional IRA.",
    },
    balRoth: {
      title: "Roth Balance",
      body: "Your current balance in Roth retirement accounts like Roth 401(k) or Roth IRA. These grow tax-free.",
    },
    balSavings: {
      title: "Taxable Balance",
      body: "Your current balance in regular taxable investment accounts like brokerage accounts, savings, or CDs.",
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
    useAgiTax: {
      title: "Taxable Income-Based Tax Calculation",
      body: "When enabled, uses a progressive tax table based on Adjusted Gross Income (gross income minus standard deduction) for pre-tax withdrawals and pension income. Uses 2025 standard deductions: $15,000 (single) / $32,600 (married). This typically results in more accurate tax rates than fixed percentages, especially for larger withdrawal amounts. Check the browser console for detailed calculations showing gross income → Taxable Income → tax rates.",
    },
    filingStatus: {
      title: "Tax Filing Status",
      body: "Your tax filing status affects Social Security taxation thresholds and Taxable Income-based tax calculations. Single filers have lower thresholds for SS taxation than married filing jointly.",
    },
    useSSRules: {
      title: "Proper Social Security Taxation",
      body: "When enabled, uses actual IRS rules for Social Security taxation based on 'provisional income' rather than simple fixed percentages. SS taxation depends on your total income and can range from 0% to 85% of benefits being taxable.",
    },
    useRMD: {
      title: "Required Minimum Distribution Rules",
      body: "When enabled, enforces mandatory withdrawals from pre-tax retirement accounts (401k, traditional IRA) starting at age 73. RMD amounts are calculated based on IRS life expectancy tables and account balances. These withdrawals are required by law and failure to take them results in significant penalties.",
    },
  };

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
  currentProgressBar = progressBar;

  // Show toast with animation
  progressTimer = setTimeout(() => {
    toast.classList.add("show");

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

// Event listeners for dismissing toast
document.addEventListener("click", (e) => {
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
    calc();
  }
});

// Annual Spending Details Functions
function regenerateSpendingFields() {
  const retireAge = num("retireAge");
  const endAge = num("endAge");

  // Only generate if ages are valid
  if (retireAge <= 0 || endAge <= retireAge) {
    return;
  }

  const grid = document.getElementById("spendingDetailsGrid");
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
    const field = document.getElementById(`spending_${age}`);
    field.addEventListener("blur", (event) =>
      handleSpendingFieldChange(age, event)
    );
  }
}

function getSpendingOverride(age) {
  const field = document.getElementById(`spending_${age}`);
  if (field && field.value && !isNaN(field.value)) {
    const useCurrentYear = document.getElementById(
      "useCurrentYearValues"
    ).checked;
    const fieldValue = Number(field.value);

    // console.log(`getSpendingOverride(${age}): fieldValue=${fieldValue}, useCurrentYear=${useCurrentYear}`);

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValue)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToSpendingValue(
          Number(storedCurrentYearValue),
          age
        );
        // console.log(`  Using stored current year value ${storedCurrentYearValue} → inflated ${inflatedValue}`);
        return inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToSpendingValue(fieldValue, age);
        // console.log(`  Using field value as current year ${fieldValue} → inflated ${inflatedValue}`);
        return inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      // console.log(`  Using field value as future dollars: ${fieldValue}`);
      return fieldValue;
    }
  }
  // console.log(`getSpendingOverride(${age}): No override (field empty or invalid)`);
  return null; // No override specified
}

function setSpendingFieldValue(age, value) {
  const field = document.getElementById(`spending_${age}`);
  if (field) {
    field.placeholder = `Auto`;
  }
}

function applyInflationToSpendingValue(currentYearValue, targetAge) {
  if (!currentYearValue) return 0;
  const currentAge = parseInt(document.getElementById("currentAge").value) || 0;
  const yearsFromNow = targetAge - currentAge;
  const inflationRate =
    parseFloat(document.getElementById("inflation").value) / 100 || 0.025;
  return currentYearValue * Math.pow(1 + inflationRate, yearsFromNow);
}

function handleSpendingFieldChange(age, event) {
  const useCurrentYear = document.getElementById(
    "useCurrentYearValues"
  ).checked;
  const inputValue = parseFloat(event.target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    // The user sees what they typed, but we store it for inflation calculation
    event.target.setAttribute("data-current-year-value", inputValue);

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToSpendingValue(inputValue, age);
    event.target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    event.target.removeAttribute("data-current-year-value");
    event.target.removeAttribute("title");
  }

  // Trigger recalculation
  calc();
}

function updateSpendingFieldsDisplayMode() {
  const useCurrentYear = document.getElementById(
    "useCurrentYearValues"
  ).checked;
  const retireAge = num("retireAge");
  const endAge = num("endAge");

  if (retireAge <= 0 || endAge <= retireAge) return;

  for (let age = retireAge; age <= endAge; age++) {
    const field = document.getElementById(`spending_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value")) || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        // When switching to current year mode, assume the current field value
        // is already in current year dollars (user entered it as such)
        // Store it as the current year value without conversion
        field.setAttribute("data-current-year-value", currentValue);
      }

      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(field.value)) {
        const displayValue = parseFloat(field.value);
        const inflatedValue = applyInflationToSpendingValue(displayValue, age);
        field.setAttribute(
          "title",
          `Current year value: $${displayValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
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

  calc();
}

// Taxable Income Adjustments Functions
function regenerateTaxableIncomeFields() {
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  // Only generate if ages are valid
  if (currentAge <= 0 || endAge <= currentAge) {
    return;
  }

  const grid = document.getElementById("taxableIncomeDetailsGrid");
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
    const field = document.getElementById(`taxableIncome_${age}`);
    field.addEventListener("blur", (event) =>
      handleTaxableIncomeFieldChange(age, event)
    );
  }
}

function getTaxableIncomeOverride(age) {
  const field = document.getElementById(`taxableIncome_${age}`);
  if (field && field.value && !isNaN(field.value)) {
    const useCurrentYear = document.getElementById(
      "useTaxableCurrentYearValues"
    ).checked;
    const fieldValue = Number(field.value);

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValue)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(
          Number(storedCurrentYearValue),
          age
        );
        return inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(fieldValue, age);
        return inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      return fieldValue;
    }
  }
  return 0; // Default to 0 if no override specified
}

function handleTaxableIncomeFieldChange(age, event) {
  const useCurrentYear = document.getElementById(
    "useTaxableCurrentYearValues"
  ).checked;
  const inputValue = parseFloat(event.target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    event.target.setAttribute("data-current-year-value", inputValue);

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToIncomeValue(inputValue, age);
    event.target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    event.target.removeAttribute("data-current-year-value");
    event.target.removeAttribute("title");
  }

  // Trigger recalculation
  calc();
}

function updateTaxableIncomeFieldsDisplayMode() {
  const useCurrentYear = document.getElementById(
    "useTaxableCurrentYearValues"
  ).checked;
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  if (currentAge <= 0 || endAge <= currentAge) return;

  for (let age = currentAge; age <= endAge; age++) {
    const field = document.getElementById(`taxableIncome_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value")) || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        field.setAttribute("data-current-year-value", currentValue);
      }

      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(field.value)) {
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

  calc();
}

// Tax-free Income Adjustments Functions
function regenerateTaxFreeIncomeFields() {
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  // Only generate if ages are valid
  if (currentAge <= 0 || endAge <= currentAge) {
    return;
  }

  const grid = document.getElementById("taxFreeIncomeDetailsGrid");
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
    const field = document.getElementById(`taxFreeIncome_${age}`);
    field.addEventListener("blur", (event) =>
      handleTaxFreeIncomeFieldChange(age, event)
    );
  }
}

function getTaxFreeIncomeOverride(age) {
  const field = document.getElementById(`taxFreeIncome_${age}`);
  if (field && field.value && !isNaN(field.value)) {
    const useCurrentYear = document.getElementById(
      "useTaxFreeCurrentYearValues"
    ).checked;
    const fieldValue = Number(field.value);

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValue)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(
          Number(storedCurrentYearValue),
          age
        );
        return inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(fieldValue, age);
        return inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      return fieldValue;
    }
  }
  return 0; // Default to 0 if no override specified
}

function handleTaxFreeIncomeFieldChange(age, event) {
  const useCurrentYear = document.getElementById(
    "useTaxFreeCurrentYearValues"
  ).checked;
  const inputValue = parseFloat(event.target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    event.target.setAttribute("data-current-year-value", inputValue);

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToIncomeValue(inputValue, age);
    event.target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    event.target.removeAttribute("data-current-year-value");
    event.target.removeAttribute("title");
  }

  // Trigger recalculation
  calc();
}

function updateTaxFreeIncomeFieldsDisplayMode() {
  const useCurrentYear = document.getElementById(
    "useTaxFreeCurrentYearValues"
  ).checked;
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  if (currentAge <= 0 || endAge <= currentAge) return;

  for (let age = currentAge; age <= endAge; age++) {
    const field = document.getElementById(`taxFreeIncome_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value")) || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        field.setAttribute("data-current-year-value", currentValue);
      }

      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(field.value)) {
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

  calc();
}

// Helper function for income inflation (similar to spending inflation)
function applyInflationToIncomeValue(currentYearValue, targetAge) {
  if (!currentYearValue) return 0;
  const currentAge = parseInt(document.getElementById("currentAge").value) || 0;
  const yearsFromNow = targetAge - currentAge;
  const inflationRate =
    parseFloat(document.getElementById("inflation").value) / 100 || 0.025;
  return currentYearValue * Math.pow(1 + inflationRate, yearsFromNow);
}

function loadExample() {
  const ex = {
    currentAge: 60,
    retireAge: 62,
    endAge: 90,
    inflation: 0.0,
    spendingToday: 100000,
    spendingDecline: 0.0,
    spouseAge: 56,
    spouseRetireAge: 62,
    spouseSsMonthly: 1000,
    spouseSsStart: 62,
    spouseSsCola: 0.0,
    spousePenMonthly: 500,
    spousePenStart: 65,
    spousePenCola: 0,
    spouseTaxSS: 10,
    spouseTaxPension: 20,
    salary: 174500,
    salaryGrowth: 2.0,
    pretaxPct: 0,
    rothPct: 0,
    taxablePct: 35,
    matchCap: 0,
    matchRate: 0,
    balPre: 600000,
    balRoth: 0,
    balSavings: 500000,
    retPre: 3.0,
    retRoth: 0.0,
    retTax: 3.0,
    ssMonthly: 2500,
    ssStart: 62,
    ssCola: 2.5,
    penMonthly: 3500,
    penStart: 65,
    penCola: 0,
    taxPre: 15,
    taxTaxable: 0,
    taxRoth: 0,
    taxSS: 10,
    taxPension: 15,
    order: "taxable,pretax,roth",
    filingStatus: "married",
    useAgiTax: true,
    useSSRules: true,
    useRMD: true,
  };
  // const ex = {
  //   currentAge: 60,
  //   retireAge: 62,
  //   endAge: 90,
  //   inflation: 2.5,
  //   spendingToday: 95000,
  //   spendingDecline: 1.0,
  //   spouseAge: 56,
  //   spouseRetireAge: 62,
  //   spouseSsMonthly: 1000,
  //   spouseSsStart: 62,
  //   spouseSsCola: 0.0,
  //   spousePenMonthly: 500,
  //   spousePenStart: 65,
  //   spousePenCola: 0,
  //   spouseTaxSS: 10,
  //   spouseTaxPension: 20,
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
  //   useAgiTax: true,
  //   useSSRules: true,
  //   useRMD: true,
  // };
  // const ex = {
  //   currentAge:55, retireAge:65, endAge:85, inflation:2.5, spendingToday:60000, spendingDecline:1.0,
  //   spouseAge:52, spouseRetireAge:62, spouseSsMonthly:1000, spouseSsStart:62, spouseSsCola:2.0,
  //   spousePenMonthly:500, spousePenStart:65, spousePenCola:0, spouseTaxSS:10, spouseTaxPension:20,
  //   salary:100000, salaryGrowth:3.0, pretaxPct:10, rothPct:5, taxablePct:5,
  //   matchCap:4, matchRate:50, balPre:300000, balRoth:100000, balSavings:50000,
  //   retPre:6.0, retRoth:6.0, retTax:5.5, ssMonthly:2500, ssStart:67, ssCola:2.0,
  //   penMonthly:0, penStart:65, penCola:0, taxPre:22, taxTaxable:10, taxRoth:0,
  //   taxSS:10, taxPension:20, order:'taxable,pretax,roth'
  // };
  // const ex = {
  //   currentAge: 54, retireAge: 55, endAge: 85,
  //   inflation: 0.0, spendingToday: 50000, spendingDecline: 0.0,
  //   spouseAge: 52, spouseRetireAge: 62, spouseSsMonthly: 0, spouseSsStart: 62, spouseSsCola: 2.0,
  //   spousePenMonthly: 0, spousePenStart: 65, spousePenCola: 0, spouseTaxSS: 10, spouseTaxPension: 20,
  //   salary: 0, salaryGrowth: 3.0, pretaxPct: 10, rothPct: 5, taxablePct: 5,
  //   matchCap: 4, matchRate: 50, balPre: 1000000, balRoth: 0, balSavings: 0,
  //   retPre: 0.0, retRoth: 0.0, retTax: 0.0,
  //   ssMonthly: 0, ssStart: 67, ssCola: 2.0,
  //   penMonthly: 0, penStart: 65, penCola: 0,
  //   taxPre: 0, taxTaxable: 0, taxRoth: 0,
  //   taxSS: 0, taxPension: 0, order: 'pretax,roth,taxable'
  // };
  for (const [k, v] of Object.entries(ex)) {
    if ($(k)) $(k).value = v;
  }
}

function resetAll() {
  document
    .querySelectorAll("input")
    .forEach((i) => (i.value = i.defaultValue ?? ""));
  $("order").value = "taxable,pretax,roth";
  $("filingStatus").value = "single";

  // Clear spending override fields
  const grid = document.getElementById("spendingDetailsGrid");
  grid.innerHTML = "";

  // Clear income adjustment fields
  const taxableGrid = document.getElementById("taxableIncomeDetailsGrid");
  taxableGrid.innerHTML = "";
  const taxFreeGrid = document.getElementById("taxFreeIncomeDetailsGrid");
  taxFreeGrid.innerHTML = "";

  $("rows").innerHTML = "";
  $("kpiAge").textContent = "—";
  $("kpiEndBal").textContent = "—";
  $("kpiDraw").textContent = "—";
  $("kpiTax").textContent = "—";
  drawChart([]);
}

/**
 * Parse and validate input parameters for the retirement calculation
 */
function parseInputParameters() {
  // Basic parameters
  const params = {
    currentAge: num("currentAge"),
    retireAge: num("retireAge"),
    endAge: num("endAge"),
    inflation: pct(num("inflation")),
    spendingToday: num("spendingToday"),
    spendingDecline: pct(num("spendingDecline")),

    // Spouse information
    spouseAge: num("spouseAge"),
    spouseRetireAge: num("spouseRetireAge"),
    spouseSsMonthly: num("spouseSsMonthly"),
    spouseSsStart: num("spouseSsStart"),
    spouseSsCola: pct(num("spouseSsCola")),
    spousePenMonthly: num("spousePenMonthly"),
    spousePenStart: num("spousePenStart"),
    spousePenCola: pct(num("spousePenCola")),
    spouseTaxSS: pct(num("spouseTaxSS")),
    spouseTaxPension: pct(num("spouseTaxPension")),

    // Employment and contributions
    startingSalary: num("salary"),
    salaryGrowth: pct(num("salaryGrowth")),
    pretaxPct: pct(num("pretaxPct")),
    rothPct: pct(num("rothPct")),
    taxablePct: pct(num("taxablePct")),
    matchCap: pct(num("matchCap")),
    matchRate: pct(num("matchRate")),

    // Account balances and returns
    balPre: num("balPre"),
    balRoth: num("balRoth"),
    balSavings: num("balSavings"),
    retPre: pct(num("retPre")),
    retRoth: pct(num("retRoth")),
    retTax: pct(num("retTax")),

    // Income sources
    ssMonthly: num("ssMonthly"),
    ssStart: num("ssStart"),
    ssCola: pct(num("ssCola")),
    penMonthly: num("penMonthly"),
    penStart: num("penStart"),
    penCola: pct(num("penCola")),

    // Tax rates and settings
    taxPre: pct(num("taxPre")),
    taxTaxable: pct(num("taxTaxable")),
    taxRoth: pct(num("taxRoth")),
    taxSS: pct(num("taxSS")),
    taxPension: pct(num("taxPension")),
    filingStatus: $("filingStatus").value,
    useAgiTax: $("useAgiTax").checked,
    useSSRules: $("useSSRules").checked,
    useRMD: $("useRMD").checked,
  };

  // Parse withdrawal order
  params.order = $("order")
    .value.split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (params.order.length === 0) {
    params.order = ["taxable", "pretax", "roth"];
    // console.log('Using fallback withdrawal order:', params.order);
  }

  // Derived values
  params.hasSpouse = params.spouseAge > 0;
  params.yearsToRetire = params.retireAge - params.currentAge;
  params.yearsTotal = params.endAge - params.currentAge;
  params.spendAtRetire =
    params.spendingToday * pow1p(params.inflation, params.yearsToRetire);

  return params;
}

/**
 * Validate that the input parameters are valid
 */
function validateInputs(params) {
  if (
    params.retireAge <= params.currentAge ||
    params.endAge <= params.retireAge
  ) {
    showToast(
      "Invalid Ages",
      "Please ensure: current age < retirement age < plan age.",
      "error"
    );
    return false;
  }
  return true;
}

/**
 * Calculate one year of accumulation phase (working years)
 */
function calculateWorkingYearData(params, year, salary, balances) {
  const age = params.currentAge + year;

  // Calculate current year living expenses (retirement spending adjusted to current year)
  const currentYearSpending =
    params.spendingToday * pow1p(params.inflation, year);

  // Desired contributions this year
  let desiredPre = salary * params.pretaxPct;
  let desiredRoth = salary * params.rothPct;

  // 401k/Roth 401k elective deferral cap (employee-only)
  let electiveLimit =
    EMPLOYEE_401K_LIMIT_2025 + (age >= 50 ? EMPLOYEE_401K_CATCHUP_50 : 0);
  const totalDesired = desiredPre + desiredRoth;
  let scale = totalDesired > 0 ? Math.min(1, electiveLimit / totalDesired) : 1;
  const cPre = desiredPre * scale;
  const cRoth = desiredRoth * scale;

  // Employer match based on actual pre-tax contribution %, capped by matchCap
  const actualPrePct = salary > 0 ? cPre / salary : 0;
  const match =
    Math.min(actualPrePct, params.matchCap) * salary * params.matchRate;

  // Calculate taxes on working income including taxable interest
  const taxableInterestIncome = balances.balSavings * params.retTax;

  // Get taxable income adjustments for this age
  const taxableIncomeAdjustment = getTaxableIncomeOverride(age);

  let grossTaxableIncome =
    salary - cPre + taxableInterestIncome + taxableIncomeAdjustment;

  const workingYearTaxes = params.useAgiTax
    ? calculateFederalTax(grossTaxableIncome, params.filingStatus)
    : grossTaxableIncome * params.taxPre;

  // Debug tax calculation for first few years
  if (year < 3) {
    // console.log(`\n=== WORKING YEAR TAX DEBUG (Year ${year + 1}, Age ${age}) ===`);
    // console.log(`Salary: ${fmt(salary)}`);
    // console.log(`Pre-tax contributions: ${fmt(cPre)}`);
    // console.log(`Taxable balance (start of year): ${fmt(balances.balSavings)}`);
    // console.log(`Taxable interest income: ${fmt(taxableInterestIncome)}`);
    // console.log(`Gross Taxable Income: ${fmt(grossTaxableIncome)}`);
    // console.log(`Filing Status: ${params.filingStatus}`);
    // console.log(`Use Taxable Income Tax: ${params.useAgiTax}`);
    if (params.useAgiTax) {
      const taxableIncomeAfterDeduction = calculateTaxableIncome(
        grossTaxableIncome,
        params.filingStatus
      );
      const effectiveRate =
        params.filingStatus === "married"
          ? getEffectiveTaxRateMarried(taxableIncomeAfterDeduction)
          : getEffectiveTaxRate(taxableIncomeAfterDeduction);
      // console.log(`Taxable Income (after standard deduction): ${fmt(taxableIncomeAfterDeduction)}`);
      // console.log(`Effective Tax Rate: ${effectiveRate.toFixed(1)}%`);
      // console.log(`Calculated Federal Tax: ${fmt(workingYearTaxes)}`);
    } else {
      // console.log(`Using fixed tax rate: ${(params.taxPre * 100).toFixed(1)}%`);
      // console.log(`Calculated Tax: ${fmt(workingYearTaxes)}`);
    }
    // console.log(`=== END TAX DEBUG ===\n`);
  }

  // After-tax income calculations
  // Total gross income includes salary plus additional taxable income
  const totalGrossIncome = salary + taxableIncomeAdjustment;
  const afterTaxIncome = totalGrossIncome - cPre - workingYearTaxes - cRoth;
  const availableForSpendingAndSavings = afterTaxIncome;
  const remainingAfterSpending = Math.max(
    0,
    availableForSpendingAndSavings - currentYearSpending
  );
  const desiredTaxableSavings = salary * params.taxablePct;
  const cTax = Math.min(desiredTaxableSavings, remainingAfterSpending);

  // Debug working year calculations (show for first few years)
  if (year < 3) {
    // console.log(`Working Year ${year + 1} (Age ${age}):`);
    // console.log(`  Salary: ${fmt(salary)}`);
    // console.log(`  Pre-tax contrib: ${fmt(cPre)} | Roth contrib: ${fmt(cRoth)}`);
    // console.log(`  Taxable interest income: ${fmt(taxableInterestIncome)}`);
    // console.log(`  Gross taxable income: ${fmt(grossTaxableIncome)} | Taxes: ${fmt(workingYearTaxes)}`);
    // console.log(`  After-tax income: ${fmt(afterTaxIncome)}`);
    // console.log(`  Living expenses: ${fmt(currentYearSpending)}`);
    // console.log(`  Remaining for savings: ${fmt(remainingAfterSpending)}`);
    // console.log(`  Desired taxable savings: ${fmt(desiredTaxableSavings)} | Actual: ${fmt(cTax)}`);
    if (cTax < desiredTaxableSavings) {
      // console.log(`  ⚠️ Savings limited by available income (shortfall: ${fmt(desiredTaxableSavings - cTax)})`);
    }
  }

  // Update balances
  // Get tax-free income adjustments for this age
  const taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age);

  // Track savings breakdown for working years
  const savingsStartBalance = balances.balSavings;
  const taxableInterestEarned = balances.balSavings * params.retTax;

  balances.balPre = (balances.balPre + cPre + match) * (1 + params.retPre);
  balances.balRoth = (balances.balRoth + cRoth) * (1 + params.retRoth);
  balances.balSavings =
    (balances.balSavings + cTax + taxFreeIncomeAdjustment) *
    (1 + params.retTax);

  return {
    age,
    salary,
    contrib: cPre + cRoth + cTax + match,
    ss: 0,
    pen: 0,
    spouseSs: 0,
    spousePen: 0,
    spend: currentYearSpending,
    wNet: 0,
    wGross: 0,
    w401kGross: 0,
    wSavingsGross: 0,
    wRothGross: 0,
    taxes: workingYearTaxes,
    ssTaxes: 0,
    otherTaxes: workingYearTaxes,
    nonTaxableIncome: taxFreeIncomeAdjustment, // Tax-free income adjustment
    taxableIncome: calculateTaxableIncome(
      grossTaxableIncome,
      params.filingStatus
    ), // Working year taxable income after standard deduction
    taxableInterest: taxableInterestIncome, // Track taxable interest earned
    totalIncome: totalGrossIncome + taxableInterestIncome, // Total income for working years including adjustments
    totalNetIncome: afterTaxIncome + taxFreeIncomeAdjustment, // Net income including tax-free adjustments
    totalGrossIncome: totalGrossIncome + taxableInterestIncome, // Gross income for working years including adjustments
    effectiveTaxRate:
      calculateTaxableIncome(grossTaxableIncome, params.filingStatus) > 0
        ? (workingYearTaxes /
            calculateTaxableIncome(grossTaxableIncome, params.filingStatus)) *
          100
        : 0,
    balSavings: balances.balSavings,
    balPre: balances.balPre,
    balRoth: balances.balRoth,
    total: balances.balSavings + balances.balPre + balances.balRoth,
    // Add savings breakdown data for popup
    savingsBreakdown: {
      startingBalance: savingsStartBalance,
      withdrawals: 0, // No withdrawals during working years
      overageDeposit: 0, // No overage during working years
      taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
      regularDeposit: cTax, // Regular taxable savings contribution
      interestEarned: taxableInterestEarned,
      endingBalance: balances.balSavings,
      growthRate: params.retTax * 100,
    },
    // Add empty SS breakdown for working years
    ssBreakdown: {
      ssGross: 0,
      ssTaxableAmount: 0,
      ssNonTaxable: 0,
      ssTaxes: 0,
    },
  };
}

// Global variable to store calculations for popup access
let calculations = [];

function calc() {
  // Enhanced retirement calculator with realistic working year modeling
  const params = parseInputParameters();

  if (!validateInputs(params)) {
    return;
  }

  // Auto-regenerate spending override fields only if ages have changed
  if (
    params.retireAge > 0 &&
    params.endAge > params.retireAge &&
    (lastRetireAge !== params.retireAge || lastEndAge !== params.endAge)
  ) {
    regenerateSpendingFields();
    lastRetireAge = params.retireAge;
    lastEndAge = params.endAge;
  }

  // Auto-regenerate income adjustment fields only if ages have changed
  if (
    params.currentAge > 0 &&
    params.endAge > params.currentAge &&
    (lastCurrentAge !== params.currentAge || lastEndAge !== params.endAge)
  ) {
    regenerateTaxableIncomeFields();
    regenerateTaxFreeIncomeFields();
    lastCurrentAge = params.currentAge;
  }

  // Display enhanced tax calculation examples
  if (params.useAgiTax) {
    displayTaxExamples(params.filingStatus);
  }

  // Initialize balances object for tracking
  const balances = {
    balPre: params.balPre,
    balRoth: params.balRoth,
    balSavings: params.balSavings,
  };

  // Reset calculations array
  calculations = [];

  let currentSalary = params.startingSalary;
  let totalTaxes = 0;
  let maxDrawdown = { year: null, value: Infinity };

  // Working years
  for (let y = 0; y < params.yearsToRetire; y++) {
    const yearData = calculateWorkingYearData(
      params,
      y,
      currentSalary,
      balances
    );

    calculations.push({
      year: new Date().getFullYear() + y,
      ...yearData,
    });

    // Track total taxes paid during working years
    totalTaxes += yearData.taxes;

    // Update salary for next year
    currentSalary *= 1 + params.salaryGrowth;
  }

  // console.log('Working years: ', calculations);

  /**
   * Calculate spouse benefit amounts at the time of primary person's retirement
   */
  function calculateSpouseBenefits(params) {
    let spouseSsAnnual = 0;
    let spousePenAnnual = 0;

    if (params.hasSpouse) {
      const spouseCurrentYear = params.retireAge - params.currentAge; // Years from now when primary person retires
      const spouseAgeAtPrimaryRetirement = params.spouseAge + spouseCurrentYear;

      spouseSsAnnual =
        params.spouseSsMonthly *
        12 *
        (spouseAgeAtPrimaryRetirement >= params.spouseSsStart
          ? pow1p(
              params.spouseSsCola,
              spouseAgeAtPrimaryRetirement - params.spouseSsStart
            )
          : 1);
      spousePenAnnual =
        params.spousePenMonthly *
        12 *
        (spouseAgeAtPrimaryRetirement >= params.spousePenStart
          ? pow1p(
              params.spousePenCola,
              spouseAgeAtPrimaryRetirement - params.spousePenStart
            )
          : 1);
    }

    return { spouseSsAnnual, spousePenAnnual };
  }

  /**
   * Calculate Social Security taxation for a given year
   */
  function calculateSocialSecurityTaxation(
    params,
    ssGross,
    totalTaxableIncome
  ) {
    if (!ssGross || ssGross <= 0) {
      return {
        ssNet: 0,
        ssTaxableAmount: 0,
        ssNonTaxable: 0,
        ssTaxes: 0,
        calculationDetails: {
          provisionalIncome: 0,
          threshold1: 0,
          threshold2: 0,
          tier1Amount: 0,
          tier2Amount: 0,
          method: "none",
        },
      };
    }

    const isMarried = params.filingStatus === "married";

    if (params.useSSRules) {
      // Use proper SS taxation rules based on provisional income
      // Calculate provisional income: Taxable Income + non-taxable interest + 50% of SS benefits
      const provisionalIncome = totalTaxableIncome + ssGross * 0.5;

      // Set thresholds based on filing status
      const threshold1 = isMarried ? 32000 : 25000; // 0% to 50% transition
      const threshold2 = isMarried ? 44000 : 34000; // 50% to 85% transition

      let ssTaxableAmount = 0;
      let tier1Amount = 0;
      let tier2Amount = 0;

      if (provisionalIncome <= threshold1) {
        // No SS benefits are taxable
        ssTaxableAmount = 0;
        tier1Amount = 0;
        tier2Amount = 0;
      } else if (provisionalIncome <= threshold2) {
        // Up to 50% of SS benefits are taxable
        const excessIncome = provisionalIncome - threshold1;
        tier1Amount = Math.min(ssGross * 0.5, excessIncome * 0.5);
        tier2Amount = 0;
        ssTaxableAmount = tier1Amount;
      } else {
        // Up to 85% of SS benefits are taxable
        // First calculate tier 1 amount (same as if we were in tier 1)
        const tier1ExcessIncome = threshold2 - threshold1; // Full range of tier 1
        tier1Amount = Math.min(ssGross * 0.5, tier1ExcessIncome * 0.5);

        // Then calculate tier 2 amount
        const tier2ExcessIncome = provisionalIncome - threshold2;
        tier2Amount = Math.min(ssGross * 0.35, tier2ExcessIncome * 0.85); // Additional 35% (85% - 50%)

        ssTaxableAmount = Math.min(ssGross * 0.85, tier1Amount + tier2Amount);
      }

      const ssNonTaxable = ssGross - ssTaxableAmount;

      // Don't calculate separate SS taxes - the taxable amount will be included in total taxable income
      const ssNet = ssGross; // SS net is the full gross amount; taxes will be calculated on total income

      return {
        ssNet,
        ssTaxableAmount,
        ssNonTaxable,
        ssTaxes: 0, // No separate SS taxes - included in total income tax calculation
        calculationDetails: {
          provisionalIncome,
          threshold1,
          threshold2,
          tier1Amount,
          tier2Amount,
          excessIncome1: Math.max(0, provisionalIncome - threshold1),
          excessIncome2: Math.max(0, provisionalIncome - threshold2),
          effectiveRate: 0, // Will be calculated on total income
          method: "irs-rules",
        },
      };
    } else {
      // Use simple fixed percentage method
      const ssTaxableAmount = ssGross * 0.85;
      const ssNonTaxable = ssGross * 0.15; // 15% is non-taxable
      const grossIncomeForTax_simple = totalTaxableIncome + ssTaxableAmount;
      const effRate_simple = isMarried
        ? getEffectiveTaxRateMarried(
            calculateTaxableIncome(grossIncomeForTax_simple, "married")
          )
        : getEffectiveTaxRate(
            calculateTaxableIncome(grossIncomeForTax_simple, "single")
          );
      const ssTaxes = ssTaxableAmount * (effRate_simple / 100);
      const ssNet = ssGross - ssTaxes;

      return {
        ssNet,
        ssTaxableAmount,
        ssNonTaxable,
        ssTaxes,
        calculationDetails: {
          provisionalIncome: 0,
          threshold1: 0,
          threshold2: 0,
          tier1Amount: 0,
          tier2Amount: 0,
          effectiveRate: effRate_simple,
          method: "simplified",
        },
      };
    }
  }

  /**
   * Calculate pension taxation for a given year
   */
  function calculatePensionTaxation(params, penGross, totalTaxableIncome) {
    if (!penGross || penGross <= 0) {
      return {
        penNet: 0,
        penTaxes: 0,
        penTaxableAmount: 0,
        penNonTaxable: 0,
        pensionTaxRate: 0,
      };
    }

    // Pensions are typically fully taxable, but we track for consistency
    const penTaxableAmount = penGross; // 100% taxable
    const penNonTaxable = 0; // 0% non-taxable

    let pensionTaxRate = params.taxPension;

    if (params.useAgiTax) {
      const grossIncomeForPensionTax = penTaxableAmount + totalTaxableIncome;
      const taxableIncomeForPensionTax = calculateTaxableIncome(
        grossIncomeForPensionTax,
        params.filingStatus
      );
      const taxableIncomeBasedRate =
        params.filingStatus === "married"
          ? getEffectiveTaxRateMarried(taxableIncomeForPensionTax)
          : getEffectiveTaxRate(taxableIncomeForPensionTax);

      const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
      pensionTaxRate = Math.max(params.taxPension, taxableIncomeRateDecimal);

      // console.log(`Pension Taxable Income Tax Calc: Gross Income: $${grossIncomeForPensionTax.toLocaleString()}, Taxable Income: $${taxableIncomeForPensionTax.toLocaleString()}, Filing: ${params.filingStatus}, Taxable Income Rate: ${taxableIncomeBasedRate.toFixed(1)}%, Fixed Rate: ${(params.taxPension*100).toFixed(1)}%, Using: ${(pensionTaxRate*100).toFixed(1)}%`);
    }

    // Don't calculate separate pension taxes - will be included in total income tax calculation
    const penTaxes = 0;
    const penNet = penGross; // Full gross amount; taxes calculated on total income

    return {
      penNet,
      penTaxes,
      penTaxableAmount,
      penNonTaxable,
      pensionTaxRate: 0, // Will be calculated as part of total income
    };
  }

  // Setup retirement years; calculate initial benefit amounts
  let ssAnnual =
    params.ssMonthly *
    12 *
    (params.retireAge >= params.ssStart
      ? pow1p(params.ssCola, params.retireAge - params.ssStart)
      : 1);
  let penAnnual =
    params.penMonthly *
    12 *
    (params.retireAge >= params.penStart
      ? pow1p(params.penCola, params.retireAge - params.penStart)
      : 1);

  const spouseBenefits = calculateSpouseBenefits(params);
  let spouseSsAnnual = spouseBenefits.spouseSsAnnual;
  let spousePenAnnual = spouseBenefits.spousePenAnnual;

  let spend = params.spendAtRetire;

  /**
   * Create withdrawal function for a specific retirement year
   */
  function createWithdrawalFunction(params, balances, totalTaxableIncomeRef) {
    let taxesThisYear = 0;
    let withdrawalsBySource = {
      retirementAccount: 0,
      savingsAccount: 0,
      roth: 0,
    };

    function withdrawFrom(kind, netAmount) {
      // console.log(`withdrawFrom called with kind: "${kind}", netAmount: ${netAmount}`);
      if (netAmount <= 0) return { gross: 0, net: 0 };

      // Validate kind parameter
      if (!kind || typeof kind !== "string") {
        console.error("Invalid withdrawal kind:", kind);
        return { gross: 0, net: 0 };
      }

      let fixedTaxRate = 0,
        balRef = 0,
        setBal;

      if (kind === "taxable") {
        fixedTaxRate = params.taxTaxable;
        balRef = balances.balSavings;
        setBal = (v) => {
          balances.balSavings = v;
        };
      } else if (kind === "pretax") {
        fixedTaxRate = params.taxPre;
        balRef = balances.balPre;
        setBal = (v) => {
          balances.balPre = v;
        };
      } else if (kind === "roth") {
        fixedTaxRate = params.taxRoth;
        balRef = balances.balRoth;
        setBal = (v) => {
          balances.balRoth = v;
        };
      } else {
        console.error("Unknown withdrawal kind:", kind);
        return { gross: 0, net: 0 };
      }

      // Use Taxable Income-based calculation for pre-tax withdrawals if enabled
      let taxRate = fixedTaxRate;

      if (kind === "pretax" && params.useAgiTax) {
        const estimatedGrossWithdrawal = netAmount / (1 - fixedTaxRate);
        const projectedGrossIncome =
          totalTaxableIncomeRef.value + estimatedGrossWithdrawal;

        const projectedTaxableIncome = calculateTaxableIncome(
          projectedGrossIncome,
          params.filingStatus
        );
        const taxableIncomeBasedRate =
          params.filingStatus === "married"
            ? getEffectiveTaxRateMarried(projectedTaxableIncome)
            : getEffectiveTaxRate(projectedTaxableIncome);

        const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
        taxRate = Math.max(fixedTaxRate, taxableIncomeRateDecimal);

        // console.log(`Gross Income: $${projectedGrossIncome.toLocaleString()}, Taxable Income: $${projectedTaxableIncome.toLocaleString()}, Filing: ${params.filingStatus}, Taxable Income Rate: ${taxableIncomeBasedRate.toFixed(1)}%, Fixed Rate: ${(fixedTaxRate*100).toFixed(1)}%, Using: ${(taxRate*100).toFixed(1)}%`);
      }

      // For pretax withdrawals, estimate tax rate and gross up to meet net need
      let grossTake, netReceived;
      if (kind === "pretax") {
        // Estimate tax rate for grossing up the withdrawal
        const projectedGrossIncome = totalTaxableIncomeRef.value + netAmount;
        const projectedTaxableIncome = calculateTaxableIncome(
          projectedGrossIncome,
          params.filingStatus
        );
        const taxableIncomeBasedRate =
          params.filingStatus === "married"
            ? getEffectiveTaxRateMarried(projectedTaxableIncome)
            : getEffectiveTaxRate(projectedTaxableIncome);
        const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
        taxRate = Math.max(params.taxPre, taxableIncomeRateDecimal);

        // Gross up the withdrawal to account for taxes
        const grossNeeded = netAmount / (1 - taxRate);
        grossTake = Math.min(grossNeeded, balRef);
        netReceived = grossTake * (1 - taxRate); // Estimated net after taxes
        setBal(balRef - grossTake);
      } else {
        // For taxable/Roth accounts, no tax impact
        grossTake = Math.min(netAmount, balRef);
        netReceived = grossTake;
        setBal(balRef - grossTake);
      }

      // Track withdrawals by source
      if (kind === "pretax") {
        withdrawalsBySource.retirementAccount += grossTake;
      } else if (kind === "taxable") {
        withdrawalsBySource.savingsAccount += grossTake;
      } else if (kind === "roth") {
        withdrawalsBySource.roth += grossTake;
      }

      // Add pre-tax withdrawals to Taxable Income for subsequent calculations
      if (kind === "pretax") {
        totalTaxableIncomeRef.value += grossTake;
      }

      return { gross: grossTake, net: netReceived };
    }

    // Special function for RMD withdrawals (gross amount based)
    function withdrawRMD(grossAmount) {
      if (grossAmount <= 0 || balances.balPre <= 0) return { gross: 0, net: 0 };

      const actualGross = Math.min(grossAmount, balances.balPre);

      let taxRate = params.taxPre;

      if (params.useAgiTax) {
        const projectedGrossIncome = totalTaxableIncomeRef.value + actualGross;
        const projectedTaxableIncome = calculateTaxableIncome(
          projectedGrossIncome,
          params.filingStatus
        );
        const taxableIncomeBasedRate =
          params.filingStatus === "married"
            ? getEffectiveTaxRateMarried(projectedTaxableIncome)
            : getEffectiveTaxRate(projectedTaxableIncome);
        const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
        taxRate = Math.max(params.taxPre, taxableIncomeRateDecimal);
      }

      // For RMD, estimate taxes to provide realistic net amount
      const projectedGrossIncome = totalTaxableIncomeRef.value + actualGross;
      const projectedTaxableIncome = calculateTaxableIncome(
        projectedGrossIncome,
        params.filingStatus
      );
      const taxableIncomeBasedRate =
        params.filingStatus === "married"
          ? getEffectiveTaxRateMarried(projectedTaxableIncome)
          : getEffectiveTaxRate(projectedTaxableIncome);
      const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
      const rmdTaxRate = Math.max(params.taxPre, taxableIncomeRateDecimal);

      const netReceived = actualGross * (1 - rmdTaxRate); // Estimated net after taxes
      balances.balPre -= actualGross;
      totalTaxableIncomeRef.value += actualGross;

      // Track RMD withdrawals as retirement account
      withdrawalsBySource.retirementAccount += actualGross;

      return { gross: actualGross, net: netReceived };
    }

    return {
      withdrawFrom,
      withdrawRMD,
      getTaxesThisYear: () => taxesThisYear,
      getWithdrawalsBySource: () => withdrawalsBySource,
    };
  }

  /**
   * 50/50 Withdrawal Strategy
   * Takes equal net amounts from savings (taxable) and 401k (pretax) accounts
   * The 401k withdrawal is grossed up to account for taxes so net amounts are equal
   */
  function withdraw50_50(withdrawalFunctions, totalNetNeeded) {
    if (totalNetNeeded <= 0) {
      return { totalGross: 0, totalNet: 0 };
    }

    // Target net amount from each source (half each)
    const targetNetPerSource = totalNetNeeded / 2;

    let totalGross = 0;
    let totalNet = 0;

    // Try to withdraw equal net amounts from both sources
    // Start with savings (no tax impact)
    const savingsResult = withdrawalFunctions.withdrawFrom(
      "taxable",
      targetNetPerSource
    );
    // Don't add savings to totalGross - savings withdrawals are not taxable income
    totalNet += savingsResult.net;

    // Then try to get equal net amount from pretax (401k)
    // This will automatically gross up to account for taxes
    const pretaxResult = withdrawalFunctions.withdrawFrom(
      "pretax",
      targetNetPerSource
    );
    totalGross += pretaxResult.gross;
    totalNet += pretaxResult.net;

    // If we couldn't get enough from one source, try to make up the difference from the other
    const remaining = totalNetNeeded - totalNet;
    if (remaining > 0) {
      // Try savings first for any remaining amount
      if (remaining > 0) {
        const additionalSavings = withdrawalFunctions.withdrawFrom(
          "taxable",
          remaining
        );
        // Don't add savings to totalGross - savings withdrawals are not taxable income
        totalNet += additionalSavings.net;
      }

      // Then try pretax for any still remaining amount
      const stillRemaining = totalNetNeeded - totalNet;
      if (stillRemaining > 0) {
        const additionalPretax = withdrawalFunctions.withdrawFrom(
          "pretax",
          stillRemaining
        );
        totalGross += additionalPretax.gross;
        totalNet += additionalPretax.net;
      }

      // Finally try Roth if both other sources are exhausted
      const finalRemaining = totalNetNeeded - totalNet;
      if (finalRemaining > 0) {
        const rothResult = withdrawalFunctions.withdrawFrom(
          "roth",
          finalRemaining
        );
        totalGross += rothResult.gross;
        totalNet += rothResult.net;
      }
    }

    return { totalGross, totalNet };
  }

  /**
   * Calculate a given retirement year with proper SS taxation based on total income
   */
  function calculateRetirementYearData(
    params,
    year,
    balances,
    benefitAmounts,
    spend
  ) {
    const age = params.currentAge + year;
    const yearNum = new Date().getFullYear() + year;

    console.log(`\n--- Retirement Year ${year + 1} (Age ${age}) ---`);

    // Income sources (gross amounts)
    const hasSS = age >= params.ssStart;
    const hasPen = age >= params.penStart && params.penMonthly > 0;
    const ssGross = hasSS ? benefitAmounts.ssAnnual : 0;
    const penGross = hasPen ? benefitAmounts.penAnnual : 0;

    // Spouse income sources
    let spouseSsGross = 0;
    let spousePenGross = 0;

    // if (age == 72) {
    //   debugger;
    // }

    if (params.hasSpouse) {
      const spouseCurrentAge = params.spouseAge + (age - params.currentAge);
      const hasSpouseSS = spouseCurrentAge >= params.spouseSsStart;
      const hasSpousePen =
        spouseCurrentAge >= params.spousePenStart &&
        params.spousePenMonthly > 0;

      spouseSsGross = hasSpouseSS ? benefitAmounts.spouseSsAnnual : 0;
      spousePenGross = hasSpousePen ? benefitAmounts.spousePenAnnual : 0;
    }

    // Get income adjustments for this age
    const taxableIncomeAdjustment = getTaxableIncomeOverride(age);
    const taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age);

    // Calculate savings breakdown (track starting balance BEFORE any adjustments for current year)
    const savingsStartBalance = balances.balSavings;

    // Add tax-free income adjustment to savings balance (not taxable)
    balances.balSavings += taxFreeIncomeAdjustment;

    // Get spending need (with additional spending)
    const additionalSpending = getSpendingOverride(age);
    const actualSpend = spend + (additionalSpending || 0);

    if (additionalSpending !== null && additionalSpending > 0) {
      console.log(
        `Age ${age}: Adding extra spending $${additionalSpending.toLocaleString()} to base $${spend.toLocaleString()} = total $${actualSpend.toLocaleString()}`
      );
    }

    if (additionalSpending === null) {
      setSpendingFieldValue(age, spend);
    }

    // STEP 1: Calculate estimated withdrawals for more conservative interest calculation
    // Estimate total withdrawals that will happen during the year
    const estimatedSavingsWithdrawals = Math.min(
      Math.max(
        0,
        actualSpend - (ssGross + spouseSsGross + penGross + spousePenGross)
      ),
      balances.balSavings
    );

    // Calculate taxable interest on balance AFTER subtracting estimated withdrawals (more conservative)
    const balanceAfterWithdrawals = Math.max(
      0,
      balances.balSavings - estimatedSavingsWithdrawals
    );
    const taxableInterestEarned = balanceAfterWithdrawals * params.retTax;

    // STEP 2: Calculate pension taxation (straightforward - doesn't depend on SS)
    let totalTaxableIncomeRef = {
      value:
        penGross +
        spousePenGross +
        taxableInterestEarned +
        taxableIncomeAdjustment,
    };
    const penResults = calculatePensionTaxation(params, penGross, 0); // Start with no other income
    const spousePenResults = calculatePensionTaxation(
      params,
      spousePenGross,
      penResults.penTaxableAmount
    );

    // Update taxable income reference to include only taxable portions plus taxable interest
    totalTaxableIncomeRef.value =
      penResults.penTaxableAmount +
      spousePenResults.penTaxableAmount +
      taxableInterestEarned +
      taxableIncomeAdjustment;

    // STEP 3: Estimate initial withdrawal need (before SS taxation)
    // Use net amounts (after tax) for spending calculation
    let preliminaryNeedNet = Math.max(
      0,
      actualSpend - (penResults.penNet + spousePenResults.penNet)
    );

    // STEP 4: Make preliminary withdrawals to estimate total income for SS calculation
    let balancesCopy = { ...balances }; // Work with copy for estimation
    let totalTaxableIncomeCopy = { value: totalTaxableIncomeRef.value };

    const preliminaryWithdrawalFunctions = createWithdrawalFunction(
      params,
      balancesCopy,
      totalTaxableIncomeCopy
    );

    // Apply RMDs first (preliminary)
    let preliminaryRmdAmount = 0;

    if (params.useRMD && age >= 73) {
      preliminaryRmdAmount = calculateRMD(age, balancesCopy.balPre);
      if (preliminaryRmdAmount > 0) {
        const rmdWithdrawal =
          preliminaryWithdrawalFunctions.withdrawRMD(preliminaryRmdAmount);
        preliminaryNeedNet = Math.max(
          0,
          preliminaryNeedNet - rmdWithdrawal.net
        );
      }
    }

    // Then regular withdrawals (preliminary)
    if (params.order[0] === "50/50") {
      // Special 50/50 strategy: equal net amounts from savings and 401k
      if (preliminaryNeedNet > 0) {
        const fiftyFiftyResults = withdraw50_50(
          preliminaryWithdrawalFunctions,
          preliminaryNeedNet
        );
        preliminaryNeedNet = Math.max(
          0,
          preliminaryNeedNet - fiftyFiftyResults.totalNet
        );
      }
    } else {
      // Standard withdrawal order strategy
      for (const k of params.order) {
        if (preliminaryNeedNet <= 0) break;
        const { gross = 0, net = 0 } =
          preliminaryWithdrawalFunctions.withdrawFrom(k, preliminaryNeedNet) ||
          {};
        preliminaryNeedNet = Math.max(0, preliminaryNeedNet - net);
      }
    }

    // STEP 5: Now calculate SS taxation based on total taxable income (excluding non-taxable savings withdrawals)
    // The totalTaxableIncomeCopy.value now contains only truly taxable income: pensions + pre-tax withdrawals + taxable interest
    const totalTaxableIncomeForSS = totalTaxableIncomeCopy.value;
    const ssResults = calculateSocialSecurityTaxation(
      params,
      ssGross,
      totalTaxableIncomeForSS
    );
    const spouseSsResults = calculateSocialSecurityTaxation(
      params,
      spouseSsGross,
      totalTaxableIncomeForSS + ssResults.ssTaxableAmount
    );

    // STEP 6: Recalculate final withdrawals with correct SS net amounts
    // Only include taxable portions in taxable income reference
    totalTaxableIncomeRef.value =
      penResults.penTaxableAmount +
      spousePenResults.penTaxableAmount +
      ssResults.ssTaxableAmount +
      spouseSsResults.ssTaxableAmount +
      taxableInterestEarned +
      taxableIncomeAdjustment;

    // Use full net amounts (including non-taxable portions) for spending calculation
    // Calculate base spending need and additional spending need separately
    const baseSpendNeed = Math.max(
      0,
      spend -
        (ssResults.ssNet +
          penResults.penNet +
          spouseSsResults.ssNet +
          spousePenResults.penNet)
    );
    const additionalSpendNeed = additionalSpending || 0;
    const totalNeedNet = baseSpendNeed + additionalSpendNeed;

    if (additionalSpendNeed > 0) {
      console.log(
        `Age ${age}: Base spending need: $${baseSpendNeed.toLocaleString()}, Additional spending need: $${additionalSpendNeed.toLocaleString()}, Total: $${totalNeedNet.toLocaleString()}`
      );
    }

    const finalWithdrawalFunctions = createWithdrawalFunction(
      params,
      balances,
      totalTaxableIncomeRef
    );

    // Final withdrawal amounts
    let finalWGross = 0,
      finalWNet = 0;
    // Start with no taxes - will calculate on total taxable income at the end
    let taxesThisYear = 0;

    // Apply RMDs (final)
    if (params.useRMD && age >= 73 && preliminaryRmdAmount > 0) {
      //debugger;
      const rmdWithdrawal =
        finalWithdrawalFunctions.withdrawRMD(preliminaryRmdAmount);
      let remainingNeedNet = Math.max(0, totalNeedNet - rmdWithdrawal.net);
      finalWGross += rmdWithdrawal.gross;
      finalWNet += rmdWithdrawal.net;
      // console.log(`RMD at age ${age}: Required $${preliminaryRmdAmount.toLocaleString()}, Withdrew $${rmdWithdrawal.gross.toLocaleString()} gross, $${rmdWithdrawal.net.toLocaleString()} net`);

      // Handle remaining withdrawals after RMD
      if (remainingNeedNet > 0) {
        // Handle additional spending first with tax-optimized approach
        let remainingAdditionalNeed = Math.min(
          remainingNeedNet,
          additionalSpendNeed
        );
        if (remainingAdditionalNeed > 0) {
          // For additional spending, prioritize Savings first, then 401k
          const savingsWithdrawal = finalWithdrawalFunctions.withdrawFrom(
            "taxable",
            remainingAdditionalNeed
          );
          // Don't add savings to finalWGross - savings withdrawals are not taxable income
          finalWNet += savingsWithdrawal.net;
          remainingNeedNet -= savingsWithdrawal.net;

          const stillNeedForAdditional = Math.max(
            0,
            remainingAdditionalNeed - savingsWithdrawal.net
          );
          if (stillNeedForAdditional > 0) {
            // Not enough in savings, use 401k for the remainder
            const pretaxWithdrawal = finalWithdrawalFunctions.withdrawFrom(
              "pretax",
              stillNeedForAdditional
            );
            finalWGross += pretaxWithdrawal.gross;
            finalWNet += pretaxWithdrawal.net;
            remainingNeedNet -= pretaxWithdrawal.net;
          }
        }

        // Handle remaining base spending with normal withdrawal order
        if (remainingNeedNet > 0) {
          if (params.order[0] === "50/50") {
            const result = withdraw50_50(
              finalWithdrawalFunctions,
              remainingNeedNet
            );
            finalWGross += result.totalGross;
            finalWNet += result.totalNet;
          } else {
            for (const k of params.order) {
              if (remainingNeedNet <= 0) break;
              const { gross = 0, net = 0 } =
                finalWithdrawalFunctions.withdrawFrom(k, remainingNeedNet) ||
                {};
              remainingNeedNet = Math.max(0, remainingNeedNet - net);
              finalWGross += gross;
              finalWNet += net;
            }
          }
        }
      }
    } else {
      // No RMD - handle all withdrawals
      let remainingNeedNet = totalNeedNet;

      // Handle additional spending first with tax-optimized approach
      if (additionalSpendNeed > 0) {
        // For additional spending, prioritize Savings first, then 401k
        const savingsWithdrawal = finalWithdrawalFunctions.withdrawFrom(
          "taxable",
          additionalSpendNeed
        );
        // Don't add savings to finalWGross - savings withdrawals are not taxable income
        finalWNet += savingsWithdrawal.net;
        remainingNeedNet -= savingsWithdrawal.net;

        const remainingAdditional = Math.max(
          0,
          additionalSpendNeed - savingsWithdrawal.net
        );
        if (remainingAdditional > 0) {
          // Not enough in savings, use 401k for the remainder
          const pretaxWithdrawal = finalWithdrawalFunctions.withdrawFrom(
            "pretax",
            remainingAdditional
          );
          finalWGross += pretaxWithdrawal.gross;
          finalWNet += pretaxWithdrawal.net;
          remainingNeedNet -= pretaxWithdrawal.net;
        }
      }

      // Handle remaining base spending with normal withdrawal order
      if (remainingNeedNet > 0) {
        if (params.order[0] === "50/50") {
          const result = withdraw50_50(
            finalWithdrawalFunctions,
            remainingNeedNet
          );
          finalWGross += result.totalGross;
          finalWNet += result.totalNet;
        } else {
          for (const k of params.order) {
            if (remainingNeedNet <= 0) break;
            const { gross = 0, net = 0 } =
              finalWithdrawalFunctions.withdrawFrom(k, remainingNeedNet) || {};
            remainingNeedNet = Math.max(0, remainingNeedNet - net);
            finalWGross += gross;
            finalWNet += net;
          }
        }
      }
    }

    // Get withdrawal breakdown by source first
    const withdrawalsBySource =
      finalWithdrawalFunctions.getWithdrawalsBySource();

    // Recalculate SS taxation using FINAL taxable income (including withdrawals)
    const finalTaxableIncomeForSS =
      penResults.penTaxableAmount +
      spousePenResults.penTaxableAmount +
      withdrawalsBySource.retirementAccount +
      taxableInterestEarned +
      taxableIncomeAdjustment;

    const finalSsResults = calculateSocialSecurityTaxation(
      params,
      ssGross,
      finalTaxableIncomeForSS
    );
    const finalSpouseSsResults = calculateSocialSecurityTaxation(
      params,
      spouseSsGross,
      finalTaxableIncomeForSS + finalSsResults.ssTaxableAmount
    );

    // Calculate total taxes on all taxable income (proper approach)
    // Total taxable income includes: SS taxable + pension taxable + pretax withdrawals + taxable interest
    const totalGrossTaxableIncome =
      penResults.penTaxableAmount +
      spousePenResults.penTaxableAmount +
      finalSsResults.ssTaxableAmount +
      finalSpouseSsResults.ssTaxableAmount +
      withdrawalsBySource.retirementAccount +
      taxableInterestEarned +
      taxableIncomeAdjustment;

    // Calculate total income tax on the combined taxable income
    taxesThisYear = calculateFederalTax(
      totalGrossTaxableIncome,
      params.filingStatus
    );

    // Also calculate the taxable income after deduction for display purposes
    const totalTaxableIncomeAfterDeduction = calculateTaxableIncome(
      totalGrossTaxableIncome,
      params.filingStatus
    );

    // Calculate net income and handle overage BEFORE growing balances
    const grossIncomeFromBenefitsAndWithdrawals =
      ssGross + spouseSsGross + penGross + spousePenGross + finalWGross;
    const netIncomeFromTaxableSources =
      grossIncomeFromBenefitsAndWithdrawals - taxesThisYear;
    const spendingTarget = actualSpend;
    const shortfall = Math.max(0, spendingTarget - netIncomeFromTaxableSources);

    // Handle shortfall with additional savings withdrawal
    let additionalSavingsWithdrawal = Math.min(shortfall, balances.balSavings);

    if (additionalSavingsWithdrawal > 0) {
      balances.balSavings -= additionalSavingsWithdrawal;
      withdrawalsBySource.savingsAccount += additionalSavingsWithdrawal;
    }

    let actualSavingsWithdrawal = withdrawalsBySource.savingsAccount; // Track the actual amount withdrawn from savings

    // Calculate total net income
    const totalNetIncome =
      netIncomeFromTaxableSources + additionalSavingsWithdrawal;

    // Update final withdrawal amounts to include any additional savings withdrawal
    const totalWithdrawals = finalWGross + additionalSavingsWithdrawal;

    // If there's an overage (excess income beyond spending target), add it to savings BEFORE growth
    const overage = Math.max(0, totalNetIncome - spendingTarget);
    if (overage > 0) {
      balances.balSavings += overage;
    }

    // Add any tax-free income adjustments
    balances.balSavings += taxFreeIncomeAdjustment;

    // Calculate balance before growth (after all deposits/withdrawals)
    const savingsBeforeGrowth = balances.balSavings;

    // Apply conservative growth: interest calculated on current balance
    // (withdrawals have already been subtracted from balances.balSavings)
    const savingsGrowth = savingsBeforeGrowth * params.retTax;
    balances.balSavings += savingsGrowth;

    // Apply normal growth to other account types (withdrawals happen at specific times)
    balances.balPre *= 1 + params.retPre;
    balances.balRoth *= 1 + params.retRoth;

    // Note: taxableInterestEarned was calculated earlier before withdrawals

    const totalBal = balances.balSavings + balances.balPre + balances.balRoth;

    // Debug RMD years to show actual total net income
    // if (params.useRMD && age >= 73) {
    //   console.log(`\n=== RMD YEAR DEBUG (Age ${age}) ===`);
    //   console.log(`Spending target: ${fmt(spendingTarget)}`);
    //   console.log(`RMD required: ${fmt(preliminaryRmdAmount)}`);
    //   console.log(
    //     `Gross income (SS/Pension/Withdrawals): ${fmt(
    //       grossIncomeFromBenefitsAndWithdrawals
    //     )}`
    //   );
    //   console.log(`Total taxes: ${fmt(taxesThisYear)}`);
    //   console.log(
    //     `Net from taxable sources: ${fmt(netIncomeFromTaxableSources)}`
    //   );
    //   console.log(`Shortfall: ${fmt(shortfall)}`);
    //   console.log(
    //     `Additional savings withdrawal: ${fmt(additionalSavingsWithdrawal)}`
    //   );
    //   console.log(`Final Total Net Income: ${fmt(totalNetIncome)}`);
    //   if (totalNetIncome > spendingTarget) {
    //     const excess = totalNetIncome - spendingTarget;
    //     console.log(
    //       `✓ Total Net exceeds spending target by ${fmt(excess)} (RMD excess)`
    //     );
    //     console.log(`✓ Adding ${fmt(excess)} to savings account`);
    //   }
    //   console.log(`=== END RMD DEBUG ===\n`);
    // }

    // For display purposes: allocate taxes proportionally (only to taxable income sources)
    const ssNetAdjusted =
      ssGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
        ? (ssGross / grossIncomeFromBenefitsAndWithdrawals) *
          netIncomeFromTaxableSources
        : ssGross;
    const spouseSsNetAdjusted =
      spouseSsGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
        ? (spouseSsGross / grossIncomeFromBenefitsAndWithdrawals) *
          netIncomeFromTaxableSources
        : spouseSsGross;
    const penNetAdjusted =
      penGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
        ? (penGross / grossIncomeFromBenefitsAndWithdrawals) *
          netIncomeFromTaxableSources
        : penGross;
    const spousePenNetAdjusted =
      spousePenGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
        ? (spousePenGross / grossIncomeFromBenefitsAndWithdrawals) *
          netIncomeFromTaxableSources
        : spousePenGross;
    const withdrawalNetAdjusted =
      finalWGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
        ? (finalWGross / grossIncomeFromBenefitsAndWithdrawals) *
          netIncomeFromTaxableSources
        : finalWGross;

    // Update final withdrawal gross to include savings
    const finalWGrossTotal = finalWGross + additionalSavingsWithdrawal;
    const finalWNetTotal = withdrawalNetAdjusted + additionalSavingsWithdrawal;

    // if (age == 72) {
    //   debugger;
    // }
    // Calculate individual withdrawal net amounts for breakdown
    const withdrawalBreakdown = {
      pretax401kGross: withdrawalsBySource.retirementAccount,
      pretax401kNet:
        finalWGross > 0
          ? (withdrawalsBySource.retirementAccount / finalWGross) *
            withdrawalNetAdjusted
          : 0,
      // savingsGross: withdrawalsBySource.savingsAccount,
      savingsNet: withdrawalsBySource.savingsAccount, // Savings withdrawals are not taxed
      rothGross: withdrawalsBySource.roth,
      rothNet:
        finalWGross > 0
          ? (withdrawalsBySource.roth / finalWGross) * withdrawalNetAdjusted
          : withdrawalsBySource.roth,
      totalGross: finalWGrossTotal,
      totalNet: finalWNetTotal,
    };

    // For tax allocation display purposes
    const ssTaxAllocated =
      grossIncomeFromBenefitsAndWithdrawals > 0
        ? ((ssGross + spouseSsGross) / grossIncomeFromBenefitsAndWithdrawals) *
          taxesThisYear
        : 0;
    const penTaxAllocated =
      grossIncomeFromBenefitsAndWithdrawals > 0
        ? ((penGross + spousePenGross) /
            grossIncomeFromBenefitsAndWithdrawals) *
          taxesThisYear
        : 0;
    const withdrawalTaxes =
      grossIncomeFromBenefitsAndWithdrawals > 0
        ? (finalWGross / grossIncomeFromBenefitsAndWithdrawals) * taxesThisYear
        : 0;

    // For display purposes: ssTaxes shows allocated SS taxes, otherTaxes shows non-SS taxes
    const ssTaxes = ssTaxAllocated;
    const otherTaxes = taxesThisYear - ssTaxAllocated;

    // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals
    const totalNonTaxableIncome =
      finalSsResults.ssNonTaxable +
      finalSpouseSsResults.ssNonTaxable +
      penResults.penNonTaxable +
      spousePenResults.penNonTaxable +
      withdrawalsBySource.savingsAccount +
      withdrawalsBySource.roth +
      taxFreeIncomeAdjustment;

    // Gross taxable income includes pre-tax withdrawals + taxable interest earned + taxable portions of benefits + taxable income adjustments
    const grossTaxableIncome =
      penResults.penTaxableAmount +
      spousePenResults.penTaxableAmount +
      ssResults.ssTaxableAmount +
      spouseSsResults.ssTaxableAmount +
      withdrawalsBySource.retirementAccount +
      taxableInterestEarned +
      taxableIncomeAdjustment;

    // Use grossTaxableIncome for Total Gross column (excludes non-taxable withdrawals)
    const totalGrossIncome =
      finalSsResults.ssNonTaxable +
      finalSpouseSsResults.ssNonTaxable +
      penResults.penNonTaxable +
      spousePenResults.penNonTaxable +
      grossTaxableIncome;

    // Taxable income after standard deduction (this is what gets taxed)
    const taxableIncomeAfterDeduction = calculateTaxableIncome(
      grossTaxableIncome,
      params.filingStatus
    );

    // Effective tax rate should be based on INCOME taxes only vs taxable income (after deduction)
    // SS taxes are calculated on gross SS benefits, not on taxable income after deduction
    const effectiveTaxRate =
      taxableIncomeAfterDeduction > 0
        ? (otherTaxes / taxableIncomeAfterDeduction) * 100
        : 0;

    return {
      year: yearNum,
      age,
      salary: 0,
      contrib: 0,
      ss: ssNetAdjusted,
      pen: penNetAdjusted,
      spouseSs: spouseSsNetAdjusted,
      spousePen: spousePenNetAdjusted,
      spend: actualSpend,
      wNet: finalWNetTotal,
      wGross: finalWGrossTotal,
      w401kGross: withdrawalsBySource.retirementAccount,
      wSavingsGross: withdrawalsBySource.savingsAccount,
      wRothGross: withdrawalsBySource.roth,
      ssGross: ssGross,
      penGross: penGross,
      spouseSsGross: spouseSsGross,
      spousePenGross: spousePenGross,
      taxes: taxesThisYear,
      ssTaxes: ssTaxAllocated,
      otherTaxes: otherTaxes,
      penTaxes: penTaxAllocated,
      withdrawalTaxes: withdrawalTaxes,
      nonTaxableIncome: totalNonTaxableIncome,
      taxableIncome: taxableIncomeAfterDeduction, // Taxable income after standard deduction (this is what appears in the table)
      taxableInterest: taxableInterestEarned,
      totalIncome:
        ssNetAdjusted +
        penNetAdjusted +
        spouseSsNetAdjusted +
        spousePenNetAdjusted +
        withdrawalNetAdjusted +
        taxableInterestEarned +
        taxableIncomeAdjustment +
        taxFreeIncomeAdjustment, // Total income including all adjustments
      totalNetIncome: totalNetIncome, // Use calculated total that meets spending target
      totalGrossIncome: totalGrossIncome, // Use the corrected gross taxable income calculation
      effectiveTaxRate,
      balSavings: balances.balSavings,
      balPre: balances.balPre,
      balRoth: balances.balRoth,
      total: totalBal,
      // Add savings breakdown data for popup
      savingsBreakdown: {
        startingBalance: savingsStartBalance,
        withdrawals: actualSavingsWithdrawal,
        overageDeposit: overage,
        taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
        balanceBeforeGrowth: savingsBeforeGrowth,
        interestEarned: savingsGrowth, // Use the conservative growth calculation
        endingBalance: balances.balSavings,
        growthRate: params.retTax * 100,
      },
      // Add withdrawal breakdown data for popup
      withdrawalBreakdown: withdrawalBreakdown,
      // Add SS breakdown data for popup
      ssBreakdown: {
        ssGross: ssGross,
        ssTaxableAmount: finalSsResults.ssTaxableAmount,
        ssNonTaxable: finalSsResults.ssNonTaxable,
        ssTaxes: ssTaxAllocated, // Show allocated tax amount
        calculationDetails: finalSsResults.calculationDetails,
        otherTaxableIncome: finalTaxableIncomeForSS,
      },
    };
  }

  // Retirement years
  for (let y = params.yearsToRetire; y < params.yearsTotal; y++) {
    const benefitAmounts = {
      ssAnnual,
      penAnnual,
      spouseSsAnnual,
      spousePenAnnual,
    };

    const yearData = calculateRetirementYearData(
      params,
      y,
      balances,
      benefitAmounts,
      spend
    );
    calculations.push(yearData);

    const totalBal = yearData.total;
    totalTaxes += yearData.taxes;
    if (totalBal < maxDrawdown.value) {
      maxDrawdown = { year: yearData.year, value: totalBal };
    }

    // Step next year: Apply COLAs to benefits
    const age = yearData.age;
    if (age >= params.ssStart) ssAnnual *= 1 + params.ssCola;
    if (age >= params.penStart && params.penMonthly > 0)
      penAnnual *= 1 + params.penCola;

    if (params.hasSpouse) {
      const spouseCurrentAge = params.spouseAge + (age - params.currentAge);
      if (spouseCurrentAge >= params.spouseSsStart)
        spouseSsAnnual *= 1 + params.spouseSsCola;
      if (
        spouseCurrentAge >= params.spousePenStart &&
        params.spousePenMonthly > 0
      )
        spousePenAnnual *= 1 + params.spousePenCola;
    }

    spend *= 1 + params.inflation;
    spend *= 1 - params.spendingDecline;
  }

  console.log("Calculations: ", calculations);

  /**
   * Generate final summary, write table, and update KPIs
   */
  function generateOutputAndSummary(params, rows, totalTaxes, maxDrawdown) {
    // Write table
    const tbody = $("rows");
    tbody.innerHTML = calculations
      .map(
        (r, index) => `
        <tr>
        <td class="neutral">${r.year}</td>
        <td class="neutral">${r.age}</td>
        
        <!-- THE NEED -->
        <td class="outgoing">${r.spend ? fmt(r.spend) : ""}</td>
        
        <!-- NET INCOME (what you actually receive) -->
        <td class="income">${
          r.ss
            ? `<span class="ss-link" onclick="showSsBreakdown(${index})">${fmt(
                r.ss
              )}</span>`
            : ""
        }</td>
        <td class="income">${r.pen ? fmt(r.pen) : ""}</td>
        <td class="income">${r.spouseSs ? fmt(r.spouseSs) : ""}</td>
        <td class="income">${r.spousePen ? fmt(r.spousePen) : ""}</td>
        <td class="income">${
          r.wNet
            ? `<span class="withdrawal-net-link" onclick="showWithdrawalNetBreakdown(${index})">${fmt(
                r.wNet
              )}</span>`
            : ""
        }</td>
        <td class="income">${
          r.totalNetIncome
            ? r.age >= params.retireAge
              ? `<span class="ss-link" onclick="showTotalNetBreakdown(${index})">${fmt(
                  r.totalNetIncome
                )}</span>`
              : fmt(r.totalNetIncome)
            : ""
        }</td>
        
        <!-- GROSS INCOME (before taxes/deductions) -->
        <td class="income">${r.salary ? fmt(r.salary) : ""}</td>
        <td class="income">${
          r.taxableInterest ? fmt(r.taxableInterest) : ""
        }</td>
        <td class="income">${r.ss ? fmt(r.ssGross || 0) : ""}</td>
        <td class="income">${r.pen ? fmt(r.penGross || 0) : ""}</td>
        <td class="income">${r.spouseSs ? fmt(r.spouseSsGross || 0) : ""}</td>
        <td class="income">${r.spousePen ? fmt(r.spousePenGross || 0) : ""}</td>
        <td class="income">${r.w401kGross ? fmt(r.w401kGross) : ""}</td>
        <td class="income">${
          r.totalGrossIncome ? fmt(r.totalGrossIncome) : ""
        }</td>
        
        <!-- THE BREAKDOWN -->
        <td class="income">${
          r.age >= params.retireAge
            ? `<span class="taxable-income-link" onclick="showTaxableIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
                r.taxableIncome || 0
              )}</span>`
            : r.taxableIncome
            ? fmt(r.taxableIncome)
            : ""
        }</td>
        <td class="income">${
          r.nonTaxableIncome
            ? r.age >= params.retireAge
              ? `<span class="non-taxable-income-link" onclick="showNonTaxableIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
                  r.nonTaxableIncome
                )}</span>`
              : fmt(r.nonTaxableIncome)
            : ""
        }</td>
        
        <!-- THE COST -->
        <td class="outgoing">${
          r.ssTaxes !== undefined && r.ssTaxes !== null ? fmt(r.ssTaxes) : ""
        }</td>
        <td class="outgoing">${r.otherTaxes ? fmt(r.otherTaxes) : ""}</td>
        <td class="outgoing">${
          r.age >= params.retireAge
            ? `<span class="total-taxes-link" onclick="showTotalTaxesBreakdown(${index})" title="Click to see breakdown">${fmt(
                r.taxes || 0
              )}</span>`
            : r.taxes
            ? fmt(r.taxes)
            : ""
        }</td>
        <td class="neutral">${
          r.effectiveTaxRate ? r.effectiveTaxRate.toFixed(1) + "%" : ""
        }</td>
        
        <!-- THE RESULT -->
        <td class="neutral">${
          r.balSavings
            ? `<span class="savings-balance-link" onclick="showSavingsBreakdown(${index})" title="Click to see savings changes">${fmt(
                r.balSavings
              )}</span>`
            : ""
        }</td>
        <td class="neutral">${fmt(r.balPre)}</td>
        <td class="neutral">${fmt(r.balRoth)}</td>
        <td class="neutral">${fmt(r.total)}</td>
        </tr>`
      )
      .join("");

    // KPIs
    const last = calculations[calculations.length - 1];
    // Find the last age where there's still money, or endAge if money lasts throughout
    const fundedTo =
      last.total > 0
        ? params.endAge
        : calculations.reduce(
            (lastGoodAge, r) => (r.total > 0 ? r.age : lastGoodAge),
            params.currentAge
          );
    $("kpiAge").innerHTML = `${fundedTo} <span class="pill ${
      fundedTo >= params.endAge ? "ok" : "alert"
    }">${fundedTo >= params.endAge ? "Fully funded" : "Shortfall"}</span>`;
    $("kpiEndBal").textContent = fmt(Math.max(0, last.total));
    $("kpiDraw").textContent = `${params.retireAge}`;
    $("kpiTax").textContent = fmt(
      params.balPre + params.balRoth + params.balSavings
    );

    // Chart (total balance)
    drawChart(calculations.map((r) => ({ x: r.year, y: r.total, age: r.age })));

    // Save rows for export
    window.__rows = rows;
  }

  // Key Performance Indicators
  const last = calculations[calculations.length - 1];
  // Find the last age where there's still money, or endAge if money lasts throughout
  const fundedTo =
    last.total > 0
      ? endAge
      : calculations.reduce(
          (lastGoodAge, r) => (r.total > 0 ? r.age : lastGoodAge),
          currentAge
        );
  $("kpiAge").innerHTML = `${fundedTo} <span class="pill ${
    fundedTo >= endAge ? "ok" : "alert"
  }">${fundedTo >= endAge ? "Fully funded" : "Shortfall"}</span>`;
  $("kpiEndBal").textContent = fmt(Math.max(0, last.total));
  $("kpiDraw").textContent = `${retireAge}`;
  $("kpiTax").textContent = fmt(
    num("balPre") + num("balRoth") + num("balSavings")
  );

  // Chart (total balance)
  drawChart(calculations.map((r) => ({ x: r.year, y: r.total, age: r.age })));

  // Save rows for export
  window.__rows = rows;

  // Generate final output
  generateOutputAndSummary(params, rows, totalTaxes, maxDrawdown);
}

function drawChart(series) {
  const c = $("chart");
  const ctx = c.getContext("2d");

  // Ensure canvas has proper dimensions before drawing
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  const width = rect.width * dpr;
  const height = rect.height * dpr;

  // Force canvas to correct size if needed
  if (c.width !== width || c.height !== height) {
    c.width = width;
    c.height = height;
    c.style.width = rect.width + "px";
    c.style.height = rect.height + "px";
  }

  ctx.clearRect(0, 0, width, height);
  if (!series || !series.length) {
    return;
  }

  // Padding (in device pixels) - increased left padding for Y-axis labels
  const pad = { l: 80 * dpr, r: 12 * dpr, t: 12 * dpr, b: 28 * dpr };
  const xs = series.map((p) => p.x);
  const ys = series.map((p) => p.y);
  const xmin = Math.min(...xs),
    xmax = Math.max(...xs);
  const ymin = 0,
    ymax = Math.max(...ys) * 1.1;
  const xTo = (x) =>
    pad.l + ((x - xmin) / (xmax - xmin)) * (width - pad.l - pad.r);
  const yTo = (y) =>
    height - pad.b - ((y - ymin) / (ymax - ymin)) * (height - pad.t - pad.b);

  // Axes
  ctx.strokeStyle = "#22304d";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(pad.l, yTo(0));
  ctx.lineTo(width - pad.r, yTo(0));
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, height - pad.b);
  ctx.stroke();

  // Y ticks
  ctx.fillStyle = "#7c8db5";
  ctx.font = `${12 * dpr}px system-ui`;
  ctx.textAlign = "right";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = (ymax / steps) * i;
    const y = yTo(v);
    ctx.strokeStyle = "rgba(34,48,77,.4)";
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(width - pad.r, y);
    ctx.stroke();
    ctx.fillText(fmt(v), pad.l - 8 * dpr, y + 4 * dpr);
  }

  // Line
  ctx.strokeStyle = "#6ea8fe";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  series.forEach((p, i) => {
    const X = xTo(p.x),
      Y = yTo(p.y);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.stroke();

  // Points
  ctx.fillStyle = "#6ea8fe";
  series.forEach((p) => {
    const X = xTo(p.x),
      Y = yTo(p.y);
    ctx.beginPath();
    ctx.arc(X, Y, 2.5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

  // X labels
  ctx.fillStyle = "#7c8db5";
  ctx.textAlign = "center";
  ctx.font = `${11 * dpr}px system-ui`;
  const years = [
    series[0].x,
    series[Math.floor(series.length / 2)].x,
    series[series.length - 1].x,
  ];
  years.forEach((x) => ctx.fillText(String(x), xTo(x), height - 6 * dpr));

  // Store chart data and setup for tooltip functionality
  c.chartData = {
    series: series,
    xTo: xTo,
    yTo: yTo,
    width: width,
    height: height,
    dpr: dpr,
    pad: pad,
  };

  // Setup mouse event handlers for tooltips (only add once)
  if (!c.hasTooltipHandlers) {
    const tooltip = document.getElementById("chartTooltip");

    function showTooltip(x, y, point) {
      const yearDiv = tooltip.querySelector(".year");
      const balanceDiv = tooltip.querySelector(".balance");

      yearDiv.textContent = `Year ${point.x} (Age ${point.age})`;
      balanceDiv.textContent = `Balance: ${fmt(point.y)}`;

      tooltip.style.left = x + "px";
      tooltip.style.top = y + "px";
      tooltip.classList.add("visible");
    }

    function hideTooltip() {
      tooltip.classList.remove("visible");
    }

    function findNearestPoint(mouseX, mouseY) {
      if (!c.chartData) return null;

      const { series, xTo, yTo, dpr } = c.chartData;
      const threshold = 20 * dpr; // 20px hit area
      let nearest = null;
      let minDistance = threshold;

      series.forEach((point) => {
        const pointX = xTo(point.x);
        const pointY = yTo(point.y);
        const distance = Math.sqrt(
          Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = point;
        }
      });

      return nearest;
    }

    c.addEventListener("mousemove", (e) => {
      const rect = c.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * c.chartData.dpr;
      const mouseY = (e.clientY - rect.top) * c.chartData.dpr;

      const nearestPoint = findNearestPoint(mouseX, mouseY);

      if (nearestPoint) {
        // Calculate chart center for conditional positioning
        const { xTo, pad, width } = c.chartData;
        const pointX = xTo(nearestPoint.x);
        const chartCenter = (pad.l + (width - pad.r)) / 2;

        // Position tooltip to avoid clipping
        let tooltipX, tooltipY;
        if (pointX < chartCenter) {
          // Point is on left side - show tooltip to the right
          tooltipX = e.clientX - rect.left + 15;
        } else {
          // Point is on right side - show tooltip to the left
          tooltipX = e.clientX - rect.left - 150;
        }
        tooltipY = e.clientY - rect.top - 10;

        showTooltip(tooltipX, tooltipY, nearestPoint);
        c.style.cursor = "pointer";
      } else {
        hideTooltip();
        c.style.cursor = "default";
      }
    });

    c.addEventListener("mouseleave", () => {
      hideTooltip();
      c.style.cursor = "default";
    });

    c.hasTooltipHandlers = true;
  }
}

function exportCSV() {
  const rows = window.__rows || [];
  if (!calculations.length) {
    showToast(
      "No Data",
      "Run a calculation first to generate data for export.",
      "warning"
    );
    return;
  }
  const headers = [
    "Year",
    "Age",
    "Annual_Spend",
    "SS_Net",
    "Pension_Net",
    "Spouse_SS_Net",
    "Spouse_Pension_Net",
    "Withdraw_Net",
    "Total_Net",
    "SS_Gross",
    "Pension_Gross",
    "Spouse_SS_Gross",
    "Spouse_Pension_Gross",
    "401k_Gross",
    "Savings_Gross",
    "Roth_Gross",
    "Total_Gross",
    "Taxable_Income",
    "Non_Taxable_Income",
    "SS_Taxes",
    "Other_Taxes",
    "Total_Taxes",
    "Effective_Tax_Rate",
    "Savings_Bal",
    "401k_Bal",
    "Roth_Bal",
    "Total_Bal",
  ];
  const csv = [headers.join(",")]
    .concat(
      calculations.map((r) =>
        [
          r.year,
          r.age,
          r.spend,
          r.ss,
          r.pen,
          r.spouseSs || 0,
          r.spousePen || 0,
          r.wNet,
          r.totalNetIncome || 0,
          r.salary || 0,
          r.taxableInterest || 0,
          r.ssGross || 0,
          r.penGross || 0,
          r.spouseSsGross || 0,
          r.spousePenGross || 0,
          r.w401kGross || 0,
          r.wSavingsGross || 0,
          r.wRothGross || 0,
          r.totalGrossIncome || 0,
          r.taxableIncome || 0,
          r.nonTaxableIncome || 0,
          r.ssTaxes || 0,
          r.otherTaxes || 0,
          r.taxes,
          r.effectiveTaxRate || 0,
          r.balSavings,
          r.balPre,
          r.balRoth,
          r.total,
        ]
          .map((v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v))
          .join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "retirement_results.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  const inputs = {};
  // Collect all input values including spending overrides
  document.querySelectorAll("input, select").forEach((input) => {
    if (input.id && input.id !== "jsonFileInput") {
      inputs[input.id] = input.value;
    }
  });

  const exportData = {
    version: "1.1",
    exportDate: new Date().toISOString(),
    description: "Retirement Calculator Scenario with Spending Overrides",
    inputs: inputs,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retirement_scenario_${
    new Date().toISOString().split("T")[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJSON() {
  const fileInput = $("jsonFileInput");
  fileInput.click();
}

function handleJSONFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".json")) {
    showToast("Invalid File", "Please select a JSON file.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      // Validate the JSON structure
      if (!data.inputs || typeof data.inputs !== "object") {
        showToast(
          "Invalid Format",
          "Invalid JSON file format. Expected retirement calculator scenario data.",
          "error"
        );
        return;
      }

      let loadedCount = 0;
      let totalCount = 0;

      // Load all input values
      Object.entries(data.inputs).forEach(([id, value]) => {
        totalCount++;
        const element = document.getElementById(id);
        if (element) {
          element.value = value;
          loadedCount++;
        } else if (id.startsWith("spending_")) {
          // Handle spending override fields that may not exist yet
          totalCount--; // Don't count these in the totals since they're dynamic
        }
      });

      // If there are spending override fields in the import, regenerate the fields first
      const hasSpendingOverrides = Object.keys(data.inputs).some((id) =>
        id.startsWith("spending_")
      );
      if (hasSpendingOverrides) {
        regenerateSpendingFields();
        // Now load the spending override values
        Object.entries(data.inputs).forEach(([id, value]) => {
          if (id.startsWith("spending_")) {
            const element = document.getElementById(id);
            if (element) {
              element.value = value;
              loadedCount++;
            }
          }
        });
      }

      // If there are income adjustment fields in the import, regenerate the fields first
      const hasTaxableIncomeOverrides = Object.keys(data.inputs).some((id) =>
        id.startsWith("taxableIncome_")
      );
      const hasTaxFreeIncomeOverrides = Object.keys(data.inputs).some((id) =>
        id.startsWith("taxFreeIncome_")
      );
      if (hasTaxableIncomeOverrides || hasTaxFreeIncomeOverrides) {
        regenerateTaxableIncomeFields();
        regenerateTaxFreeIncomeFields();
        // Now load the income adjustment values
        Object.entries(data.inputs).forEach(([id, value]) => {
          if (
            id.startsWith("taxableIncome_") ||
            id.startsWith("taxFreeIncome_")
          ) {
            const element = document.getElementById(id);
            if (element) {
              element.value = value;
              loadedCount++;
            }
          }
        });
      }

      // Show import summary
      let summary = `Loaded ${loadedCount} of ${totalCount} settings.`;
      if (data.description) {
        summary += `\nDescription: ${data.description}`;
      }
      if (data.exportDate) {
        summary += `\nExported: ${new Date(
          data.exportDate
        ).toLocaleDateString()}`;
      }

      showToast("Import Successful", summary, "success", 7000);
      calc(); // Automatically recalculate
    } catch (error) {
      showToast(
        "Import Error",
        "Error reading JSON file: " + error.message,
        "error"
      );
    }
  };

  reader.readAsText(file);
  // Clear the file input so the same file can be selected again
  event.target.value = "";
}

/**
 * Generate a comprehensive PDF report of the retirement calculation
 */
function generatePDFReport() {
  if (!calculations || calculations.length === 0) {
    showToast(
      "No Data",
      "Please run the calculation first before generating a PDF report.",
      "error"
    );
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const params = parseInputParameters();

    // Color scheme
    const colors = {
      primary: [43, 99, 255], // Blue
      secondary: [110, 168, 254], // Light blue
      success: [69, 212, 131], // Green
      warning: [255, 191, 105], // Orange
      danger: [255, 107, 107], // Red
      dark: [11, 18, 32], // Dark blue
      muted: [124, 141, 181], // Muted blue
      light: [230, 238, 252], // Very light blue
    };

    // Helper functions for styling
    function addColoredRect(x, y, width, height, color, alpha = 0.1) {
      // Calculate lighter color instead of using alpha
      const lightenedColor = color.map((c) =>
        Math.min(255, c + (255 - c) * (1 - alpha))
      );
      doc.setFillColor(lightenedColor[0], lightenedColor[1], lightenedColor[2]);
      doc.rect(x, y, width, height, "F");
    }

    // Page break management
    function checkAndAddPageBreak(currentY, requiredSpace) {
      const pageHeight = 297; // A4 page height in mm
      const bottomMargin = 20; // Space to leave at bottom

      if (currentY + requiredSpace > pageHeight - bottomMargin) {
        doc.addPage();
        return 20; // Start new page at top margin
      }
      return currentY;
    }

    function addSectionHeader(
      title,
      yPos,
      color = colors.primary,
      estimatedSectionHeight = 50
    ) {
      // Check if we need a page break before starting this section
      yPos = checkAndAddPageBreak(yPos, estimatedSectionHeight);

      // Background rectangle
      addColoredRect(15, yPos - 8, 180, 12, color, 0.1);

      // Header text
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, 20, yPos);

      // Reset color
      doc.setTextColor(0, 0, 0);
      return yPos + 15;
    }

    function addKeyValuePair(key, value, yPos, indent = 0, valueColor = null) {
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(key, 20 + indent, yPos);

      if (valueColor) {
        doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        doc.setFont(undefined, "bold");
      }

      doc.text(value, 120, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");

      return yPos + 7;
    }

    // PAGE 1: Executive Summary
    // Header with gradient-like effect
    addColoredRect(0, 0, 210, 40, colors.primary, 0.05);
    addColoredRect(0, 0, 210, 25, colors.primary, 0.1);

    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Retirement Planning Report", 20, 20);

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(
      `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      20,
      32
    );

    doc.setTextColor(0, 0, 0);

    let yPos = 55;

    // Executive Summary with status indicator
    yPos = addSectionHeader("Executive Summary", yPos);

    const last = calculations[calculations.length - 1];
    const fundedTo =
      last.total > 0
        ? params.endAge
        : calculations.reduce(
            (lastGoodAge, r) => (r.total > 0 ? r.age : lastGoodAge),
            params.currentAge
          );
    const isFullyFunded = fundedTo >= params.endAge;

    // Status box - smaller and with custom drawn symbols
    const statusColor = isFullyFunded ? colors.success : colors.danger;
    const statusText = isFullyFunded ? "Fully Funded" : "Funding Shortfall";

    // Smaller status box
    addColoredRect(15, yPos - 3, 180, 15, statusColor, 0.1);

    // Draw custom status symbol
    const symbolX = 22;
    const symbolY = yPos + 4.5; // Vertically center the symbol
    const radius = 3;

    if (isFullyFunded) {
      // Draw green circle with checkmark
      doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
      doc.circle(symbolX, symbolY, radius, "F");

      // Draw checkmark inside circle
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.line(symbolX - 1.5, symbolY, symbolX - 0.5, symbolY + 1);
      doc.line(symbolX - 0.5, symbolY + 1, symbolX + 1.5, symbolY - 1);
    } else {
      // Draw red circle with X
      doc.setFillColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      doc.circle(symbolX, symbolY, radius, "F");

      // Draw X inside circle
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.line(symbolX - 1.5, symbolY - 1.5, symbolX + 1.5, symbolY + 1.5);
      doc.line(symbolX - 1.5, symbolY + 1.5, symbolX + 1.5, symbolY - 1.5);
    }

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Status: ${statusText}`, 30, yPos + 5.5); // Perfect vertical centering

    if (!isFullyFunded) {
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Your retirement funds will last until age ${fundedTo}`,
        20,
        yPos + 12
      );
      yPos += 25; // Extra space for the warning text + more spacing
    } else {
      yPos += 20; // More space when fully funded
    }

    doc.setTextColor(0, 0, 0);

    // Key metrics in a nice layout
    yPos = addKeyValuePair("Current Age:", `${params.currentAge} years`, yPos);
    yPos = addKeyValuePair(
      "Planned Retirement Age:",
      `${params.retireAge} years`,
      yPos
    );
    yPos = addKeyValuePair(
      "Plan Duration:",
      `${params.endAge - params.currentAge} years total`,
      yPos
    );
    yPos = addKeyValuePair(
      "Years to Retirement:",
      `${params.retireAge - params.currentAge} years`,
      yPos
    );
    yPos += 5;

    yPos = addKeyValuePair(
      "Current Total Assets:",
      fmt(params.balPre + params.balRoth + params.balSavings),
      yPos,
      0,
      colors.primary
    );
    yPos = addKeyValuePair(
      "Projected Final Balance:",
      fmt(Math.max(0, last.total)),
      yPos,
      0,
      isFullyFunded ? colors.success : colors.danger
    );
    yPos += 10;

    // Asset allocation with visual representation
    yPos = addSectionHeader(
      "Current Asset Allocation",
      yPos,
      colors.secondary,
      80
    );

    const totalAssets = params.balPre + params.balRoth + params.balSavings;
    const pretaxPct = ((params.balPre / totalAssets) * 100).toFixed(1);
    const rothPct = ((params.balRoth / totalAssets) * 100).toFixed(1);
    const savingsPct = ((params.balSavings / totalAssets) * 100).toFixed(1);

    yPos = addKeyValuePair(
      "Pre-tax (401k/IRA):",
      `${fmt(params.balPre)} (${pretaxPct}%)`,
      yPos,
      0,
      colors.primary
    );
    yPos = addKeyValuePair(
      "Roth IRA/401k:",
      `${fmt(params.balRoth)} (${rothPct}%)`,
      yPos,
      0,
      colors.success
    );
    yPos = addKeyValuePair(
      "Taxable Savings:",
      `${fmt(params.balSavings)} (${savingsPct}%)`,
      yPos,
      0,
      colors.warning
    );

    // Visual asset allocation bars
    const barWidth = 150;
    const barHeight = 8;
    const barStartX = 25;
    yPos += 10;

    // Pre-tax bar
    const pretaxBarWidth = barWidth * (params.balPre / totalAssets);
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(barStartX, yPos, pretaxBarWidth, barHeight, "F");

    // Roth bar
    const rothBarWidth = barWidth * (params.balRoth / totalAssets);
    doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.rect(barStartX + pretaxBarWidth, yPos, rothBarWidth, barHeight, "F");

    // Savings bar
    const savingsBarWidth = barWidth * (params.balSavings / totalAssets);
    doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    doc.rect(
      barStartX + pretaxBarWidth + rothBarWidth,
      yPos,
      savingsBarWidth,
      barHeight,
      "F"
    );

    // Add border around the complete bar
    doc.setDrawColor(150, 150, 150);
    doc.rect(barStartX, yPos, barWidth, barHeight);

    yPos += 25;

    // Chart and Key Assumptions (will add page break if needed)
    // Add the chart
    yPos = addSectionHeader(
      "Balance Projection Chart",
      yPos,
      colors.primary,
      120
    );

    // Get chart data and create a simple line chart
    const chartData = calculations.map((r) => ({ x: r.year, y: r.total }));
    const chartWidth = 170;
    const chartHeight = 80;
    const chartX = 20;
    const chartY = yPos + 15; // Add more space between header and chart

    // Chart background
    addColoredRect(
      chartX - 5,
      chartY - 5,
      chartWidth + 10,
      chartHeight + 10,
      colors.light,
      0.3
    );

    // Find min/max values for scaling
    const maxBalance = Math.max(...chartData.map((d) => d.y));
    const minBalance = Math.min(0, Math.min(...chartData.map((d) => d.y)));
    const balanceRange = maxBalance - minBalance;

    const minYear = Math.min(...chartData.map((d) => d.x));
    const maxYear = Math.max(...chartData.map((d) => d.x));
    const yearRange = maxYear - minYear;

    // Draw grid lines
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);

    // Vertical grid lines (years)
    for (let i = 0; i <= 4; i++) {
      const x = chartX + (chartWidth * i) / 4;
      doc.line(x, chartY, x, chartY + chartHeight);
    }

    // Horizontal grid lines (balance)
    for (let i = 0; i <= 4; i++) {
      const y = chartY + (chartHeight * i) / 4;
      doc.line(chartX, y, chartX + chartWidth, y);
    }

    // Draw the data line
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(2);

    for (let i = 0; i < chartData.length - 1; i++) {
      const point1 = chartData[i];
      const point2 = chartData[i + 1];

      const x1 = chartX + ((point1.x - minYear) / yearRange) * chartWidth;
      const y1 =
        chartY +
        chartHeight -
        ((point1.y - minBalance) / balanceRange) * chartHeight;
      const x2 = chartX + ((point2.x - minYear) / yearRange) * chartWidth;
      const y2 =
        chartY +
        chartHeight -
        ((point2.y - minBalance) / balanceRange) * chartHeight;

      doc.line(x1, y1, x2, y2);
    }

    // Add chart labels
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.setFontSize(8);

    // Y-axis labels (balance)
    for (let i = 0; i <= 4; i++) {
      const balance = minBalance + (balanceRange * i) / 4;
      const y = chartY + chartHeight - (chartHeight * i) / 4;
      doc.text((balance / 1000000).toFixed(1) + "M", chartX - 15, y + 2);
    }

    // X-axis labels (years)
    for (let i = 0; i <= 4; i++) {
      const year = Math.round(minYear + (yearRange * i) / 4);
      const x = chartX + (chartWidth * i) / 4;
      doc.text(year.toString(), x - 8, chartY + chartHeight + 10);
    }

    // Chart title and axis labels
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text(
      "Total Account Balance Over Time",
      chartX + chartWidth / 2 - 35,
      chartY - 10
    );

    doc.setFont(undefined, "normal");
    doc.text("Balance ($M)", chartX - 15, chartY - 15);
    doc.text("Year", chartX + chartWidth / 2 - 10, chartY + chartHeight + 20);

    doc.setTextColor(0, 0, 0);
    yPos = chartY + chartHeight + 30;

    // Key Assumptions
    yPos = addSectionHeader("Key Assumptions", yPos, colors.secondary, 70);

    yPos = addKeyValuePair(
      "Current Annual Spending:",
      fmt(params.spendingToday),
      yPos
    );
    yPos = addKeyValuePair(
      "Inflation Rate:",
      `${(params.inflation * 100).toFixed(1)}%`,
      yPos
    );
    yPos = addKeyValuePair(
      "Annual Spending Decline:",
      `${(params.spendingDecline * 100).toFixed(1)}%`,
      yPos
    );
    yPos = addKeyValuePair("Current Salary:", fmt(params.startingSalary), yPos);
    yPos = addKeyValuePair(
      "Salary Growth Rate:",
      `${(params.salaryGrowth * 100).toFixed(1)}%`,
      yPos
    );
    yPos += 10;

    // Investment returns in a box - dynamic sizing for any number of items
    const investmentReturnsStartY = yPos;

    // Define the investment return items dynamically
    const investmentItems = [
      {
        key: "Pre-tax Accounts:",
        value: `${(params.retPre * 100).toFixed(1)}%`,
      },
      { key: "Roth Accounts:", value: `${(params.retRoth * 100).toFixed(1)}%` },
      {
        key: "Taxable Accounts:",
        value: `${(params.retTax * 100).toFixed(1)}%`,
      },
      // Future investment types can be added here
    ];

    // Calculate required height: header (12) + items (7 each) + padding (5)
    const headerHeight = 12;
    const itemHeight = 7;
    const bottomPadding = 5;
    const boxHeight =
      headerHeight + investmentItems.length * itemHeight + bottomPadding;

    // Draw the box first (background layer)
    addColoredRect(
      15,
      investmentReturnsStartY - 5,
      180,
      boxHeight,
      colors.secondary,
      0.05
    );

    // Draw the content on top
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Expected Investment Returns:", 20, yPos + 5);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    yPos += 12;

    // Draw all investment items dynamically
    investmentItems.forEach((item) => {
      yPos = addKeyValuePair(item.key, item.value, yPos, 5);
    });

    yPos += 10;

    // Income Sources
    yPos = addSectionHeader("Income Sources", yPos, colors.success, 120);

    yPos = addKeyValuePair(
      "Social Security (Annual):",
      fmt(params.ssMonthly * 12),
      yPos
    );
    yPos = addKeyValuePair("SS Starting Age:", `${params.ssStart}`, yPos, 5);
    yPos = addKeyValuePair(
      "SS COLA:",
      `${(params.ssCola * 100).toFixed(1)}%`,
      yPos,
      5
    );
    yPos += 3;

    if (params.penMonthly > 0) {
      yPos = addKeyValuePair(
        "Pension (Annual):",
        fmt(params.penMonthly * 12),
        yPos
      );
      yPos = addKeyValuePair(
        "Pension Starting Age:",
        `${params.penStart}`,
        yPos,
        5
      );
      yPos = addKeyValuePair(
        "Pension COLA:",
        `${(params.penCola * 100).toFixed(1)}%`,
        yPos,
        5
      );
    } else {
      yPos = addKeyValuePair("Pension:", "None", yPos);
    }

    if (params.hasSpouse) {
      yPos += 5;
      addColoredRect(15, yPos - 3, 180, 20, colors.light, 0.3);

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Spouse Information:", 20, yPos + 5);

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      yPos += 12;
      yPos = addKeyValuePair("Spouse Age:", `${params.spouseAge}`, yPos, 5);
      yPos = addKeyValuePair(
        "Spouse SS (Annual):",
        fmt(params.spouseSsMonthly * 12),
        yPos,
        5
      );
      yPos = addKeyValuePair(
        "Spouse Pension (Annual):",
        fmt(params.spousePenMonthly * 12),
        yPos,
        5
      );
    }

    // Add some spacing before detailed analysis
    yPos += 10;

    // Detailed Analysis (will add page break if needed)
    // Working Years Summary
    const workingYears = calculations.filter((c) => c.age < params.retireAge);
    if (workingYears.length > 0) {
      yPos = addSectionHeader(
        "Working Years Analysis",
        yPos,
        colors.primary,
        60
      );

      const totalContributions = workingYears.reduce(
        (sum, year) => sum + year.contrib,
        0
      );
      const totalTaxesPaid = workingYears.reduce(
        (sum, year) => sum + year.taxes,
        0
      );
      const finalWorkingBalance = workingYears[workingYears.length - 1];

      yPos = addKeyValuePair(
        "Years Until Retirement:",
        `${workingYears.length}`,
        yPos
      );
      yPos = addKeyValuePair(
        "Total Contributions:",
        fmt(totalContributions),
        yPos,
        0,
        colors.success
      );
      yPos = addKeyValuePair(
        "Total Taxes Paid:",
        fmt(totalTaxesPaid),
        yPos,
        0,
        colors.danger
      );
      yPos = addKeyValuePair(
        "Balance at Retirement:",
        fmt(finalWorkingBalance.total),
        yPos,
        0,
        colors.primary
      );
      yPos += 15;
    }

    // Retirement Years Summary
    const retirementYears = calculations.filter(
      (c) => c.age >= params.retireAge
    );
    if (retirementYears.length > 0) {
      yPos = addSectionHeader(
        "Retirement Years Analysis",
        yPos,
        colors.secondary,
        70
      );

      const totalRetirementSpending = retirementYears.reduce(
        (sum, year) => sum + year.spend,
        0
      );
      const totalRetirementTaxes = retirementYears.reduce(
        (sum, year) => sum + year.taxes,
        0
      );
      const totalSSIncome = retirementYears.reduce(
        (sum, year) => sum + (year.ss || 0),
        0
      );
      const totalPensionIncome = retirementYears.reduce(
        (sum, year) => sum + (year.pen || 0),
        0
      );
      const totalWithdrawals = retirementYears.reduce(
        (sum, year) => sum + year.wNet,
        0
      );

      yPos = addKeyValuePair(
        "Years in Retirement:",
        `${retirementYears.length}`,
        yPos
      );
      yPos = addKeyValuePair(
        "Total Spending:",
        fmt(totalRetirementSpending),
        yPos,
        0,
        colors.danger
      );
      yPos = addKeyValuePair(
        "Total SS Income:",
        fmt(totalSSIncome),
        yPos,
        0,
        colors.success
      );
      yPos = addKeyValuePair(
        "Total Pension Income:",
        fmt(totalPensionIncome),
        yPos,
        0,
        colors.success
      );
      yPos = addKeyValuePair(
        "Total Account Withdrawals:",
        fmt(totalWithdrawals),
        yPos,
        0,
        colors.warning
      );
      yPos = addKeyValuePair(
        "Total Retirement Taxes:",
        fmt(totalRetirementTaxes),
        yPos,
        0,
        colors.danger
      );
      yPos += 15;
    }

    // Key Year Projections Table with better formatting
    yPos = addSectionHeader("Key Year Projections", yPos, colors.primary, 150);

    // Table header with colored background
    addColoredRect(15, yPos - 5, 180, 12, colors.primary, 0.1);

    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);

    const headers = [
      "Year",
      "Age",
      "Spending",
      "SS",
      "Pension",
      "Withdrawals",
      "Taxes",
      "Balance",
    ];
    const colWidths = [20, 15, 25, 20, 25, 25, 20, 25];
    let xPos = 20;

    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");

    // Show key years with alternating row colors
    const keyYears = calculations.filter((calc, index) => {
      const isEveryFifthYear = index % 5 === 0;
      const isLastWorkingYear = calc.age === params.retireAge - 1;
      const isFirstRetirementYear = calc.age === params.retireAge;
      const isLastYear = index === calculations.length - 1;
      const isFirstYear = index === 0;
      return (
        isEveryFifthYear ||
        isLastWorkingYear ||
        isFirstRetirementYear ||
        isLastYear ||
        isFirstYear
      );
    });

    keyYears.forEach((calc, index) => {
      if (yPos > 270) {
        // Page break
        doc.addPage();
        yPos = 20;
        // Repeat headers
        addColoredRect(15, yPos - 5, 180, 12, colors.primary, 0.1);
        doc.setFont(undefined, "bold");
        doc.setTextColor(
          colors.primary[0],
          colors.primary[1],
          colors.primary[2]
        );
        xPos = 20;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos + 5);
          xPos += colWidths[i];
        });
        yPos += 15;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");
      }

      // Alternating row background
      if (index % 2 === 0) {
        addColoredRect(15, yPos - 3, 180, 8, colors.light, 0.3);
      }

      // Highlight retirement transition
      if (calc.age === params.retireAge) {
        addColoredRect(15, yPos - 3, 180, 8, colors.warning, 0.2);
      }

      const values = [
        calc.year.toString(),
        calc.age.toString(),
        calc.spend ? "$" + (calc.spend / 1000).toFixed(0) + "k" : "",
        calc.ss ? "$" + (calc.ss / 1000).toFixed(0) + "k" : "",
        calc.pen ? "$" + (calc.pen / 1000).toFixed(0) + "k" : "",
        calc.wNet ? "$" + (calc.wNet / 1000).toFixed(0) + "k" : "",
        calc.taxes ? "$" + (calc.taxes / 1000).toFixed(0) + "k" : "",
        "$" + (calc.total / 1000).toFixed(0) + "k",
      ];

      xPos = 20;
      values.forEach((value, i) => {
        // Color code negative balances
        if (i === 7 && calc.total < 0) {
          doc.setTextColor(
            colors.danger[0],
            colors.danger[1],
            colors.danger[2]
          );
          doc.setFont(undefined, "bold");
        }

        doc.text(value, xPos, yPos + 2);

        // Reset formatting
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");

        xPos += colWidths[i];
      });
      yPos += 8;
    });

    // Disclaimers (will add page break if needed)
    yPos = addSectionHeader("Important Disclaimers", yPos, colors.danger, 200);

    addColoredRect(15, yPos - 5, 180, 140, colors.warning, 0.05);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    const disclaimers = [
      "This retirement planning report is for educational and informational purposes only.",
      "It should not be considered as financial, investment, or tax advice. The projections",
      "are based on the assumptions you provided and are estimates only.",
      "",
      "Key Limitations:",
      "• Market returns are unpredictable and may vary significantly from assumptions",
      "• Tax laws and Social Security rules may change over time",
      "• Healthcare costs and long-term care needs are not explicitly modeled",
      "• Inflation may vary from the assumed rate",
      "• Individual circumstances may require different strategies",
      "• Sequence of returns risk is not modeled",
      "",
      "Important Considerations:",
      "• This model uses simplified tax calculations",
      "• RMD rules may change in the future",
      "• Social Security benefits may be reduced if the trust fund is depleted",
      "• Healthcare inflation typically exceeds general inflation",
      "• Long-term care costs can be substantial",
      "",
      "Recommendations:",
      "• Consult with a qualified financial advisor before making investment decisions",
      "• Review and update your retirement plan regularly (annually recommended)",
      "• Consider multiple scenarios with different assumptions",
      "• Factor in emergency funds and unexpected expenses",
      "• Consider professional tax planning advice",
      "• Review beneficiary designations regularly",
      "",
      "This calculator uses simplified models and may not capture all aspects of",
      "retirement planning. Professional advice is recommended for comprehensive",
      "retirement planning tailored to your specific situation.",
    ];

    disclaimers.forEach((line) => {
      if (yPos > 280) {
        // Page break
        doc.addPage();
        yPos = 20;
      }
      if (line === "") {
        yPos += 5;
      } else {
        doc.text(line, 20, yPos, { maxWidth: 170 });
        yPos += 7;
      }
    });

    // Footer on last page
    yPos = 280;
    doc.setFontSize(8);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(
      `Generated by Retirement Calculator • ${new Date().toLocaleDateString()}`,
      20,
      yPos
    );
    doc.text(
      "This report contains confidential financial information",
      120,
      yPos
    );

    // Open PDF in new tab instead of downloading
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");

    // Clean up the URL after a delay to free memory
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

    showToast("PDF Generated", "PDF report opened in new tab", "success");
  } catch (error) {
    console.error("PDF generation error:", error);
    showToast(
      "PDF Error",
      "Error generating PDF report: " + error.message,
      "error"
    );
  }
}

// Events
$("calcBtn").addEventListener("click", calc);
$("pdfBtn").addEventListener("click", generatePDFReport);
$("csvBtn").addEventListener("click", exportCSV);
$("exportJsonBtn").addEventListener("click", exportJSON);
$("importJsonBtn").addEventListener("click", importJSON);
$("jsonFileInput").addEventListener("change", handleJSONFile);
$("clearBtn").addEventListener("click", resetAll);
$("useCurrentYearValues").addEventListener("change", function () {
  updateSpendingFieldsDisplayMode();
});
$("useTaxableCurrentYearValues").addEventListener("change", function () {
  updateTaxableIncomeFieldsDisplayMode();
});
$("useTaxFreeCurrentYearValues").addEventListener("change", function () {
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
    const match = onclickAttr.match(
      /showHelpToast\(event,\s*['"]([^'"]+)['"]\)/
    );
    if (match) {
      const fieldId = match[1];
      const placeholder = document.createElement("span");
      placeholder.className = "help-icon-placeholder";
      placeholder.setAttribute("data-field", fieldId);
      placeholder.innerHTML = createHelpIcon(fieldId);
      svg.parentNode.replaceChild(placeholder, svg);
    }
  });
}

// SS Breakdown Popup Functions
function showSsBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation || !calculation.ss) {
    return; // No SS data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Get the breakdown data from the calculation
  const ssBreakdown = calculation.ssBreakdown || {};
  const details = ssBreakdown.calculationDetails || {};

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">SS Monthly Benefit:</span>
        <span class="ss-breakdown-value">${fmt(
          (ssBreakdown.ssGross || 0) / 12
        )}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">SS Gross Annual:</span>
        <span class="ss-breakdown-value">${fmt(ssBreakdown.ssGross || 0)}</span>
    </div>
    `;

  // Add detailed calculation steps based on method
  if (details.method === "irs-rules") {
    breakdownHtml += `
        <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">IRS SS Taxation Calculation:</strong>
        <div style="margin-top: 8px;">
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
            <span class="ss-breakdown-label">Other Taxable Income:</span>
            <span class="ss-breakdown-value">${fmt(
              ssBreakdown.otherTaxableIncome || 0
            )}</span>
            </div>
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
            <span class="ss-breakdown-label">+ 50% of SS Benefits:</span>
            <span class="ss-breakdown-value">${fmt(
              (ssBreakdown.ssGross || 0) * 0.5
            )}</span>
            </div>
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; font-weight: 600; border-top: 1px solid var(--border); margin-top: 4px;">
            <span class="ss-breakdown-label">= Provisional Income:</span>
            <span class="ss-breakdown-value">${fmt(
              details.provisionalIncome || 0
            )}</span>
            </div>
        </div>
        
        <div style="margin-top: 12px;">
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
            <strong>Thresholds (${
              calculation.age >= 65
                ? "Filing Status: " +
                  (details.threshold1 === 32000 ? "Married" : "Single")
                : "Single/Married"
            }):</strong><br/>
            • Tier 1: $${details.threshold1?.toLocaleString()} (0% → 50% taxable)<br/>
            • Tier 2: $${details.threshold2?.toLocaleString()} (50% → 85% taxable)
            </div>
    `;

    if (details.provisionalIncome <= details.threshold1) {
      breakdownHtml += `
            <div style="color: var(--good);">
            ✓ Provisional income ≤ $${details.threshold1.toLocaleString()}<br/>
            → 0% of SS benefits are taxable
            </div>
        `;
    } else if (details.provisionalIncome <= details.threshold2) {
      breakdownHtml += `
            <div style="color: var(--warn);">
            ⚠ Provisional income between $${details.threshold1.toLocaleString()} and $${details.threshold2.toLocaleString()}<br/>
            → Up to 50% of SS benefits may be taxable<br/>
            <div style="margin-top: 4px; font-size: 11px;">
                Excess over threshold: ${fmt(details.excessIncome1)}<br/>
                Taxable amount: min(50% of SS, 50% of excess) = ${fmt(
                  details.tier1Amount
                )}
            </div>
            </div>
        `;
    } else {
      breakdownHtml += `
            <div style="color: var(--bad);">
            ⚠ Provisional income > $${details.threshold2.toLocaleString()}<br/>
            → Up to 85% of SS benefits may be taxable<br/>
            <div style="margin-top: 4px; font-size: 11px;">
                Tier 1 (50%): ${fmt(details.tier1Amount)}<br/>
                Tier 2 (85% of excess over $${details.threshold2.toLocaleString()}): ${fmt(
        details.tier2Amount
      )}<br/>
                85% of SS benefits: ${fmt(
                  (ssBreakdown.ssGross || 0) * 0.85
                )}<br/>
                Total taxable: min(85% of SS, Tier 1 + Tier 2) = ${fmt(
                  details.tier1Amount + details.tier2Amount
                )}
            </div>
            </div>
        `;
    }

    breakdownHtml += `</div>`;
  } else if (details.method === "simplified") {
    breakdownHtml += `
        <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Simplified SS Taxation:</strong>
        <div style="margin-top: 8px; font-size: 12px; color: var(--muted);">
            Using simplified assumption that 85% of SS benefits are taxable.
        </div>
        </div>
    `;
  }

  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Taxable Amount:</span>
        <span class="ss-breakdown-value">${fmt(
          ssBreakdown.ssTaxableAmount || 0
        )}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Non-Taxable Amount:</span>
        <span class="ss-breakdown-value">${fmt(
          ssBreakdown.ssNonTaxable || 0
        )}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Effective Tax Rate:</span>
        <span class="ss-breakdown-value">${
          details.effectiveRate ? details.effectiveRate.toFixed(1) + "%" : "N/A"
        }</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Federal Taxes:</span>
        <span class="ss-breakdown-value">${fmt(ssBreakdown.ssTaxes || 0)}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Net Amount (Take Home):</span>
        <span class="ss-breakdown-value">${fmt(calculation.ss)}</span>
    </div>
    `;

  // Add taxation method explanation
  const params = parseInputParameters();
  if (params.useSSRules) {
    breakdownHtml += `
        <div style="margin-top: 16px; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px; font-size: 12px; color: var(--muted);">
        <strong>About IRS SS Rules:</strong><br/>
        Social Security taxation is based on "provisional income" which includes your taxable income plus 50% of your SS benefits. The percentage of SS benefits that become taxable depends on income thresholds that vary by filing status.
        </div>
    `;
  } else {
    breakdownHtml += `
        <div style="margin-top: 16px; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px; font-size: 12px; color: var(--muted);">
        <strong>About Simplified Method:</strong><br/>
        Using simplified assumption that 85% of SS benefits are taxable regardless of income level. This provides a conservative estimate but may not reflect actual taxation.
        </div>
    `;
  }

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

function closeSsPopup() {
  const popup = document.getElementById("ssPopup");
  popup.classList.remove("show");
}

// Function to show taxable income breakdown popup
function showTaxableIncomeBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation) {
    return; // No data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Update popup title
  const title = popup.querySelector(".ss-popup-title");
  if (title) {
    title.textContent = "Taxable Income Breakdown";
  }

  // Update close button to use the general close function
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeSsPopup();
    };
  } // Build the breakdown content showing sources of taxable income
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
  `;

  let grossTaxableTotal = 0;

  // Add taxable income sources
  if (calculation.salary && calculation.salary > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Salary:</span>
          <span class="ss-breakdown-value">${fmt(calculation.salary)}</span>
      </div>
    `;
    grossTaxableTotal += calculation.salary;
  }

  if (calculation.taxableInterest && calculation.taxableInterest > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Taxable Interest:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.taxableInterest
          )}</span>
      </div>
    `;
    grossTaxableTotal += calculation.taxableInterest;
  }

  // Social Security gross (before calculating taxable portion)
  if (calculation.ssGross && calculation.ssGross > 0) {
    const ssTaxableAmount =
      calculation.ssBreakdown?.ssTaxableAmount || calculation.ssGross * 0.85; // Estimate if not available
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security (Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(ssTaxableAmount)}</span>
      </div>
    `;
    grossTaxableTotal += ssTaxableAmount;
  }

  // Pension gross (typically fully taxable)
  if (calculation.penGross && calculation.penGross > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension:</span>
          <span class="ss-breakdown-value">${fmt(calculation.penGross)}</span>
      </div>
    `;
    grossTaxableTotal += calculation.penGross;
  }

  // Spouse Social Security gross
  if (calculation.spouseSsGross && calculation.spouseSsGross > 0) {
    const spouseSsTaxableAmount =
      calculation.spouseSsBreakdown?.ssTaxableAmount ||
      calculation.spouseSsGross * 0.85; // Estimate if not available
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Spouse Social Security (Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(spouseSsTaxableAmount)}</span>
      </div>
    `;
    grossTaxableTotal += spouseSsTaxableAmount;
  }

  // Spouse Pension gross
  if (calculation.spousePenGross && calculation.spousePenGross > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Spouse Pension:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.spousePenGross
          )}</span>
      </div>
    `;
    grossTaxableTotal += calculation.spousePenGross;
  }

  // Pre-tax withdrawals (401k)
  if (calculation.w401kGross && calculation.w401kGross > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">401k Withdrawals:</span>
          <span class="ss-breakdown-value">${fmt(calculation.w401kGross)}</span>
      </div>
    `;
    grossTaxableTotal += calculation.w401kGross;
  }

  // Add separator and totals
  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label"><strong>Gross Taxable Income:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          grossTaxableTotal
        )}</strong></span>
    </div>
  `;

  // Add standard deduction info
  const filingStatusElement = document.getElementById("filingStatus");
  const filingStatus = filingStatusElement
    ? filingStatusElement.value
    : "single";
  const standardDeduction = filingStatus === "married" ? 29200 : 14600; // 2024 values

  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Less: Standard Deduction:</span>
        <span class="ss-breakdown-value">-${fmt(standardDeduction)}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label"><strong>Net Taxable Income:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          calculation.taxableIncome ||
            Math.max(0, grossTaxableTotal - standardDeduction)
        )}</strong></span>
    </div>
  `;

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

// Function to show non-taxable income breakdown popup
function showNonTaxableIncomeBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation) {
    return; // No data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Update popup title
  const title = popup.querySelector(".ss-popup-title");
  if (title) {
    title.textContent = "Non-Taxable Income Breakdown";
  }

  // Update close button to use the general close function
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeSsPopup();
    };
  }

  // Build the breakdown content showing sources of non-taxable income
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
  `;

  let nonTaxableTotal = 0;

  // Social Security non-taxable portion
  if (calculation.ssGross && calculation.ssGross > 0) {
    const ssNonTaxableAmount =
      calculation.ssBreakdown?.ssNonTaxable || calculation.ssGross * 0.15; // Estimate if not available
    if (ssNonTaxableAmount > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item">
            <span class="ss-breakdown-label">Social Security (Non-Taxable Portion):</span>
            <span class="ss-breakdown-value">${fmt(ssNonTaxableAmount)}</span>
        </div>
      `;
      nonTaxableTotal += ssNonTaxableAmount;
    }
  }

  // Spouse Social Security non-taxable portion
  if (calculation.spouseSsGross && calculation.spouseSsGross > 0) {
    const spouseSsNonTaxableAmount =
      calculation.spouseSsBreakdown?.ssNonTaxable ||
      calculation.spouseSsGross * 0.15; // Estimate if not available
    if (spouseSsNonTaxableAmount > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item">
            <span class="ss-breakdown-label">Spouse Social Security (Non-Taxable Portion):</span>
            <span class="ss-breakdown-value">${fmt(
              spouseSsNonTaxableAmount
            )}</span>
        </div>
      `;
      nonTaxableTotal += spouseSsNonTaxableAmount;
    }
  }

  // Pension non-taxable portion (usually none, but could be from Roth 401k)
  if (
    calculation.penBreakdown?.penNonTaxable &&
    calculation.penBreakdown.penNonTaxable > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension (Non-Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.penBreakdown.penNonTaxable
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.penBreakdown.penNonTaxable;
  }

  // Spouse Pension non-taxable portion
  if (
    calculation.spousePenBreakdown?.penNonTaxable &&
    calculation.spousePenBreakdown.penNonTaxable > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Spouse Pension (Non-Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.spousePenBreakdown.penNonTaxable
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.spousePenBreakdown.penNonTaxable;
  }

  // Savings withdrawals (after-tax money)
  if (calculation.wSavingsGross && calculation.wSavingsGross > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Savings Withdrawals:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.wSavingsGross
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.wSavingsGross;
  }

  // Roth withdrawals (tax-free)
  if (calculation.wRothGross && calculation.wRothGross > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Roth Withdrawals:</span>
          <span class="ss-breakdown-value">${fmt(calculation.wRothGross)}</span>
      </div>
    `;
    nonTaxableTotal += calculation.wRothGross;
  }

  // Tax-free income adjustments (gifts, inheritance, etc.)
  if (
    calculation.taxFreeIncomeAdjustment &&
    calculation.taxFreeIncomeAdjustment > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Tax-Free Income Adjustments:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.taxFreeIncomeAdjustment
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.taxFreeIncomeAdjustment;
  }

  // Add total
  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label"><strong>Total Non-Taxable Income:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          nonTaxableTotal
        )}</strong></span>
    </div>
  `;

  // Add explanatory note
  breakdownHtml += `
    <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
        <span class="ss-breakdown-label" style="font-size: 12px; color: var(--muted);">Note:</span>
        <span class="ss-breakdown-value" style="font-size: 12px; color: var(--muted);">This income is not subject to federal income tax</span>
    </div>
  `;

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

// Function to show total taxes breakdown popup
function showTotalTaxesBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation) {
    return; // No data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Update popup title
  const title = popup.querySelector(".ss-popup-title");
  if (title) {
    title.textContent = "Total Taxes Breakdown";
  }

  // Update close button to use the general close function
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeSsPopup();
    };
  }

  // Build the breakdown content showing sources of taxes
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
  `;

  let totalTaxes = 0;

  // Social Security taxes
  if (calculation.ssTaxes && calculation.ssTaxes > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security Taxes:</span>
          <span class="ss-breakdown-value">${fmt(calculation.ssTaxes)}</span>
      </div>
    `;
    totalTaxes += calculation.ssTaxes;
  }

  // Other taxes (income taxes on pre-tax withdrawals, pensions, etc.)
  if (calculation.otherTaxes && calculation.otherTaxes > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Income Taxes:</span>
          <span class="ss-breakdown-value">${fmt(calculation.otherTaxes)}</span>
      </div>
    `;
    totalTaxes += calculation.otherTaxes;

    // Add breakdown of what income taxes include
    breakdownHtml += `<div style="margin-left: 20px;">`;

    if (calculation.penTaxes && calculation.penTaxes > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item" style="font-size: 12px; color: var(--muted);">
            <span class="ss-breakdown-label">• Taxes on pension income</span>
            <span class="ss-breakdown-value">${fmt(calculation.penTaxes)}</span>
        </div>
      `;
    }

    if (calculation.withdrawalTaxes && calculation.withdrawalTaxes > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item" style="font-size: 12px; color: var(--muted);">
            <span class="ss-breakdown-label">• Taxes on 401k withdrawals</span>
            <span class="ss-breakdown-value">${fmt(
              calculation.withdrawalTaxes
            )}</span>
        </div>
      `;
    }

    // Calculate other income taxes (like taxable interest)
    const otherIncomeTaxes =
      calculation.otherTaxes -
      (calculation.penTaxes || 0) -
      (calculation.withdrawalTaxes || 0);
    if (otherIncomeTaxes > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item" style="font-size: 12px; color: var(--muted);">
            <span class="ss-breakdown-label">• Taxes on taxable interest</span>
            <span class="ss-breakdown-value">${fmt(otherIncomeTaxes)}</span>
        </div>
      `;
    }

    breakdownHtml += `</div>`;
  }

  // Add total
  breakdownHtml += `
    <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--border);">
        <span class="ss-breakdown-label"><strong>Total Taxes:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          totalTaxes
        )}</strong></span>
    </div>
  `;

  // Add effective tax rate if available
  if (calculation.effectiveTaxRate) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Effective Tax Rate:</span>
          <span class="ss-breakdown-value">${calculation.effectiveTaxRate.toFixed(
            1
          )}%</span>
      </div>
    `;
  }

  // Add explanatory note
  breakdownHtml += `
    <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
        <span class="ss-breakdown-label" style="font-size: 12px; color: var(--muted);">Note:</span>
        <span class="ss-breakdown-value" style="font-size: 12px; color: var(--muted);">These are federal taxes only. State taxes not included.</span>
    </div>
  `;

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

// Close popup with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const ssPopup = document.getElementById("ssPopup");
    if (ssPopup && ssPopup.classList.contains("show")) {
      // Check if this is being used for Total Net (has the dataset markers)
      if (ssPopup.dataset.originalTitle) {
        closeTotalNetPopup();
      } else {
        closeSsPopup();
      }
    }
  }
});

/**
 * Show Total Net Income breakdown popup
 */
function showTotalNetBreakdown(index) {
  if (!calculations || !calculations[index]) {
    console.error("No calculation data available for index:", index);
    return;
  }

  const data = calculations[index];

  // Use SS popup structure for Total Net breakdown
  const ssPopup = document.getElementById("ssPopup");
  if (ssPopup) {
    const ssContent = document.getElementById("ssBreakdownContent");
    if (ssContent) {
      // Update popup title - use the actual class names
      const popupHeader = ssPopup.querySelector("h3.ss-popup-title");
      if (popupHeader) {
        popupHeader.textContent = `Total Net Income Breakdown - Age ${data.age}`;
      }

      // Update close button - use the actual class name
      const closeBtn = ssPopup.querySelector("button.ss-popup-close");
      if (closeBtn) {
        closeBtn.onclick = function () {
          closeTotalNetPopup();
        };
      }

      // Store original title and close function to restore later
      if (!ssPopup.dataset.originalTitle) {
        ssPopup.dataset.originalTitle = "Social Security Breakdown";
        ssPopup.dataset.originalClose = "closeSsPopup()";
      }

      // Generate full breakdown content
      ssContent.innerHTML = generateTotalNetBreakdownContent(data);

      // Set display to flex to override the CSS !important rule
      ssPopup.style.setProperty("display", "flex", "important");
      ssPopup.style.setProperty("align-items", "center", "important");
      ssPopup.style.setProperty("justify-content", "center", "important");
      return;
    }
  }

  // Fallback: Create popup if SS popup doesn't exist
  let popup = document.getElementById("totalNetPopup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "totalNetPopup";
    popup.className = "popup-overlay";
    popup.innerHTML = `
      <div class="popup-content">
        <div class="popup-header">
          <h3>Total Net Income Breakdown - Age ${data.age}</h3>
          <button class="close-btn" onclick="closeTotalNetPopup()">&times;</button>
        </div>
        <div class="popup-body" id="totalNetBreakdownContent">
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  }

  // Update content
  const content = document.getElementById("totalNetBreakdownContent");
  content.innerHTML = generateTotalNetBreakdownContent(data);

  popup.style.display = "block";
}

/**
 * Generate the detailed breakdown content for Total Net Income
 */
function generateTotalNetBreakdownContent(data) {
  const fmt = (val) =>
    val == null || val === 0 ? "-" : `$${Math.round(val).toLocaleString()}`;

  let html = `
    <div class="breakdown-section">
      <h4>Gross Income Sources (Before Taxes)</h4>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Social Security (Gross)
  if (data.ssGross > 0) {
    html += `
      <tr>
        <td>Social Security</td>
        <td class="amount">${fmt(data.ssGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Spouse Social Security (Gross)
  if (data.spouseSsGross > 0) {
    html += `
      <tr>
        <td>Spouse Social Security</td>
        <td class="amount">${fmt(data.spouseSsGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Pension (Gross)
  if (data.penGross > 0) {
    html += `
      <tr>
        <td>Pension</td>
        <td class="amount">${fmt(data.penGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Spouse Pension (Gross)
  if (data.spousePenGross > 0) {
    html += `
      <tr>
        <td>Spouse Pension</td>
        <td class="amount">${fmt(data.spousePenGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Withdrawals (Gross)
  if (data.wGross > 0) {
    html += `
      <tr>
        <td>Portfolio Withdrawals</td>
        <td class="amount">${fmt(data.wGross)}</td>
        <td>Before taxes and penalties</td>
      </tr>
    `;
  }

  // Taxable Interest
  if (data.taxableInterest > 0) {
    html += `
      <tr>
        <td>Taxable Interest</td>
        <td class="amount">${fmt(data.taxableInterest)}</td>
        <td>Interest income</td>
      </tr>
    `;
  }

  // Calculate and add total for Gross Income Sources
  const grossIncomeTotal =
    (data.ssGross || 0) +
    (data.spouseSsGross || 0) +
    (data.penGross || 0) +
    (data.spousePenGross || 0) +
    (data.wGross || 0) +
    (data.taxableInterest || 0);

  html += `
          <tr class="total-row">
            <td><strong>Total Gross Income</strong></td>
            <td class="amount total"><strong>${fmt(
              grossIncomeTotal
            )}</strong></td>
            <td><strong>Before all taxes</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  html += `
    <div class="breakdown-section">
      <h4>Income Sources (Net After Taxes)</h4>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Social Security (Net)
  if (data.ss > 0) {
    html += `
      <tr>
        <td>Social Security</td>
        <td class="amount">${fmt(data.ss)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Spouse Social Security (Net)
  if (data.spouseSs > 0) {
    html += `
      <tr>
        <td>Spouse Social Security</td>
        <td class="amount">${fmt(data.spouseSs)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Pension (Net)
  if (data.pen > 0) {
    html += `
      <tr>
        <td>Pension</td>
        <td class="amount">${fmt(data.pen)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Spouse Pension (Net)
  if (data.spousePen > 0) {
    html += `
      <tr>
        <td>Spouse Pension</td>
        <td class="amount">${fmt(data.spousePen)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Withdrawals (Net)
  if (data.wNet > 0) {
    html += `
      <tr>
        <td>Portfolio Withdrawals</td>
        <td class="amount">${fmt(data.wNet)}</td>
        <td>After taxes and penalties</td>
      </tr>
    `;
  }

  // Tax-Free Income Adjustments (if any)
  const taxFreeAdjustment =
    data.totalNetIncome -
    (data.ss + data.spouseSs + data.pen + data.spousePen + data.wNet);
  if (taxFreeAdjustment > 0) {
    html += `
      <tr>
        <td>Tax-Free Income</td>
        <td class="amount">${fmt(taxFreeAdjustment)}</td>
        <td>Additional tax-free income</td>
      </tr>
    `;
  }

  // Calculate and add total for Net Income Sources
  const netIncomeTotal =
    (data.ss || 0) +
    (data.spouseSs || 0) +
    (data.pen || 0) +
    (data.spousePen || 0) +
    (data.wNet || 0) +
    (taxFreeAdjustment > 0 ? taxFreeAdjustment : 0);

  html += `
          <tr class="total-row">
            <td><strong>Total Net Income</strong></td>
            <td class="amount total"><strong>${fmt(
              netIncomeTotal
            )}</strong></td>
            <td><strong>After all taxes</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Show withdrawal breakdown if there were withdrawals
  if (data.wNet > 0) {
    html += `
      <div class="breakdown-section">
        <h4>Withdrawal Breakdown</h4>
        <table class="breakdown-table">
          <thead>
            <tr>
              <th>Account Type</th>
              <th>Gross Withdrawal</th>
              <th>Tax Treatment</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (data.wSavingsGross > 0) {
      html += `
        <tr>
          <td>Savings</td>
          <td class="amount">${fmt(data.wSavingsGross)}</td>
          <td>Tax-free (already taxed)</td>
        </tr>
      `;
    }

    if (data.wRothGross > 0) {
      html += `
        <tr>
          <td>Roth IRA/401k</td>
          <td class="amount">${fmt(data.wRothGross)}</td>
          <td>Tax-free qualified distribution</td>
        </tr>
      `;
    }

    if (data.w401kGross > 0) {
      const withdrawalTaxes =
        data.w401kGross -
        (data.wNet - (data.wSavingsGross || 0) - (data.wRothGross || 0));
      html += `
        <tr>
          <td>Pre-Tax 401k/IRA</td>
          <td class="amount">${fmt(data.w401kGross)}</td>
          <td>Taxable as ordinary income</td>
        </tr>
      `;
      if (withdrawalTaxes > 0) {
        html += `
          <tr>
            <td style="padding-left: 20px;">• Taxes on pre-tax withdrawal</td>
            <td class="amount negative">-${fmt(withdrawalTaxes)}</td>
            <td>Federal income tax</td>
          </tr>
        `;
      }
    }

    // Calculate and add total for Withdrawal Breakdown
    const withdrawalTaxes =
      data.w401kGross > 0
        ? data.w401kGross -
          (data.wNet - (data.wSavingsGross || 0) - (data.wRothGross || 0))
        : 0;
    const withdrawalNetTotal =
      (data.wSavingsGross || 0) +
      (data.wRothGross || 0) +
      (data.w401kGross || 0) -
      (withdrawalTaxes > 0 ? withdrawalTaxes : 0);

    html += `
          <tr class="total-row">
            <td><strong>Total Net Withdrawals</strong></td>
            <td class="amount total"><strong>${fmt(
              withdrawalNetTotal
            )}</strong></td>
            <td><strong>After taxes</strong></td>
          </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Summary section - only include taxable gross income sources
  const totalGrossIncome =
    (data.ssGross || 0) +
    (data.spouseSsGross || 0) +
    (data.penGross || 0) +
    (data.spousePenGross || 0) +
    (data.w401kGross || 0) + // Only pre-tax withdrawals, not savings/Roth
    (data.taxableInterest || 0);
  const totalTaxes = data.taxes || 0;
  const totalNetIncome = data.totalNetIncome;

  // Calculate Total Taxable Income more accurately
  // Start with fully taxable income (pensions, pre-tax withdrawals, interest)
  const fullyTaxableIncome =
    (data.penGross || 0) +
    (data.spousePenGross || 0) +
    (data.w401kGross || 0) +
    (data.taxableInterest || 0);

  // For SS, the taxable portion is typically what was used to calculate ssTaxes
  // If we have ssTaxes, we can estimate the taxable SS amount
  const estimatedTaxableSS =
    (data.ssTaxes || 0) > 0
      ? // Estimate based on taxes paid vs estimated effective rate
        Math.min(
          (data.ssGross || 0) + (data.spouseSsGross || 0),
          ((data.ssGross || 0) + (data.spouseSsGross || 0)) * 0.85
        )
      : 0;

  const totalTaxableIncome = fullyTaxableIncome + estimatedTaxableSS;

  html += `
    <div class="breakdown-section summary-section">
      <h4>Summary</h4>
      <table class="breakdown-table">
        <tbody>
          <tr>
            <td><strong>Gross Revenue</strong></td>
            <td class="amount"><strong>${fmt(totalGrossIncome)}</strong></td>
            <td>Before taxes</td>
          </tr>
          <tr>
            <td><strong>Taxable Income</strong></td>
            <td class="amount"><strong>${fmt(totalTaxableIncome)}</strong></td>
            <td>Subject to federal tax</td>
          </tr>
          <tr>
            <td><strong>Taxes Paid</strong></td>
            <td class="amount negative"><strong>-${fmt(
              totalTaxes
            )}</strong></td>
            <td>Federal income tax</td>
          </tr>
          <tr class="total-row">
            <td><strong>Realized Revenue</strong></td>
            <td class="amount total"><strong>${fmt(
              totalNetIncome
            )}</strong></td>
            <td><strong>Available for spending</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Tax details section
  if (totalTaxes > 0) {
    html += `
      <div class="breakdown-section">
        <h4>Tax Details</h4>
        <table class="breakdown-table">
          <tbody>
    `;

    if (data.ssTaxes > 0) {
      html += `
        <tr>
          <td>Social Security Taxes</td>
          <td class="amount">${fmt(data.ssTaxes)}</td>
          <td>Federal tax on SS benefits</td>
        </tr>
      `;
    }

    if (data.otherTaxes > 0) {
      html += `
        <tr>
          <td>Other Income Taxes</td>
          <td class="amount">${fmt(data.otherTaxes)}</td>
          <td>Tax on pensions, withdrawals, interest</td>
        </tr>
      `;
    }

    if (data.effectiveTaxRate) {
      html += `
        <tr>
          <td><strong>Effective Tax Rate</strong></td>
          <td class="amount"><strong>${data.effectiveTaxRate.toFixed(
            1
          )}%</strong></td>
          <td>Total taxes ÷ taxable income</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Add note about calculations
  html += `
    <div class="breakdown-section note">
      <p style="font-size: 0.65em;"><strong>Note:</strong> This breakdown shows how your Total Net Income is calculated from all sources after federal taxes. 
      Amounts may not add exactly due to rounding. Social Security taxation follows IRS provisional income rules.</p>
    </div>
  `;

  return html;
}

/**
 * Close Total Net breakdown popup
 */
function closeTotalNetPopup() {
  const ssPopup = document.getElementById("ssPopup");
  if (ssPopup) {
    // Restore original title and close function
    const popupHeader = ssPopup.querySelector("h3.ss-popup-title");
    if (popupHeader && ssPopup.dataset.originalTitle) {
      popupHeader.textContent = ssPopup.dataset.originalTitle;
    }

    const closeBtn = ssPopup.querySelector("button.ss-popup-close");
    if (closeBtn && ssPopup.dataset.originalClose) {
      // Restore original onclick handler
      closeBtn.onclick = function () {
        closeSsPopup();
      };
    }

    // Clear the dataset markers
    delete ssPopup.dataset.originalTitle;
    delete ssPopup.dataset.originalClose;

    // Close the popup
    ssPopup.style.setProperty("display", "none", "important");
  }
}

// Withdrawal Net Breakdown Popup Functions
function showWithdrawalNetBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation || !calculation.wNet || !calculation.withdrawalBreakdown) {
    return; // No withdrawal data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Get the breakdown data from the calculation
  const withdrawalBreakdown = calculation.withdrawalBreakdown;

  if (calculation.age == 72) {
    debugger;
  }

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
    `;

  // Show withdrawal breakdown
  breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Withdrawal Net Breakdown:</strong>
        <div style="margin-top: 8px;">`;

  // Show 401k withdrawals
  if (withdrawalBreakdown.pretax401kNet > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">401k Net:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.pretax401kNet
                )}</span>
            </div>`;
  }

  // Show savings withdrawals
  if (withdrawalBreakdown.savingsNet > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">Savings Net:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.savingsNet
                )}</span>
            </div>`;
  }

  // Show Roth withdrawals
  if (withdrawalBreakdown.rothNet > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">Roth Net:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.rothNet
                )}</span>
            </div>`;
  }

  breakdownHtml += `
        </div>
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(110, 168, 254, 0.3);">
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; font-weight: bold;">
                <span class="ss-breakdown-label">Total Net Withdrawals:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.totalNet
                )}</span>
            </div>
        </div>
    </div>`;

  // Set popup content
  content.innerHTML = breakdownHtml;

  // Set popup title
  const popupHeader = popup.querySelector("h3.ss-popup-title");
  if (popupHeader) {
    popupHeader.textContent = `Withdrawal Net Breakdown - Age ${calculation.age}`;
  }

  // Set up close button to work properly
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = closeSsPopup;
  }

  // Show popup
  popup.classList.add("show");
}

// Savings Breakdown Popup Functions
function showSavingsBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation || calculation.balSavings === undefined) {
    return; // No savings data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Get the breakdown data from the calculation
  const savingsBreakdown = calculation.savingsBreakdown || {};

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
    `;

  // Show starting balance
  if (savingsBreakdown.startingBalance !== undefined) {
    breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Savings Balance Changes:</strong>
        <div style="margin-top: 8px;">
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">Starting Balance:</span>
                <span class="ss-breakdown-value">${fmt(
                  savingsBreakdown.startingBalance
                )}</span>
            </div>`;
  }

  //debugger;
  // Show withdrawals (negative) - always show for debugging
  if (savingsBreakdown.withdrawals !== undefined) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #ff6b6b;">
                <span class="ss-breakdown-label">Withdrawals:</span>
                <span class="ss-breakdown-value">-${fmt(
                  savingsBreakdown.withdrawals
                )}</span>
            </div>`;
  }

  // Show overage deposits (positive)
  if (savingsBreakdown.overageDeposit > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #51cf66;">
                <span class="ss-breakdown-label">RMD Overage Deposit:</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.overageDeposit
                )}</span>
            </div>`;
  }

  // Show regular deposits (positive) - for working years
  if (savingsBreakdown.regularDeposit > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #51cf66;">
                <span class="ss-breakdown-label">Regular Savings:</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.regularDeposit
                )}</span>
            </div>`;
  }

  // Show tax-free income deposits (positive)
  if (savingsBreakdown.taxFreeIncomeDeposit > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #51cf66;">
                <span class="ss-breakdown-label">Tax-Free Income:</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.taxFreeIncomeDeposit
                )}</span>
            </div>`;
  }

  // Show interest earned - always show for debugging
  if (savingsBreakdown.interestEarned !== undefined) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #339af0;">
                <span class="ss-breakdown-label">Interest Earned (${savingsBreakdown.growthRate.toFixed(
                  1
                )}%):</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.interestEarned
                )}</span>
            </div>`;
  }

  // Show ending balance
  if (savingsBreakdown.endingBalance !== undefined) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border-top: 2px solid var(--accent); margin-top: 8px; padding-top: 8px; font-weight: bold;">
                <span class="ss-breakdown-label">Ending Balance:</span>
                <span class="ss-breakdown-value">${fmt(
                  savingsBreakdown.endingBalance
                )}</span>
            </div>
        </div>
    </div>`;
  }

  content.innerHTML = breakdownHtml;

  // Update popup title
  const title = popup.querySelector(".ss-popup-header h3");
  if (title) {
    title.textContent = `Savings Balance Changes - Year ${calculation.year}`;
  }

  // Show the popup using the same method as other breakdowns
  popup.classList.add("show");
}

// Close Total Net popup when clicking outside
document.addEventListener("click", function (event) {
  const ssPopup = document.getElementById("ssPopup");
  if (
    ssPopup &&
    (ssPopup.style.display === "flex" ||
      ssPopup.style.display === "block" ||
      ssPopup.classList.contains("show")) &&
    event.target === ssPopup
  ) {
    // Check if this is being used for Total Net (has the dataset markers)
    if (ssPopup.dataset.originalTitle) {
      closeTotalNetPopup();
    } else {
      closeSsPopup();
    }
  }
});

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // First render
  initializeHelpIcons();
  loadExample();
  calc();
});
