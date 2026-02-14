// UIField.js
// @ts-check

export class UIField {
  // ─────────────────────────
  // General
  // ─────────────────────────
  static ORDER = "order";
  static FILING_STATUS = "filingStatus";
  static CURRENT_YEAR = "currentYear";

  // ─────────────────────────
  // Subject
  // ─────────────────────────
  static SUBJECT_CURRENT_AGE = "subjectCurrentAge";
  static SUBJECT_RETIRE_AGE = "subjectRetireAge";
  static SUBJECT_LIFESPAN = "subjectLifespan";
  static SUBJECT_401K_START_AGE = "subject401kStartAge";
  static SUBJECT_PENSION_START_AGE = "subjectPensionStartAge";
  static SUBJECT_SS_START_AGE = "subjectSsStartAge";

  static SUBJECT_SALARY = "subjectSalary";
  static SUBJECT_PAYROLL_DEDUCTIONS = "subjectPayrollDeductions";
  static SUBJECT_SALARY_GROWTH = "subjectSalaryGrowth";
  static SUBJECT_SAVINGS_MONTHLY = "subjectSavingsMonthly";
  static SUBJECT_ROTH_MONTHLY = "subjectRothMonthly";

  static SUBJECT_401K_CONTRIBUTION = "subject401kContribution";
  static SUBJECT_EMP_MATCH_RATE = "subjectEmpMatchRate";
  static SUBJECT_EMP_MATCH_CAP = "subjectEmpMatchCap";

  static SUBJECT_401K_BALANCE = "subject401kBalance";
  static SUBJECT_401K_RETURN = "subject401kReturnRate";
  static SUBJECT_ROTH_BALANCE = "subjectRothBalance";
  static SUBJECT_ROTH_RETURN = "subjectRothReturnRate";

  // ─────────────────────────
  // Partner
  // ─────────────────────────
  static PARTNER_CURRENT_AGE = "partnerCurrentAge";
  static PARTNER_RETIRE_AGE = "partnerRetireAge";
  static PARTNER_LIFESPAN = "partnerLifespan";
  static PARTNER_401K_START_AGE = "partner401kStartAge";
  static PARTNER_PENSION_START_AGE = "partnerPensionStartAge";
  static PARTNER_SS_START_AGE = "partnerSsStartAge";

  static PARTNER_SALARY = "partnerSalary";
  static PARTNER_SALARY_GROWTH = "partnerSalaryGrowth";
  static PARTNER_ROTH_MONTHLY = "partnerRothMonthly";
  static PARTNER_401K_CONTRIBUTION = "partner401kContribution";
  static PARTNER_EMP_MATCH_RATE = "partnerEmpMatchRate";
  static PARTNER_EMP_MATCH_CAP = "partnerEmpMatchCap";

  static PARTNER_401K_BALANCE = "partner401kBalance";
  static PARTNER_401K_RETURN = "partner401kReturnRate";
  static PARTNER_ROTH_BALANCE = "partnerRothBalance";
  static PARTNER_ROTH_RETURN = "partnerRothReturnRate";

  // ─────────────────────────
  // Spending & Inflation
  // ─────────────────────────
  static WORKING_YEARS_SPENDING = "workingYearsSpending";
  static RETIREMENT_YEARS_SPENDING = "retirementYearsSpending";
  static INFLATION = "inflation";
  static SPENDING_DECLINE = "spendingDecline";

  // ─────────────────────────
  // Savings
  // ─────────────────────────
  static SAVINGS_BALANCE = "startingSavingsBalance";
  static SAVINGS_RETURN = "savingsReturnRate";

  // ─────────────────────────
  // Social Security
  // ─────────────────────────
  static SUBJECT_SS_MONTHLY = "subjectSsMonthly";
  static PARTNER_SS_MONTHLY = "partnerSsMonthly";
  static SS_COLA = "ssCola";
  static SS_WITHHOLDING = "ssWithholdingRate";

  // ─────────────────────────
  // Pensions
  // ─────────────────────────
  static SUBJECT_PENSION_MONTHLY = "subjectPensionMonthly";
  static SUBJECT_PENSION_WITHHOLDING = "subjectPensionWithholdingRate";
  static SUBJECT_PENSION_SURVIVORSHIP = "subjectPensionSurvivorship";

  static PARTNER_PENSION_MONTHLY = "partnerPensionMonthly";
  static PARTNER_PENSION_WITHHOLDING = "partnerPensionWithholdingRate";
  static PARTNER_PENSION_SURVIVORSHIP = "partnerPensionSurvivorship";

  // ─────────────────────────
  // Withholding / Taxes
  // ─────────────────────────
  static WITHHOLDINGS_DEFAULT = "withholdingsDefaultRate";
  static WITHHOLDINGS_WAGES = "withholdingsWages";
  static WITHHOLDINGS_401K = "withholdings401k";
  static WITHHOLDINGS_SS = "withholdingsSS";
  static WITHHOLDINGS_PENSION = "withholdingsPension";
  static USE_RMD = "useRMD";

  // ─────────────────────────
    // Taxable Income Adjustments
    // ─────────────────────────
    static USE_TAXABLE_CURRENT_YEAR_VALUES = "useTaxableCurrentYearValues";
}
