import { ACCOUNT_TYPES } from "./cAccount.js";
/**
 * @typedef {import("./cPensionAnnuityStorage.js").PensionAnnuity} PensionAnnuity
 */

/**
 * @typedef {Object} RetirementYearSpendingOverride
 * @property {number} year - Year number relative to retirement (1 = first year of retirement)
 * @property {number} amount - Extra spending amount for that year
 *
 * @typedef {Partial<Inputs>} InputsOptions
 */

class Inputs {
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
      subjectPensionSurvivorship = 0,
      partnerPensionSurvivorship = 0,
      subject401kStartAge = 0,
      subjectLifeSpan = 0,
      partnerLifeSpan = 0,

      // Inflation + spending
      inflationRate = 0,
      spendingToday = 0,
      spendingRetirement = 0,
      spendingDecline = 0,

      // Partner info
      partnerRetireAge = 0,
      partnerSsMonthly = 0,
      partnerSsStartAge = 0,
      partnerPenMonthly = 0,
      partnerPenStartAge = 0,
      partner401kStartAge = 0,
      partnerTaxSS = 0,
      partnerPensionWithholdings = 0,

      // Salary / contributions
      subjectStartingSalary = 0,
      partnerStartingSalary = 0,
      subjectSalaryGrowthRate = 0,
      partnerSalaryGrowthRate = 0,
      subjectCareer401kContributionRate = 0,
      partnerCareer401kContributionRate = 0,
      subjectRothContributionRate = 0,
      partnerRothContributionRate = 0,
      // taxablePct = 0,
      subjectEmp401kMatchRate = 0,
      subject401kContributionRate = 0,
      partnerCareerMonthlyPayrollDeductions = 1,
      subjectCareerMonthlyPayrollDeductions = 1,
      subjectCareerPayPeriods = 26,
      partnerCareerPayPeriods = 26,

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
      subjectSsMonthly = 0,
      ssCola = 0,
      subjectPensionMonthly = 0,

      // Taxes/settings
      filingStatus = "married",
      useRMD = true,
      flatSsWithholdingRate = 0.07,
      flatCareerTrad401kWithholdingRate = 0.2,
      flatPensionWithholdingRate = 0.2,
      flatWageWithholdingRate = 0.15,

      // Withdrawal order
      order = [
        ACCOUNT_TYPES.SAVINGS,
        ACCOUNT_TYPES.SUBJECT_401K,
        ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      ],
      pensionAnnuities = [],

      // Savings contribution knobs
      subjectWorkingYearSavingsContributionFixedAmount = 0,
      subjectWorkingYearSavingsContributionRate = 0,
      partnerWorkingYearSavingsContributionFixedAmount = 0,
      partnerWorkingYearSavingsContributionRate = 0,
      subjectRetirementYearSavingsContributionFixedAmount = 0,
      subjectRetirementYearSavingsContributionRate = 0,
      partnerRetirementYearSavingsContributionFixedAmount = 0,
      partnerRetirementYearSavingsContributionRate = 0,
      // Salary reductions
    } = options;

    // ---------------------------
    // Assign values
    // ---------------------------
    /** @type{number} */
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
    this.subjectPensionSurvivorship = subjectPensionSurvivorship;

    /** @type {number} */
    this.partnerPensionSurvivorship = partnerPensionSurvivorship;

    /** @type {PensionAnnuity[]} */
    this.pensionAnnuities = options.pensionAnnuities || [];

    /** @type {number} */
    this.subject401kStartAge = subject401kStartAge;

    /** @type {number} */
    this.subjectLifeSpan = subjectLifeSpan;

    /** @type {number} */
    this.partnerLifeSpan = partnerLifeSpan;

    /** @type {RetirementYearSpendingOverride[]} */
    this.retirementYearSpendingOverrides =
      options.retirementYearSpendingOverrides || [];

    /** @type {RetirementYearSpendingOverride[]} */
    this.taxableIncomeOverrides = options.taxableIncomeOverrides || [];

    /** @type {RetirementYearSpendingOverride[]} */
    this.taxFreeIncomeOverrides = options.taxFreeIncomeOverrides || [];

    /** @type {number} */
    this.inflationRate = inflationRate;

    /** @type {number} */
    this.spendingToday = spendingToday;

    /** @type {number} */
    this.spendingRetirement = spendingRetirement;

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
    this.partnerPenMonthly = partnerPenMonthly;

    /** @type {number} */
    this.partnerPenStartAge = partnerPenStartAge;

    /** @type {number} */
    this.partner401kStartAge = partner401kStartAge;

    /** @type {number} */
    this.partnerTaxSS = partnerTaxSS;

    /** @type {number} */
    this.partnerPensionWithholdings = partnerPensionWithholdings;

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

    // /** @type {number} */
    // this.taxablePct = taxablePct;

    /** @type {number} */
    this.subjectEmp401kMatchRate = subjectEmp401kMatchRate;

    /** @type {number} */
    this.subject401kContributionRate = subject401kContributionRate;

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
    this.subjectSsMonthly = subjectSsMonthly;

    /** @type {number} */
    this.ssCola = ssCola;

    /** @type {number} */
    this.subjectPensionMonthly = subjectPensionMonthly;

    // Tax rates and settings
    /** @type {string} */
    this.filingStatus = filingStatus;

    /** @type {boolean} */
    this.useRMD = useRMD;

    /** @type {number} */
    this.flatSsWithholdingRate = flatSsWithholdingRate;

    /** @type {number} */
    this.flatCareerTrad401kWithholdingRate = flatCareerTrad401kWithholdingRate;

    /** @type {number} */
    this.flatPensionWithholdingRate = flatPensionWithholdingRate;

    /** @type {number} */
    this.flatWageWithholdingRate = flatWageWithholdingRate;

    /** @type {string[]} */
    this.order = order;

    // Internal/derived / stateful
    /** @type {number} */
    this.yearIndex = 0;

    // /** @type {number} */
    // this.additionalSpending = 0;

    /** @type {number} */
    this.savingsUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.savingsUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.trad401kUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.rothUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.subjectCareerMonthlyPayrollDeductions =
      subjectCareerMonthlyPayrollDeductions;

    this.subjectRetirementPayrollDeductions = 0;
    this.partnerRetirementPayrollDeductions = 0;

    /** @type {number} */
    this.partnerCareerMonthlyPayrollDeductions =
      partnerCareerMonthlyPayrollDeductions;

    /** @type {number} */
    this.subjectWorkingYearSavingsContributionFixedAmount =
      subjectWorkingYearSavingsContributionFixedAmount;

    /** @type {number} */
    this.subjectWorkingYearSavingsContributionRate =
      subjectWorkingYearSavingsContributionRate;

    /** @type {number} */
    this.partnerWorkingYearSavingsContributionFixedAmount =
      partnerWorkingYearSavingsContributionFixedAmount;

    /** @type {number} */
    this.partnerWorkingYearSavingsContributionRate =
      partnerWorkingYearSavingsContributionRate;

    /** @type {number} */
    this.subjectRetirementYearSavingsContributionFixedAmount =
      subjectRetirementYearSavingsContributionFixedAmount;

    /** @type {number} */
    this.subjectRetirementYearSavingsContributionRate =
      subjectRetirementYearSavingsContributionRate;

    /** @type {number} */
    this.partnerRetirementYearSavingsContributionFixedAmount =
      partnerRetirementYearSavingsContributionFixedAmount;

    /** @type {number} */
    this.partnerRetirementYearSavingsContributionRate =
      partnerRetirementYearSavingsContributionRate;

    /** @type {number} */
    this.partnerCareer401kContributionRate = partnerCareer401kContributionRate;

    /** @type {number} */
    this.partnerRothContributionRate = partnerRothContributionRate;

    /** @type {number} */
    this.subjectCareerPayPeriods = subjectCareerPayPeriods;

    this.subjectRetirementPayPeriods = 0;
    this.partnerRetirementPayPeriods = 0;

    /** @type {number} */
    this.partnerCareerPayPeriods = partnerCareerPayPeriods;
  }

  get hasPartner() {
    return this.initialAgePartner > 0;
  }

  get totalWorkingYears() {
    return this.subjectRetireAge - this.initialAgeSubject;
  }

  get totalLivingYears() {
    return this.subjectLifeSpan - this.initialAgeSubject;
  }

  get subjectLivingYears(){
    return this.subjectLifeSpan - this.initialAgeSubject;
  }

  get partnerLivingYears(){
    return this.partnerLifeSpan - this.partnerAge;
  }

  // Utility methods for input validation and analysis
  isValid() {
    return true;
    // return (
    //   this.subjectRetireAge <= this.initialAgeSubject ||
    //   this.endSubjectAge <= this.subjectRetireAge
    // );
  }

  hasValidAges() {
    return (
      this.initialAgeSubject > 0 &&
      this.subjectRetireAge > this.initialAgeSubject &&
      this.subjectLifeSpan > this.subjectRetireAge
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
    return Math.max(0, this.subjectLifeSpan - this.subjectRetireAge);
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
      this.subjectSsMonthly +
      this.subjectPensionMonthly +
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
        endAge: this.subjectLifeSpan,
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
    // debugger;
    if (this.subjectAge >= this.subjectSsStartAge) {
      return (this.subjectSsMonthly * 12).adjustedForInflation(
        this.ssCola,
        this.subjectAge - this.subjectSsStartAge
      );
    }
    return 0;
  }

  get subjectPension() {
    if (this.subjectAge >= this.subjectPensionStartAge) {
      return (this.subjectPensionMonthly * 12).asCurrency();
    }
    return 0;
  }

  get partnerSs() {
    if (this.partnerAge >= this.partnerSsStartAge) {
      return (this.partnerSsMonthly * 12).adjustedForInflation(
        this.ssCola,
        this.partnerAge - this.partnerSsStartAge
      );
    }
    return 0;
  }

  get partnerPension() {
    if (this.partnerAge >= this.partnerPenStartAge) {
      return (this.partnerPenMonthly * 12).asCurrency();
    }
    return 0;
  }

  get spend() {
    if (this.#isRetired) {
      let result = this.spendingRetirement
        .adjustedForInflation(this.inflationRate, this.yearIndex)
        .asCurrency();
      result = result.adjustedForInflation(
        -this.spendingDecline,
        this.#retirementYearIndex
      );

      if (
        this.retirementYearSpendingOverride &&
        this.retirementYearSpendingOverride > 0
      ) {
        result = this.retirementYearSpendingOverride;
      }

      return result;
    }

    let result = this.spendingToday
      .adjustedForInflation(this.inflationRate, this.yearIndex)
      .asCurrency();

    // if (this.#isRetired) {
    //   result = result.adjustedForInflation(
    //     -this.spendingDecline,
    //     this.#retirementYearIndex
    //   );
    //   result += this.retirementYearExtraSpend;
    // }

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

  // get retirementYearTaxableIncomeOverride() {
  //   const taxableIncomeOverride = this.taxableIncomeOverrides.find(
  //     (tye) => tye.year === this.#retirementYearIndex + 1
  //   );
  //   return taxableIncomeOverride ? taxableIncomeOverride.amount : 0;
  // }

  // get retirementYearTaxFreeIncomeOverride() {
  //   const taxFreeIncomeOverride = this.taxFreeIncomeOverrides.find(
  //     (tye) => tye.year === this.#retirementYearIndex + 1
  //   );
  //   return taxFreeIncomeOverride ? taxFreeIncomeOverride.amount : 0;
  // }

  get retirementYearSpendingOverride() {
    const spendingOverride = this.retirementYearSpendingOverrides.find(
      (rye) => rye.year === this.#retirementYearIndex + 1
    );
    return spendingOverride ? spendingOverride.amount : 0;
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
  /** @returns {Inputs} */
  toObject() {
    // Return a shallow copy of the current instance
    return {...this};
  }
}

export { Inputs };
