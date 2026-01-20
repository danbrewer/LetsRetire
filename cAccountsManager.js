import { Account, ACCOUNT_TYPES } from "./cAccount.js";
import { Inputs } from "./cInputs.js";
import { TransactionManager } from "./cTransactionManager.js";
import { DateFunctions } from "./utils.js";

class AccountsManager {
  /** @type {Map<ACCOUNT_TYPES, Account>} */
  #accountsByType;

  /**
   * @param {Map<ACCOUNT_TYPES, Account>} accountsMap - Map of account types to Account instances
   */
  constructor(accountsMap) {
    this.#accountsByType = new Map(accountsMap);
  }

  /**
   * Factory method to create AccountGroup from input data
   * @param {Inputs} inputs - Input data containing account balances and rates
   * @param {TransactionManager} transactionManager
   * @returns {AccountsManager} New AccountGroup instance
   */
  static CreateFromInputs(inputs, transactionManager) {
    /** @type {Map<ACCOUNT_TYPES, Account>} */
    const accountsMap = new Map();

    // Iterate over all ACCOUNT_TYPES and create appropriate accounts
    for (const [typeName, accountType] of Object.entries(ACCOUNT_TYPES)) {
      let startingBalance = 0;
      let interestRate = 0;

      // Set starting balance and interest rate based on account type
      switch (accountType) {
        case ACCOUNT_TYPES.SUBJECT_401K:
          startingBalance = inputs.subject401kStartingBalance || 0;
          interestRate = inputs.trad401kInterestRate || 0;
          break;

        case ACCOUNT_TYPES.PARTNER_401K:
          startingBalance = inputs.partner401kStartingBalance || 0;
          interestRate = inputs.partnerTrad401kInterestRate || 0;
          break;

        case ACCOUNT_TYPES.SUBJECT_ROTH_IRA:
          startingBalance = inputs.subjectRothStartingBalance || 0;
          interestRate = inputs.tradRothInterestRate || 0;
          break;

        case ACCOUNT_TYPES.PARTNER_ROTH_IRA:
          startingBalance = inputs.partnerRothStartingBalance || 0;
          interestRate = inputs.partnerRothInterestRate || 0;
          break;

        case ACCOUNT_TYPES.SAVINGS:
          startingBalance = inputs.savingsStartingBalance || 0;
          interestRate = inputs.savingsInterestRate || 0;
          break;

        // All other account types default to 0 balance and 0% interest
        default:
          startingBalance = 0;
          interestRate = 0;
          break;
      }

      const account = Account.createWithOpeningBalance(
        accountType,
        transactionManager,
        startingBalance,
        DateFunctions.addDays(new Date(inputs.currentYear, 0, 1), -1),
        interestRate
      );

      accountsMap.set(accountType, account);
    }

    return new AccountsManager(accountsMap);
  }

  /**
   * @param {ACCOUNT_TYPES} accountType
   * @returns {Account}
   */
  #getAccountByType(accountType) {
    const account = this.#accountsByType.get(accountType);
    if (account) {
      return account;
    }
    throw new Error(`Account type not found: ${accountType}`);
  }

  get subject401k() {
    return this.#getAccountByType(ACCOUNT_TYPES.SUBJECT_401K);
  }

  get partnerTrad401k() {
    return this.#getAccountByType(ACCOUNT_TYPES.PARTNER_401K);
  }

  get subjectRothIra() {
    return this.#getAccountByType(ACCOUNT_TYPES.SUBJECT_ROTH_IRA);
  }

  get savings() {
    return this.#getAccountByType(ACCOUNT_TYPES.SAVINGS);
  }

  get income() {
    return this.#getAccountByType(ACCOUNT_TYPES.CASH);
  }

  /**
   * @param {number | null} yyyy
   */
  toJSON(yyyy = null) {
    return {
      trad401k: this.subject401k?.toJSON(yyyy),
      rothIra: this.subjectRothIra?.toJSON(yyyy),
      savings: this.savings?.toJSON(yyyy),
      income: this.income?.toJSON(yyyy),
    };
  }

  /**
   * @param {string} json
   */
  static fromJSON(json) {
    const obj = typeof json === "string" ? JSON.parse(json) : json;
    const accountsMap = new Map();

    for (const [_, accountType] of Object.entries(ACCOUNT_TYPES)) {
      const key =
        typeof accountType === "symbol" ? accountType.description : accountType;
      if (obj[key]) {
        accountsMap.set(accountType, Account.fromJSON(obj[key]));
      }
    }

    return new AccountsManager(accountsMap);
  }

  // Utility methods for account group analysis
  getAllAccounts() {
    return [this.subject401k, this.subjectRothIra, this.savings, this.income];
  }

  /**
   * @param {number} year
   */
  getTotalBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.endingBalanceForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalStartingBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.endingBalanceForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalWithdrawals(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.withdrawalsForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalDeposits(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.depositsForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   * @param {string} calculationMethod
   */
  getTotalInterestEarned(year, calculationMethod) {
    return this.getAllAccounts().reduce((total, account) => {
      return (
        total +
        (account?.calculateInterestForYear(calculationMethod, year) ?? 0)
      );
    }, 0);
  }

  /**
   * @param {ACCOUNT_TYPES} name
   */
  getAccountByType(name) {
    return this.#accountsByType.get(name);
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
      trad401k: this.subject401k?.endingBalanceForYear(year) ?? 0,
      rothIra: this.subjectRothIra?.endingBalanceForYear(year) ?? 0,
      savings: this.savings?.endingBalanceForYear(year) ?? 0,
      total: this.getTotalBalance(year),
    };
  }

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
            return this.subject401k;
          case "ROTH_IRA":
            return this.subjectRothIra;
          default:
            return null;
        }
      })
      .filter((account) => account !== null);
  }
}

export { AccountsManager };
