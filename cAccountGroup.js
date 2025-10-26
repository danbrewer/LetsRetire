class AccountGroup {
  /**
   * @param {Account} trad401k - Traditional 401k account instance
   * @param {Account} rothIra - Roth IRA account instance
   * @param {Account} savings - Savings account instance
   */
  constructor(trad401k, rothIra, savings) {
    /** @type {Account} */
    this.trad401k = trad401k;

    /** @type {Account} */
    this.rothIra = rothIra;

    /** @type {Account} */
    this.savings = savings;
  }

  /**
   * Factory method to create AccountGroup from input data
   * @param {Object} inputs - Input data containing account balances and rates
   * @returns {AccountGroup} New AccountGroup instance
   */
  static fromInputs(inputs) {
    const trad401k = new Account(
      "Traditional 401k",
      inputs.trad401k,
      inputs.ret401k
    );
    const rothIra = new Account("Roth IRA", inputs.rothIRA, inputs.retRoth);
    const savings = new Account("Savings", inputs.savings, inputs.retSavings);

    return new AccountGroup(trad401k, rothIra, savings);
  }

  // Utility methods for account group analysis
  getAllAccounts() {
    return [this.trad401k, this.rothIra, this.savings];
  }

  getTotalBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.endingBalanceForYear(year);
    }, 0);
  }

  getTotalStartingBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.startingBalanceForYear(year);
    }, 0);
  }

  getTotalWithdrawals(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.withdrawalsForYear(year);
    }, 0);
  }

  getTotalDeposits(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.depositsForYear(year);
    }, 0);
  }

  getTotalInterestEarned(year, calculationMethod) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + account.calculateInterestForYear(calculationMethod, year);
    }, 0);
  }

  getAccountByName(name) {
    switch (name.toLowerCase()) {
      case "traditional 401k":
      case "trad401k":
        return this.trad401k;
      case "roth ira":
      case "rothira":
        return this.rothIra;
      case "savings":
        return this.savings;
      default:
        return null;
    }
  }

  hasPositiveBalance(year) {
    return this.getTotalBalance(year) > 0;
  }

  getBalanceBreakdown(year) {
    return {
      trad401k: this.trad401k.endingBalanceForYear(year),
      rothIra: this.rothIra.endingBalanceForYear(year),
      savings: this.savings.endingBalanceForYear(year),
      total: this.getTotalBalance(year),
    };
  }

  getAccountSummary(year) {
    return {
      trad401k: {
        name: this.trad401k.name,
        startingBalance: this.trad401k.startingBalanceForYear(year),
        endingBalance: this.trad401k.endingBalanceForYear(year),
        withdrawals: this.trad401k.withdrawalsForYear(year),
        deposits: this.trad401k.depositsForYear(year),
        interestRate: this.trad401k.interestRate,
      },
      rothIra: {
        name: this.rothIra.name,
        startingBalance: this.rothIra.startingBalanceForYear(year),
        endingBalance: this.rothIra.endingBalanceForYear(year),
        withdrawals: this.rothIra.withdrawalsForYear(year),
        deposits: this.rothIra.depositsForYear(year),
        interestRate: this.rothIra.interestRate,
      },
      savings: {
        name: this.savings.name,
        startingBalance: this.savings.startingBalanceForYear(year),
        endingBalance: this.savings.endingBalanceForYear(year),
        withdrawals: this.savings.withdrawalsForYear(year),
        deposits: this.savings.depositsForYear(year),
        interestRate: this.savings.interestRate,
      },
      totals: {
        startingBalance: this.getTotalStartingBalance(year),
        endingBalance: this.getTotalBalance(year),
        withdrawals: this.getTotalWithdrawals(year),
        deposits: this.getTotalDeposits(year),
      },
    };
  }

  // Method to apply interest rate changes to all accounts
  updateInterestRates(trad401kRate, rothIraRate, savingsRate) {
    // Note: Account class would need setter methods for this to work
    // This is a placeholder for future implementation
    console.warn(
      "updateInterestRates method requires Account class to have rate setters"
    );
  }

  // Method to get accounts in withdrawal order
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
}

// Create instance using the factory method for backward compatibility
const accounts = AccountGroup.fromInputs(inputs);
