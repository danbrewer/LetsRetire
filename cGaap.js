// @ts-check

// Node environment: load EnumBase from module
if (typeof module !== "undefined" && module.exports) {
  var { EnumBase } = require("./cEnum.js");
}

// -------------------------------------------------------------
// GAAP ACCOUNT TYPE NAMES  (Strongly typed string-literal union)
// -------------------------------------------------------------

const GaapAccountTypeNames = /** @type {const} */ ({
  Asset: "Asset",
  Liability: "Liability",
  Equity: "Equity",
  Income: "Income",
  Expense: "Expense",
});

/**
 * @typedef {typeof GaapAccountTypeNames[keyof typeof GaapAccountTypeNames]} GaapAccountTypeName
 */

const GaapPostingSide = /** @type {const} */ ({
  Debit: "Debit",
  Credit: "Credit",
});

/** @typedef {"Debit" | "Credit"} GaapPostingSideName */

// -------------------------------------------------------------
class GaapAccountTypeEnum extends EnumBase {
  constructor() {
    super("GaapAccountType", Object.values(GaapAccountTypeNames));
  }

  get Asset() {
    return this.map.Asset;
  }
  get Liability() {
    return this.map.Liability;
  }
  get Equity() {
    return this.map.Equity;
  }
  get Income() {
    return this.map.Income;
  }
  get Expense() {
    return this.map.Expense;
  }

  /**
   * Override with a precise return type.
   * @param {symbol} sym
   * @returns {GaapAccountTypeName}
   */
  toName(sym) {
    const name = super.toName(sym);
    if (name == null) {
      throw new Error(`Invalid GaapAccountType symbol: ${String(sym)}`);
    }
    return /** @type {GaapAccountTypeName} */ (name);
  }
}

/** 
Runtime examples of GaapAccountType: 
    GaapAccountType.Asset     // => Symbol(GaapAccountType.Asset)
    GaapAccountType.toName(GaapAccountType.Asset) // "Asset"
*/
const GaapAccountType = new GaapAccountTypeEnum();

/**
 * @type {Record<GaapAccountTypeName, GaapPostingSideName>}
 */
const GAAP_NORMAL_BALANCE_BY_TYPE = Object.freeze({
  Asset: GaapPostingSide.Debit,
  Expense: GaapPostingSide.Debit,
  Liability: GaapPostingSide.Credit,
  Equity: GaapPostingSide.Credit,
  Income: GaapPostingSide.Credit,
});

// Utility: simple ID generator
let __gaap_id_counter = 1;
function nextGaapId() {
  return __gaap_id_counter++;
}

// -------------------------------------------------------------
// POSTING BUILDER
// -------------------------------------------------------------

/**
 * Create GaapPostings using Builder pattern.
 */
class GaapPostingBuilder {
  constructor() {
    /** @type {GaapPosting[]} */
    this.postings = [];
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  deposit(account, amount) {
    return account.isDebitNormal
      ? this.#debit(account, amount)
      : this.#credit(account, amount);
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  withdraw(account, amount) {
    return account.isDebitNormal
      ? this.#credit(account, amount)
      : this.#debit(account, amount);
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  #debit(account, amount) {
    this.postings.push({
      accountId: account.id,
      side: GaapPostingSide.Debit,
      amount,
    });
    return this;
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  #credit(account, amount) {
    this.postings.push({
      accountId: account.id,
      side: GaapPostingSide.Credit,
      amount,
    });
    return this;
  }

  /**
   * @returns {GaapPosting[]}
   */
  build() {
    return this.postings;
  }
}

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------

/**
 * @typedef {Object} GaapPosting
 * @property {number} accountId
 * @property {number} amount
 * @property {GaapPostingSideName} side
 */

// -------------------------------------------------------------
// TRANSACTION
// -------------------------------------------------------------

// class GaapTransaction {
//   /**
//    * @param {string} description
//    * @param {GaapPosting[]} postings
//    */
//   constructor(description, postings) {
//     if (!Array.isArray(postings) || postings.length < 2)
//       throw new Error("Transaction must have 2+ postings");

//     for (const p of postings) {
//       if (p.amount < 0) throw new Error("Amounts must be >= 0");
//     }

//     const debits = postings
//       .filter((p) => p.side === GaapPostingSide.Debit)
//       .reduce((a, b) => a + b.amount, 0);
//     const credits = postings
//       .filter((p) => p.side === GaapPostingSide.Credit)
//       .reduce((a, b) => a + b.amount, 0);

//     if (debits !== credits)
//       throw new Error("Transaction unbalanced: debits !== credits");

//     /** @type {number} */
//     this.id = nextGaapId();
//     /** @type {string} */
//     this.description = description;
//     /** @type {GaapPosting[]} */
//     this.postings = postings;
//   }
// }

// -------------------------------------------------------------
// ACCOUNT
// -------------------------------------------------------------

class GaapAccount {
  /**
   * @param {string} name
   * @param {symbol} type
   */
  constructor(name, type) {
    /** @type {number} */
    this.id = nextGaapId();
    this.name = name;
    this.type = type;
    this.normalBalance =
      GAAP_NORMAL_BALANCE_BY_TYPE[GaapAccountType.toName(type)];
    this.isDebitNormal = this.normalBalance === GaapPostingSide.Debit;
    this.isCashAccount =
      name.toLowerCase().includes("cash") && type === GaapAccountType.Asset;
  }

  /**
//    * Debit helper: increases for Asset/Expense.
//    * @param {GaapLedger} ledger
//    * @param {Date} date
//    * @param {string} desc
//    * @param {number} amount
//    * @param {GaapAccount} counterAccount
//    */
  //   debit(ledger, date, desc, amount, counterAccount) {

  //     const txn = new GaapTransaction(date, desc, [
  //       { accountId: this.id, side: "debit", amount },
  //       { accountId: counterAccount.id, side: "credit", amount },
  //     ]);
  //     ledger.record(txn);
  //     return txn;
  //   }

  //   /**
  //    * Credit helper: increases for Liability/Equity/Income.
  //    * @param {GaapLedger} ledger
  //    * @param {Date} date
  //    * @param {string} desc
  //    * @param {any} amount
  //    * @param {any} counterAccount
  //    */
  //   credit(ledger, date, desc, amount, counterAccount) {
  //     const txn = new GaapTransaction(date, desc, [
  //       { accountId: this.id, side: "credit", amount },
  //       { accountId: counterAccount.id, side: "debit", amount },
  //     ]);
  //     ledger.record(date, desc, txn);
  //     return txn;
  //   }

  /**
   * Apply one posting.
   *
   * @param {GaapPostingSideName} side
   * @param {number} amount
   */
  apply(side, amount) {
    const increase =
      (side === GaapPostingSide.Debit &&
        this.normalBalance === GaapPostingSide.Debit) ||
      (side === GaapPostingSide.Credit &&
        this.normalBalance === GaapPostingSide.Credit);

    return increase ? amount : -amount;
  }

  /**
   * @param {GaapJournalEntry[]} journalEntries
   * @returns {number}
   */
  #getBalance(journalEntries) {
    const postings = journalEntries
      .flatMap((je) => je.postings)
      .filter((p) => p.accountId === this.id);

    const balance = postings.reduce((sum, p) => {
      return sum + this.apply(p.side, p.amount);
    }, 0);

    return balance;
  }

  /**
   *    * @param {GaapLedger} ledger
   */
  getBalance(ledger) {
    return this.#getBalance(ledger.journalEntries);
  }

  /**
   *    * @param {GaapLedger} ledger
   * @param {Date} date
   */
  getBalanceAsOf(ledger, date) {
    const journalEntries = ledger.journalEntries.filter(
      (je) => je.date <= date
    );
    return this.#getBalance(journalEntries);
  }
}

// -------------------------------------------------------------
// JOURNAL ENTRY
// -------------------------------------------------------------

class GaapJournalEntry {
  /**
   * @param {Date} date
   * @param {string} description
   * @param {GaapPosting[]} postings
   */
  constructor(date, description, postings) {
    if (!(date instanceof Date)) {
      throw new Error("JournalEntry requires a valid Date");
    }
    if (!Array.isArray(postings) || postings.length < 2) {
      throw new Error(
        "A JournalEntry requires 2+ postings (debit and credit)."
      );
    }

    this.date = date;
    this.description = description;

    // Validate postings
    for (const p of postings) {
      if (p.amount <= 0) throw new Error("Posting amounts must be > 0");
      if (
        p.side !== GaapPostingSide.Debit &&
        p.side !== GaapPostingSide.Credit
      ) {
        throw new Error("Posting side must be Debit or Credit");
      }
    }

    // Validate that total balance = 0
    const totalDebits = postings
      .filter((p) => p.side === GaapPostingSide.Debit)
      .reduce((s, p) => s + p.amount, 0);

    const totalCredits = postings
      .filter((p) => p.side === GaapPostingSide.Credit)
      .reduce((s, p) => s + p.amount, 0);

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Unbalanced JournalEntry: debits=${totalDebits}, credits=${totalCredits}`
      );
    }

    this.postings = postings;
  }
}

// -------------------------------------------------------------
// LEDGER
// -------------------------------------------------------------

class GaapLedger {
  constructor() {
    /** @type {GaapAccount[]} */
    this.accounts = [];

    /** @type {GaapJournalEntry[]} */
    this.journalEntries = [];
  }

  /**
   * @param {string} name
   * @param {GaapAccountTypeName} typeName
   */
  createAccount(name, typeName) {
    const typeSymbol = GaapAccountType.parse(typeName);
    const acct = new GaapAccount(name, typeSymbol);
    this.accounts.push(acct);
    return acct;
  }

  /**
   * @param {Date} date
   * @param {string} description
   * @param {GaapPosting[]} postings
   */
  record(date, description, postings) {
    const journalEntry = new GaapJournalEntry(date, description, postings);
    this.journalEntries.push(journalEntry);
    return journalEntry;
  }

  // ---------------------------------------------------------
  // DATE-AWARE BALANCE HELPERS
  // ---------------------------------------------------------

  /**
   * Compute balance of a given account up to a date.
   * @param {GaapAccount} account
   * @param {Date} asOf
   */
  _accountBalanceAsOf(account, asOf) {
    let balance = 0;

    return this.journalEntries
      .filter((je) => je.date <= asOf)
      .flatMap((je) => je.postings)
      .filter((p) => p.accountId === account.id)
      .reduce(
        (balance, posting) =>
          (balance += account.apply(posting.side, posting.amount)),
        0
      );
  }

  /**
    * Compute net activity in account between dates

    * @param {Number} accountId
    * @param {Date} start
    * @param {Date} end
    */
  _accountActivityBetween(accountId, start, end) {
    // Get all transactions in date range
    return this.journalEntries
      .filter((je) => je.date >= start && je.date <= end)
      .flatMap((je) => je.postings)
      .filter((p) => p.accountId === accountId)
      .reduce((balance, posting) => {
        const account = this.accounts.find((a) => a.id === posting.accountId);
        if (!account) return balance;
        return balance + account.apply(posting.side, posting.amount);
      }, 0);
  }

  // ---------------------------------------------------------
  // BALANCE SHEET (POINT IN TIME)
  // ---------------------------------------------------------

  /**
   * @param {Date} asOfDate
   */
  getBalanceSheet(asOfDate) {
    const assets = this.accounts
      .filter((a) => a.type === GaapAccountType.Asset)
      .reduce((sum, a) => sum + this._accountBalanceAsOf(a, asOfDate), 0);

    const liabilities = this.accounts
      .filter((a) => a.type === GaapAccountType.Liability)
      .reduce((sum, a) => sum + this._accountBalanceAsOf(a, asOfDate), 0);

    const equity = this.accounts
      .filter((a) => a.type === GaapAccountType.Equity)
      .reduce((sum, a) => sum + this._accountBalanceAsOf(a, asOfDate), 0);

    return {
      date: asOfDate,
      assets,
      liabilities,
      equity,
      balanceCheck: assets - liabilities - equity, // should be 0
    };
  }

  // ---------------------------------------------------------
  // INCOME STATEMENT (PERIOD)
  // ---------------------------------------------------------
  /**
   * @param {Date} startDate
   * @param {Date} endDate
   */
  getIncomeStatement(startDate, endDate) {
    const income = this.accounts
      .filter((a) => a.type === GaapAccountType.Income)
      .reduce(
        (sum, a) =>
          sum + this._accountActivityBetween(a.id, startDate, endDate),
        0
      );

    const expenses = this.accounts
      .filter((a) => a.type === GaapAccountType.Expense)
      .reduce(
        (sum, a) =>
          sum + this._accountActivityBetween(a.id, startDate, endDate),
        0
      );

    return {
      startDate,
      endDate,
      income,
      expenses,
      netIncome: income - expenses,
    };
  }

  /**
   * @param {number} totalAmount
   * @param {number[]} weightedAmounts
   * @returns {number[]} allocations
   */
  allocateProportionally(totalAmount, weightedAmounts) {
    if (weightedAmounts.length === 0) return [];

    if (weightedAmounts.some((w) => w < 0)) {
      throw new Error("All weightedAmounts must be non-negative");
    }

    const weightedTotal = weightedAmounts.reduce(
      (sum, weightedAmount) => sum + weightedAmount,
      0
    );

    // Compute exact fractional allocations
    const raw = weightedAmounts.map(
      (weightedAmount) => totalAmount * (weightedAmount / weightedTotal)
    );

    // Floor toward zero for GAAP-friendly rounding
    const floored = raw.map((x) => (x < 0 ? Math.ceil(x) : Math.floor(x)));

    const sumFloored = floored.reduce((s, v) => s + v, 0);

    // Remainder we must distribute
    let remainder = totalAmount - sumFloored;

    if (remainder === 0) {
      return floored; // perfect match, no fractional parts
    }

    // Compute fractional remainders
    const fracParts = raw.map((x, i) => ({
      index: i,
      frac: Math.abs(x - floored[i]), // deviation from floored value
    }));

    // Sort descending by fractional remainder
    fracParts.sort((a, b) => b.frac - a.frac);

    // Distribute the remainder to the largest fractional portions first
    const result = [...floored];

    const direction = remainder < 0 ? -1 : 1;
    remainder = Math.abs(remainder);

    for (let i = 0; i < fracParts.length && remainder > 0; i++) {
      const idx = fracParts[i].index;
      result[idx] += direction;
      remainder--;
    }

    return result;
  }

  // ---------------------------------------------------------
  // STATEMENT OF CASH FLOWS (PERIOD)
  // ---------------------------------------------------------
  /**
   * @param {Date} startDate
   * @param {Date} endDate
   */
  getCashFlowStatement(startDate, endDate) {
    // First: identify the cash account(s)
    if (!this.accounts.some((a) => a.isCashAccount)) {
      throw new Error("No cash account found. Name must include 'Cash'.");
    }

    const cashAccounts = this.accounts.filter((a) => a.isCashAccount);

    const isCashAccount = (/** @type {number} */ accountId) =>
      cashAccounts.some((a) => a.id === accountId);

    // Totals
    let operating = 0;
    let investing = 0;
    let financing = 0;

    const isOperating = (/** @type {GaapAccount} */ acc) =>
      acc.type === GaapAccountType.Income ||
      acc.type === GaapAccountType.Expense;

    const isInvesting = (/** @type {GaapAccount} */ acc) =>
      acc.type === GaapAccountType.Asset &&
      !acc.name.toLowerCase().includes("cash");

    const isFinancing = (/** @type {GaapAccount} */ acc) =>
      acc.type === GaapAccountType.Equity ||
      acc.type === GaapAccountType.Liability;

    // Net cash change from actual cash accounts (already correct)
    let netCashChange = 0;
    for (const cashAccount of cashAccounts) {
      netCashChange += this._accountActivityBetween(
        cashAccount.id,
        startDate,
        endDate
      );
    }

    const journalEntriesAffectiveCash = this.journalEntries
      .filter((je) => je.date >= startDate && je.date <= endDate)
      .filter((je) => je.postings.some((p) => isCashAccount(p.accountId)));

    for (const je of journalEntriesAffectiveCash) {
      const cashPostings = je.postings.filter((p) =>
        isCashAccount(p.accountId)
      );
      const nonCashPostings = je.postings.filter(
        (p) => !isCashAccount(p.accountId)
      );

      // Determine cash movement *sign* from cash postings
      // (Debit = cash inflow, Credit = outflow)
      let cashDelta = 0;
      for (const cashPosting of cashPostings) {
        cashDelta +=
          cashPosting.side === GaapPostingSide.Debit
            ? cashPosting.amount
            : -cashPosting.amount;
      }

      if (cashDelta === 0 || nonCashPostings.length === 0) {
        // No net cash movement; skip
        continue;
      }

      // Extract amounts for allocation algorithm
      const nonCashAmounts = nonCashPostings.map((p) => p.amount);

      // Compute proportional allocations (guaranteed to sum to cashDelta)
      const allocations = this.allocateProportionally(
        cashDelta,
        nonCashAmounts
      );

      // Classify each allocated portion
      for (let i = 0; i < nonCashPostings.length; i++) {
        const posting = nonCashPostings[i];
        const allocated = allocations[i];

        const account = this.accounts.find((a) => a.id === posting.accountId);
        if (!account) continue;

        if (isOperating(account)) operating += allocated;
        else if (isInvesting(account)) investing += allocated;
        else if (isFinancing(account)) financing += allocated;
      }

      // for (const nonCashPosting of nonCashPostings) {
      //   const account = this.accounts.find(
      //     (a) => a.id === nonCashPosting.accountId
      //   );
      //   if (!account) continue;

      //   const allocated = (cashDelta < 0 ? -1 : 1) * nonCashPosting.amount;

      //   if (isOperating(account)) operating += allocated;
      //   else if (isInvesting(account)) investing += allocated;
      //   else if (isFinancing(account)) financing += allocated;
      // }
    }

    return {
      startDate,
      endDate,
      operating,
      investing,
      financing,
      netCashChange,
    };
  }

  // ---------------------------------------------------------
  // TRIAL BALANCE WITH DATE
  // ---------------------------------------------------------

  /**
   * @param {Date} asOfDate
   */
  getTrialBalance(asOfDate) {
    return this.accounts.map((acct) => ({
      id: acct.id,
      name: acct.name,
      type: acct.type,
      balance: this._accountBalanceAsOf(acct, asOfDate),
    }));
  }
}

// Export for Node tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GaapAccountTypeNames,
    GaapAccountType,
    GAAP_NORMAL_BALANCE_BY_TYPE,
    GaapAccount,
    GaapPostingSide,
    GaapPostingBuilder,
    // ...anything else you need in tests
  };
}
