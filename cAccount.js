/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 */

import { INTEREST_CALCULATION_EPOCH, PERIODIC_FREQUENCY } from "./consts.js";
import { AccountRegister, AccountRegisterEntry } from "./cAccountRegister.js";
import {
  Transaction,
  TransactionCategory,
  TransactionType,
} from "./cTransaction.js";
import { DateFunctions } from "./utils.js";

class ACCOUNT_TYPES {}
ACCOUNT_TYPES.SAVINGS = "Savings";
ACCOUNT_TYPES.TRAD_401K = "Trad401k";
ACCOUNT_TYPES.TRAD_ROTH = "RothIra";
ACCOUNT_TYPES.REVENUE = "Revenue";
ACCOUNT_TYPES.INTEREST_ON_SAVINGS = "InterestOnSavings";
ACCOUNT_TYPES.DISBURSEMENT = "Disbursement";
ACCOUNT_TYPES.TAXES = "Taxes";
ACCOUNT_TYPES.WITHHOLDINGS = "Withholdings";

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
        if (tx.transactionType === TransactionType.Deposit) {
          startingBalance += tx.amount;
        } else if (tx.transactionType === TransactionType.Withdrawal) {
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
        if (tx.transactionType === TransactionType.Deposit) {
          endingBalance += tx.amount;
        } else if (tx.transactionType === TransactionType.Withdrawal) {
          endingBalance -= tx.amount;
        }
      } else if (tx.date.getFullYear() > yyyy) {
        break; // Future transactions don't affect the current year's ending balance
      }
    }
    return endingBalance;
  }

  /**
   *
   * @param {Date} date
   */
  #balanceAsOfDate(date) {
    let startingBalance = this.initialBalance;
    const transactions = this.#transactions.filter((tx) => tx.date <= date);
    for (const tx of transactions.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )) {
      if (tx.transactionType === TransactionType.Deposit) {
        startingBalance += tx.amount;
      } else if (tx.transactionType === TransactionType.Withdrawal) {
        startingBalance -= tx.amount;
      }
    }
    return startingBalance;
  }

  /**
   * @param {string} name - Name of the account
   * @param {number} openingBalance - Initial balance of the account
   * @param {number} [interestRate] - Annual interest rate as a decimal (e.g., 0.05 for 5%)
   */
  constructor(name, openingBalance, interestRate = 0) {
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
   * @param {TransactionCategorySymbol} category
   * @param {Date} date
   * @param {string | null} memo
   */
  #deposit(amount, category, date, memo) {
    if (amount < 0) {
      throw new Error("Deposit amount must be positive.");
    }
    
    if (amount === 0) return amount.asCurrency();

    this.#transactions.push(
      new Transaction(amount, TransactionType.Deposit, category, date, memo)
    );

    return amount.asCurrency();
  }

  /**
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {number} yyyy
   * @param {number} [month]
   * @param {number} [day]
   * @param {string} [memo]
   */
  deposit(amount, category, yyyy, month = 1, day = 1, memo = "") {
    if (amount < 0) {
      throw new Error("Deposit amount must be positive.");
    }

    if (month < 1 || month > 12) {
      throw new Error("Month must be between 1 (January) and 12 (December).");
    }
    

    this.#deposit(
      amount,
      category,
      new Date(yyyy, month - 1, day), // Set to January 1st of the given year
      memo
    );

    return amount.asCurrency();
  }

  /**
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {Date} date
   * @param {string | null} [memo]
   */
  #withdrawal(amount, category, date, memo) {
    if (amount < 0) {
      throw new Error("Withdrawal amount must be positive.");
    }

    if (amount === 0) return amount.asCurrency();

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
        TransactionType.Withdrawal,
        category,
        date,
        memo
      )
    );

    return withdrawalAmount.asCurrency();
  }

  /**
   * @param {number} amount - Amount to withdraw
   * @param {TransactionCategorySymbol} category - Category of the withdrawal
   * @param {number} yyyy - Year of the withdrawal
   * @param {number} [month]
   * @param {number} [day]
   * @param {string} [memo] - Optional memo associated with the withdrawal
   */
  withdrawal(amount, category, yyyy, month = 1, day = 1, memo = "") {
    this.#withdrawal(
      amount,
      category,
      new Date(yyyy, month - 1, day), // Set to January 1st of the given year
      memo
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
  //       memo
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
          if (tx.transactionType === TransactionType.Deposit) {
            balance += tx.amount;
          } else if (tx.transactionType === TransactionType.Withdrawal) {
            balance -= tx.amount;
          }
        }
      }

      // Calculate interest for the month
      const monthlyInterest = (balance * (this.interestRate / 12)).asCurrency();
      if (recordInterestEarned) {
        this.#deposit(
          monthlyInterest,
          TransactionCategory.Interest,
          new Date(yyyy, month, 1),
          "Interest dividend"
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
   * @param {TransactionCategorySymbol | undefined} [category]
   * @param {string | undefined} [memo = ""]
   */
  depositsForYear(yyyy, category, memo) {
    const transactions = this.#transactions.filter(
      (tx) =>
        tx.transactionType === TransactionType.Deposit &&
        tx.date.getFullYear() === yyyy &&
        (category ? tx.category === category : true) &&
        (memo ? tx.memo === memo : true)
    );
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return total.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  withdrawalsForYear(yyyy, category) {
    const transactions = this.#transactions.filter(
      (tx) =>
        tx.transactionType === TransactionType.Withdrawal &&
        tx.date.getFullYear() === yyyy &&
        (category ? tx.category === category : true)
    );
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return total.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {TransactionTypeSymbol | undefined} type
   */
  transactionsForYear(yyyy, type) {
    return this.#transactions.filter((tx) =>
      tx.date.getFullYear() === yyyy && type === undefined
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
   * @param {TransactionCategorySymbol} category
   * @param {string} frequency
   * @param {string | null} memo
   */
  processAsPeriodicWithdrawals(yyyy, amount, category, frequency, memo) {
    switch (frequency) {
      case PERIODIC_FREQUENCY.ANNUAL:
        return this.#withdrawal(amount, category, new Date(yyyy, 0, 1), memo);
      case PERIODIC_FREQUENCY.SEMI_ANNUAL:
        return this.#processAsSemiAnnualTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Withdrawal
        );
      case PERIODIC_FREQUENCY.QUARTERLY:
        return this.#processAsQuarterlyTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Withdrawal,
          memo
        );
      case PERIODIC_FREQUENCY.MONTHLY:
        return this.#processAsMonthlyTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Withdrawal,
          memo
        );
      case PERIODIC_FREQUENCY.DAILY:
        return this.#processAsDailyTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Withdrawal,
          memo
        );
      // Add more frequencies as needed
      default:
        throw new Error(`Unknown periodic frequency: ${frequency}`);
    }
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {string} frequency
   * @param {string | null} memo
   */
  processAsPeriodicDeposits(yyyy, amount, category, frequency, memo) {
    switch (frequency) {
      case PERIODIC_FREQUENCY.ANNUAL:
        return this.#deposit(amount, category, new Date(yyyy, 0, 1), memo);
      case PERIODIC_FREQUENCY.SEMI_ANNUAL:
        return this.#processAsSemiAnnualTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Withdrawal,
          memo
        );
      case PERIODIC_FREQUENCY.QUARTERLY:
        return this.#processAsQuarterlyTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Deposit,
          memo
        );
      case PERIODIC_FREQUENCY.MONTHLY:
        return this.#processAsMonthlyTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Deposit,
          memo
        );
      case PERIODIC_FREQUENCY.DAILY:
        return this.#processAsDailyTransactions(
          yyyy,
          amount,
          category,
          TransactionType.Deposit,
          memo
        );
      // Add more frequencies as needed
      default:
        throw new Error(`Unknown periodic frequency: ${frequency}`);
    }
  }

  /**
   * @param {number} yyyy
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   */
  #processAsDailyTransactions(yyyy, amount, category, transactionType, memo) {
    const daysInYear = new Date(yyyy, 1, 29).getMonth() === 1 ? 366 : 365;
    const dailyAmount = (amount / daysInYear).asCurrency();

    switch (transactionType) {
      case TransactionType.Withdrawal:
        for (let day = 0; day < daysInYear - 1; day++) {
          this.#withdrawal(dailyAmount, category, new Date(yyyy, 0, day + 1));
        }

        // Adjust final day to account for rounding
        const totalWithdrawn = dailyAmount * (daysInYear - 1);
        const finalDayAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(
          finalDayAmount,
          category,
          new Date(yyyy, 11, 31),
          memo
        );
        break;
      case TransactionType.Deposit:
        for (let day = 0; day < daysInYear - 1; day++) {
          this.#deposit(
            dailyAmount,
            category,
            new Date(yyyy, 0, day + 1),
            memo
          );
        }

        // Adjust final day to account for rounding
        const totalDeposited = dailyAmount * (daysInYear - 1);
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(
          finalDepositAmount,
          category,
          new Date(yyyy, 11, 31),
          memo
        );
        break;
      default:
        throw new Error(
          `Unknown transaction type: ${transactionType.toString()}`
        );
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
   * @param {TransactionCategorySymbol} category
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   */
  #processAsMonthlyTransactions(yyyy, amount, category, transactionType, memo) {
    const monthlyAmount = (amount / 12).asCurrency();

    switch (transactionType) {
      case TransactionType.Withdrawal:
        for (let month = 0; month < 11; month++) {
          this.#withdrawal(monthlyAmount, category, new Date(yyyy, month, 1));
        }

        // Adjust final month to account for rounding
        const totalWithdrawn = monthlyAmount * 11;
        const finalMonthAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(
          finalMonthAmount,
          category,
          new Date(yyyy, 11, 1),
          memo
        );
        break;
      case TransactionType.Deposit:
        for (let month = 0; month < 11; month++) {
          this.#deposit(
            monthlyAmount,
            category,
            new Date(yyyy, month, 1),
            memo
          );
        }

        // Adjust final month to account for rounding
        const totalDeposited = monthlyAmount * 11;
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(
          finalDepositAmount,
          category,
          new Date(yyyy, 11, 1),
          memo
        );
        break;
      default:
        throw new Error(
          `Unknown transaction type: ${transactionType.toString()}`
        );
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
   * @param {TransactionCategorySymbol} category
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   */
  #processAsQuarterlyTransactions(
    yyyy,
    amount,
    category,
    transactionType,
    memo
  ) {
    const quarterlyAmount = (amount / 4).asCurrency();

    switch (transactionType) {
      case TransactionType.Withdrawal:
        for (let quarter = 0; quarter < 3; quarter++) {
          const month = quarter * 3;
          this.#withdrawal(
            quarterlyAmount,
            category,
            new Date(yyyy, month, 1),
            memo
          );
        }

        // Adjust final quarter to account for rounding
        const totalWithdrawn = quarterlyAmount * 3;
        const finalQuarterAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(finalQuarterAmount, category, new Date(yyyy, 9, 1));
        break;
      case TransactionType.Deposit:
        for (let quarter = 0; quarter < 3; quarter++) {
          const month = quarter * 3;
          this.#deposit(
            quarterlyAmount,
            category,
            new Date(yyyy, month, 1),
            memo
          );
        }

        // Adjust final quarter to account for rounding
        const totalDeposited = quarterlyAmount * 3;
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(finalDepositAmount, category, new Date(yyyy, 9, 1), memo);
        break;
      default:
        throw new Error(
          `Unknown transaction type: ${transactionType.toString()}`
        );
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
   * @param {TransactionCategorySymbol} category
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   */
  #processAsSemiAnnualTransactions(
    yyyy,
    amount,
    category,
    transactionType,
    memo = ""
  ) {
    const semiAnnualAmount = (amount / 2).asCurrency();

    switch (transactionType) {
      case TransactionType.Withdrawal:
        this.#withdrawal(semiAnnualAmount, category, new Date(yyyy, 5, 1));
        this.#withdrawal(
          amount - semiAnnualAmount,
          category,
          new Date(yyyy, 11, 1),
          memo
        );
        break;
      case TransactionType.Deposit:
        this.#deposit(semiAnnualAmount, category, new Date(yyyy, 5, 1), memo);
        this.#deposit(
          amount - semiAnnualAmount,
          category,
          new Date(yyyy, 11, 1),
          memo
        );
        break;
      default:
        throw new Error(
          `Unknown transaction type: ${transactionType.toString}`
        );
    }

    return amount.asCurrency();
  }

  /**
   * @param {Date | null} startDate
   * @param {Date | null} endDate
   * @param {TransactionCategorySymbol | null} category
   */
  filterTransactions(startDate, endDate, category) {
    return this.#transactions.filter((tx) => {
      const matchesStartDate = startDate ? tx.date >= startDate : true;
      const matchesEndDate = endDate ? tx.date <= endDate : true;
      const matchesCategory = category ? tx.category === category : true;

      return matchesStartDate && matchesEndDate && matchesCategory;
    });
  }

  /**
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {TransactionCategorySymbol | null} category
   * @returns {AccountRegister}
   */
  buildAccountRegister(startDate, endDate, category) {
    const transactions = this.filterTransactions(startDate, endDate, category);

    // Calculate starting balance (balance as of day before start date)
    const startingBalanceDate = DateFunctions.addDays(startDate, -1);
    let runningBalance = this.#balanceAsOfDate(startingBalanceDate);

    // Create register entries from transactions
    const register = new AccountRegister(startDate, endDate, category);

    // Add starting balance entry
    register.addBalanceUpdate(startDate, runningBalance, "Starting Balance");

    // Sort transactions by date to ensure proper running balance calculation
    const sortedTransactions = transactions
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Convert transactions to register entries with running balance
    for (const tx of sortedTransactions) {
      runningBalance += tx.amount;

      if (tx.transactionType === TransactionType.Deposit) {
        register.addDeposit(tx.date, tx.memo, tx.amount, runningBalance);
      } else if (tx.transactionType === TransactionType.Withdrawal) {
        register.addWithdrawal(tx.date, tx.memo, tx.amount, runningBalance);
      }
    }

    register.addBalanceUpdate(endDate, runningBalance, "Ending Balance");

    return register;
  }

  /**
   * @param {Date} date
   */
  balanceAsOfDate(date) {
    return this.#balanceAsOfDate(date).asCurrency();
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
