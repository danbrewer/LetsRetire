import { ReportingYear as ReportingYear } from "./cReporting.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { AccountYear } from "./cAccountYear.js";

/**
 * Manages Report objects keyed by year
 */
class ReportsManager {
  /** @type {Map<number, ReportingYear>} */
  #reportingYears;
  //   /** @type {Demographics} */
  //   #demographics;
  //   /** @type {FiscalData} */
  //   #fiscalData;

  //   /**
  //    * @param {Demographics} demographics - Demographics data
  //    * @param {FiscalData} fiscalData - Fiscal data
  //    */
  constructor() {
    this.#reportingYears = new Map();
    // this.#demographics = demographics;
    // this.#fiscalData = fiscalData;
  }

  /**
   * Get a Report for a given year. Creates a new Report if one doesn't exist.
   * @param {number} year - The year (yyyy format)
   * @returns {ReportingYear} The Report object for the given year
   */
  addReportingYear(year) {
    const reporting = new ReportingYear();
    this.#reportingYears.set(year, reporting);
    return reporting;
  }

  /**
   * @param {number} year - The year (yyyy format)
   * @returns {ReportingYear | undefined} The Report object for the given year
   */
  getReportingYear(year) {
    return this.#reportingYears.get(year);
  }

  /**
   * Check if a Report exists for a given year
   * @param {number} year - The year (yyyy format)
   * @returns {boolean} True if a Report exists for the year
   */
  hasReportingYear(year) {
    return this.#reportingYears.has(year);
  }

  /**
   * Get all years that have Report objects
   * @returns {number[]} Array of years
   */
  getYears() {
    return Array.from(this.#reportingYears.keys()).sort();
  }

  /**
   * Remove a Report for a given year
   * @param {number} year - The year (yyyy format)
   * @returns {boolean} True if a Report was removed
   */
  removeReportingYear(year) {
    return this.#reportingYears.delete(year);
  }

  /**
   * Clear all Report objects
   */
  clearAllReportingYears() {
    this.#reportingYears.clear();
  }

  /**
   * Get the count of Report objects managed
   * @returns {number} Number of Report objects
   */
  get size() {
    return this.#reportingYears.size;
  }

  /**
   * Get all Report objects
   * @returns {ReportingYear[]} Array of all Report objects
   */
  getAllReportingYears() {
    return Array.from(this.#reportingYears.values());
  }
}

export { ReportsManager };
