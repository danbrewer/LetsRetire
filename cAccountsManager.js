import { Account, ACCOUNT_TYPES } from "./cAccount.js";
import { Inputs } from "./cInputs.js";

class AccountsManager {
  /**
   * @param {Account} trad401k - Traditional 401k account instance
   * @param {Account} rothIra - Roth IRA account instance
   * @param {Account} savings - Savings account instance
   * @param {Account} income - Income account instance
   * @param {Account} disbursement - Disbursement account instance
   * @param {Account} taxes - Taxes account instance
   * @param {Account} withholdings - Withholdings account instance
   */
  constructor(
    trad401k,
    rothIra,
    savings,
    income,
    disbursement,
    taxes,
    withholdings
  ) {
    /** @type {Account} */
    this.trad401k = trad401k;

    /** @type {Account} */
    this.rothIra = rothIra;

    /** @type {Account} */
    this.savings = savings;

    /** @type {Account} */
    this.income = income;

    /** @type {Account} */
    this.disbursement = disbursement;

    /** @type {Account} */
    this.taxes = taxes;

    /** @type {Account} */
    this.withholdings = withholdings;
  }

  /**
   * Factory method to create AccountGroup from input data
   * @param {Inputs} inputs - Input data containing account balances and rates
   * @returns {AccountsManager} New AccountGroup instance
   */
  static CreateFromInputs(inputs) {
    const trad401k = new Account(
      ACCOUNT_TYPES.TRAD_401K,
      inputs.trad401kStartingBalance,
      inputs.trad401kInterestRate
    );
    const rothIra = new Account(
      ACCOUNT_TYPES.TRAD_ROTH,
      inputs.tradRothStartingBalance,
      inputs.tradRothInterestRate
    );
    const savings = new Account(
      ACCOUNT_TYPES.SAVINGS,
      inputs.savingsStartingBalance,
      inputs.savingsInterestRate
    );

    const revenue = new Account(ACCOUNT_TYPES.REVENUE, 0, 0);
    const disbursement = new Account(ACCOUNT_TYPES.DISBURSEMENT, 0, 0);
    const taxes = new Account(ACCOUNT_TYPES.TAXES, 0, 0);
    const withholdings = new Account(ACCOUNT_TYPES.WITHHOLDINGS, 0, 0);
    return new AccountsManager(
      trad401k,
      rothIra,
      savings,
      revenue,
      disbursement,
      taxes,
      withholdings
    );
  }

  /**
   * @param {number | null} yyyy
   */
  toJSON(yyyy = null) {
    return {
      trad401k: this.trad401k.toJSON(yyyy),
      rothIra: this.rothIra.toJSON(yyyy),
      savings: this.savings.toJSON(yyyy),
      income: this.income.toJSON(yyyy),
      disbursement: this.disbursement.toJSON(yyyy),
    };
  }

  /**
   * @param {string} json
   */
  static fromJSON(json) {
    const obj = typeof json === "string" ? JSON.parse(json) : json;
    return new AccountsManager(
      Account.fromJSON(obj.trad401k),
      Account.fromJSON(obj.rothIra),
      Account.fromJSON(obj.savings),
      Account.fromJSON(obj.income),
      Account.fromJSON(obj.disbursement),
      Account.fromJSON(obj.taxes),
      Account.fromJSON(obj.withholdings)
    );
  }

  // Utility methods for account group analysis
  getAllAccounts() {
    return [this.trad401k, this.rothIra, this.savings, this.income];
  }

  /**
   * @param {number} year
   */
  getTotalBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.endingBalanceForYear(year);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalStartingBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.startingBalanceForYear(year);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalWithdrawals(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.withdrawalsForYear(year);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalDeposits(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.depositsForYear(year);
    }, 0);
  }

  /**
   * @param {number} year
   * @param {string} calculationMethod
   */
  getTotalInterestEarned(year, calculationMethod) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.calculateInterestForYear(calculationMethod, year);
    }, 0);
  }

  /**
   * @param {ACCOUNT_TYPES} name
   */
  getAccountByName(name) {
    switch (name) {
      case ACCOUNT_TYPES.TRAD_401K:
        return this.trad401k;
      case ACCOUNT_TYPES.TRAD_ROTH:
        return this.rothIra;
      case ACCOUNT_TYPES.SAVINGS:
        return this.savings;
      case ACCOUNT_TYPES.REVENUE:
        return this.income;
      case ACCOUNT_TYPES.DISBURSEMENT:
        return this.disbursement;
      default:
        throw new Error(`Account not found: ${name}`);
    }
  }

  /**
   * @param {number} year
   */
  hasPositiveBalance(year) {
    return this.getTotalBalance(year) > 0;
  }

  /**
   * @param {number} year
   */
  getBalanceBreakdown(year) {
    return {
      trad401k: this.trad401k.endingBalanceForYear(year),
      rothIra: this.rothIra.endingBalanceForYear(year),
      savings: this.savings.endingBalanceForYear(year),
      total: this.getTotalBalance(year),
    };
  }

  // /**
  //  * @param {number} year
  //  */
  // getAccountSummary(year) {
  //   return {
  //     trad401k: {
  //       name: this.trad401k.name,
  //       startingBalance: this.trad401k.startingBalanceForYear(year),
  //       withdrawals: this.trad401k.withdrawalsForYear(year),
  //       deposits: this.trad401k.depositsForYear(year),
  //       endingBalance: this.trad401k.endingBalanceForYear(year),
  //       interestRate: this.trad401k.interestRate,
  //     },
  //     rothIra: {
  //       name: this.rothIra.name,
  //       startingBalance: this.rothIra.startingBalanceForYear(year),
  //       withdrawals: this.rothIra.withdrawalsForYear(year),
  //       deposits: this.rothIra.depositsForYear(year),
  //       endingBalance: this.rothIra.endingBalanceForYear(year),
  //       interestRate: this.rothIra.interestRate,
  //     },
  //     savings: {
  //       name: this.savings.name,
  //       startingBalance: this.savings.startingBalanceForYear(year),
  //       withdrawals: this.savings.withdrawalsForYear(year),
  //       deposits: this.savings.depositsForYear(year),
  //       endingBalance: this.savings.endingBalanceForYear(year),
  //       interestRate: this.savings.interestRate,
  //     },
  //     totals: {
  //       startingBalance: this.getTotalStartingBalance(year),
  //       endingBalance: this.getTotalBalance(year),
  //       withdrawals: this.getTotalWithdrawals(year),
  //       deposits: this.getTotalDeposits(year),
  //     },
  //   };
  // }

  //   // Method to apply interest rate changes to all accounts
  //   updateInterestRates(trad401kRate, rothIraRate, savingsRate) {
  //     // Note: Account class would need setter methods for this to work
  //     // This is a placeholder for future implementation
  //     console.warn(
  //       "updateInterestRates method requires Account class to have rate setters"
  //     );
  //   }

  // Method to get accounts in withdrawal order
  /**
   * @param {string[]} withdrawalOrder
   */
  getAccountsInOrder(withdrawalOrder) {
    if (!Array.isArray(withdrawalOrder)) {
      return this.getAllAccounts();
    }

    return withdrawalOrder
      .map((accountType) => {
        switch (accountType) {
          case "SAVINGS":
            return this.savings;
          case "TRADITIONAL_401K":
            return this.trad401k;
          case "ROTH_IRA":
            return this.rothIra;
          default:
            return null;
        }
      })
      .filter((account) => account !== null);
  }

  // static Empty() {
  //   return new AccountsManager(
  //     Account.Empty(ACCOUNT_TYPES.TRAD_401K),
  //     Account.Empty(ACCOUNT_TYPES.TRAD_ROTH),
  //     Account.Empty(ACCOUNT_TYPES.SAVINGS),
  //     Account.Empty(ACCOUNT_TYPES.REVENUE),
  //     Account.Empty(ACCOUNT_TYPES.DISBURSEMENT)
  //   );
  // }
}

// Create instance using the factory method for backward compatibility
// const accounts = AccountGroup.fromInputs(inputs);

export { AccountsManager };
