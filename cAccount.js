/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 * @typedef {import("./types.js").TransactionRoute} TransactionRoute
 * @typedef {import("./types.js").TransferId} TransferId
 */

import { INTEREST_CALCULATION_EPOCH, PERIODIC_FREQUENCY } from "./consts.js";
import { AccountRegister, AccountRegisterEntry } from "./cAccountRegister.js";
import {
  Transaction,
  TransactionCategory,
  TransactionType,
} from "./cTransaction.js";
import { DateFunctions } from "./utils.js";
import { TransactionRoutes } from "./tTransactionRoute.js";
import { TransactionManager } from "./cTransactionManager.js";

class ACCOUNT_TYPES {}

ACCOUNT_TYPES.CASH = "Cash";
ACCOUNT_TYPES.SAVINGS = "Savings";

ACCOUNT_TYPES.SUBJECT_401K = "Subject401k";
ACCOUNT_TYPES.PARTNER_401K = "Partner401k";

ACCOUNT_TYPES.SUBJECT_ROTH_IRA = "SubjectRothIra";
ACCOUNT_TYPES.PARTNER_ROTH_IRA = "PartnerRothIra";

ACCOUNT_TYPES.SUBJECT_PENSION = "SubjectPension";
ACCOUNT_TYPES.PARTNER_PENSION = "PartnerPension";

ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY = "SubjectSocSec";
ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY = "PartnerSocSec";
ACCOUNT_TYPES.SOCIAL_SECURITY_BREAKDOWN = "SocSecReporting";

ACCOUNT_TYPES.SUBJECT_WAGES = "SubjectWages";
ACCOUNT_TYPES.PARTNER_WAGES = "PartnerWages";

ACCOUNT_TYPES.OTHER_INCOME = "OtherIncome";

ACCOUNT_TYPES.TAXES = "Taxes";

ACCOUNT_TYPES.SUBJECT_PAYROLL_DEDUCTIONS = "SubjPayrlDeduc";
ACCOUNT_TYPES.PARTNER_PAYROLL_DEDUCTIONS = "PrtnrPayrlDeduc";

ACCOUNT_TYPES.ADJUSTABLE_INCOME = "AdjustableIncome";

// Create a class for the account
class Account {
  /** @type {TransactionManager} */
  #transactionManager;

  /** @type {string} */
  #name = "";

  /** @type {number} Annual interest rate as a decimal (e.g., 0.05 for 5%) */
  #interestRate = 0;

  /**
   * @param {number} yyyy
   */
  #getTransactionsForYearFast(yyyy) {
    return this.#transactionManager.getTransactionsForAccountYear(
      this.#name,
      yyyy
    );
  }

  get #transactions() {
    return this.#transactionManager.getTransactionsForAccount(this.#name);
  }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  #startingBalanceForYear(yyyy, category) {
    let bal = 0;

    for (const tx of this.#transactions) {
      if (tx.date.getFullYear() >= yyyy) break;
      if (category && tx.category !== category) continue;

      bal +=
        tx.transactionType === TransactionType.Deposit ? tx.amount : -tx.amount;
    }
    return bal;
  }
  // #startingBalanceForYear(yyyy, category) {
  //   let startingBalance = 0;
  //   const transactions = this.#transactions.filter(
  //     (tx) => !category || tx.category === category
  //   );
  //   for (const tx of transactions.sort(
  //     (a, b) => a.date.getTime() - b.date.getTime()
  //   )) {
  //     if (tx.date.getFullYear() < yyyy) {
  //       if (tx.transactionType === TransactionType.Deposit) {
  //         startingBalance += tx.amount;
  //       } else if (tx.transactionType === TransactionType.Withdrawal) {
  //         startingBalance -= tx.amount;
  //       }
  //     } else break; // Future transactions don't affect the current year's starting balance
  //   }
  //   return startingBalance;
  // }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  #endingBalanceForYear(yyyy, category) {
    let bal = this.#startingBalanceForYear(yyyy, category);

    for (const tx of this.#getTransactionsForYearFast(yyyy)) {
      if (category && tx.category !== category) continue;

      bal +=
        tx.transactionType === TransactionType.Deposit ? tx.amount : -tx.amount;
    }
    return bal;
  }
  // #endingBalanceForYear(yyyy, category) {
  //   let endingBalance = this.#startingBalanceForYear(yyyy, category);
  //   const transactions = this.#transactions.filter(
  //     (tx) => !category || tx.category === category
  //   );
  //   for (const tx of transactions.sort(
  //     (a, b) => a.date.getTime() - b.date.getTime()
  //   )) {
  //     if (tx.date.getFullYear() === yyyy) {
  //       if (tx.transactionType === TransactionType.Deposit) {
  //         endingBalance += tx.amount;
  //       } else if (tx.transactionType === TransactionType.Withdrawal) {
  //         endingBalance -= tx.amount;
  //       }
  //     } else if (tx.date.getFullYear() > yyyy) {
  //       break; // Future transactions don't affect the current year's ending balance
  //     }
  //   }
  //   return endingBalance;
  // }

  /**
   * Calculate the annual revenue for a given year
   * @param {number} yyyy - The year for which to calculate the revenue
   * @param {TransactionCategorySymbol | undefined} [category]
   * @returns {number} - The annual revenue
   */
  #annualRevenues(yyyy, category) {
    return (
      this.#endingBalanceForYear(yyyy, category) -
      this.#startingBalanceForYear(yyyy, category)
    );
  }

  /**
   *
   * @param {Date} date
   */
  #balanceAsOfDate(date) {
    let bal = this.initialBalance;

    for (const tx of this.#transactions) {
      if (tx.date > date) break;
      bal +=
        tx.transactionType === TransactionType.Deposit ? tx.amount : -tx.amount;
    }
    return bal;
  }
  // #balanceAsOfDate(date) {
  //   let startingBalance = this.initialBalance;
  //   const transactions = this.#transactions.filter((tx) => tx.date <= date);
  //   for (const tx of transactions.sort(
  //     (a, b) => a.date.getTime() - b.date.getTime()
  //   )) {
  //     if (tx.transactionType === TransactionType.Deposit) {
  //       startingBalance += tx.amount;
  //     } else if (tx.transactionType === TransactionType.Withdrawal) {
  //       startingBalance -= tx.amount;
  //     }
  //   }
  //   return startingBalance;
  // }

  /**
   * @param {string} name - Name of the account
   * @param {TransactionManager} transactionManager
   * @param {number} [interestRate] - Annual interest rate as a decimal (e.g., 0.05 for 5%)
   */
  constructor(name, transactionManager, interestRate = 0) {
    // Validate that name matches one of the ACCOUNT_TYPES values
    const validAccountTypes = Object.values(ACCOUNT_TYPES);
    if (!validAccountTypes.includes(name)) {
      throw new Error(
        `Invalid account type: ${name}. Must be one of: ${validAccountTypes.join(", ")}`
      );
    }

    this.#name = name;
    this.#transactionManager = transactionManager;
    this.#interestRate = interestRate; // Annual interest rate as a decimal (e.g., 0.05 for 5%)
  }

  /**
   * Set the opening balance for the account on a specific date
   * This creates the first transaction that establishes when the account opened
   * @param {number} amount - Opening balance amount (must be positive)
   * @param {Date} openingDate - Date when account was opened
   * @param {TransactionRoute} [route] - Optional transaction route
   * @param {string} [memo] - Optional memo for the opening transaction
   */
  setOpeningBalance(
    amount,
    openingDate,
    route = TransactionRoutes.External,
    memo = "Opening balance"
  ) {
    if (amount < 0) {
      throw new Error("Opening balance must be positive");
    }

    // Check if account already has transactions
    if (this.#transactions.length > 0) {
      throw new Error(
        "Cannot set opening balance - account already has transactions"
      );
    }

    this.#transactionManager.addTransaction(
      new Transaction(
        this.#name,
        amount,
        TransactionType.Deposit,
        TransactionCategory.OpeningBalance,
        route,
        new Date(openingDate),
        memo
      )
    );
  }

  /**
   * Convenience method to set opening balance by year/month/day
   * @param {number} amount - Opening balance amount
   * @param {number} year - Year account was opened
   * @param {number} [month] - Month (1-12, defaults to 1)
   * @param {number} [day] - Day (defaults to 1)
   * @param {string} [memo] - Optional memo
   */
  setOpeningBalanceByDate(
    amount,
    year,
    month = 1,
    day = 1,
    memo = "Opening balance"
  ) {
    const openingDate = new Date(year, month - 1, day);
    this.setOpeningBalance(amount, openingDate, memo);
  }

  /**
   * Factory method to create account with opening balance
   * @param {string} name - Account name
   * @param {TransactionManager} transactionManager
   * @param {number} openingBalance - Opening balance amount
   * @param {Date} openingDate - Date when account opened
   * @param {number} [interestRate] - Interest rate
   * @param {string} [memo] - Opening memo
   * @returns {Account}
   */
  static createWithOpeningBalance(
    name,
    transactionManager,
    openingBalance,
    openingDate,
    interestRate = 0,
    memo = "Opening balance"
  ) {
    const account = new Account(name, transactionManager, interestRate);
    account.setOpeningBalance(openingBalance, openingDate, memo);
    return account;
  }

  /**
   * Factory method to create account with opening balance by year
   * @param {string} name - Account name
   * @param {TransactionManager} transactionManager
   * @param {number} openingBalance - Opening balance amount
   * @param {number} year - Opening year
   * @param {number} [interestRate] - Interest rate
   * @param {number} [month] - Month (1-12)
   * @param {number} [day] - Day
   * @param {string} [memo] - Opening memo
   * @returns {Account}
   */
  static createWithOpeningBalanceByYear(
    name,
    transactionManager,
    openingBalance,
    year,
    interestRate = 0,
    month = 1,
    day = 1,
    memo = "Opening balance"
  ) {
    const openingDate = new Date(year, month - 1, day);
    return Account.createWithOpeningBalance(
      name,
      transactionManager,
      openingBalance,
      openingDate,
      interestRate,
      memo
    );
  }

  /**
   * Get the date when this account was first opened (earliest transaction date)
   * @returns {Date | null} Opening date or null if no transactions
   */
  get accountOpeningDate() {
    if (this.#transactions.length === 0) return null;

    return this.#transactions
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0].date;
  }

  /**
   * Get the year when this account was first opened
   * @returns {number | null} Opening year or null if no transactions
   */
  get accountOpeningYear() {
    const openingDate = this.accountOpeningDate;
    return openingDate ? openingDate.getFullYear() : null;
  }

  /**
   * Check if account was open during a specific year
   * @param {number} year - Year to check
   * @returns {boolean}
   */
  wasOpenInYear(year) {
    const openingYear = this.accountOpeningYear;
    return openingYear !== null && openingYear <= year;
  }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  getTransactionsForYear(yyyy, category) {
    return this.#transactions.filter(
      (tx) =>
        tx.date.getFullYear() === yyyy &&
        (category ? tx.category === category : true)
    );
  }

  /**
   * @param {number | null} yyyy
   */
  toJSON(yyyy = null) {
    return {
      name: this.#name,
      interestRate: this.#interestRate,
      transactions: yyyy
        ? this.getTransactionsForYear(yyyy)
        : this.#transactions,
    };
  }

  get name() {
    return this.#name;
  }

  get initialBalance() {
    return this.#transactions.length > 0 ? this.#transactions[0].amount : 0;
  }

  get interestRate() {
    return this.#interestRate;
  }

  /**
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   * @param {Date} date
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  #deposit(amount, category, route, date, memo, transferId) {
    if (amount < 0) {
      const catName = TransactionCategory.toName(category);
      throw new Error(
        `Deposit amount must be positive. Found: ${amount} Date: ${date.toISOString()} Category: ${catName}  Memo: ${memo}`
      );
    }

    if (amount === 0) return amount.asCurrency();

    this.#transactionManager.addTransaction(
      new Transaction(
        this.#name,
        amount,
        TransactionType.Deposit,
        category,
        route,
        date,
        memo,
        transferId
      )
    );

    return amount.asCurrency();
  }

  /**
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   * @param {number} yyyy
   * @param {number} [month]
   * @param {number} [day]
   * @param {string | null} [memo]
   * @param {TransferId | null} [transferId]
   */
  deposit(
    amount,
    category,
    route,
    yyyy,
    month = 1,
    day = 1,
    memo = "",
    transferId = null
  ) {
    if (amount < 0) {
      throw new Error("Deposit amount must be positive.");
    }

    if (month < 1 || month > 12) {
      throw new Error("Month must be between 1 (January) and 12 (December).");
    }

    this.#deposit(
      amount,
      category,
      route,
      new Date(yyyy, month - 1, day), // Set to January 1st of the given year
      memo,
      transferId
    );

    return amount.asCurrency();
  }

  /**
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   * @param {Date} date
   * @param {string | null} [memo]
   * @param {TransferId | null} [transferId]
   */
  #withdrawal(amount, category, route, date, memo, transferId) {
    // if (amount < 0) {
    //   throw new Error("Withdrawal amount must be positive.");
    // }

    if (amount === 0) return amount.asCurrency();

    const withdrawalAmount = amount;
    //  Math.min(
    //   amount,
    //   this.#endingBalanceForYear(date.getFullYear())
    // );
    // if (withdrawalAmount < amount) {
    //   console.warn(
    //     `Requested withdrawal of ${amount} exceeds available balance. Withdrawing only ${withdrawalAmount}.`
    //   );
    // }
    this.#transactionManager.addTransaction(
      new Transaction(
        this.#name,
        withdrawalAmount,
        TransactionType.Withdrawal,
        category,
        route,
        date,
        memo,
        transferId
      )
    );

    return withdrawalAmount.asCurrency();
  }

  /**
   * @param {number} amount - Amount to withdraw
   * @param {TransactionCategorySymbol} category - Category of the withdrawal
   * @param {TransactionRoute} route - Route of the withdrawal
   * @param {number} yyyy - Year of the withdrawal
   * @param {number} [month]
   * @param {number} [day]
   * @param {string} [memo] - Optional memo associated with the withdrawal
   * @param {TransferId | null} [transferId] - Optional transfer ID for linked transactions
   */
  withdrawal(
    amount,
    category,
    route,
    yyyy,
    month = 1,
    day = 1,
    memo = "",
    transferId = null
  ) {
    this.#withdrawal(
      amount,
      category,
      route,
      new Date(yyyy, month - 1, day), // Set to January 1st of the given year
      memo,
      transferId
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
    let bal = 0;
    switch (intensity) {
      case INTEREST_CALCULATION_EPOCH.STARTING_BALANCE:
        bal = this.#startingBalanceForYear(yyyy);
        if (bal <= 0) break;
        interestEarned = (
          bal * this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS:
        bal =
          this.#startingBalanceForYear(yyyy) - this.withdrawalsForYear(yyyy);
        if (bal <= 0) break;
        interestEarned = (
          bal *
          this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.IGNORE_WITHDRAWALS:
        bal =
          this.#startingBalanceForYear(yyyy) + this.depositsForYear(yyyy);
        if (bal <= 0) break;
        interestEarned = (
          bal *
          this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.AVERAGE_BALANCE:
        bal =
          (this.#endingBalanceForYear(yyyy) +
            this.#startingBalanceForYear(yyyy)) /
          2;
        if (bal <= 0) break;
        interestEarned = (
          bal *
          this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.ENDING_BALANCE:
        bal = this.#endingBalanceForYear(yyyy);
        if (bal <= 0) break;
        interestEarned = (
          bal * this.interestRate
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
  #calculateRollingInterestForYear(yyyy, record = false) {
    let bal = this.#startingBalanceForYear(yyyy);
    let interest = 0;

    const monthly = Array(12).fill(0);

    for (const tx of this.#getTransactionsForYearFast(yyyy)) {
      monthly[tx.date.getMonth()] +=
        tx.transactionType === TransactionType.Deposit ? tx.amount : -tx.amount;
    }

    for (let m = 0; m < 12; m++) {
      bal += monthly[m];
      if (bal <= 0) continue;
      const i = (bal * (this.interestRate / 12)).asCurrency();
      interest += i;
      bal += i;

      if (record) {
        this.#deposit(
          i,
          TransactionCategory.Interest,
          TransactionRoutes.External,
          new Date(yyyy, m, 1),
          "Interest dividend"
        );
      }
    }

    return interest.asCurrency();
  }
  // #calculateRollingInterestForYear(yyyy, recordInterestEarned = false) {
  //   let interestEarned = 0;
  //   let monthlyBalance = this.#startingBalanceForYear(yyyy);

  //   for (let month = 0; month < 12; month++) {
  //     // Process transactions for the month
  //     this.#transactions
  //       .filter(
  //         (tx) => tx.date.getFullYear() === yyyy && tx.date.getMonth() === month
  //       )
  //       .reduce(
  //         (bal, tx) =>
  //           tx.transactionType === TransactionType.Deposit
  //             ? bal + tx.amount
  //             : bal - tx.amount,
  //         monthlyBalance
  //       );

  //     // Calculate interest for the month
  //     const monthlyInterest = (
  //       monthlyBalance *
  //       (this.interestRate / 12)
  //     ).asCurrency();
  //     if (recordInterestEarned) {
  //       this.#deposit(
  //         monthlyInterest,
  //         TransactionCategory.Interest,
  //         TransactionRoutes.External,
  //         new Date(yyyy, month, 1),
  //         "Interest dividend"
  //       );
  //     }
  //     interestEarned += monthlyInterest;

  //     // Update balance with interest
  //     monthlyBalance += monthlyInterest;
  //   }

  //   return interestEarned.asCurrency();
  // }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   * @param {string | undefined} [memo = ""]
   */
  depositsForYear(yyyy, category, memo) {
    let total = 0;
    for (const tx of this.#getTransactionsForYearFast(yyyy)) {
      if (tx.transactionType !== TransactionType.Deposit) continue;
      if (category && tx.category !== category) continue;
      if (memo && tx.memo !== memo) continue;
      total += tx.amount;
    }
    return total.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  withdrawalsForYear(yyyy, category) {
    let total = 0;
    for (const tx of this.#getTransactionsForYearFast(yyyy)) {
      if (tx.transactionType !== TransactionType.Withdrawal) continue;
      if (category && tx.category !== category) continue;
      total += tx.amount;
    }
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
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  startingBalanceForYear(yyyy, category) {
    return this.#startingBalanceForYear(yyyy, category).asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  endingBalanceForYear(yyyy, category) {
    return this.#endingBalanceForYear(yyyy, category).asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  annualRevenuesForYear(yyyy, category) {
    return this.#annualRevenues(yyyy, category).asCurrency();
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
   * @param {TransactionRoute} targetRoute
   * @param {string} frequency
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  processAsPeriodicWithdrawals(
    yyyy,
    amount,
    category,
    targetRoute,
    frequency,
    memo,
    transferId = null
  ) {
    switch (frequency) {
      case PERIODIC_FREQUENCY.ANNUAL_LEADING:
      case PERIODIC_FREQUENCY.ANNUAL_TRAILING:
        return this.#processAsAnnualTransactions(
          frequency,
          yyyy,
          amount,
          category,
          targetRoute,
          TransactionType.Withdrawal,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.SEMI_ANNUAL_LEADING:
      case PERIODIC_FREQUENCY.SEMI_ANNUAL_TRAILING:
        return this.#processAsSemiAnnualTransactions(
          frequency,
          yyyy,
          amount,
          category,
          targetRoute,
          TransactionType.Withdrawal,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.QUARTERLY_TRAILING:
      case PERIODIC_FREQUENCY.QUARTERLY_TRAILING:
        return this.#processAsQuarterlyTransactions(
          frequency,
          yyyy,
          amount,
          category,
          targetRoute,
          TransactionType.Withdrawal,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.MONTHLY:
        return this.#processAsMonthlyTransactions(
          yyyy,
          amount,
          category,
          targetRoute,
          TransactionType.Withdrawal,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.DAILY:
        return this.#processAsDailyTransactions(
          yyyy,
          amount,
          category,
          targetRoute,
          TransactionType.Withdrawal,
          memo,
          transferId
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
   * @param {TransactionRoute} route
   * @param {string} frequency
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  processAsPeriodicDeposits(
    yyyy,
    amount,
    category,
    route,
    frequency,
    memo,
    transferId = null
  ) {
    switch (frequency) {
      case PERIODIC_FREQUENCY.ANNUAL_LEADING:
      case PERIODIC_FREQUENCY.ANNUAL_TRAILING:
        return this.#processAsAnnualTransactions(
          frequency,
          yyyy,
          amount,
          category,
          route,
          TransactionType.Deposit,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.SEMI_ANNUAL_LEADING:
      case PERIODIC_FREQUENCY.SEMI_ANNUAL_TRAILING:
        return this.#processAsSemiAnnualTransactions(
          frequency,
          yyyy,
          amount,
          category,
          route,
          TransactionType.Deposit,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.QUARTERLY_LEADING:
      case PERIODIC_FREQUENCY.QUARTERLY_TRAILING:
        return this.#processAsQuarterlyTransactions(
          frequency,
          yyyy,
          amount,
          category,
          route,
          TransactionType.Deposit,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.MONTHLY:
        return this.#processAsMonthlyTransactions(
          yyyy,
          amount,
          category,
          route,
          TransactionType.Deposit,
          memo,
          transferId
        );
      case PERIODIC_FREQUENCY.DAILY:
        return this.#processAsDailyTransactions(
          yyyy,
          amount,
          category,
          route,
          TransactionType.Deposit,
          memo,
          transferId
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
   * @param {TransactionRoute} route
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  #processAsDailyTransactions(
    yyyy,
    amount,
    category,
    route,
    transactionType,
    memo,
    transferId = null
  ) {
    const daysInYear = new Date(yyyy, 1, 29).getMonth() === 1 ? 366 : 365;
    const dailyAmount = Math.trunc(amount / daysInYear);

    switch (transactionType) {
      case TransactionType.Withdrawal:
        for (let day = 0; day < daysInYear - 1; day++) {
          this.#withdrawal(
            dailyAmount,
            category,
            route,
            new Date(yyyy, 0, day + 1),
            memo,
            transferId
          );
        }

        // Adjust final day to account for rounding
        const totalWithdrawn = dailyAmount * (daysInYear - 1);
        const finalDayAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(
          finalDayAmount,
          category,
          route,
          new Date(yyyy, 11, 31),
          memo,
          transferId
        );
        break;
      case TransactionType.Deposit:
        for (let day = 0; day < daysInYear - 1; day++) {
          this.#deposit(
            dailyAmount,
            category,
            route,
            new Date(yyyy, 0, day + 1),
            memo,
            transferId
          );
        }

        // Adjust final day to account for rounding
        const totalDeposited = dailyAmount * (daysInYear - 1);
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(
          finalDepositAmount,
          category,
          route,
          new Date(yyyy, 11, 31),
          memo,
          transferId
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
   * @param {TransactionRoute} route
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  #processAsMonthlyTransactions(
    yyyy,
    amount,
    category,
    route,
    transactionType,
    memo,
    transferId = null
  ) {
    // if (amount < 0) return;
    if (amount <= 12) {
      let month = 0;
      while (amount > 0) {
        if (transactionType === TransactionType.Withdrawal) {
          this.#withdrawal(
            1,
            category,
            route,
            new Date(yyyy, month, 1),
            memo,
            transferId
          );
        } else if (transactionType === TransactionType.Deposit) {
          this.#deposit(
            1,
            category,
            route,
            new Date(yyyy, month, 1),
            memo,
            transferId
          );
        }
        amount--;
      }
      return amount.asCurrency();
    }

    const monthlyAmount = Math.trunc(amount / 12);

    switch (transactionType) {
      case TransactionType.Withdrawal:
        for (let month = 0; month < 11; month++) {
          this.#withdrawal(
            monthlyAmount,
            category,
            route,
            new Date(yyyy, month, 1),
            memo,
            transferId
          );
        }

        // Adjust final month to account for rounding
        const totalWithdrawn = monthlyAmount * 11;
        const finalMonthAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(
          finalMonthAmount,
          category,
          route,
          new Date(yyyy, 11, 1),
          memo,
          transferId
        );
        break;
      case TransactionType.Deposit:
        for (let month = 0; month < 11; month++) {
          this.#deposit(
            monthlyAmount,
            category,
            route,
            new Date(yyyy, month, 1),
            memo,
            transferId
          );
        }

        // Adjust final month to account for rounding
        const totalDeposited = monthlyAmount * 11;
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(
          finalDepositAmount,
          category,
          route,
          new Date(yyyy, 11, 1),
          memo,
          transferId
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
   * @param {PERIODIC_FREQUENCY} frequency
   * @param {number} yyyy
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  #processAsQuarterlyTransactions(
    frequency,
    yyyy,
    amount,
    category,
    route,
    transactionType,
    memo,
    transferId = null
  ) {
    const quarterlyAmount = Math.trunc(amount / 4);

    const dates =
      frequency === PERIODIC_FREQUENCY.QUARTERLY_LEADING
        ? [
            new Date(yyyy, 0, 1),
            new Date(yyyy, 3, 1),
            new Date(yyyy, 6, 1),
            new Date(yyyy, 9, 1),
          ]
        : [
            new Date(yyyy, 2, 31),
            new Date(yyyy, 5, 30),
            new Date(yyyy, 8, 30),
            new Date(yyyy, 11, 31),
          ];

    switch (transactionType) {
      case TransactionType.Withdrawal:
        for (let quarter = 0; quarter < 3; quarter++) {
          const month = quarter * 3;
          this.#withdrawal(
            quarterlyAmount,
            category,
            route,
            dates[quarter],
            memo,
            transferId
          );
        }

        // Adjust final quarter to account for rounding
        const totalWithdrawn = quarterlyAmount * 3;
        const finalQuarterAmount = (amount - totalWithdrawn).asCurrency();
        this.#withdrawal(
          finalQuarterAmount,
          category,
          route,
          dates[3],
          memo,
          transferId
        );
        break;
      case TransactionType.Deposit:
        for (let quarter = 0; quarter < 3; quarter++) {
          const month = quarter * 3;
          this.#deposit(
            quarterlyAmount,
            category,
            route,
            dates[quarter],
            memo,
            transferId
          );
        }

        // Adjust final quarter to account for rounding
        const totalDeposited = quarterlyAmount * 3;
        const finalDepositAmount = (amount - totalDeposited).asCurrency();
        this.#deposit(
          finalDepositAmount,
          category,
          route,
          dates[3],
          memo,
          transferId
        );
        break;
      default:
        throw new Error(
          `Unknown transaction type: ${transactionType.toString()}`
        );
    }

    return amount.asCurrency();
  }

  /**
   * @param {PERIODIC_FREQUENCY} frequency
   * @param {number} yyyy
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  #processAsSemiAnnualTransactions(
    frequency,
    yyyy,
    amount,
    category,
    route,
    transactionType,
    memo = "",
    transferId = null
  ) {
    const semiAnnualAmount = Math.trunc(amount / 2);

    const dates =
      frequency === PERIODIC_FREQUENCY.SEMI_ANNUAL_LEADING
        ? [new Date(yyyy, 0, 1), new Date(yyyy, 6, 1)]
        : [new Date(yyyy, 5, 30), new Date(yyyy, 11, 31)];

    switch (transactionType) {
      case TransactionType.Withdrawal:
        this.#withdrawal(
          semiAnnualAmount,
          category,
          route,
          dates[0],
          memo,
          transferId
        );
        this.#withdrawal(
          amount - semiAnnualAmount,
          category,
          route,
          dates[1],
          memo,
          transferId
        );
        break;
      case TransactionType.Deposit:
        this.#deposit(
          semiAnnualAmount,
          category,
          route,
          new Date(yyyy, 5, 1),
          memo,
          transferId
        );
        this.#deposit(
          amount - semiAnnualAmount,
          category,
          route,
          new Date(yyyy, 11, 1),
          memo,
          transferId
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
   * @param {PERIODIC_FREQUENCY} frequency
   * @param {number} yyyy
   * @param {number} amount
   * @param {TransactionCategorySymbol} category
   * @param {TransactionRoute} route
   * @param {TransactionTypeSymbol} transactionType
   * @param {string | null} memo
   * @param {TransferId | null} [transferId]
   */
  #processAsAnnualTransactions(
    frequency,
    yyyy,
    amount,
    category,
    route,
    transactionType,
    memo = "",
    transferId = null
  ) {
    const date =
      frequency === PERIODIC_FREQUENCY.ANNUAL_LEADING
        ? new Date(yyyy, 0, 1)
        : new Date(yyyy, 11, 31);

    switch (transactionType) {
      case TransactionType.Withdrawal:
        this.#withdrawal(amount, category, route, date, memo, transferId);
        break;
      case TransactionType.Deposit:
        this.#deposit(amount, category, route, date, memo, transferId);
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
   * @param {TransactionCategorySymbol} category
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
    const account = new Account(obj.name, obj.interestRate);
    return account;
  }
}

export { ACCOUNT_TYPES, Account };
