import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountAnalyzer } from "./cAccountAnalyzer.js";
import { AccountsManager } from "./cAccountsManager.js";
import { INTEREST_CALCULATION_EPOCH } from "./consts.js";
import { TransactionCategory } from "./cTransaction.js";

/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 */
class AccountingYear {
  #accountsManager;

  /** @type {Map<string, AccountAnalyzer>} */
  #accountAnalyzers;

  /** @type {Object.<string, AccountAnalyzer>} */
  #analyzerProxy;

  /**
   * @param {AccountsManager} accountsManager
   * @param {number} taxYear
   */
  constructor(accountsManager, taxYear) {
    this.#accountsManager = accountsManager;
    this.taxYear = taxYear;

    this.#accountAnalyzers = new Map();
    // Initialize AccountAnalyzers for all account types
    this.#accountAnalyzers = new Map();
    for (const [typeName, accountType] of Object.entries(ACCOUNT_TYPES)) {
      this.#accountAnalyzers.set(
        accountType,
        new AccountAnalyzer(this, accountType)
      );
    }

    // Create a proxy object for elegant access
    this.#analyzerProxy = new Proxy(
      {},
      {
        get: (_, prop) => {
          if (typeof prop === "string") {
            if (!this.#accountAnalyzers.has(prop)) {
              throw new Error(
                `AccountAnalyzer for type "${prop}" does not exist.`
              );
            }
            return this.#accountAnalyzers.get(prop);
          }
          return undefined;
        },
        has: (_, prop) => {
          if (typeof prop === "string") {
            return this.#accountAnalyzers.has(prop);
          }
          return false;
        },
        ownKeys: (_) => {
          return Array.from(this.#accountAnalyzers.keys());
        },
        getOwnPropertyDescriptor: (_, prop) => {
          if (typeof prop === "string" && this.#accountAnalyzers.has(prop)) {
            return {
              enumerable: true,
              configurable: true,
              value: this.#accountAnalyzers.get(prop),
            };
          }
          return undefined;
        },
      }
    );
  }

  /**
   * Get AccountAnalyzer for a specific account type
   * @param {string} accountType - The account type from ACCOUNT_TYPES
   * @returns {AccountAnalyzer | undefined}
   */
  getAccountAnalyzer(accountType) {
    return this.#accountAnalyzers.get(accountType);
  }

  /**
   * Get AccountAnalyzers with elegant indexer-style access
   * @returns {Object.<string, AccountAnalyzer>}
   */
  get analyzers() {
    return this.#analyzerProxy;
  }

  toJSON() {
    return {
      accountsManager: this.#accountsManager.toJSON(this.taxYear),
      taxYear: this.taxYear,
    };
  }

  /**
   * @param {string} accountName
   * @param {TransactionCategorySymbol} category
   * @param {number} amount
   * @param {number} [month]
   * @param {number} [day]
   * @param {string | null} [party]
   */
  deposit(accountName, category, amount, month = 1, day = 1, party = "") {
    const account = this.#accountsManager.getAccountByType(accountName);
    if (account) {
      account.deposit(amount, category, this.taxYear, month, day, party);
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountName
   * @param {TransactionCategorySymbol | undefined} [category = ""]
   */
  getDeposits(accountName, category) {
    const account = this.#getAccountByName(accountName);
    return account.depositsForYear(this.taxYear, category);
  }

  /**
   * @param {string} accountName
   * @param {TransactionCategorySymbol} category
   * @param {number} amount
   * @param {number} [month]
   * @param {number} [day]
   * @param {string} [party]
   */
  withdrawal(accountName, category, amount, month = 1, day = 1, party = "") {
    const account = this.#accountsManager.getAccountByType(accountName);
    if (account) {
      account.withdrawal(amount, category, this.taxYear, month, day, party);
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountName
   */
  #getAccountByName(accountName) {
    const account = this.#accountsManager.getAccountByType(accountName);
    if (!account) {
      throw new Error(`Account not found: ${accountName}`);
    }
    return account;
  }

  /**
   * @param {ACCOUNT_TYPES} accountType
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  getWithdrawals(accountType, category) {
    const account = this.#accountsManager.getAccountByType(accountType);
    if (account) {
      return account.withdrawalsForYear(this.taxYear, category);
    } else {
      throw new Error(`Account not found: ${accountType}`);
    }
  }

  // Utility methods for account group analysis
  getAllAccounts() {
    return this.#accountsManager.getAllAccounts();
  }

  getTotalBalance() {
    return this.#accountsManager.getTotalBalance(this.taxYear);
  }

  /**
   * @param {string} accountName
   */
  getStartingBalance(accountName) {
    const account = this.#accountsManager.getAccountByType(accountName);
    if (account) {
      return account.startingBalanceForYear(this.taxYear);
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountName
   */
  getEndingBalance(accountName) {
    const account = this.#accountsManager.getAccountByType(accountName);
    if (account) {
      return account.endingBalanceForYear(this.taxYear).asCurrency();
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  getTotalStartingBalance() {
    return this.#accountsManager
      .getTotalStartingBalance(this.taxYear)
      .asCurrency();
  }

  getTotalWithdrawals() {
    return this.#accountsManager.getTotalWithdrawals(this.taxYear).asCurrency();
  }

  getTotalDeposits() {
    return this.#accountsManager.getTotalDeposits(this.taxYear).asCurrency();
  }

  /**
   * @param {string[]} accountNames
   */
  getAvailableFunds(accountNames) {
    let total = 0;
    for (const name of accountNames) {
      const account = this.#accountsManager.getAccountByType(name);
      if (account) {
        total += Math.max(account.endingBalanceForYear(this.taxYear), 0);
      } else {
        throw new Error(`Account not found: ${name}`);
      }
    }
    return Math.max(total, 0).asCurrency();
  }

  /**
   * @param {string} calculationMethod
   */
  getTotalInterestEarned(calculationMethod) {
    return this.#accountsManager.getTotalInterestEarned(
      this.taxYear,
      calculationMethod
    ).asCurrency;
  }

  /**
   * @param {any} accountName
   * @param {INTEREST_CALCULATION_EPOCH} epoch
   */
  calculateInterestForYear(accountName, epoch) {
    return this.#getAccountByName(accountName).calculateInterestForYear(
      epoch,
      this.taxYear
    );
  }

  /**
   * @param {string} accountName
   * @returns {number}
   */
  recordInterestEarnedForYear(accountName) {
    return this.#getAccountByName(accountName)
      .recordInterestEarnedForYear(this.taxYear)
      .asCurrency();
  }

  /** @param {string} accountName */
  getInterestEarnedForYear(accountName) {
    return this.getDeposits(
      accountName,
      TransactionCategory.Interest
    ).asCurrency();
  }

  /**
   * @param {string} accountName
   * @param {TransactionCategorySymbol} category
   * @param {number} amount
   * @param {string} frequency
   * @param {string | null} memo
   */
  processAsPeriodicWithdrawals(accountName, category, amount, frequency, memo) {
    const account = this.#getAccountByName(accountName);
    if (account) {
      account.processAsPeriodicWithdrawals(
        this.taxYear,
        amount,
        category,
        frequency,
        memo
      );
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountName
   * @param {TransactionCategorySymbol} category
   * @param {number} amount
   * @param {string} frequency
   * @param {string} memo
   */
  processAsPeriodicDeposits(
    accountName,
    category,
    amount,
    frequency,
    memo = ""
  ) {
    const account = this.#getAccountByName(accountName);
    if (account) {
      account.processAsPeriodicDeposits(
        this.taxYear,
        amount,
        category,
        frequency,
        memo
      );
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountType
   */
  getAccountByType(accountType) {
    return this.#accountsManager.getAccountByType(accountType);
  }

  /**
   * @param {string} accountType
   */
  getAccountTransactions(accountType) {
    const account = this.#getAccountByName(accountType);
    if (account) {
      return account.getTransactionsForYear(this.taxYear);
    } else {
      throw new Error(`Account not found: ${accountType}`);
    }
  }

  hasPositiveBalance() {
    return this.#accountsManager.getTotalBalance(this.taxYear) > 0;
  }

  getBalanceBreakdown() {
    return this.#accountsManager.getBalanceBreakdown(this.taxYear);
  }

  getAccountsSummary() {
    /** @type {Record<string, any>} */
    const summaries = {};
    for (const accountType of Object.values(ACCOUNT_TYPES)) {
      summaries[accountType] = this.getAccountSummary(accountType);
    }
    return summaries;
  }

  /**
   * @param {string} accountType
   */
  getAccountSummary(accountType) {
    const account = this.#getAccountByName(accountType);
    return {
      name: account.name,
      startingBalance: account.startingBalanceForYear(this.taxYear),
      endingBalance: account.endingBalanceForYear(this.taxYear),
      deposits: account.depositsForYear(this.taxYear),
      withdrawals: account.withdrawalsForYear(this.taxYear),
      interestRate: account.interestRate,
    };
  }

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
    return this.#accountsManager.getAccountsInOrder(withdrawalOrder);
  }

  // static Empty() {
  //   return new AccountYear(AccountsManager.Empty(), 0);
  // }

  /**
   * @param {AccountsManager} accountsManager
   * @param {number} taxYear
   */
  static FromAccountsManager(accountsManager, taxYear) {
    return new AccountingYear(accountsManager, taxYear);
  }
}

// Create instance using the factory method for backward compatibility
// const accounts = AccountGroup.fromInputs(inputs);

export { AccountingYear };
