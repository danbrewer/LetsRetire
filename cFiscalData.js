import { Inputs } from "./cInputs.js";

class FiscalData {
  /**
   * @param {number} inflationRate
   * @param {number} retirementAccountRateOfReturn
   * @param {number} rothRateOfReturn
   * @param {number} savingsRateOfReturn
   * @param {number} yearIndex
   * @param {number} spend
   * @param {number} taxYearBase
   */
  constructor(
    inflationRate,
    retirementAccountRateOfReturn,
    rothRateOfReturn,
    savingsRateOfReturn,
    yearIndex,
    spend,
    taxYearBase,
    useRmd = false,
    useSavings = true,
    useTrad401k = true,
    useRoth = true
  ) {
    this._description = "Fiscal Year Data";
    this.inflationRate = inflationRate;
    this.retirementAccountRateOfReturn = retirementAccountRateOfReturn;
    this.rothRateOfReturn = rothRateOfReturn;
    this.savingsRateOfReturn = savingsRateOfReturn;
    this.taxYear = taxYearBase + yearIndex;
    this.yearIndex = yearIndex;
    this.spend = spend;
    this.useRmd = useRmd;
    this.useSavings = useSavings;
    this.useTrad401k = useTrad401k;
    this.useRoth = useRoth;
  }

  //   // Getter for description to maintain compatibility
  //   get description() {
  //     return this._description;
  //   }

  // Method to update for next year
  /**
   * @param {number} newSpend
   * @param {number} newYearIndex
   */
  updateForNextYear(newSpend, newYearIndex) {
    this.spend = newSpend;
    this.yearIndex = newYearIndex;
    this.taxYear = this.taxYear + (newYearIndex - this.yearIndex);
  }

  // Method to get account usage flags
  getAccountUsageFlags() {
    return {
      useRmd: this.useRmd,
      useSavings: this.useSavings,
      useTrad401k: this.useTrad401k,
      useRoth: this.useRoth,
    };
  }

  // Method to get rate of return data
  getRatesOfReturn() {
    return {
      retirementAccount: this.retirementAccountRateOfReturn,
      roth: this.rothRateOfReturn,
      savings: this.savingsRateOfReturn,
    };
  }

  // Method to enable/disable account usage
  /**
   * @param {any} accountType
   * @param {boolean} enabled
   */
  setAccountUsage(accountType, enabled) {
    switch (accountType) {
      case "rmd":
        this.useRmd = enabled;
        break;
      case "savings":
        this.useSavings = enabled;
        break;
      case "trad401k":
        this.useTrad401k = enabled;
        break;
      case "roth":
        this.useRoth = enabled;
        break;
      default:
        throw new Error(`Unknown account type: ${accountType}`);
    }
  }

  /**
   * Factory method to create a FiscalData instance from retirement calculation inputs.
   *
   * This method constructs a FiscalData object containing all financial parameters
   * needed for retirement year calculations, including inflation rates, investment
   * returns, spending amounts, and account usage preferences. It provides a convenient
   * interface for creating fiscal data from comprehensive input objects.
   *
   * @param {Inputs} inputs - Retirement calculation inputs object containing:
   *   - inflation: Annual inflation rate as decimal (e.g., 0.03 for 3%)
   *   - filingStatus: Tax filing status ("single", "married_filing_jointly", etc.)
   *   - ret401k: Traditional 401k rate of return as decimal (e.g., 0.07 for 7%)
   *   - retRoth: Roth IRA rate of return as decimal (e.g., 0.07 for 7%)
   *   - retSavings: Savings account rate of return as decimal (e.g., 0.02 for 2%)
   *   - yearIndex: Zero-based index of current retirement year
   *   - spend: Annual spending amount as Currency or number
   *   - useRMD: Boolean flag to enable Required Minimum Distributions
   *   - useSavings: Boolean flag to allow savings account withdrawals
   *   - useTrad401k: Boolean flag to allow traditional 401k withdrawals
   *   - useRoth: Boolean flag to allow Roth IRA withdrawals
   *
   * @param {number} taxYearBase - Base year for tax calculations.
   *   Defaults to the global TAX_BASE_YEAR constant. Used to calculate the
   *   actual tax year by adding the yearIndex.
   *
   * @returns {FiscalData} A fully configured FiscalData instance containing:
   *   - All rate of return values for investment calculations
   *   - Tax year derived from base year and year index
   *   - Account usage flags for withdrawal strategy
   *   - Spending amounts and inflation parameters
   *   - Utility methods for account management and rate access
   *
   * @throws {Error} When required input properties are missing or invalid
   * @throws {Error} When rate values are negative or exceed reasonable bounds
   *
   * @example
   * // Create fiscal data for first retirement year
   * const inputs = {
   *   inflation: 0.03,
   *   filingStatus: "married_filing_jointly",
   *   ret401k: 0.07,
   *   retRoth: 0.07,
   *   retSavings: 0.02,
   *   yearIndex: 0,
   *   spend: new Currency(80000),
   *   useRMD: false,
   *   useSavings: true,
   *   useTrad401k: true,
   *   useRoth: true
   * };
   *
   * const fiscalData = FiscalData.CreateUsing(inputs, 2024);
   * console.log(fiscalData.taxYear); // 2024 (base year + 0)
   * console.log(fiscalData.getRatesOfReturn()); // { retirementAccount: 0.07, ... }
   *
   * @example
   * // Create fiscal data with custom tax base year
   * const fiscalData = FiscalData.CreateUsing(inputs, 2025);
   * fiscalData.setAccountUsage("roth", false); // Disable Roth withdrawals
   *
   * @see {@link FiscalData#constructor} For detailed parameter descriptions
   * @see {@link FiscalData#getRatesOfReturn} For accessing investment return rates
   * @see {@link FiscalData#getAccountUsageFlags} For checking withdrawal preferences
   * @see {@link FiscalData#setAccountUsage} For modifying account usage settings
   * @see {@link Currency} For spending amount formatting
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(inputs, taxYearBase) {
    return new FiscalData(
      inputs.inflation,
      inputs.trad401kInterestRate,
      inputs.tradRothInterestRate,
      inputs.savingsInterestRate,
      inputs.yearIndex,
      inputs.spend,
      taxYearBase,
      inputs.useRMD,
      inputs.useSavings,
      inputs.useTrad401k,
      inputs.useRoth
    );
  }

  static Empty() {
    return new FiscalData(0, 0, 0, 0, 0, 0, 0);
  }
}

export { FiscalData };