import { Account } from "./cAccount";
import { AccountsManager } from "./cAccountsManager";
import { FiscalData } from "./cFiscalData";
import { withLabel } from "./debugUtils";

/**
 * Represents deposit amounts across all retirement and savings accounts.
 *
 * This class encapsulates the deposit breakdown for all account types in a retirement
 * calculation year, providing structured access to individual account deposits and
 * total deposit amounts. It includes Required Minimum Distributions (RMD) and serves
 * as a comprehensive view of all fund distributions for reporting and analysis.
 *
 * @class Deposits
 * @since 1.0.0
 */
class Deposits {
  /**
   * Creates a new Deposits instance with deposit data from all account types.
   *
   * @param {Account} trad401k - Traditional 401k deposits for the year
   * @param {Account} savings - Savings account deposits for the year
   * @param {Account}  roth - Roth IRA deposits for the year
   * @param {number} taxYear - The tax year for which these deposits apply
   * @param {string} [description="Deposits Breakdown"] - Descriptive label for this deposit snapshot
   */
  constructor(
    trad401k,
    savings,
    roth,
    taxYear,
    description = "Deposits Breakdown"
  ) {
    this._description = description;
    this._trad401k = trad401k;
    this._savings = savings;
    this._roth = roth;
    this._taxYear = taxYear;
  }

  // /**
  //  * Gets the descriptive label for this deposit breakdown.
  //  *
  //  * @returns {string} Description of the deposits
  //  */
  // get description() {
  //   return this._description;
  // }

  /**
   * Sets a new description for this deposit breakdown.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  get trad401k() {
    return this._trad401k.depositsForYear(this._taxYear);
  }

  get savings() {
    return this._savings.depositsForYear(this._taxYear);
  }

  get roth() {
    return this._roth.depositsForYear(this._taxYear);
  }

  /**
   * Calculates the total deposit amount across all accounts and sources.
   *
   * @returns {number} Sum of all deposits including RMD
   */
  get total() {
    return this.trad401k + this.savings + this.roth;
  }

  /**
   * Gets total deposits from retirement accounts only (401k + Roth, excluding savings and RMD).
   *
   * @returns {number} Combined retirement account deposits
   */
  get totalRetirementDeposits() {
    return this.trad401k + this.roth;
  }

  /**
   * Gets the percentage breakdown of deposits by source.
   *
   * @returns {Object} Deposit source percentages:
   *   - trad401kPercent: Percentage from traditional 401k
   *   - savingsPercent: Percentage from savings account
   *   - rothPercent: Percentage from Roth IRA
   *   - rmdPercent: Percentage from RMD
   */
  get depositPercentages() {
    if (this.total === 0) {
      return {
        trad401kPercent: 0,
        savingsPercent: 0,
        rothPercent: 0,
      };
    }

    return {
      trad401kPercent: ((this.trad401k / this.total) * 100).toFixed(2),
      savingsPercent: ((this.savings / this.total) * 100).toFixed(2),
      rothPercent: ((this.roth / this.total) * 100).toFixed(2),
    };
  }

  /**
   * Checks if any deposit amount is negative (error condition).
   *
   * @returns {boolean} True if any deposit is negative
   */
  get hasNegativeDeposits() {
    return this.trad401k < 0 || this.savings < 0 || this.roth < 0;
  }

  /**
   * Gets the largest deposit source and amount.
   *
   * @returns {Object} Largest deposit information:
   *   - source: Name of the account with largest deposit
   *   - amount: The deposit amount
   */
  get largestDeposit() {
    const amounts = {
      trad401k: this.trad401k,
      savings: this.savings,
      roth: this.roth,
    };

    const largest = Object.entries(amounts).reduce(
      (max, [source, amount]) => {
        return amount > max.amount ? { source, amount } : max;
      },
      { source: "none", amount: 0 }
    );

    return largest;
  }

  /**
   * Checks if there are any deposits at all.
   *
   * @returns {boolean} True if total deposits are greater than zero
   */
  get hasDeposits() {
    return this.total > 0;
  }

  /**
   * Creates a summary object with formatted deposit information.
   *
   * @returns {Object} Summary containing:
   *   - trad401k: Traditional 401k deposits
   *   - savings: Savings account deposits
   *   - roth: Roth IRA deposits
   *   - rmd: Required Minimum Distribution amount
   *   - total: Total deposit amount
   *   - retirementTotal: Combined retirement account deposits
   *   - taxableTotal: Combined taxable deposits
   *   - percentages: Percentage breakdown by source
   *   - largestDeposit: Source with highest deposit
   *   - hasNegativeDeposits: Whether any deposits are negative
   *   - hasDeposits: Whether any deposits occurred
   */
  getSummary() {
    return {
      trad401k: this.trad401k,
      savings: this.savings,
      roth: this.roth,
      total: this.total,
      retirementTotal: this.totalRetirementDeposits,
      percentages: this.depositPercentages,
      largestDeposit: this.largestDeposit,
      hasNegativeDeposits: this.hasNegativeDeposits,
      hasDeposits: this.hasDeposits,
    };
  }

  /**
   * Factory method to create an empty Deposits instance with all values set to zero.
   *
   * This method provides a convenient way to initialize a Deposits object with
   * no deposits, useful for scenarios where deposit calculations haven't been
   * performed yet or for baseline comparisons.
   *
   * @param {string} [description="Deposits Breakdown"] - Optional description
   *
   * @returns {Deposits} A new Deposits instance with all values set to zero
   *
   * @example
   * // Create empty deposits for initialization
   * const deposits = Deposits.Empty();
   * console.log(deposits.total()); // 0
   * console.log(deposits.hasDeposits()); // false
   *
   * // Later, update with actual deposit amounts
   * deposits.updateDeposits({
   *   trad401k: 25000,
   *   rmd: 5000
   * });
   * console.log(deposits.total()); // 30000
   *
   * @static
   * @since 1.0.0
   */
  static Empty(description = "Deposits Breakdown") {
    return new Deposits(
      new Account("savings", 0, 0),
      new Account("trad401k", 0, 0),
      new Account("roth", 0, 0),
      0,
      description
    );
  }

  /**
   * Factory method to create a Deposits instance from account group and income data.
   *
   * This method provides a convenient way to construct Deposits objects by
   * extracting deposit amounts from an AccountGroup and income breakdown for
   * a specific tax year. It handles the deposit calculations automatically.
   *
   * @param {AccountsManager} accounts - AccountGroup instance containing all accounts
   * @param {FiscalData} fiscalData - Fiscal data containing the target tax year
   * @param {string} [description="Deposits Breakdown"] - Optional description
   *
   * @returns {Deposits} A new Deposits instance with current deposit amounts
   *
   * @example
   * // Create deposits from account group for current tax year
   * const accounts = AccountGroup.CreateUsing(accountData);
   * const incomeBreakdown = IncomeBreakdown.CreateFrom(incomeData);
   * const fiscalData = FiscalData.CreateUsing(inputs, 2024);
   *
   * const deposits = Deposits.CreateUsing(accounts, incomeBreakdown, fiscalData);
   * console.log(deposits.total()); // Total deposit amount
   * console.log(deposits.getDepositPercentages()); // Source breakdown
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(accounts, fiscalData, description = "Deposits Breakdown") {
    const trad401k = accounts.trad401k;
    const savings = accounts.savings;
    const roth = accounts.rothIra;

    const calculationDetails = [];
    if (typeof withLabel === "function") {
      calculationDetails.push(
        withLabel("fiscalData", fiscalData),
        withLabel("accounts", accounts)
      );
    } else {
      calculationDetails.push(fiscalData, accounts);
    }

    return new Deposits(
      trad401k,
      savings,
      roth,
      fiscalData.taxYear,
      description
    );
  }

  /**
   * Factory method to create a Deposits instance from individual deposit amounts.
   *
   * @param {Account} trad401k - Traditional 401k deposit amount
   * @param {Account} savings - Savings deposit amount
   * @param {Account} roth - Roth IRA deposit amount
   * @param {number} taxYear - Fiscal data containing the target tax year
   * @param {string} [description="Deposits Breakdown"] - Optional description
   *
   * @returns {Deposits} A new Deposits instance with specified amounts
   *
   * @example
   * // Create deposits from known amounts
   * const deposits = Deposits.CreateFrom(25000, 10000, 5000, 8000);
   * console.log(deposits.total()); // 48000
   *
   * @static
   * @since 1.0.0
   */
  static CreateFrom(
    trad401k,
    savings,
    roth,
    taxYear,
    description = "Deposits Breakdown"
  ) {
    return new Deposits(trad401k, savings, roth, taxYear, description);
  }
}

// Maintain backward compatibility - this will need account and income data context
// const deposits = Deposits.CreateUsing(accounts, incomeResults.incomeBreakdown, fiscalData);

export { Deposits };