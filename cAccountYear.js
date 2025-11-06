class AccountYear {
  #accountsManager;
  #taxYear;

  /**
   * @param {AccountsManager} accountsManager
   * @param {number} taxYear
   */
  constructor(accountsManager, taxYear) {
    this.#accountsManager = accountsManager;
    this.#taxYear = taxYear;
  }

  // get #trad401k() {
  //   return this.#accountsManager.trad401k;
  // }

  // get #rothIra() {
  //   return this.#accountsManager.rothIra;
  // }

  // get #savings() {
  //   return this.#accountsManager.savings;
  // }

  /**
   * @param {string} accountName
   * @param {string} category
   * @param {number} amount
   */
  deposit(accountName, category, amount) {
    const account = this.#accountsManager.getAccountByName(accountName);
    if (account) {
      account.deposit(amount, category, this.#taxYear);
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountName
   * @param {string | undefined} [category = ""]
   */
  getDeposits(accountName, category) {
    const account = this.#getAccountByName(accountName);
    return account.depositsForYear(this.#taxYear, category);
  }

  /**
   * @param {string} accountName
   * @param {string} category
   * @param {number} amount
   */
  withdrawal(accountName, category, amount) {
    const account = this.#accountsManager.getAccountByName(accountName);
    if (account) {
      account.withdrawal(amount, category, this.#taxYear);
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountName
   */
  #getAccountByName(accountName) {
    const account = this.#accountsManager.getAccountByName(accountName);
    if (!account) {
      throw new Error(`Account not found: ${accountName}`);
    }
    return account;
  }

  /**
   * @param {ACCOUNT_TYPES} accountType
   * @param {string | undefined} [category = ""]
   */
  getWithdrawals(accountType, category = "") {
    const account = this.#accountsManager.getAccountByName(accountType);
    if (account) {
      return account.withdrawalsForYear(this.#taxYear, category);
    } else {
      throw new Error(`Account not found: ${accountType}`);
    }
  }

  // Utility methods for account group analysis
  getAllAccounts() {
    return this.#accountsManager.getAllAccounts();
  }

  getTotalBalance() {
    return this.#accountsManager.getTotalBalance(this.#taxYear);
  }

  /**
   * @param {string} accountName
   */
  getStartingBalance(accountName) {
    const account = this.#accountsManager.getAccountByName(accountName);
    if (account) {
      return account.startingBalanceForYear(this.#taxYear);
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  /**
   * @param {string} accountName
   */
  getEndingBalance(accountName) {
    const account = this.#accountsManager.getAccountByName(accountName);
    if (account) {
      return account.endingBalanceForYear(this.#taxYear).asCurrency();
    } else {
      throw new Error(`Account not found: ${accountName}`);
    }
  }

  getTotalStartingBalance() {
    return this.#accountsManager
      .getTotalStartingBalance(this.#taxYear)
      .asCurrency();
  }

  getTotalWithdrawals() {
    return this.#accountsManager
      .getTotalWithdrawals(this.#taxYear)
      .asCurrency();
  }

  getTotalDeposits() {
    return this.#accountsManager.getTotalDeposits(this.#taxYear).asCurrency();
  }

  /**
   * @param {string[]} accountNames
   */
  getAvailableFunds(accountNames) {
    let total = 0;
    for (const name of accountNames) {
      const account = this.#accountsManager.getAccountByName(name);
      if (account) {
        total += Math.max(account.endingBalanceForYear(this.#taxYear), 0);
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
      this.#taxYear,
      calculationMethod
    ).asCurrency;
  }

  /**
   * @param {any} accountName
   * @param {any} epoch
   */
  calculateInterestForYear(accountName, epoch) {
    return this.#getAccountByName(accountName).calculateInterestForYear(
      epoch,
      this.#taxYear
    );
  }

  /**
   * @param {string} name
   */
  getAccountByName(name) {
    return this.#accountsManager.getAccountByName(name);
  }

  hasPositiveBalance() {
    return this.#accountsManager.getTotalBalance(this.#taxYear) > 0;
  }

  getBalanceBreakdown() {
    return this.#accountsManager.getBalanceBreakdown(this.#taxYear);
  }

  getAccountSummary() {
    return this.#accountsManager.getAccountSummary(this.#taxYear);
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

  static Empty() {
    return new AccountYear(AccountsManager.Empty(), 0);
  }

  /**
   * @param {AccountsManager} accountsManager
   * @param {number} taxYear
   */
  static FromAccountsManager(accountsManager, taxYear) {
    return new AccountYear(accountsManager, taxYear);
  }
}

// Create instance using the factory method for backward compatibility
// const accounts = AccountGroup.fromInputs(inputs);
