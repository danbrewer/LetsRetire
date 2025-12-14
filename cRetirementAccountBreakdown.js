import { Account } from "./cAccount";
import { FiscalData } from "./cFiscalData";

/**
 * Represents detailed breakdown of retirement account activity for a specific year.
 *
 * This class encapsulates all financial activity for a retirement account during
 * a calculation year, including starting balance, withdrawals, deposits, interest
 * earned, and ending balance. It provides structured access to account performance
 * metrics and growth analysis for retirement planning scenarios.
 *
 * @class RetirementAccountBreakdown
 * @since 1.0.0
 */
class RetirementAccountBreakdown {
  /**
   * Creates a new RetirementAccountBreakdown instance with account activity data.
   *
   * @param {number} [startingBalance=0] - Account balance at beginning of year
   * @param {number} [withdrawals=0] - Total withdrawals during the year
   * @param {string} [growthRate="0%"] - Annual growth rate as formatted percentage
   * @param {number} [interestEarned=0] - Interest/investment gains for the year
   * @param {number} [deposits=0] - Total deposits/contributions during the year
   * @param {number} [endingBalance=0] - Account balance at end of year
   * @param {string} [description="Retirement Account Breakdown"] - Descriptive label
   */
  constructor(
    startingBalance = 0,
    withdrawals = 0,
    growthRate = "0%",
    interestEarned = 0,
    deposits = 0,
    endingBalance = 0,
    description = "Retirement Account Breakdown"
  ) {
    this._description = description;
    this.startingBalance = startingBalance;
    this.withdrawals = withdrawals;
    this.growthRate = growthRate;
    this.interestEarned = interestEarned;
    this.deposits = deposits;
    this.endingBalance = endingBalance;
  }

  //   /**
  //    * Gets the descriptive label for this account breakdown.
  //    *
  //    * @returns {string} Description of the account breakdown
  //    */
  //   get description() {
  //     return this._description;
  //   }

  /**
   * Sets a new description for this account breakdown.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  /**
   * Calculates the net change in account balance for the year.
   *
   * @returns {number} Ending balance minus starting balance
   */
  getNetChange() {
    return this.endingBalance - this.startingBalance;
  }

  /**
   * Calculates the growth rate as a decimal from the formatted percentage string.
   *
   * @returns {number} Growth rate as decimal (e.g., 0.07 for 7%)
   */
  getGrowthRateAsDecimal() {
    const numericPart = parseFloat(this.growthRate.replace("%", ""));
    return isNaN(numericPart) ? 0 : numericPart / 100;
  }

  /**
   * Calculates the actual return rate based on account activity.
   * Formula: (Interest Earned) / (Average Balance)
   *
   * @returns {number} Actual return rate as decimal
   */
  get actualReturnRate() {
    const averageBalance = (this.startingBalance + this.endingBalance) / 2;
    if (averageBalance === 0) return 0;
    return this.interestEarned / averageBalance;
  }

  /**
   * Gets the net contribution amount (deposits minus withdrawals).
   *
   * @returns {number} Net contributions for the year
   */
  get netContributions() {
    return this.deposits - this.withdrawals;
  }

  //   /**
  //    * Validates the account balance calculation for consistency.
  //    * Formula: Starting Balance + Deposits + Interest - Withdrawals = Ending Balance
  //    *
  //    * @returns {boolean} True if calculation is consistent within rounding tolerance
  //    */
  //   get isBalanceCalculationValid() {
  //     const calculatedEnding =
  //       this.startingBalance +
  //       this.deposits +
  //       this.interestEarned -
  //       this.withdrawals;
  //     const tolerance = 0.01; // Allow for rounding differences
  //     return Math.abs(calculatedEnding - this.endingBalance) <= tolerance;
  //   }

  //   /**
  //    * Gets the expected ending balance based on the growth rate.
  //    * This is what the balance would be with just growth, no deposits/withdrawals.
  //    *
  //    * @returns {number} Expected balance with growth only
  //    */
  //   getExpectedBalanceWithGrowthOnly() {
  //     return this.startingBalance * (1 + this.getGrowthRateAsDecimal());
  //   }

  //   /**
  //    * Calculates the impact of deposits and withdrawals on the account.
  //    *
  //    * @returns {number} Difference between actual and expected (growth-only) ending balance
  //    */
  //   getCashFlowImpact() {
  //     return this.endingBalance - this.getExpectedBalanceWithGrowthOnly();
  //   }

  //   /**
  //    * Creates a comprehensive summary of account activity and performance.
  //    *
  //    * @returns {Object} Summary containing:
  //    *   - startingBalance: Beginning balance
  //    *   - endingBalance: Ending balance
  //    *   - netChange: Total change in balance
  //    *   - deposits: Total deposits/contributions
  //    *   - withdrawals: Total withdrawals
  //    *   - netContributions: Net contribution amount
  //    *   - interestEarned: Investment gains
  //    *   - growthRate: Formatted growth rate
  //    *   - actualReturnRate: Calculated actual return rate
  //    *   - isValid: Whether balance calculation is consistent
  //    *   - expectedBalanceWithGrowthOnly: Balance with growth only
  //    *   - cashFlowImpact: Impact of cash flows on balance
  //    */
  //   getSummary() {
  //     return {
  //       startingBalance: this.startingBalance,
  //       endingBalance: this.endingBalance,
  //       netChange: this.getNetChange(),
  //       deposits: this.deposits,
  //       withdrawals: this.withdrawals,
  //       netContributions: this.netContributions,
  //       interestEarned: this.interestEarned,
  //       growthRate: this.growthRate,
  //       actualReturnRate: (this.actualReturnRate * 100).toFixed(2) + "%",
  //       isValid: this.isBalanceCalculationValid,
  //       expectedBalanceWithGrowthOnly: this.getExpectedBalanceWithGrowthOnly(),
  //       cashFlowImpact: this.getCashFlowImpact(),
  //     };
  //   }

  //   /**
  //    * Updates account breakdown values for corrections or adjustments.
  //    *
  //    * @param {Object} updates - Object containing breakdown updates:
  //    * @param {number} [updates.startingBalance] - New starting balance
  //    * @param {number} [updates.withdrawals] - New withdrawal amount
  //    * @param {number} [updates.interestEarned] - New interest earned
  //    * @param {number} [updates.deposits] - New deposit amount
  //    * @param {number} [updates.endingBalance] - New ending balance
  //    * @param {string} [updates.growthRate] - New growth rate (as formatted string)
  //    */
  //   updateBreakdown(updates) {
  //     if (updates.startingBalance !== undefined) {
  //       this.startingBalance = updates.startingBalance;
  //     }
  //     if (updates.withdrawals !== undefined) {
  //       this.withdrawals = updates.withdrawals;
  //     }
  //     if (updates.interestEarned !== undefined) {
  //       this.interestEarned = updates.interestEarned;
  //     }
  //     if (updates.deposits !== undefined) {
  //       this.deposits = updates.deposits;
  //     }
  //     if (updates.endingBalance !== undefined) {
  //       this.endingBalance = updates.endingBalance;
  //     }
  //     if (updates.growthRate !== undefined) {
  //       this.growthRate = updates.growthRate;
  //     }
  //   }

  /**
   * Factory method to create a RetirementAccountBreakdown from account and input data.
   *
   * This method provides a convenient way to construct RetirementAccountBreakdown
   * objects by extracting activity data from an Account instance for a specific
   * tax year. It handles all the account method calls and formatting automatically.
   *
   * @param {Account} account - Account instance (trad401k, rothIra, etc.)
   * @param {FiscalData} fiscalData - Fiscal data containing the target tax year
   * @param {number} growthRate - Growth rate for the account (e.g., "7%")
   * @param {string} [description="Retirement Account Breakdown"] - Optional description
   *
   * @returns {RetirementAccountBreakdown} A new breakdown instance with account activity data
   *
   * @example
   * // Create breakdown for traditional 401k account
   * const accounts = AccountGroup.CreateUsing(accountData);
   * const inputs = RetirementInputs.CreateUsing(inputData);
   * const fiscalData = FiscalData.CreateUsing(inputs, 2024);
   *
   * const breakdown = RetirementAccountBreakdown.CreateUsing(
   *   accounts.trad401k,
   *   inputs,
   *   fiscalData,
   *   "ret401k",
   *   "Traditional 401k Breakdown"
   * );
   *
   * console.log(breakdown.getSummary());
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(
    account,
    fiscalData,
    growthRate,
    description = "Retirement Account Breakdown"
  ) {
    const startingBalance = account.startingBalanceForYear(fiscalData.taxYear);
    const withdrawals = account.withdrawalsForYear(fiscalData.taxYear);
    const interestEarned = account.depositsForYear(
      fiscalData.taxYear,
      typeof TRANSACTION_CATEGORY !== "undefined"
        ? TRANSACTION_CATEGORY.INTEREST
        : "interest"
    );
    const deposits = account.depositsForYear(fiscalData.taxYear);
    const endingBalance = account
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency();

    return new RetirementAccountBreakdown(
      startingBalance,
      withdrawals,
      `${growthRate * 100}%`,
      interestEarned,
      deposits,
      endingBalance,
      description
    );
  }

  /**
   * Factory method to create a RetirementAccountBreakdown from individual values.
   *
   * @param {number} startingBalance - Starting balance for the year
   * @param {number} withdrawals - Withdrawal amount
   * @param {number} deposits - Deposit amount
   * @param {number} interestEarned - Interest/gains earned
   * @param {number} endingBalance - Ending balance
   * @param {number} growthRateDecimal - Growth rate as decimal (e.g., 0.07 for 7%)
   * @param {string} [description="Retirement Account Breakdown"] - Optional description
   *
   * @returns {RetirementAccountBreakdown} A new breakdown instance with specified values
   *
   * @example
   * // Create breakdown from known values
   * const breakdown = RetirementAccountBreakdown.CreateFrom(
   *   100000, // starting
   *   15000,  // withdrawals
   *   5000,   // deposits
   *   7000,   // interest
   *   97000,  // ending
   *   0.07    // 7% growth rate
   * );
   *
   * @static
   * @since 1.0.0
   */
  static CreateFrom(
    startingBalance,
    withdrawals,
    deposits,
    interestEarned,
    endingBalance,
    growthRateDecimal,
    description = "Retirement Account Breakdown"
  ) {
    const growthRate = `${(growthRateDecimal * 100).toFixed(1)}%`;

    return new RetirementAccountBreakdown(
      startingBalance,
      withdrawals,
      growthRate,
      interestEarned,
      deposits,
      endingBalance,
      description
    );
  }

  static Empty() {
    return new RetirementAccountBreakdown(
      0,
      0,
      "0%",
      0,
      0,
      0,
      "Empty Breakdown"
    );
  }
}

// Maintain backward compatibility - this will need account and input data context
// const retirementAccountBreakdown = RetirementAccountBreakdown.CreateUsing(accounts.trad401k, inputs, fiscalData, "ret401k");

export { RetirementAccountBreakdown };