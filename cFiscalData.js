class FiscalData {
  constructor(
    inflationRate,
    filingStatus,
    retirementAccountRateOfReturn,
    rothRateOfReturn,
    savingsRateOfReturn,
    yearIndex,
    spend,
    useRmd = false,
    useSavings = true,
    useTrad401k = true,
    useRoth = true,
    taxBaseYear = TAX_BASE_YEAR
  ) {
    this._description = "Fiscal Year Data";
    this.inflationRate = inflationRate;
    this.filingStatus = filingStatus;
    this.retirementAccountRateOfReturn = retirementAccountRateOfReturn;
    this.rothRateOfReturn = rothRateOfReturn;
    this.savingsRateOfReturn = savingsRateOfReturn;
    this.taxYear = taxBaseYear + yearIndex;
    this.yearIndex = yearIndex;
    this.spend = spend;
    this.useRmd = useRmd;
    this.useSavings = useSavings;
    this.useTrad401k = useTrad401k;
    this.useRoth = useRoth;
  }

  // Getter for description to maintain compatibility
  get description() {
    return this._description;
  }

  // Method to update for next year
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

  // Static factory method for creating fiscal data from inputs
  static CreateUsing(inputs, taxBaseYear = TAX_BASE_YEAR) {
    return new FiscalData(
      inputs.inflation,
      inputs.filingStatus,
      inputs.ret401k,
      inputs.retRoth,
      inputs.retSavings,
      inputs.yearIndex,
      inputs.spend,
      inputs.useRMD,
      inputs.useSavings,
      inputs.useTrad401k,
      inputs.useRoth,
      taxBaseYear
    );
  }
}
