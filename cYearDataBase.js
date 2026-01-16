// @ts-check

// cYearDataBase.js
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";

/**
 * Abstract base class for year-based financial data.
 *
 * Encapsulates shared immutable inputs and accessors
 * for both working and retirement year models.
 *
 * @abstract
 */
class BaseYearData {
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;

  /** @type {AccountingYear} */
  #accountYear;

  /**
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   * @param {AccountingYear} accountYear
   *
   */
  constructor(demographics, fiscalData, accountYear) {
    this.#demographics = Object.freeze(demographics);
    this.#fiscalData = Object.freeze(fiscalData);
    this.#accountYear = /** @type {AccountingYear} */ (
      Object.freeze(accountYear)
    );
  }

  /** @returns {Demographics} */
  get demographics() {
    return this.#demographics;
  }

  /** @returns {FiscalData} */
  get fiscalData() {
    return this.#fiscalData;
  }

  /** @returns {AccountingYear} */
  get accountYear() {
    return this.#accountYear;
  }

  /**
   * Subclasses must provide a description
   *
   * @abstract
   * @returns {string}
   */
  get description() {
    throw new Error("Subclasses must implement description");
  }
}

export { BaseYearData as YearDataBase };
