// consts.js
// Constants for tax brackets and standard deductions

const constsJS_TAX_TABLES_2025 = {
  single: [
    { rate: 0.1, upTo: 11925 },
    { rate: 0.12, upTo: 48475 },
    { rate: 0.22, upTo: 103350 },
    { rate: 0.24, upTo: 197300 },
    { rate: 0.32, upTo: 250525 },
    { rate: 0.35, upTo: 626350 },
    { rate: 0.37, upTo: Infinity },
  ],
  mfj: [
    { rate: 0.1, upTo: 23850 },
    { rate: 0.12, upTo: 96950 },
    { rate: 0.22, upTo: 206700 },
    { rate: 0.24, upTo: 394600 },
    { rate: 0.32, upTo: 501050 },
    { rate: 0.35, upTo: 751600 },
    { rate: 0.37, upTo: Infinity },
  ],
};

const constsJS_STANDARD_DEDUCTION_2025 = {
  single: 14600,
  mfj: 29200,
};

const constsJS_FILING_STATUS = {
  SINGLE: "single",
  MARRIED_FILING_JOINTLY: "married",
};

// --- Added by patch: 2025 elective deferral limits (401k/Roth 401k) ---
const EMPLOYEE_401K_LIMIT_2025 = 23000; // elective deferral
const EMPLOYEE_401K_CATCHUP_50 = 7500; // catch-up age 50+

class INTEREST_CALCULATION_EPOCH {}
INTEREST_CALCULATION_EPOCH.STARTING_BALANCE = "beginning"; // based on starting balance
INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS = "ignore_deposits"; // based on starting balance - withdrawals
INTEREST_CALCULATION_EPOCH.IGNORE_WITHDRAWALS = "ignore_withdrawals"; // based on starting balance + deposits
INTEREST_CALCULATION_EPOCH.AVERAGE_BALANCE = "average"; // based on average of starting and ending balances
INTEREST_CALCULATION_EPOCH.ENDING_BALANCE = "end"; // based on ending balance
INTEREST_CALCULATION_EPOCH.ROLLING_BALANCE = "rolling"; // based on rolling daily balance

class PERIODIC_FREQUENCY {}
PERIODIC_FREQUENCY.ANNUAL_LEADING = "annualLeading";
PERIODIC_FREQUENCY.ANNUAL_TRAILING = "annualTrailing";
PERIODIC_FREQUENCY.SEMI_ANNUAL_LEADING = "semiAnnualLeading";
PERIODIC_FREQUENCY.SEMI_ANNUAL_TRAILING = "semiAnnualTrailing";
PERIODIC_FREQUENCY.QUARTERLY_LEADING = "quarterlyLeading";
PERIODIC_FREQUENCY.QUARTERLY_TRAILING = "quarterlyTrailing";
PERIODIC_FREQUENCY.MONTHLY = "monthly";
PERIODIC_FREQUENCY.DAILY = "daily";

export {
  constsJS_TAX_TABLES_2025,
  constsJS_STANDARD_DEDUCTION_2025,
  constsJS_FILING_STATUS,
  EMPLOYEE_401K_LIMIT_2025,
  EMPLOYEE_401K_CATCHUP_50,
  INTEREST_CALCULATION_EPOCH,
  PERIODIC_FREQUENCY,
};
