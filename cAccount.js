import { INTEREST_CALCULATION_EPOCH, PERIODIC_FREQUENCY } from "./consts";

class ACCOUNT_TYPES {}
ACCOUNT_TYPES.SAVINGS = "savings";
ACCOUNT_TYPES.TRAD_401K = "trad401k";
ACCOUNT_TYPES.TRAD_ROTH = "rothIra";
ACCOUNT_TYPES.REVENUE = "revenue";
ACCOUNT_TYPES.INTEREST_ON_SAVINGS = "interestOnSavings";
ACCOUNT_TYPES.DISBURSEMENT = "disbursement";
ACCOUNT_TYPES.TAXES = "taxes";
ACCOUNT_TYPES.WITHHOLDINGS = "withholdings";



// Create a class for the account
class Account {
  /** @type {Transaction[]} */
  #transactions = [];

  /** @type {string} */
  #name = "";

  /** @type {number} */
  #openingBalance = 0;

  /** @type {number} Annual interest rate as a decimal (e.g., 0.05 for 5%) */
  #interestRate = 0;

  /**
   * @param {number} yyyy
   */
  #startingBalanceForYear(yyyy) {
    let startingBalance = this.initialBalance;
    for (const tx of this.#transactions.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )) {
      if (tx.date.getFullYear() < yyyy) {
        if (tx.transactionType === TRANSACTION_TYPE.DEPOSIT) {
          startingBalance += tx.amount;
        } else if (tx.transactionType === TRANSACTION_TYPE.WITHDRAWAL) {
          startingBalance -= tx.amount;
        }
      } else break; // Future transactions don't affect the current year's starting balance
    }
    return startingBalance;
  }

  /**
   * @param {number} yyyy
   */
  #endingBalanceForYear(yyyy) {
    let endingBalance = this.#startingBalanceForYear(yyyy);
    for (const tx of this.#transactions.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )) {
      if (tx.date.getFullYear() === yyyy) {
        if (tx.transactionType === TRANSACTION_TYPE.DEPOSIT) {
          endingBalance += tx.amount;
        } else if (tx.transactionType === TRANSACTION_TYPE.WITHDRAWAL) {
          endingBalance -= tx.amount;
        }
      } else if (tx.date.getFullYear() > yyyy) {
        break; // Future transactions don't affect the current year's ending balance
      }
    }
    return endingBalance;
  }

  /**
   * @param {string} name - Name of the account
   * @param {number} openingBalance - Initial balance of the account
   * @param {number} interestRate - Annual interest rate as a decimal (e.g., 0.05 for 5%)
   */
  constructor(name, openingBalance, interestRate) {
    // Validate that name matches one of the ACCOUNT_TYPES values
    const validAccountTypes = Object.values(ACCOUNT_TYPES);
    if (!validAccountTypes.includes(name)) {
      throw new Error(
        `Invalid account type: ${name}. Must be one of: ${validAccountTypes.join(", ")}`
      );
    }

    this.#name = name;
    this.#openingBalance = openingBalance;
    this.#interestRate = interestRate; // Annual interest rate as a decimal (e.g., 0.05 for 5%)
  }

  /**
   * @param {number} yyyy
   */
  getTransactionForYear(yyyy) {
    return this.#transactions.filter((tx) => tx.date.getFullYear() === yyyy);
  }

  /**
   * @param {number | null} yyyy
   */
  toJSON(yyyy = null) {
    return {
      name: this.#name,
      openingBalance: this.#openingBalance,
      interestRate: this.#interestRate,
      transactions: yyyy
        ? this.getTransactionForYear(yyyy)
        : this.#transactions,
    };
  }

  get name() {
    return this.#name;
  }

  get initialBalance() {
    return this.#openingBalance.asCurrency();
  }

  get interestRate() {
    return this.#interestRate;
  }

  /**
   * @param {number} amount
   * @param {string} category
   * @param {Date} date
   */
  #deposit(amount, category, date, party = "") {
    if (amount < 0) {
      throw new Error("Deposit amount must be positive.");
    }
    this.#transactions.push(
      new Transaction(amount, TRANSACTION_TYPE.DEPOSIT, category, date, party)
    );

    return amount.asCurrency();
  }

  /**
   * @param {number} amount
   * @param {string} category
   * @param {number} yyyy
   * @param {string} [party]
   */
  deposit(amount, category, yyyy, party = "") {
    if (amount < 0) {
      throw new Error("Deposit amount must be positive.");
    }
    this.#deposit(
      amount,
      category,
      new Date(yyyy, 0, 1), // Set to January 1st of the given year
      party
    );

    return amount.asCurrency();
  }

  /**
   * @param {number} amount
   * @param {string} category
   * @param {Date} date
   */
  #withdrawal(amount, category, date, party = "") {
    if (amount < 0) {
      throw new Error("Withdrawal amount must be positive.");
    }
    const withdrawalAmount = Math.min(
      amount,
      this.#endingBalanceForYear(date.getFullYear())
    );
    if (withdrawalAmount < amount) {
      console.warn(
        `Requested withdrawal of ${amount} exceeds available balance. Withdrawing only ${withdrawalAmount}.`
      );
    }
    this.#transactions.push(
      new Transaction(
        withdrawalAmount,
        TRANSACTION_TYPE.WITHDRAWAL,
        category,
        date,
        party
      )
    );

    return withdrawalAmount.asCurrency();
  }

  /**
   * @param {number} amount - Amount to withdraw
   * @param {string} category - Category of the withdrawal
   * @param {number} yyyy - Year of the withdrawal
   * @param {string} [party] - Optional party associated with the withdrawal
   */
  withdrawal(amount, category, yyyy, party = "") {
    this.#withdrawal(
      amount,
      category,
      new Date(yyyy, 0, 1), // Set to January 1st of the given year
      party
    );

    return amount.asCurrency();
  }
  //   if (amount < 0) {
  //     throw new Error("Withdrawal amount must be positive.");
  //   }
  //   const withdrawalAmount = Math.min(amount, this.#endingBalanceForYear(yyyy));
  //   if (withdrawalAmount < amount) {
  //     console.warn(
  //       `Requested withdrawal of ${amount} exceeds available balance. Withdrawing only ${withdrawalAmount}.`
  //     );
  //   }
  //   this.#transactions.push(
  //     new Transaction(
  //       withdrawalAmount,
  //       TRANSACTION_TYPE.WITHDRAWAL,
  //       category,
  //       new Date(yyyy, 0, 1), // Set to January 1st of the given year
  //       party
  //     )
  //   );

  //   return withdrawalAmount.asCurrency();
  // }

  // Method to calculate interest earned over a year
  /**
   * @param {INTEREST_CALCULATION_EPOCH} intensity
   * @param {number} yyyy
   */
  calculateInterestForYear(intensity, yyyy) {
    let interestEarned = 0;
    switch (intensity) {
      case INTEREST_CALCULATION_EPOCH.STARTING_BALANCE:
        interestEarned = (
          this.#startingBalanceForYear(yyyy) * this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS:
        interestEarned = (
          (this.#startingBalanceForYear(yyyy) - this.withdrawalsForYear(yyyy)) *
          this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.IGNORE_WITHDRAWALS:
        interestEarned = (
          (this.#startingBalanceForYear(yyyy) + this.depositsForYear(yyyy)) *
          this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.AVERAGE_BALANCE:
        interestEarned = (
          ((this.#endingBalanceForYear(yyyy) +
            this.#startingBalanceForYear(yyyy)) /
            2) *
          this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.ENDING_BALANCE:
        interestEarned = (
          this.#endingBalanceForYear(yyyy) * this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.ROLLING_BALANCE:
        interestEarned = this.#calculateRollingInterestForYear(yyyy);
        break;
      default:
        throw new Error(`Unknown INTEREST_CALCULATION_EPOCH: ${intensity}`);
    }
    return interestEarned.asCurrency();
  }

  /**
   * @param {number} yyyy
   */
  recordInterestEarnedForYear(yyyy) {
    return this.#calculateRollingInterestForYear(yyyy, true);
  }

  /**
   * @param {number} yyyy
   */
  #calculateRollingInterestForYear(yyyy, recordInterestEarned = false) {
    let interestEarned = 0;
    let balance = this.#startingBalanceForYear(yyyy);

    for (let month = 0; month < 12; month++) {
      // Process transactions for the month
      for (const tx of this.#transactions) {
        if (tx.date.getFullYear() === yyyy && tx.date.getMonth() === month) {
          if (tx.transactionType === TRANSACTION_TYPE.DEPOSIT) {
            balance += tx.amount;
          } else if (tx.transactionType === TRANSACTION_TYPE.WITHDRAWAL) {
            balance -= tx.amount;
          }
        }
      }

      // Calculate interest for the month
      const monthlyInterest = (balance * (this.interestRate / 12)).asCurrency();
      if (recordInterestEarned) {
        this.#deposit(
          monthlyInterest,
          TRANSACTION_CATEGORY.INTEREST,
          new Date(yyyy, month, 1)
        );
      }
      interestEarned += monthlyInterest;

      // Update balance with interest
      balance += monthlyInterest;
    }

    return interestEarned.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {string | undefined} [category = ""]
   * @param {string | undefined} [party = ""]
   */
  depositsForYear(yyyy, category = "", party = "") {
    const transactions = this.#transactions.filter(
      (tx) =>
        tx.transactionType === TRANSACTION_TYPE.DEPOSIT &&
        tx.date.getFullYear() === yyyy &&
        (category === "" ? true : tx.category === category) &&
        (party === "" ? true : tx.party === party)
    );
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return total.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {string | undefined} [category = ""]
   */
  withdrawalsForYear(yyyy, category = "") {
    const transactions = this.#transactions.filter(
      (tx) =>
        tx.transactionType === TRANSACTION_TYPE.WITHDRAWAL &&
        tx.date.getFullYear() === yyyy &&
        (category === "" ? true : tx.category === category)
    );
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return total.asCurrency();
  }

  /**
   * @param {number} yyyy
   */
  transactionsForYear(yyyy, type = "") {
    return this.#transactions.filter((tx) =>
      tx.date.getFullYear() === yyyy && type === ""
        ? true
        : tx.transactionType === type
    );
  }

  /**
   * @param {number} yyyy
   */
  startingBalanceForYear(yyyy) {
    return this.#startingBalanceForYear(yyyy).asCurrency();
  }

  /**
   * @param {number} yyyy
   */
  endingBalanceForYear(yyyy) {
    return this.#endingBalanceForYear(yyyy).asCurrency();
  }

  // /**
  //  * @param {string} accountName
  //  */
  // static Empty(accountName) {
  //   return new Account(accountName, 0, 0);
  // }

  /**
   * @param {number} yyyy
   */
  averageBalanceForYear(yyyy) {
    return (
      (this.#startingBalanceForYear(yyyy) + this.#endingBalanceForYear(yyyy)) /
      2
    ).asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {string} category
   * @param {string} frequency
   */
  processAsPeriodicWithdrawals(yyyy, amount, category, frequency) {
    switch (frequency) {
      case PERIODIC_FREQUENCY.ANNUAL:
        return this.#withdrawal(amount, category, new Date(yyyy, 0, 1));
      case PERIODIC_FREQUENCY.SEMI_ANNUAL:
        return this.#processAsSemiAnnualTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.WITHDRAWAL
        );
      case PERIODIC_FREQUENCY.QUARTERLY:
        return this.#processAsQuarterlyTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.WITHDRAWAL
        );
      case PERIODIC_FREQUENCY.MONTHLY:
        return this.#processAsMonthlyTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.WITHDRAWAL
        );
      case PERIODIC_FREQUENCY.DAILY:
        return this.#processAsDailyTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.WITHDRAWAL
        );
      // Add more frequencies as needed
      default:
        throw new Error(`Unknown periodic frequency: ${frequency}`);
    }
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {string} category
   * @param {string} frequency
   */
  processAsPeriodicDeposits(yyyy, amount, category, frequency) {
    switch (frequency) {
      case PERIODIC_FREQUENCY.ANNUAL:
        return this.#deposit(amount, category, new Date(yyyy, 0, 1));
      case PERIODIC_FREQUENCY.SEMI_ANNUAL:
        return this.#processAsSemiAnnualTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.WITHDRAWAL
        );
      case PERIODIC_FREQUENCY.QUARTERLY:
        return this.#processAsQuarterlyTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.DEPOSIT
        );
      case PERIODIC_FREQUENCY.MONTHLY:
        return this.#processAsMonthlyTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.DEPOSIT
        );
      case PERIODIC_FREQUENCY.DAILY:
        return this.#processAsDailyTransactions(
          yyyy,
          amount,
          category,
          TRANSACTION_TYPE.DEPOSIT
        );
      // Add more frequencies as needed
      default:
        throw new Error(`Unknown periodic frequency: ${frequency}`);
    }
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {string} category
   * @param {string} transactionType
   */
  #processAsDailyTransactions(yyyy, amount, category, transactionType) {
    const daysInYear = new Date(yyyy, 1, 29).getMonth() === 1 ? 366 : 365;
    const dailyAmount = (amount / daysInYear).asCurrency();

    switch (transactionType) {
      case TRANSACTION_TYPE.WITHDRAWAL:
        for (let day = 0; day < daysInYear - 1; day++) {
          this.#withdrawal(dailyAmount, category, new Date(yyyy, 0, day + 1));
        }

        // Adjust final day to account for rounding
        const totalWithdrawn = dailyAmount * (daysInYear - 1);
        const finalDayAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(finalDayAmount, category, new Date(yyyy, 11, 31));
        break;
      case TRANSACTION_TYPE.DEPOSIT:
        for (let day = 0; day < daysInYear - 1; day++) {
          this.#deposit(dailyAmount, category, new Date(yyyy, 0, day + 1));
        }

        // Adjust final day to account for rounding
        const totalDeposited = dailyAmount * (daysInYear - 1);
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(finalDepositAmount, category, new Date(yyyy, 11, 31));
        break;
      default:
        throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    // for (let day = 0; day < daysInYear - 1; day++) {
    //   this.#withdrawal(dailyAmount, category, new Date(yyyy, 0, day + 1));
    // }

    // // Adjust final day to account for rounding
    // const totalWithdrawn = dailyAmount * (daysInYear - 1);
    // const finalDayAmount = (amount - totalWithdrawn).asCurrency();
    // this.#withdrawal(finalDayAmount, category, new Date(yyyy, 11, 31));

    return amount.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {string} category
   * @param {string} transactionType
   */
  #processAsMonthlyTransactions(yyyy, amount, category, transactionType) {
    const monthlyAmount = (amount / 12).asCurrency();

    switch (transactionType) {
      case TRANSACTION_TYPE.WITHDRAWAL:
        for (let month = 0; month < 11; month++) {
          this.#withdrawal(monthlyAmount, category, new Date(yyyy, month, 1));
        }

        // Adjust final month to account for rounding
        const totalWithdrawn = monthlyAmount * 11;
        const finalMonthAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(finalMonthAmount, category, new Date(yyyy, 11, 1));
        break;
      case TRANSACTION_TYPE.DEPOSIT:
        for (let month = 0; month < 11; month++) {
          this.#deposit(monthlyAmount, category, new Date(yyyy, month, 1));
        }

        // Adjust final month to account for rounding
        const totalDeposited = monthlyAmount * 11;
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(finalDepositAmount, category, new Date(yyyy, 11, 1));
        break;
      default:
        throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    // for (let month = 0; month < 11; month++) {
    //   this.#withdrawal(monthlyAmount, category, new Date(yyyy, month, 1));
    // }

    // // Adjust final month to account for rounding
    // const totalWithdrawn = monthlyAmount * 11;
    // const finalMonthAmount = (amount - totalWithdrawn).asCurrency();
    // this.#withdrawal(finalMonthAmount, category, new Date(yyyy, 11, 1));

    return amount.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {string} category
   * @param {string} transactionType
   */
  #processAsQuarterlyTransactions(yyyy, amount, category, transactionType) {
    const quarterlyAmount = (amount / 4).asCurrency();

    switch (transactionType) {
      case TRANSACTION_TYPE.WITHDRAWAL:
        for (let quarter = 0; quarter < 3; quarter++) {
          const month = quarter * 3;
          this.#withdrawal(quarterlyAmount, category, new Date(yyyy, month, 1));
        }

        // Adjust final quarter to account for rounding
        const totalWithdrawn = quarterlyAmount * 3;
        const finalQuarterAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(finalQuarterAmount, category, new Date(yyyy, 9, 1));
        break;
      case TRANSACTION_TYPE.DEPOSIT:
        for (let quarter = 0; quarter < 3; quarter++) {
          const month = quarter * 3;
          this.#deposit(quarterlyAmount, category, new Date(yyyy, month, 1));
        }

        // Adjust final quarter to account for rounding
        const totalDeposited = quarterlyAmount * 3;
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(finalDepositAmount, category, new Date(yyyy, 9, 1));
        break;
      default:
        throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    return amount.asCurrency();

    /*
      for (let quarter = 0; quarter < 3; quarter++) {
      const month = quarter * 3;
      this.#withdrawal(quarterlyAmount, category, new Date(yyyy, month, 1));
    }

    // Adjust final quarter to account for rounding
    const totalWithdrawn = quarterlyAmount * 3;
    const finalQuarterAmount = (amount - totalWithdrawn).asCurrency();
    this.#withdrawal(finalQuarterAmount, category, new Date(yyyy, 9, 1));

    return amount.asCurrency();
  }*/
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {string} category
   * @param {string} transactionType
   */
  #processAsSemiAnnualTransactions(yyyy, amount, category, transactionType) {
    const semiAnnualAmount = (amount / 2).asCurrency();

    switch (transactionType) {
      case TRANSACTION_TYPE.WITHDRAWAL:
        this.#withdrawal(semiAnnualAmount, category, new Date(yyyy, 5, 1));
        this.#withdrawal(
          amount - semiAnnualAmount,
          category,
          new Date(yyyy, 11, 1)
        );
        break;
      case TRANSACTION_TYPE.DEPOSIT:
        this.#deposit(semiAnnualAmount, category, new Date(yyyy, 5, 1));
        this.#deposit(
          amount - semiAnnualAmount,
          category,
          new Date(yyyy, 11, 1)
        );
        break;
      default:
        throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    return amount.asCurrency();
  }

  /**
   * @param {string} json
   */
  static fromJSON(json) {
    const obj = typeof json === "string" ? JSON.parse(json) : json;
    const account = new Account(obj.name, obj.initialBalance, obj.interestRate);
    return account;
  }
}

export { ACCOUNT_TYPES, Account };