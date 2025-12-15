import { RetirementYearData } from "./cRetirementYearData";
import { WorkingYearData } from "./cWorkingYearData";

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

  get subjectSocialSecurity() {
    return this.#yearData instanceof RetirementYearData
      ? this.#yearData.socialSecurityIncome.subjectTotalSsIncome
      : 0;
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

  get salary() {
    return null; // TODO: add salary to WorkingYearData
  }

  get taxableInterest() {
    return null; // TODO: add taxableInterest to WorkingYearData
  }

  get subjectGrossSs() {
    return null; // TODO: add subjectGrossSs to WorkingYearData
  }

  get subjectGrossPen() {
    return null; // TODO: add subjectGrossPen to WorkingYearData
  }

  get spouseGrossSs() {
    return null; // TODO: add spouseGrossSs to WorkingYearData
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

  get effectiveTaxRate(){
    return 0; // TODO: add effectiveTaxRate to RetirementYearData
  }

  get balSavings(){
    return null; // TODO: add balSavings to RetirementYearData
  }

  get balTran401k(){
    return 0; // TODO: add balTran401k to RetirementYearData
  }

  get balRoth(){
    return 0; // TODO: add balRoth to RetirementYearData
  }

  get balTotal(){
    return 0; // TODO: add balTotal to RetirementYearData
  }

  get total(){
    return 0; // TODO: add total to RetirementYearData
  }



}

export { Calculation };
