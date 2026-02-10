import { ACCOUNT_TYPES } from "./cAccount.js";
import { RetirementYearData } from "./cRetirementYearData.js";
import { TransactionCategory } from "./cTransaction.js";
import { WorkingYearData } from "./cWorkingYearData.js";

class Calculation {
  /** @type {WorkingYearData | RetirementYearData} */
  #yearData;

  /**
   * @param {number} taxYear
   * @param {WorkingYearData | RetirementYearData} yearData
   */
  constructor(taxYear, yearData) {
    if (yearData === null) {
      throw new Error("Year data must be provided.");
    }

    this.taxYear = taxYear;
    this.#yearData = yearData;
  }

  get year() {
    return this.taxYear;
  }

  get age() {
    return this.#yearData.demographics.currentAge;
  }

  get demographics() {
    return this.#yearData.demographics;
  }

  get fiscalData() {
    return this.#yearData.fiscalData;
  }

  get accountYear() {
    return this.#yearData.accountYear;
  }

  get subjectPension() {
    return this.#yearData instanceof RetirementYearData
      ? 0 // TODO: add pension to RetirementYearData
      : 0;
  }

  get spouseSocialSecurity() {
    return null; // TODO: add spouse ss to RetirementYearData
  }

  get spousePension() {
    return null; // TODO: add spouse pension to RetirementYearData
  }

  get trad401kNet() {
    return null;
  } // TODO: add trad401kNet to RetirementYearData

  get tradRothNet() {
    return null;
  } // TODO: add tradRothNet to RetirementYearData

  get totalNetIncome() {
    return null; // TODO: add totalNetIncome to WorkingYearData and RetirementYearData
  }

  get salaryGross() {
    const result =
      this.#yearData.accountYear
        .getDeposits(
          ACCOUNT_TYPES.SUBJECT_WAGES,
          TransactionCategory.IncomeGross
        )
        .asCurrency() +
      this.#yearData.accountYear
        .getDeposits(
          ACCOUNT_TYPES.PARTNER_WAGES,
          TransactionCategory.IncomeGross
        )
        .asCurrency(); // TODO: add salary to WorkingYearData

    return result;
  }

  get salaryWithholdings() {
    const result =
      this.#yearData.accountYear
        .getWithdrawals(
          ACCOUNT_TYPES.SUBJECT_WAGES,
          TransactionCategory.Withholdings
        )
        .asCurrency() +
      this.#yearData.accountYear
        .getWithdrawals(
          ACCOUNT_TYPES.PARTNER_WAGES,
          TransactionCategory.Withholdings
        )
        .asCurrency();
    return result;
  }

  get salaryNet() {
    return this.salaryGross - this.salaryWithholdings;
  }

  get taxableInterest() {
    return null; // TODO: add taxableInterest to WorkingYearData
  }

  get subjectSsGross() {
    const result = this.#yearData.accountYear
      .getDeposits(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        TransactionCategory.IncomeGross
      )
      .asCurrency();

    return result;
  }

  get subjectSsWithholdings() {
    const result = this.#yearData.accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        TransactionCategory.Withholdings
      )
      .asCurrency();

    return result;
  }

  get subjectSsNet() {
    return this.subjectSsGross - this.subjectSsWithholdings;
  }

  get spouseGrossSs() {
    return null; // TODO: add spouseGrossSs to WorkingYearData
  }

  get subjectGrossPen() {
    return null; // TODO: add subjectGrossPen to WorkingYearData
  }

  get spouseGrossPen() {
    return null; // TODO: add spouseGrossPen to WorkingYearData
  }

  get trad401kGross() {
    return null; // TODO: add trad401kGross to RetirementYearData
  }

  get totalGrossIncome() {
    return null; // TODO: add totalGrossIncome to RetirementYearData
  }

  get taxableIncome() {
    return 0; // TODO: add taxableIncome to RetirementYearData
  }

  get nonTaxableIncome() {
    return 0; // TODO: add nonTaxableIncome to RetirementYearData
  }

  get provisionalIncome() {
    return 0; // TODO: add provisionalIncome to RetirementYearData
  }

  get standardDeduction() {
    return 0; // TODO: add standardDeduction to RetirementYearData
  }

  get ssTaxes() {
    return 0; // TODO: add ssTaxes to RetirementYearData
  }

  get otherTaxes() {
    return 0; // TODO: add otherTaxes to RetirementYearData
  }

  get totalTaxes() {
    return 0; // TODO: add taxes to RetirementYearData
  }

  get effectiveTaxRate() {
    return 0; // TODO: add effectiveTaxRate to RetirementYearData
  }

  get balSavings() {
    return null; // TODO: add balSavings to RetirementYearData
  }

  get balTran401k() {
    return 0; // TODO: add balTran401k to RetirementYearData
  }

  get balRoth() {
    return 0; // TODO: add balRoth to RetirementYearData
  }

  get balTotal() {
    return 0; // TODO: add balTotal to RetirementYearData
  }

  get total() {
    return 0; // TODO: add total to RetirementYearData
  }
}

class Calculations {
  /** @type {Calculation[]} */
  #calculations = [];

  /**
   * @param {Calculation} calculation
   */
  addCalculation(calculation) {
    this.#calculations.push(calculation);
  }

  /**
   * @returns {Calculation[]}
   */
  getAllCalculations() {
    return this.#calculations;
  }

  getLastCalculation() {
    return this.#calculations[this.#calculations.length - 1];
  }
}

export { Calculation, Calculations };
