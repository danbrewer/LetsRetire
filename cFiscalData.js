import { Inputs } from "./cInputs.js";

class FiscalData {
  /**
   * @param {number} inflationRate
   * @param {number} retirementAccountRateOfReturn
   * @param {number} rothRateOfReturn
   * @param {number} savingsRateOfReturn
   * @param {number} yearIndex
   * @param {number} spend
   * @param {boolean} overridingSpend
   * @param {number} taxYearBase
   * @param {boolean} useRmd
   * @param {boolean} useSavings
   * @param {boolean} useTrad401k
   * @param {boolean} useRoth
   * @param {number} flatSsWithholdingRate
   * @param {number} flatTrad401kWithholdingRate
 
   */
  constructor(
    inflationRate,
    retirementAccountRateOfReturn,
    rothRateOfReturn,
    savingsRateOfReturn,
    yearIndex,
    spend,
    overridingSpend,
    taxYearBase,
    useRmd,
    useSavings,
    useTrad401k,
    useRoth,
    flatSsWithholdingRate,
    flatTrad401kWithholdingRate,
  ) {
    this._description = "Fiscal Year Data";
    this.inflationRate = inflationRate;
    this.retirementAccountRateOfReturn = retirementAccountRateOfReturn;
    this.rothRateOfReturn = rothRateOfReturn;
    this.savingsRateOfReturn = savingsRateOfReturn;
    this.taxYear = taxYearBase + yearIndex;
    this.yearIndex = yearIndex;
    this.spend = spend;
    this.overridingSpend = overridingSpend;
    this.useRmd = useRmd;
    this.useSavings = useSavings;
    this.useTrad401k = useTrad401k;
    this.useRoth = useRoth;
    this.flatSsWithholdingRate = flatSsWithholdingRate;
    this.flatTrad401kWithholdingRate = flatTrad401kWithholdingRate;
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
   * @param {Inputs} inputs - Retirement calculation inputs object containing:
   * @param {number} taxYearBase - Base year for tax calculations.
   * @returns {FiscalData} A fully configured FiscalData instance containing:
   
   */
  static CreateUsing(inputs, taxYearBase) {
    return new FiscalData(
      inputs.inflationRate,
      inputs.subject401kInterestRate,
      inputs.subjectRothInterestRate,
      inputs.savingsInterestRate,
      inputs.yearIndex,
      inputs.spend,
      inputs.overridingSpend,
      taxYearBase,
      inputs.useRMD,
      inputs.useSavings,
      inputs.subjectUseTrad401k,
      inputs.subjectUseRoth,
      inputs.flatSsWithholdingRate,
      inputs.flatCareerTrad401kWithholdingRate,
      // inputs.retirementYearSpendingOverride,
      // inputs.retirementYearTaxableIncomeOverride,
      // inputs.retirementYearTaxFreeIncomeOverride
    );
  }
}

export { FiscalData };
