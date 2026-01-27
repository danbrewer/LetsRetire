import { ACCOUNT_TYPES } from "./cAccount.js";
import { compoundedRate } from "./utils.js";

/**
 * @typedef {Object} InputsOptions
 * @property {number} [startingYear]
 * @property {number} [initialAgeSubject]
 * @property {number} [initialAgePartner]
 * @property {number} [subjectRetireAge]
 * @property {number} [subjectSsStartAge]
 * @property {number} [subjectPensionStartAge]
 * @property {number} [subject401kStartAge]
 * @property {number} [endSubjectAge]
 *
 * @property {number} [inflationRate]
 * @property {number} [spendingToday]
 * @property {number} [spendingDecline]
 *
 * @property {number} [partnerRetireAge]
 * @property {number} [partnerSsMonthly]
 * @property {number} [partnerSsStartAge]
 * @property {number} [partnerSsCola]
 * @property {number} [partnerPenMonthly]
 * @property {number} [partnerPenStartAge]
 * @property {number} [partner401kStartAge]
 * @property {number} [partnerPenCola]
 * @property {number} [partnerTaxSS]
 * @property {number} [partnerTaxPension]
 *
 * @property {number} [subjectStartingSalary]
 * @property {number} [partnerStartingSalary]
 * @property {number} [subjectSalaryGrowthRate]
 * @property {number} [partnerSalaryGrowthRate]
 * @property {number} [subject401kContributionRate]
 * @property {number} [partner401kContributionRate]
 * @property {number} [subjectRothContributionRate]
 * @property {number} [partnerRothContributionRate]
 * @property {number} [taxablePct]
 * @property {number} [matchCap]
 * @property {number} [subject401kMatchRate]
 *
 * @property {number} [subject401kStartingBalance]
 * @property {number} [subjectRothStartingBalance]
 * @property {number} [partner401kStartingBalance]
 * @property {number} [partnerRothStartingBalance]
 * @property {number} [savingsStartingBalance]
 *
 * @property {number} [subject401kInterestRate]
 * @property {number} [subjectRothInterestRate]
 * @property {number} [partner401kInterestRate]
 * @property {number} [partnerRothInterestRate]
 * @property {number} [savingsInterestRate]
 *
 * @property {number} [ssMonthly]
 * @property {number} [ssCola]
 * @property {number} [penMonthly]
 * @property {number} [penCola]
 *
 * @property {string} [filingStatus]
 * @property {boolean} [useRMD]
 *
 * @property {number} [flatSsWithholdingRate]
 * @property {number} [flatTrad401kWithholdingRate]
 * @property {number} [flatPensionWithholdingRate]
 * @property {number} [flatWageWithholdingRate]
 *
 * @property {string[]} [order]
 *
 * @property {number} [subjectWorkingYearSavingsContributionFixed]
 * @property {number} [subjectWorkingYearSavingsContributionVariable]
 * @property {number} [partnerWorkingYearSavingsContributionFixed]
 * @property {number} [partnerWorkingYearSavingsContributionVariable]
 * @property {number} [subjectRetirementYearSavingsContributionFixed]
 * @property {number} [subjectRetirementYearSavingsContributionVariable]
 * @property {number} [partnerRetirementYearSavingsContributionFixed]
 * @property {number} [partnerRetirementYearSavingsContributionVariable]
 *
 * @property {number} [partner401kContributionRate]
 * @property {number} [partnerRothContributionRate]
 *
 * @property {number} [subjectPayrollDeductions]
 * @property {number} [partnerPayrollDeductions]
 * @property {number} [subjectPayPeriods]
 * @property {number} [partnerPayPeriods]
 */

class Inputs {
  /** @type {number} */
  #taxableIncomeAdjustment = 0;

  /** @type {number} */
  #taxFreeIncomeAdjustment = 0;

  /**
   * JS "named parameters" pattern: constructor takes a single options object.
   *
   * @param {InputsOptions} [options]
   */
  constructor(options = {}) {
    const {
      // Timeline / Ages
      startingYear = 2025,
      initialAgeSubject = 0,
      initialAgePartner = 0,
      subjectRetireAge = 0,
      subjectSsStartAge = 0,
      subjectPensionStartAge = 0,
      subject401kStartAge = 0,
      endSubjectAge = 0,

      // Inflation + spending
      inflationRate = 0,
      spendingToday = 0,
      spendingDecline = 0,

      // Partner info
      partnerRetireAge = 0,
      partnerSsMonthly = 0,
      partnerSsStartAge = 0,
      partnerSsCola = 0,
      partnerPenMonthly = 0,
      partnerPenStartAge = 0,
      partner401kStartAge = 0,
      partnerPenCola = 0,
      partnerTaxSS = 0,
      partnerTaxPension = 0,

      // Salary / contributions
      subjectStartingSalary = 0,
      partnerStartingSalary = 0,
      subjectSalaryGrowthRate = 0,
      partnerSalaryGrowthRate = 0,
      subject401kContributionRate: subjectCareer401kContributionRate = 0,
      partner401kContributionRate: partnerCareer401kContributionRate = 0,
      subjectRothContributionRate = 0,
      partnerRothContributionRate = 0,
      taxablePct = 0,
      matchCap = 0,
      subject401kMatchRate = 0,

      // Starting balances
      subject401kStartingBalance = 0,
      subjectRothStartingBalance = 0,
      partner401kStartingBalance = 0,
      partnerRothStartingBalance = 0,
      savingsStartingBalance = 0,

      // Returns
      subject401kInterestRate = 0,
      subjectRothInterestRate = 0,
      partner401kInterestRate = 0,
      partnerRothInterestRate = 0,
      savingsInterestRate = 0,

      // Benefits
      ssMonthly = 0,
      ssCola = 0,
      penMonthly = 0,
      penCola = 0,

      // Taxes/settings
      filingStatus = "single",
      useRMD = false,
      flatSsWithholdingRate = 0.07,
      flatTrad401kWithholdingRate: flatCareerTrad401kWithholdingRate = 0.2,
      flatPensionWithholdingRate = 0.2,
      flatWageWithholdingRate = 0.15,

      // Withdrawal order
      order = [
        ACCOUNT_TYPES.SAVINGS,
        ACCOUNT_TYPES.SUBJECT_401K,
        ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      ],

      // Savings contribution knobs
      subjectWorkingYearSavingsContributionFixed = 100,
      subjectWorkingYearSavingsContributionVariable = 0,
      partnerWorkingYearSavingsContributionFixed = 0,
      partnerWorkingYearSavingsContributionVariable = 0,
      subjectRetirementYearSavingsContributionFixed = 0,
      subjectRetirementYearSavingsContributionVariable = 0,
      partnerRetirementYearSavingsContributionFixed = 0,
      partnerRetirementYearSavingsContributionVariable = 0,

      // Salary reductions
      subjectPayrollDeductions = 1,
      partnerPayrollDeductions = 1,
      subjectPayPeriods = 26,
      partnerPayPeriods = 26,
    } = options;

    // ---------------------------
    // Assign values
    // ---------------------------
    this.startingYear = startingYear;

    // Personal information
    /** @type {number} */
    this.initialAgeSubject = initialAgeSubject;

    /** @type {number} */
    this.initialAgePartner = initialAgePartner;

    /** @type {number} */
    this.subjectRetireAge = subjectRetireAge;

    /** @type {number} */
    this.subjectSsStartAge = subjectSsStartAge;

    /** @type {number} */
    this.subjectPensionStartAge = subjectPensionStartAge;

    /** @type {number} */
    this.subject401kStartAge = subject401kStartAge;

    /** @type {number} */
    this.endSubjectAge = endSubjectAge;

    /** @type {number} */
    this.inflationRate = inflationRate;

    /** @type {number} */
    this.spendingToday = spendingToday;

    /** @type {number} */
    this.spendingDecline = spendingDecline;

    // Partner information
    /** @type {number} */
    this.partnerRetireAge = partnerRetireAge;

    /** @type {number} */
    this.partnerSsMonthly = partnerSsMonthly;

    /** @type {number} */
    this.partnerSsStartAge = partnerSsStartAge;

    /** @type {number} */
    this.partnerSsCola = partnerSsCola;

    /** @type {number} */
    this.partnerPenMonthly = partnerPenMonthly;

    /** @type {number} */
    this.partnerPenStartAge = partnerPenStartAge;

    /** @type {number} */
    this.partner401kStartAge = partner401kStartAge;

    /** @type {number} */
    this.partnerPenCola = partnerPenCola;

    /** @type {number} */
    this.partnerTaxSS = partnerTaxSS;

    /** @type {number} */
    this.partnerTaxPension = partnerTaxPension;

    // Employment and contributions
    /** @type {number} */
    this.subjectStartingSalary = subjectStartingSalary;

    /** @type {number} */
    this.partnerStartingSalary = partnerStartingSalary;

    /** @type {number} */
    this.subjectSalaryGrowthRate = subjectSalaryGrowthRate;

    /** @type {number} */
    this.partnerSalaryGrowthRate = partnerSalaryGrowthRate;

    /** @type {number} */
    this.subjectCareer401kContributionRate = subjectCareer401kContributionRate;

    /** @type {number} */
    this.partnerCareer401kContributionRate = 0;

    this.subjectRetirement401kContributionRate = 0;
    this.partnerRetirement401kContributionRate = 0;

    /** @type {number} */
    this.subjectRothContributionRate = subjectRothContributionRate;

    /** @type {number} */
    this.taxablePct = taxablePct;

    /** @type {number} */
    this.matchCap = matchCap;

    /** @type {number} */
    this.subject401kMatchRate = subject401kMatchRate;

    // Account balances and returns
    /** @type {number} */
    this.subject401kStartingBalance = subject401kStartingBalance;

    /** @type {number} */
    this.subjectRothStartingBalance = subjectRothStartingBalance;

    /** @type {number} */
    this.partner401kStartingBalance = partner401kStartingBalance;

    /** @type {number} */
    this.partnerRothStartingBalance = partnerRothStartingBalance;

    /** @type {number} */
    this.savingsStartingBalance = savingsStartingBalance;

    /** @type {number} */
    this.subject401kInterestRate = subject401kInterestRate;

    /** @type {number} */
    this.subjectRothInterestRate = subjectRothInterestRate;

    /** @type {number} */
    this.partner401kInterestRate = partner401kInterestRate;

    /** @type {number} */
    this.partnerRothInterestRate = partnerRothInterestRate;

    /** @type {number} */
    this.savingsInterestRate = savingsInterestRate;

    // Income sources
    /** @type {number} */
    this.ssMonthly = ssMonthly;

    /** @type {number} */
    this.ssCola = ssCola;

    /** @type {number} */
    this.penMonthly = penMonthly;

    /** @type {number} */
    this.penCola = penCola;

    // Tax rates and settings
    /** @type {string} */
    this.filingStatus = filingStatus;

    /** @type {boolean} */
    this.useRMD = useRMD;

    /** @type {number} */
    this.flatSsWithholdingRate = flatSsWithholdingRate;

    /** @type {number} */
    this.flatTrad401kWithholdingRate = flatCareerTrad401kWithholdingRate;

    /** @type {number} */
    this.flatPensionWithholdingRate = flatPensionWithholdingRate;

    /** @type {number} */
    this.flatWageWithholdingRate = flatWageWithholdingRate;

    /** @type {string[]} */
    this.order = order;

    // Internal/derived / stateful
    /** @type {number} */
    this.yearIndex = 0;

    /** @type {number} */
    this.additionalSpending = 0;

    /** @type {number} */
    this.savingsUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.savingsUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.trad401kUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.rothUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.subjectCareerPayrollDeductions = subjectPayrollDeductions;

    this.subjectRetirementPayrollDeductions = 0;
    this.partnerRetirementPayrollDeductions = 0;

    /** @type {number} */
    this.partnerCareerPayrollDeductions = partnerPayrollDeductions;

    /** @type {number} */
    this.subjectWorkingYearSavingsContributionFixed =
      subjectWorkingYearSavingsContributionFixed;

    /** @type {number} */
    this.subjectWorkingYearSavingsContributionVariable =
      subjectWorkingYearSavingsContributionVariable;

    /** @type {number} */
    this.partnerWorkingYearSavingsContributionFixed =
      partnerWorkingYearSavingsContributionFixed;

    /** @type {number} */
    this.partnerWorkingYearSavingsContributionVariable =
      partnerWorkingYearSavingsContributionVariable;

    /** @type {number} */
    this.subjectRetirementYearSavingsContributionFixed =
      subjectRetirementYearSavingsContributionFixed;

    /** @type {number} */
    this.subjectRetirementYearSavingsContributionVariable =
      subjectRetirementYearSavingsContributionVariable;

    /** @type {number} */
    this.partnerRetirementYearSavingsContributionFixed =
      partnerRetirementYearSavingsContributionFixed;

    /** @type {number} */
    this.partnerRetirementYearSavingsContributionVariable =
      partnerRetirementYearSavingsContributionVariable;

    /** @type {number} */
    this.partnerCareer401kContributionRate = partnerCareer401kContributionRate;

    /** @type {number} */
    this.partnerRothContributionRate = partnerRothContributionRate;

    // These were duplicated in your original constructor; keep them once.
    /** @type {number} */
    this.totalWorkingYears = 0;

    /** @type {number} */
    this.totalLivingYears = 0;

    /** @type {number} */
    this.spendAtRetire = 0;

    /** @type {boolean} */
    this.hasPartner = false;

    /** @type {number} */
    this.subjectCareerPayPeriods = subjectPayPeriods;

    this.subjectRetirementPayPeriods = 0;
    this.partnerRetirementPayPeriods = 0;

    /** @type {number} */
    this.partnerCareerPayPeriods = partnerPayPeriods;

    // Calculate derived values
    this.#calculateDerivedValues();
  }

  /**
   * Private method to calculate derived values
   */
  #calculateDerivedValues() {
    this.hasPartner = this.initialAgePartner > 0;

    this.totalWorkingYears = this.subjectRetireAge - this.initialAgeSubject;

    this.totalLivingYears = this.endSubjectAge - this.initialAgeSubject;

    this.spendAtRetire =
      this.spendingToday *
      compoundedRate(this.inflationRate, this.totalWorkingYears);
  }

  // Utility methods for input validation and analysis
  isValid() {
    return (
      this.subjectRetireAge <= this.initialAgeSubject ||
      this.endSubjectAge <= this.subjectRetireAge
    );
  }

  hasValidAges() {
    return (
      this.initialAgeSubject > 0 &&
      this.subjectRetireAge > this.initialAgeSubject &&
      this.endSubjectAge > this.subjectRetireAge
    );
  }

  hasValidFinancials() {
    return (
      this.inflationRate >= 0 &&
      this.spendingToday >= 0 &&
      this.subject401kInterestRate >= 0 &&
      this.subjectRothInterestRate >= 0 &&
      this.savingsInterestRate >= 0
    );
  }

  getWorkingYearsRemaining() {
    return Math.max(0, this.totalWorkingYears);
  }

  getRetirementYearsRemaining() {
    return Math.max(0, this.endSubjectAge - this.subjectRetireAge);
  }

  getTotalAccountBalance() {
    return (
      this.subject401kStartingBalance +
      this.subjectRothStartingBalance +
      this.savingsStartingBalance
    );
  }

  getTotalMonthlyBenefits() {
    return (
      this.ssMonthly +
      this.penMonthly +
      this.partnerSsMonthly +
      this.partnerPenMonthly
    );
  }

  getTotalAnnualBenefits() {
    return this.getTotalMonthlyBenefits() * 12;
  }

  getInputSummary() {
    return {
      personal: {
        currentAge: this.initialAgeSubject,
        retireAge: this.subjectRetireAge,
        endAge: this.endSubjectAge,
        hasPartner: this.hasPartner,
      },
      financial: {
        spendingToday: this.spendingToday,
        inflation: this.inflationRate,
        totalAccountBalance: this.getTotalAccountBalance(),
        totalAnnualBenefits: this.getTotalAnnualBenefits(),
      },
      timeline: {
        workingYearsRemaining: this.getWorkingYearsRemaining(),
        retirementYearsRemaining: this.getRetirementYearsRemaining(),
        totalLivingYears: this.totalLivingYears,
      },
    };
  }

  get totalSsIncome() {
    return (this.subjectSs + this.partnerSs).asCurrency() ?? 0;
  }

  get totalPensionIncome() {
    return (this.subjectPension + this.partnerPension).asCurrency() ?? 0;
  }

  get subjectSs() {
    if (this.subjectAge >= this.subjectSsStartAge) {
      return (this.ssMonthly * 12).adjustedForInflation(
        this.ssCola,
        this.subjectAge - this.subjectSsStartAge
      );
    }
    return 0;
  }

  get subjectPension() {
    if (this.subjectAge >= this.subjectPensionStartAge) {
      return (this.penMonthly * 12).adjustedForInflation(
        this.penCola,
        this.subjectAge - this.subjectPensionStartAge
      );
    }
    return 0;
  }

  get partnerSs() {
    if (this.partnerAge >= this.partnerSsStartAge) {
      return (this.partnerSsMonthly * 12).adjustedForInflation(
        this.partnerSsCola,
        this.partnerAge - this.partnerSsStartAge
      );
    }
    return 0;
  }

  get partnerPension() {
    if (this.partnerAge >= this.partnerPenStartAge) {
      return (this.partnerPenMonthly * 12).adjustedForInflation(
        this.partnerPenCola,
        this.partnerAge - this.partnerPenStartAge
      );
    }
    return 0;
  }

  get spend() {
    let result = this.spendingToday
      .adjustedForInflation(this.inflationRate, this.yearIndex)
      .asCurrency();

    if (this.#isRetired) {
      result = result.adjustedForInflation(
        -this.spendingDecline,
        this.#retirementYearIndex
      );
    }

    return result;
  }

  get subjectCareerSalary() {
    return this.subjectStartingSalary.adjustedForInflation(
      this.subjectSalaryGrowthRate,
      this.yearIndex
    );
  }

  get subjectRetirementSalary() {
    return 0;
  }

  get partnerRetirementSalary() {
    return 0;
  }

  get partnerCareerSalary() {
    return this.partnerStartingSalary.adjustedForInflation(
      this.partnerSalaryGrowthRate,
      this.yearIndex
    );
  }

  get partnerAge() {
    return this.hasPartner ? this.initialAgePartner + this.yearIndex : 0;
  }

  get currentYear() {
    return this.startingYear + this.yearIndex;
  }

  get subjectAge() {
    return this.initialAgeSubject + this.yearIndex;
  }

  get useSavings() {
    return this.subjectAge >= this.savingsUseAge;
  }

  get subjectUseTrad401k() {
    return this.subjectAge >= this.trad401kUseAge;
  }

  get partnerUseTrad401k() {
    return this.partnerAge >= this.trad401kUseAge;
  }

  get subjectUseRoth() {
    return this.subjectAge >= this.rothUseAge;
  }

  get partnerUseRoth() {
    return this.partnerAge >= this.rothUseAge;
  }

  get #isRetired() {
    return this.subjectAge >= this.subjectRetireAge;
  }

  get #retirementYearIndex() {
    return this.subjectAge - this.subjectRetireAge;
  }

  /**
   * @param {number} value
   */
  set taxableIncomeAdjustment(value) {
    this.#taxableIncomeAdjustment = value;
  }

  get taxableIncomeAdjustment() {
    return this.#taxableIncomeAdjustment;
  }

  /**
   * @param {number} value
   */
  set taxFreeIncomeAdjustment(value) {
    this.#taxFreeIncomeAdjustment = value;
  }

  get taxFreeIncomeAdjustment() {
    return this.#taxFreeIncomeAdjustment;
  }

  /**
   * Clone using the options-object pattern.
   * This avoids the "giant positional argument list" problem forever.
   */
  clone() {
    return new Inputs(this.toObject());
  }

  /**
   * Optional helper: turn current instance into a plain object.
   * Great for persistence, cloning, diffing, etc.
   */
  /** @returns {InputsOptions} */
  toObject() {
    return {
      startingYear: this.startingYear,
      initialAgeSubject: this.initialAgeSubject,
      initialAgePartner: this.initialAgePartner,
      subjectRetireAge: this.subjectRetireAge,
      subjectSsStartAge: this.subjectSsStartAge,
      subjectPensionStartAge: this.subjectPensionStartAge,
      subject401kStartAge: this.subject401kStartAge,
      endSubjectAge: this.endSubjectAge,

      inflationRate: this.inflationRate,
      spendingToday: this.spendingToday,
      spendingDecline: this.spendingDecline,

      partnerRetireAge: this.partnerRetireAge,
      partnerSsMonthly: this.partnerSsMonthly,
      partnerSsStartAge: this.partnerSsStartAge,
      partnerSsCola: this.partnerSsCola,
      partnerPenMonthly: this.partnerPenMonthly,
      partnerPenStartAge: this.partnerPenStartAge,
      partner401kStartAge: this.partner401kStartAge,
      partnerPenCola: this.partnerPenCola,
      partnerTaxSS: this.partnerTaxSS,
      partnerTaxPension: this.partnerTaxPension,

      subjectStartingSalary: this.subjectStartingSalary,
      partnerStartingSalary: this.partnerStartingSalary,
      subjectSalaryGrowthRate: this.subjectSalaryGrowthRate,
      partnerSalaryGrowthRate: this.partnerSalaryGrowthRate,
      subject401kContributionRate: this.subjectCareer401kContributionRate,
      subjectRothContributionRate: this.subjectRothContributionRate,
      taxablePct: this.taxablePct,
      matchCap: this.matchCap,
      subject401kMatchRate: this.subject401kMatchRate,

      subject401kStartingBalance: this.subject401kStartingBalance,
      subjectRothStartingBalance: this.subjectRothStartingBalance,
      partner401kStartingBalance: this.partner401kStartingBalance,
      partnerRothStartingBalance: this.partnerRothStartingBalance,
      savingsStartingBalance: this.savingsStartingBalance,

      subject401kInterestRate: this.subject401kInterestRate,
      subjectRothInterestRate: this.subjectRothInterestRate,
      partner401kInterestRate: this.partner401kInterestRate,
      partnerRothInterestRate: this.partnerRothInterestRate,
      savingsInterestRate: this.savingsInterestRate,

      ssMonthly: this.ssMonthly,
      ssCola: this.ssCola,
      penMonthly: this.penMonthly,
      penCola: this.penCola,

      filingStatus: this.filingStatus,
      useRMD: this.useRMD,

      flatSsWithholdingRate: this.flatSsWithholdingRate,
      flatTrad401kWithholdingRate: this.flatTrad401kWithholdingRate,
      flatPensionWithholdingRate: this.flatPensionWithholdingRate,
      flatWageWithholdingRate: this.flatWageWithholdingRate,

      order: this.order,

      subjectWorkingYearSavingsContributionFixed:
        this.subjectWorkingYearSavingsContributionFixed,
      subjectWorkingYearSavingsContributionVariable:
        this.subjectWorkingYearSavingsContributionVariable,
      partnerWorkingYearSavingsContributionFixed:
        this.partnerWorkingYearSavingsContributionFixed,
      partnerWorkingYearSavingsContributionVariable:
        this.partnerWorkingYearSavingsContributionVariable,
      subjectRetirementYearSavingsContributionFixed:
        this.subjectRetirementYearSavingsContributionFixed,
      subjectRetirementYearSavingsContributionVariable:
        this.subjectRetirementYearSavingsContributionVariable,
      partnerRetirementYearSavingsContributionFixed:
        this.partnerRetirementYearSavingsContributionFixed,
      partnerRetirementYearSavingsContributionVariable:
        this.partnerRetirementYearSavingsContributionVariable,

      partner401kContributionRate: this.partnerCareer401kContributionRate,
      partnerRothContributionRate: this.partnerRothContributionRate,

      subjectPayrollDeductions: this.subjectCareerPayrollDeductions,
      partnerPayrollDeductions: this.partnerCareerPayrollDeductions,
    };
  }
}

export { Inputs };
