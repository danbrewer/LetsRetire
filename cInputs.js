import { ACCOUNT_TYPES } from "./cAccount.js";
import { compoundedRate } from "./utils.js";

class Inputs {
  /** @type {number} */
  #taxableIncomeAdjustment = 0;

  /** @type {number} */
  #taxFreeIncomeAdjustment = 0;

  /**
   * @param {number} startingYear - The starting year of the simulation
   * @param {number} initialAgeSubject - Current age of the person
   * @param {number} initialAgePartner - Current age of partner (0 if no partner)
   * @param {number} subjectRetireAge - Age at retirement
   * @param {number} subjectSsStartAge - Age when Social Security benefits start
   * @param {number} subjectPensionStartAge - Age when pension benefits start
   * @param {number} endSubjectAge - Age at end of planning period
   * @param {number} inflation - Annual inflation rate as decimal
   * @param {number} spendingToday - Current annual spending amount
   * @param {number} spendingDecline - Spending decline rate in retirement as decimal
   * @param {number} partnerRetireAge - Partner retirement age
   * @param {number} partnerSsMonthly - Monthly partner Social Security benefits
   * @param {number} partnerSsStartAge - Age when partner SS benefits start
   * @param {number} partnerSsCola - Partner SS cost of living adjustment as decimal
   * @param {number} partnerPenMonthly - Monthly partner pension benefits
   * @param {number} partnerPenStartAge - Age when partner pension benefits start
   * @param {number} partnerPenCola - Partner pension cost of living adjustment as decimal
   * @param {number} partnerTaxSS - Partner Social Security tax rate as decimal
   * @param {number} partnerTaxPension - Partner pension tax rate as decimal
   * @param {number} subjectStartingSalary - Starting annual salary
   * @param {number} partnerStartingSalary - Partner starting annual salary
   * @param {number} subjectSalaryGrowthRate - Annual salary growth rate as decimal
   * @param {number} partnerSalaryGrowthRate - Partner annual salary growth rate as decimal
   * @param {number} subject401kContributionRate - Pre-tax 401k contribution percentage as decimal
   * @param {number} subjectRothContributionRate - Roth IRA contribution percentage as decimal
   * @param {number} taxablePct - Taxable savings percentage as decimal
   * @param {number} matchCap - Employer match cap percentage as decimal
   * @param {number} subject401kMatchRate - Employer match rate as decimal
   * @param {number} subject401kStartingBalance - Current traditional 401k balance
   * @param {number} subjectRothStartingBalance - Current Roth IRA balance
   * @param {number} partner401kStartingBalance - Current partner traditional 401k balance
   * @param {number} partnerRothStartingBalance - Current partner Roth IRA balance
   * @param {number} savingsStartingBalance - Current savings balance
   * @param {number} trad401kInterestRate - 401k rate of return as decimal
   * @param {number} tradRothInterestRate - Roth IRA rate of return as decimal
   * @param {number} partnerTrad401kInterestRate - Partner 401k rate of return as decimal
   * @param {number} partnerRothInterestRate - Partner Roth IRA rate of return as decimal
   * @param {number} savingsInterestRate - Savings rate of return as decimal
   * @param {number} ssMonthly - Monthly Social Security benefits
   * @param {number} ssCola - Social Security cost of living adjustment as decimal
   * @param {number} penMonthly - Monthly pension benefits
   * @param {number} penCola - Pension cost of living adjustment as decimal
   * @param {string} filingStatus - Tax filing status
   * @param {boolean} useRMD - Whether to use Required Minimum Distributions
   * @param {number} flatSsWithholdingRate - Flat withholding rate for Social Security as decimal
   * @param {number} flatTrad401kWithholdingRate - Flat withholding rate for traditional 401k as decimal
   * @param {number} flatPensionWithholdingRate - Flat withholding rate for pension as decimal
   * @param {number} flatWageWithholdingRate - Flat withholding rate for wages as decimal
   * @param {string[]} order - Withdrawal order for accounts
   * @param {number} subjectWorkingYearSavingsContributionFixed
   * @param {number} subjectWorkingYearSavingsContributionVariable
   * @param {number} partnerWorkingYearSavingsContributionFixed
   * @param {number} partnerWorkingYearSavingsContributionVariable
   * @param {number} subjectRetirementYearSavingsContributionFixed
   * @param {number} subjectRetirementYearSavingsContributionVariable
   * @param {number} partnerRetirementYearSavingsContributionFixed
   * @param {number} partnerRetirementYearSavingsContributionVariable
   * @param {number} partner401kContributionRate - Partner pre-tax 401k contribution percentage as decimal
   * @param {number} partnerRothContributionRate - Partner Roth IRA contribution percentage as decimal
   * @param {number} subjectNonTaxableSalaryReductions - Subject non-taxable salary reductions (e.g., health/dental/HSA)
   * @param {number} partnerNonTaxableSalaryReductions - Partner non-taxable salary reductions (e.g., health/dental/HSA)
   * @param {number} subject401kStartAge - Age when subject starts 401k contributions
   */
  constructor(
    startingYear = 2025,
    initialAgeSubject = 0,
    initialAgePartner = 0,
    subjectRetireAge = 0,
    subjectSsStartAge = 0,
    subjectPensionStartAge = 0,
    subject401kStartAge = 0,
    endSubjectAge = 0,

    inflation = 0,
    spendingToday = 0,
    spendingDecline = 0,

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

    subjectStartingSalary = 0,
    partnerStartingSalary = 0,
    subjectSalaryGrowthRate = 0,
    partnerSalaryGrowthRate = 0,
    subject401kContributionRate = 0,
    subjectRothContributionRate = 0,
    taxablePct = 0,
    matchCap = 0,
    subject401kMatchRate = 0,
    subject401kStartingBalance = 0,
    subjectRothStartingBalance = 0,
    partner401kStartingBalance = 0,
    partnerRothStartingBalance = 0,
    savingsStartingBalance = 0,
    trad401kInterestRate = 0,
    tradRothInterestRate = 0,
    partnerTrad401kInterestRate = 0,
    partnerRothInterestRate = 0,
    savingsInterestRate = 0,
    ssMonthly = 0,
    ssCola = 0,
    penMonthly = 0,
    penCola = 0,
    filingStatus = "single",
    useRMD = false,
    flatSsWithholdingRate = 0.07,
    flatTrad401kWithholdingRate = 0.2,
    flatPensionWithholdingRate = 0.2,
    flatWageWithholdingRate = 0.15,
    order = [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ],
    subjectWorkingYearSavingsContributionFixed = 0,
    subjectWorkingYearSavingsContributionVariable = 0,
    partnerWorkingYearSavingsContributionFixed = 0,
    partnerWorkingYearSavingsContributionVariable = 0,
    subjectRetirementYearSavingsContributionFixed = 0,
    subjectRetirementYearSavingsContributionVariable = 0,
    partnerRetirementYearSavingsContributionFixed = 0,
    partnerRetirementYearSavingsContributionVariable = 0,
    partner401kContributionRate = 0,
    partnerRothContributionRate = 0,
    subjectNonTaxableSalaryReductions = 500 * 26,
    partnerNonTaxableSalaryReductions = 0
  ) {
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
    this.inflation = inflation;

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

    this.partnerStartingSalary = partnerStartingSalary;

    /** @type {number} */
    this.subjectSalaryGrowthRate = subjectSalaryGrowthRate;
    /** @type {number} */
    this.partnerSalaryGrowthRate = partnerSalaryGrowthRate;

    /** @type {number} */
    this.subjectCareer401kContributionRate = subject401kContributionRate;

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
    this.trad401kInterestRate = trad401kInterestRate;

    /** @type {number} */
    this.tradRothInterestRate = tradRothInterestRate;

    /** @type {number} */
    this.partnerTrad401kInterestRate = partnerTrad401kInterestRate;

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
    this.flatCareerTrad401kWithholdingRate = flatTrad401kWithholdingRate;
    /** @type {number} */
    this.flatPensionWithholdingRate = flatPensionWithholdingRate;
    /** @type {number} */
    this.flatCareerWageWithholdingRate = flatWageWithholdingRate;
    /** @type {number} */
    this.flatCareerWageWithholdingRate = flatWageWithholdingRate;

    /** @type {string[]} */
    this.order = order;

    /** @type {number} */
    this.totalWorkingYears = 0;
    /** @type {number} */
    this.totalLivingYears = 0;
    /** @type {boolean} */
    this.hasPartner = false;
    // /** @type {number} */
    // this.spendAtRetire = 0;
    /** @type {number} */
    this.additionalSpending = 0;
    // /** @type {number} */
    // this.spend = 0;
    // /** @type {number} */
    // this.otherTaxableIncomeAdjustments = 0;

    /** @type {number} */
    this.savingsUseAge = this.subjectRetireAge;
    /** @type {number} */
    this.trad401kUseAge = this.subjectRetireAge;
    /** @type {number} */
    this.rothUseAge = this.subjectRetireAge;

    /** @type {number} */
    this.yearIndex = 0;

    /** @type {number} */
    this.subjectCareerNonTaxableSalaryReductions =
      subjectNonTaxableSalaryReductions; // e.g., health/dental/HSA

    /** @type {number} */
    this.partnerCareerNonTaxableSalaryReductions =
      partnerNonTaxableSalaryReductions; // For now. This can include health/dental/HSA contributions, etc. later on

    /** @type {number} */
    this.spendAtRetire = 0;

    /** @type {boolean} */
    this.hasPartner = false;

    /** @type {number} */
    this.totalWorkingYears = 0;

    /** @type {number} */
    this.totalLivingYears = 0;

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
    this.partnerCareer401kContributionRate = partner401kContributionRate;
    /** @type {number} */
    this.partnerRothContributionRate = partnerRothContributionRate;

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
      compoundedRate(this.inflation, this.totalWorkingYears);
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
      this.inflation >= 0 &&
      this.spendingToday >= 0 &&
      this.trad401kInterestRate >= 0 &&
      this.tradRothInterestRate >= 0 &&
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
        inflation: this.inflation,
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
      .adjustedForInflation(this.inflation, this.yearIndex)
      .asCurrency();
    if (this.#isRetired) {
      result = result.adjustedForInflation(
        -this.spendingDecline,
        this.#retirementYearIndex
      );
    }
    return result;
  }

  // get subjectTaxableWagesAndCompensation() {
  //   const grossWages = this.subjectGrossTaxableCompensation;

  //   const result = grossWages - this.subjectGrossSalaryReductions;

  //   return result;
  // }

  get subjectCareerSalary() {
    return this.subjectStartingSalary.adjustedForInflation(
      this.subjectSalaryGrowthRate,
      this.yearIndex
    );
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

  clone() {
    return new Inputs(
      this.startingYear,
      this.initialAgeSubject,
      this.initialAgePartner,
      this.subjectRetireAge,
      this.subjectSsStartAge,
      this.subjectPensionStartAge,
      this.subject401kStartAge,
      this.endSubjectAge,

      this.inflation,
      this.spendingToday,
      this.spendingDecline,

      this.partnerRetireAge,
      this.partnerSsMonthly,
      this.partnerSsStartAge,
      this.partnerSsCola,
      this.partnerPenMonthly,
      this.partnerPenStartAge,
      this.partner401kStartAge,
      this.partnerPenCola,
      this.partnerTaxSS,
      this.partnerTaxPension,

      this.subjectStartingSalary,
      this.partnerStartingSalary,
      this.subjectSalaryGrowthRate,
      this.partnerSalaryGrowthRate,
      this.subjectCareer401kContributionRate,
      this.subjectRothContributionRate,
      this.taxablePct,
      this.matchCap,
      this.subject401kMatchRate,
      this.subject401kStartingBalance,
      this.subjectRothStartingBalance,
      this.partner401kStartingBalance,
      this.partnerRothStartingBalance,
      this.savingsStartingBalance,
      this.trad401kInterestRate,
      this.tradRothInterestRate,
      this.partnerTrad401kInterestRate,
      this.partnerRothInterestRate,
      this.savingsInterestRate,
      this.ssMonthly,
      this.ssCola,
      this.penMonthly,
      this.penCola,
      this.filingStatus,
      this.useRMD,
      this.flatSsWithholdingRate,
      this.flatCareerTrad401kWithholdingRate,
      this.flatPensionWithholdingRate,
      this.flatCareerWageWithholdingRate,
      this.order,
      this.subjectWorkingYearSavingsContributionFixed,
      this.subjectWorkingYearSavingsContributionVariable,
      this.partnerWorkingYearSavingsContributionFixed,
      this.partnerWorkingYearSavingsContributionVariable,
      this.subjectRetirementYearSavingsContributionFixed,
      this.subjectRetirementYearSavingsContributionVariable,
      this.partnerRetirementYearSavingsContributionFixed,
      this.partnerRetirementYearSavingsContributionVariable,
      this.partnerCareer401kContributionRate,
      this.partnerRothContributionRate,
      this.subjectCareerNonTaxableSalaryReductions,
      this.partnerCareerNonTaxableSalaryReductions
    );
  }
}

export { Inputs };
