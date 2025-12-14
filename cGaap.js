// @ts-check

import { EnumBase } from "./cEnum.js";

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

/**
 * @global
 * @typedef {"Debit" | "Credit"} GaapPostingSideName
 */

// -------------------------------------------------------------

/**
 * EnumBase contract:
 *   - .map: Record<string, symbol>
 *   - .toName(symbol): string | undefined
 *   - .parse(name: string): symbol
 *
 * EnumBase guarantees that:
 *   this.map = { [name: string]: symbol }
 *
 * Example:
 *   this.map.Asset === Symbol("GaapAccountType.Asset")
 *
 * This class relies on:
 *   - this.map[name] → symbol
 *   - .toName(symbol) → name
 *   - .parse(name) → symbol (from EnumBase or overridden here)
 */
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
 * @typedef {typeof GaapAccountType.Asset
 *         | typeof GaapAccountType.Liability
 *         | typeof GaapAccountType.Equity
 *         | typeof GaapAccountType.Income
 *         | typeof GaapAccountType.Expense} GaapAccountTypeSymbol
 */

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
  increase(account, amount) {
    if (amount <= 0) throw new Error("Posting amount must be > 0");
    return account.isDebitNormal
      ? this.#debit(account, amount)
      : this.#credit(account, amount);
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  decrease(account, amount) {
    if (amount <= 0) throw new Error("Posting amount must be > 0");
    return account.isDebitNormal
      ? this.#credit(account, amount)
      : this.#debit(account, amount);
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  #debit(account, amount) {
    this.postings.push(new GaapPosting(account, amount, GaapPostingSide.Debit));
    return this;
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  #credit(account, amount) {
    this.postings.push(
      new GaapPosting(account, amount, GaapPostingSide.Credit)
    );
    return this;
  }

  /**
   * @returns {GaapPosting[]}
   */
  build() {
    return [...this.postings];
  }
}

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------

class GaapPosting {
  /**
   * @param {GaapAccount} account
   * @param {number} amount
   * @param {GaapPostingSideName} side
   * */

  constructor(account, amount, side) {
    if (amount <= 0) throw new Error("Posting amount must be > 0");

    this.account = account;
    this.amount = amount;
    this.side = side;

    // Postings are immutable
    Object.freeze(this);
  }
}

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
  static #constructorToken = Symbol("Secret");
  /**
   * @param {symbol} token
   * @param {string} name
   * @param {GaapAccountTypeSymbol} accountType
   * @param {boolean} isCashAccount
   */
  constructor(token, name, accountType, isCashAccount) {
    if (token !== GaapAccount.#constructorToken) {
      throw new Error(
        "This constructor is private. Use static factory methods."
      );
    }

    if (!Object.values(GaapAccountType.map).includes(accountType)) {
      throw new Error("Invalid account type");
    }

    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("Invalid account name");
    }

    if (typeof isCashAccount !== "boolean") {
      throw new Error("isCashAccount must be a boolean");
    }

    if (isCashAccount && accountType !== GaapAccountType.Asset) {
      throw new Error("Cash accounts MUST be Asset accounts");
    }

    /** @type {number} */
    this.id = nextGaapId();
    this.name = name;
    this.type = accountType;
    this.normalBalance =
      GAAP_NORMAL_BALANCE_BY_TYPE[GaapAccountType.toName(accountType)];
    this.isDebitNormal = this.normalBalance === GaapPostingSide.Debit;
    this.isCashAccount = isCashAccount;
  }

  /**
   * @param {string} accountName
   */
  static CreateCashAccount(accountName) {
    return new GaapAccount(
      GaapAccount.#constructorToken,
      accountName,
      GaapAccountType.Asset,
      true
    );
  }

  /**
   * @param {string} accountName
   * @param {GaapAccountTypeSymbol} accountType
   */
  static CreateNonCashAccount(accountName, accountType) {
    return new GaapAccount(
      GaapAccount.#constructorToken,
      accountName,
      accountType,
      false
    );
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
    // const increase =
    //   (side === GaapPostingSide.Debit &&
    //     this.normalBalance === GaapPostingSide.Debit) ||
    //   (side === GaapPostingSide.Credit &&
    //     this.normalBalance === GaapPostingSide.Credit);

    // return increase ? amount : -amount;
    return side === this.normalBalance ? amount : -amount;
  }

  /**
   * @param {GaapJournalEntry[]} journalEntries
   * @returns {number}
   */
  #getBalance(journalEntries) {
    const postings = journalEntries
      .flatMap((je) => je.postings)
      .filter((p) => p.account.id === this.id);

    let balance = postings.reduce(
      (sum, p) => sum + this.apply(p.side, p.amount),
      0
    );

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

    this.id = nextGaapId();
    /** @type {Date} */
    this.date = date;
    this.description = description;

    const sortedPostings = postings.slice().sort((a, b) => {
      // Explicit ranking: lower value sorts first
      const rank = (/** @type {GaapPosting} */ p) =>
        p.side === GaapPostingSide.Debit ? 0 : 1;

      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;

      // If we got here (because both postings are Debit
      // or both are Credit), sort by account name alphabetically
      return a.account.name.localeCompare(b.account.name);
    });

    // Validate postings
    for (const p of sortedPostings) {
      if (p.amount <= 0) throw new Error("Posting amounts must be > 0");
      if (
        p.side !== GaapPostingSide.Debit &&
        p.side !== GaapPostingSide.Credit
      ) {
        throw new Error("Posting side must be Debit or Credit");
      }
    }

    // Validate that total balance = 0
    const totalDebits = sortedPostings
      .filter((p) => p.side === GaapPostingSide.Debit)
      .reduce((s, p) => s + p.amount, 0);

    const totalCredits = sortedPostings
      .filter((p) => p.side === GaapPostingSide.Credit)
      .reduce((s, p) => s + p.amount, 0);

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Unbalanced JournalEntry: debits=${totalDebits}, credits=${totalCredits}`
      );
    }

    this.postings = Object.freeze(sortedPostings);
  }

  toString() {
    const lines = [];
    lines.push(`Journal Entry #${this.id}`);
    lines.push(`Date: ${this.date.toISOString().split("T")[0]}`);
    lines.push(`Description: ${this.description}`);
    lines.push("");

    // Column widths
    const accountWidth = Math.max(
      ...this.postings.map((p) => p.account.name.length),
      "Account".length
    );

    const amountWidth = Math.max(
      ...this.postings.map((p) => String(p.amount).length),
      "Amount".length
    );

    const header =
      `${"Account".padEnd(accountWidth)}  ` +
      `Dr`.padStart(4) +
      "  " +
      `Cr`.padStart(4) +
      "  " +
      `${"Amount".padStart(amountWidth)}`;

    lines.push(header);
    lines.push("-".repeat(header.length));

    for (const p of this.postings) {
      const isDebit = p.side === "Debit";

      const drCol = isDebit ? "Dr".padStart(4) : "".padStart(4);
      const crCol = isDebit ? "".padStart(4) : "Cr".padStart(4);

      lines.push(
        `${p.account.name.padEnd(accountWidth)}  ` +
          `${drCol}  ` +
          `${crCol}  ` +
          `${String(p.amount).padStart(amountWidth)}`
      );
    }

    // Totals
    const totalDr = this.postings
      .filter((p) => p.side === "Debit")
      .reduce((s, p) => s + p.amount, 0);

    const totalCr = this.postings
      .filter((p) => p.side === "Credit")
      .reduce((s, p) => s + p.amount, 0);

    lines.push("");
    lines.push(`Total Debits:  ${totalDr}`);
    lines.push(`Total Credits: ${totalCr}`);
    lines.push(
      totalDr === totalCr ? "Status: BALANCED ✔" : "Status: UNBALANCED ✘"
    );

    return lines.join("\n");
  }
}

class GaapJournalEntryBuilder {
  /**
   * @param {GaapLedger} ledger
   * @param {Date} date
   * @param {string} description
   */
  constructor(ledger, date, description) {
    if (!(date instanceof Date)) {
      throw new Error("JournalEntryBuilder requires a valid Date");
    }

    this.ledger = ledger;
    this.date = date;
    this.description = description;

    /** @type {GaapPosting[]} */
    this.postings = [];
  }

  /**
   * Add a debit posting.
   * @param {GaapAccount} account
   * @param {number} amount
   */
  debit(account, amount) {
    if (amount <= 0) {
      throw new Error("Debit amount must be > 0");
    }

    this.postings.push(new GaapPosting(account, amount, GaapPostingSide.Debit));
    return this;
  }

  /**
   * Add a credit posting.
   * @param {GaapAccount} account
   * @param {number} amount
   */
  credit(account, amount) {
    if (amount <= 0) {
      throw new Error("Credit amount must be > 0");
    }

    this.postings.push(
      new GaapPosting(account, amount, GaapPostingSide.Credit)
    );
    return this;
  }

  /**
   * Validates and posts the journal entry to the ledger.
   */
  post() {
    if (this.postings.length < 2) {
      throw new Error("A Journal Entry must contain at least 2 postings.");
    }

    const totalDebits = this.postings
      .filter((p) => p.side === GaapPostingSide.Debit)
      .reduce((s, p) => s + p.amount, 0);

    const totalCredits = this.postings
      .filter((p) => p.side === GaapPostingSide.Credit)
      .reduce((s, p) => s + p.amount, 0);

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Unbalanced JournalEntry: debits=${totalDebits} credits=${totalCredits}`
      );
    }

    // Create GaapJournalEntry (which will sort postings, etc.)
    return this.ledger.record(this.date, this.description, this.postings);
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

    // Attach macros automatically
    this.do = new GaapMacros(this);
  }

  /**
   * @param {string} name
   */
  createCashAccount(name) {
    const acct = GaapAccount.CreateCashAccount(name);
    this.accounts.push(acct);
    return acct;
  }

  /**
   * @param {string} name
   * @param {GaapAccountTypeSymbol} accountType
   */
  createNonCashAccount(name, accountType) {
    const acct = GaapAccount.CreateNonCashAccount(name, accountType);
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

  /**
   * @param {Date} date
   * @param {string} description
   */
  entry(date, description) {
    return new GaapJournalEntryBuilder(this, date, description);
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
    return this.journalEntries
      .filter((je) => je.date <= asOf)
      .flatMap((je) => je.postings)
      .filter((p) => p.account.id === account.id)
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
      .filter((p) => p.account.id === accountId)
      .reduce((balance, posting) => {
        const account = this.accounts.find((a) => a.id === posting.account.id);
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
      acc.type === GaapAccountType.Asset && !acc.isCashAccount;

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

    const journalEntriesAffectingCash = this.journalEntries
      .filter((je) => je.date >= startDate && je.date <= endDate)
      .filter((je) => je.postings.some((p) => isCashAccount(p.account.id)));

    for (const je of journalEntriesAffectingCash) {
      const cashPostings = je.postings.filter((p) =>
        isCashAccount(p.account.id)
      );
      const nonCashPostings = je.postings.filter(
        (p) => !isCashAccount(p.account.id)
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

        const account = this.accounts.find((a) => a.id === posting.account.id);
        if (!account) continue;

        if (isOperating(account)) operating += allocated;
        else if (isInvesting(account)) investing += allocated;
        else if (isFinancing(account)) financing += allocated;
      }
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

/* ============================================================
   FLOW-BASED ARG TYPES (GAAP-CONSISTENT ORDERING)
   dr* = Asset or Expense (debit-normal)
   cr* = Liability, Income, Equity (credit-normal)

   ORDERING RULE:
   1. All dr* accounts first (in logical order)
   2. All cr* accounts second
   3. Amount/principal/interest/etc.
   4. Optional date/desc
   ============================================================ */

/** -------------------- SALE -------------------- */
/**
 * Asset increases (dr), Revenue increases (cr)
 * @typedef {object} RevenueToAssetArgs
 * @property {GaapAccount} drAsset
 * @property {GaapAccount} crRevenue
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- EXPENSE PAYMENT -------------------- */
/**
 * Expense increases (dr), Cash decreases (cr)
 * @typedef {object} CashToExpenseArgs
 * @property {GaapAccount} drExpense
 * @property {GaapAccount} drCash
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- ASSET TRANSFER -------------------- */
/**
 * Debit destination (increase), credit source (decrease)
 * @typedef {object} AssetToAssetArgs
 * @property {GaapAccount} drAssetDestination
 * @property {GaapAccount} drAssetSource   // credited via decrease()
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- LOAN DISBURSEMENT -------------------- */
/**
 * Cash increases (dr), Liability increases (cr)
 * @typedef {object} LiabilityToCashArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} crLiability
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- LOAN PAYMENT -------------------- */
/**
 * Cash decreases (cr), Loan decreases (dr), Expense increases (dr)
 * @typedef {object} CashToLiabilityAndExpenseArgs
 * @property {GaapAccount} drInterestExpense
 * @property {GaapAccount} drCash            // credited via decrease()
 * @property {GaapAccount} crLoanLiability   // credited via decrease()
 * @property {number} principal
 * @property {number} interest
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- PAYROLL -------------------- */
/**
 * Cash increases (dr), Gross income increases (cr), Liabilities increase (cr)
 * @typedef {object} IncomeToCashAndExpensesArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} drTrad401k
 * @property {GaapAccount} drFederalWithholdings
 * @property {GaapAccount} crIncomeGross
 * @property {number} grossPay
 * @property {number} taxesAndBenefits
 * @property {number} retirementContribution
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- 401k CONTRIBUTION -------------------- */
/**
 * 401k Asset increases (dr), Cash decreases (cr)
 * @typedef {object} CashTo401kArgs
 * @property {GaapAccount} dr401k
 * @property {GaapAccount} drCash
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- ROTH CONTRIBUTION -------------------- */
/**
 * Roth Asset increases (dr), Cash decreases (cr)
 * @typedef {object} CashToRothArgs
 * @property {GaapAccount} drRoth
 * @property {GaapAccount} drCash
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- TRADITIONAL WITHDRAWAL -------------------- */
/**
 * Cash increases (dr), 401k decreases (cr), Income increases (cr)
 * @typedef {object} Trad401kToCashAndIncomeArgs
 * @property {GaapAccount} drCash       // Debit Cash (asset ↑)
 * @property {GaapAccount} dr401k       // Credit 401k (asset ↓)
 * @property {GaapAccount} crIncome     // Credit Income (credit-normal ↑)
 * @property {GaapAccount} crEquity     // Debit Equity (credit-normal ↓)
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- ROTH WITHDRAWAL -------------------- */
/**
 * Cash increases (dr), Roth asset decreases (cr)
 * @typedef {object} RothToCashArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} drRoth         // credited via decrease()
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- PENSION INCOME -------------------- */
/**
 * Cash increases (dr), Pension Income increases (cr)
 * @typedef {object} PensionIncomeToCashArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} crPensionIncome
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- SOCIAL SECURITY INCOME -------------------- */
/**
 * Cash increases (dr), SS Income increases (cr)
 * @typedef {object} SSIncomeToCashArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} crSSIncome
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- INVESTMENT PURCHASE -------------------- */
/**
 * Investment increases (dr), Cash decreases (cr)
 * @typedef {object} CashToInvestmentArgs
 * @property {GaapAccount} drInvestment
 * @property {GaapAccount} drCash
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- INVESTMENT SALE -------------------- */
/**
 * Cash increases (dr), Investment decreases (cr)
 * @typedef {object} InvestmentToCashArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} drInvestment   // credited via decrease()
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- CAPITAL GAIN -------------------- */
/**
 * Cash increases (dr), Investment decreases (cr), Gain increases (cr)
 * @typedef {object} InvestmentToCashAndGainArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} drInvestment
 * @property {GaapAccount} crGain
 * @property {GaapAccount} drLoss
 * @property {number} proceeds
 * @property {number} basis
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- INTEREST INCOME -------------------- */
/**
 * Cash increases (dr), Interest Income increases (cr)
 * @typedef {object} InterestIncomeToCashArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} crInterestIncome
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- DIVIDEND INCOME -------------------- */
/**
 * Cash increases (dr), Dividend Income increases (cr)
 * @typedef {object} DividendIncomeToCashArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} crDividendIncome
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- TAX PAYMENT -------------------- */
/**
 * Liability decreases (dr), Cash decreases (cr)
 * @typedef {object} CashToTaxLiabilityArgs
 * @property {GaapAccount} drCash
 * @property {GaapAccount} crTaxLiability
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- ESTIMATED TAX (EXPENSE) -------------------- */
/**
 * Tax Expense increases (dr), Cash decreases (cr)
 * @typedef {object} CashToTaxExpenseArgs
 * @property {GaapAccount} drTaxExpense
 * @property {GaapAccount} drCash
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

/** -------------------- ESCROW DEPOSIT -------------------- */
/**
 * Escrow Asset increases (dr), Cash decreases (cr)
 * @typedef {object} CashToEscrowArgs
 * @property {GaapAccount} drEscrow
 * @property {GaapAccount} drCash
 * @property {number} amount
 * @property {Date} [date]
 * @property {string} [desc]
 */

class GaapMacros {
  /**
   * @param {GaapLedger} ledger
   */
  constructor(ledger) {
    this.ledger = ledger;
  }

  // ============================================================
  // SALE (Asset increases, Revenue increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Asset account increases by the sale amount.
   *  - Revenue is recognized for the same amount.
   * GAAP Posting Effects:
   *  - drAsset is debited (asset increases).
   *  - crRevenue is credited (income increases).
   * @param {RevenueToAssetArgs} p
   */
  sale(p) {
    const b = new GaapPostingBuilder();
    b.increase(p.drAsset, p.amount);
    b.increase(p.crRevenue, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Sale",
      b.build()
    );
  }

  // ============================================================
  // EXPENSE PAYMENT (Cash decreases, Expense increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash is reduced to pay an expense.
   *  - The expense account increases, reflecting cost incurred.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - drExpense is debited (expense increases).
   * @param {CashToExpenseArgs} p
   */
  expensePayment(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drCash, p.amount);
    b.increase(p.drExpense, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Expense Payment",
      b.build()
    );
  }

  // ============================================================
  // ASSET TRANSFER (One asset decreases, another increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Money or value is moved from one asset account to another.
   * GAAP Posting Effects:
   *  - drAssetSource is credited (asset decreases).
   *  - drAssetDestination is debited (asset increases).
   * @param {AssetToAssetArgs} p
   */
  transfer(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drAssetSource, p.amount);
    b.increase(p.drAssetDestination, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Transfer",
      b.build()
    );
  }

  // ============================================================
  // LOAN DISBURSEMENT (Liability increases, Cash increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash is received from a loan.
   *  - A liability is created for the borrowed amount.
   * GAAP Posting Effects:
   *  - drCash is debited (asset increases).
   *  - crLiability is credited (liability increases).
   * @param {LiabilityToCashArgs} p
   */
  loanDisbursement(p) {
    const b = new GaapPostingBuilder();
    b.increase(p.drCash, p.amount);
    b.increase(p.crLiability, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Loan Disbursement",
      b.build()
    );
  }

  // ============================================================
  // LOAN PAYMENT (Cash decreases, Liability decreases, Expense increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash decreases for the total payment.
   *  - Loan principal is reduced.
   *  - Interest is recognized as an expense.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - crLoanLiability is debited (liability decreases).
   *  - drInterestExpense is debited (expense increases).
   * @param {CashToLiabilityAndExpenseArgs} p
   */
  loanPayment(p) {
    const b = new GaapPostingBuilder();
    const total = p.principal + p.interest;

    b.decrease(p.drCash, total);
    b.decrease(p.crLoanLiability, p.principal);
    b.increase(p.drInterestExpense, p.interest);

    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Loan Payment",
      b.build()
    );
  }

  // ============================================================
  // PAYROLL (Income increases, Cash increases, Liabilities increase)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Gross pay is recognized as income.
   *  - Cash increases by net pay.
   *  - Payroll expense increases by total withholdings.
   *  - Withholding liabilities increase.
   * GAAP Posting Effects:
   *  - drCash is debited for net pay (asset increases).
   *  - drExpensePayroll is debited for total withholdings (expense increases).
   *  - crIncome is credited (income increases).
   *  - Withholding liabilities are credited (liabilities increase).
   * @param {IncomeToCashAndExpensesArgs} p
   */
  payroll(p) {
    const b = new GaapPostingBuilder();

    const netPay = p.grossPay - p.taxesAndBenefits - p.retirementContribution;

    b.increase(p.drCash, netPay);
    b.increase(p.drFederalWithholdings, p.taxesAndBenefits);
    b.increase(p.drTrad401k, p.retirementContribution);
    b.increase(p.crIncomeGross, p.grossPay);

    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Payroll",
      b.build()
    );
  }

  // ============================================================
  // TRADITIONAL 401k CONTRIBUTION (Cash decreases, 401k increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash decreases for the contribution.
   *  - Retirement account increases by the same amount.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - dr401k is debited (asset increases).
   * @param {CashTo401kArgs} p
   */
  retirementContributionTraditional(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drCash, p.amount);
    b.increase(p.dr401k, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Traditional 401k Contribution",
      b.build()
    );
  }

  // ============================================================
  // ROTH CONTRIBUTION (Cash decreases, Roth increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash decreases for the Roth contribution.
   *  - Roth account increases by the same amount.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - drRoth is debited (asset increases).
   * @param {CashToRothArgs} p
   */
  retirementContributionRoth(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drCash, p.amount);
    b.increase(p.drRoth, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Roth Contribution",
      b.build()
    );
  }

  // ============================================================
  // TRADITIONAL WITHDRAWAL (401k decreases, Cash increases, Income increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Retirement account decreases.
   *  - Cash increases by the withdrawn amount.
   *  - Income is recognized for tax purposes.
   * GAAP Posting Effects:
   *  - dr401k is credited (asset decreases).
   *  - drCash is debited (asset increases).
   *  - crIncome is credited (income increases).
   * @param {Trad401kToCashAndIncomeArgs} p
   */
  withdrawFromTraditional401k(p) {
    const b = new GaapPostingBuilder()
      .increase(p.drCash, p.amount) // Debit Cash (asset ↑)
      .decrease(p.dr401k, p.amount) // Credit 401k (asset ↓)
      .increase(p.crIncome, p.amount) // Credit Income (credit-normal ↑)
      .decrease(p.crEquity, p.amount); // Debit Equity (credit-normal ↓)
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Traditional Withdrawal",
      b.build()
    );
  }

  /**
   * @param {Trad401kToCashAndIncomeArgs} p
   */
  rmdWithdrawal(p) {
    return this.withdrawFromTraditional401k({
      ...p,
      desc: p.desc ?? "RMD Withdrawal",
    });
  }

  // ============================================================
  // ROTH WITHDRAWAL (Roth decreases, Cash increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Roth account decreases.
   *  - Cash increases by the withdrawn amount.
   * GAAP Posting Effects:
   *  - drRoth is credited (asset decreases).
   *  - drCash is debited (asset increases).
   * @param {RothToCashArgs} p
   */
  withdrawFromTraditionalRoth(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drRoth, p.amount);
    b.increase(p.drCash, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Roth Withdrawal",
      b.build()
    );
  }

  // ============================================================
  // PENSION INCOME (Income increases, Cash increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash increases from pension payment.
   *  - Pension income is recognized.
   * GAAP Posting Effects:
   *  - crPensionIncome is credited (income increases).
   *  - drCash is debited (asset increases).
   * @param {PensionIncomeToCashArgs} p
   */
  pensionPayment(p) {
    const b = new GaapPostingBuilder();
    b.increase(p.crPensionIncome, p.amount);
    b.increase(p.drCash, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Pension Income",
      b.build()
    );
  }

  // ============================================================
  // SOCIAL SECURITY INCOME (Income increases, Cash increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash increases from Social Security benefits.
   *  - Social Security income is recognized.
   * GAAP Posting Effects:
   *  - crSSIncome is credited (income increases).
   *  - drCash is debited (asset increases).
   * @param {SSIncomeToCashArgs} p
   */
  socialSecurityIncome(p) {
    const b = new GaapPostingBuilder();
    b.increase(p.crSSIncome, p.amount);
    b.increase(p.drCash, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Social Security Income",
      b.build()
    );
  }

  // ============================================================
  // INVESTMENT PURCHASE (Cash decreases, Investment increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash decreases to purchase an investment.
   *  - Investment value increases by the purchase amount.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - drInvestment is debited (asset increases).
   * @param {CashToInvestmentArgs} p
   */
  investmentBuy(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drCash, p.amount);
    b.increase(p.drInvestment, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Investment Purchase",
      b.build()
    );
  }

  // ============================================================
  // INVESTMENT SALE (Investment decreases, Cash increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Investment account decreases by sold amount.
   *  - Cash increases from proceeds.
   * GAAP Posting Effects:
   *  - drInvestment is credited (asset decreases).
   *  - drCash is debited (asset increases).
   * @param {InvestmentToCashArgs} p
   */
  investmentSell(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drInvestment, p.amount);
    b.increase(p.drCash, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Investment Sale",
      b.build()
    );
  }

  // ============================================================
  // CAPITAL GAIN REALIZATION
  // ============================================================
  /**
   * Correct GAAP behavior:
   *   Dr Cash (proceeds)
   *   Dr Loss (if basis > proceeds)
   *   Cr Investment (basis removed)
   *   Cr Gain (if proceeds > basis)
   * @param {InvestmentToCashAndGainArgs} p
   */
  realizeCapitalGain(p) {
    const b = new GaapPostingBuilder();

    // 1. Investment decreases by its basis (credit)
    b.decrease(p.drInvestment, p.basis);

    // 2. Cash increases by proceeds (debit)
    b.increase(p.drCash, p.proceeds);

    // 3. Gain or Loss recognition
    const gain = p.proceeds - p.basis;

    if (gain > 0) {
      // Gain is credited
      b.increase(p.crGain, gain);
    } else if (gain < 0) {
      // Loss is debited (positive number)
      b.increase(p.drLoss, -gain); // convert negative to positive
    }

    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Capital Gain Realization",
      b.build()
    );
  }

  // ============================================================
  // INTEREST INCOME (Income increases, Cash increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash increases by interest received.
   *  - Interest income is recognized.
   * GAAP Posting Effects:
   *  - crInterestIncome is credited (income increases).
   *  - drCash is debited (asset increases).
   * @param {InterestIncomeToCashArgs} p
   */
  interestIncome(p) {
    const b = new GaapPostingBuilder();
    b.increase(p.crInterestIncome, p.amount);
    b.increase(p.drCash, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Interest Earned",
      b.build()
    );
  }

  // ============================================================
  // DIVIDEND INCOME (Income increases, Cash increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash increases from dividends.
   *  - Dividend income is recognized.
   * GAAP Posting Effects:
   *  - crDividendIncome is credited (income increases).
   *  - drCash is debited (asset increases).
   * @param {DividendIncomeToCashArgs} p
   */
  dividendIncome(p) {
    const b = new GaapPostingBuilder();
    b.increase(p.crDividendIncome, p.amount);
    b.increase(p.drCash, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Dividend Received",
      b.build()
    );
  }

  // ============================================================
  // TAX PAYMENT (Cash decreases, Liability decreases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash decreases to pay taxes.
   *  - Tax liability is reduced.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - crTaxLiability is debited (liability decreases).
   * @param {CashToTaxLiabilityArgs} p
   */
  taxPayment(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drCash, p.amount);
    b.decrease(p.crTaxLiability, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Tax Payment",
      b.build()
    );
  }

  // ============================================================
  // ESTIMATED TAX PAYMENT (Cash decreases, Tax Expense increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash decreases to pay estimated taxes.
   *  - Tax expense is recognized.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - drTaxExpense is debited (expense increases).
   *
   * @param {CashToTaxExpenseArgs} p
   */
  estimatedTaxPayment(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drCash, p.amount);
    b.increase(p.drTaxExpense, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Estimated Tax Payment",
      b.build()
    );
  }

  // ============================================================
  // ESCROW DEPOSIT (Cash decreases, Escrow asset increases)
  // ============================================================
  /**
   * Financial Meaning:
   *  - Cash decreases when depositing into escrow.
   *  - Escrow asset increases by the deposit amount.
   * GAAP Posting Effects:
   *  - drCash is credited (asset decreases).
   *  - drEscrow is debited (asset increases).
   * @param {CashToEscrowArgs} p
   */
  escrowDeposit(p) {
    const b = new GaapPostingBuilder();
    b.decrease(p.drCash, p.amount);
    b.increase(p.drEscrow, p.amount);
    return this.ledger.record(
      p.date ?? new Date(),
      p.desc ?? "Escrow Deposit",
      b.build()
    );
  }
}

// -------------------------------------------------------------
// GAAP OUTPUT GENERATOR
// -------------------------------------------------------------

class GaapOutputGenerator {
  /**
   * @param {GaapLedger} ledger
   */
  constructor(ledger) {
    if (!ledger) {
      throw new Error("GaapOutputGenerator requires a GaapLedger instance");
    }
    if (!(ledger instanceof GaapLedger)) {
      throw new Error("GaapOutputGenerator requires a GaapLedger instance");
    }

    this.ledger = ledger;
  }

  // =========================================================
  // T-ACCOUNT VISUALIZER
  // =========================================================

  /**
   * Pretty-print a single T-account.
   * @param {GaapAccount} account
   * @returns {string}
   */
  printTAccount(account) {
    const ledger = this.ledger;
    const lines = [];

    const nameHeader = `${account.name} (T-Account)`;
    lines.push(nameHeader);
    lines.push("-".repeat(nameHeader.length));

    // Collect all postings affecting this account
    const entries = ledger.journalEntries.flatMap((je) =>
      je.postings
        .filter((p) => p.account.id === account.id)
        .map((p) => ({
          side: p.side,
          amount: p.amount,
          date: je.date,
          desc: je.description,
        }))
    );

    if (entries.length === 0) {
      lines.push("(no activity)");
      return lines.join("\n");
    }

    // Separate debits and credits
    const debits = [];
    const credits = [];

    for (const e of entries) {
      const formatted = `${e.date.toISOString().split("T")[0]} | ${e.desc} | ${e.amount}`;
      if (e.side === "Debit") debits.push(formatted);
      else credits.push(formatted);
    }

    // Column widths
    const leftWidth = Math.max(10, ...debits.map((s) => s.length));
    const rightWidth = Math.max(10, ...credits.map((s) => s.length));
    const totalWidth = leftWidth + 3 + rightWidth;

    // Header
    lines.push("Debit".padEnd(leftWidth) + " | " + "Credit");
    lines.push("-".repeat(totalWidth));

    // Rows
    const maxRows = Math.max(debits.length, credits.length);
    for (let i = 0; i < maxRows; i++) {
      const left = debits[i] || "";
      const right = credits[i] || "";
      lines.push(left.padEnd(leftWidth) + " | " + right);
    }

    lines.push("");
    lines.push(`Ending Balance: ${account.getBalance(ledger)}`);

    return lines.join("\n");
  }

  // =========================================================
  // LEDGER STATEMENT
  // =========================================================

  /**
   * Pretty-print every journal entry in chronological order.
   * @param {Date|null} startDate
   * @param {Date|null} endDate
   * @returns {string}
   */
  printLedgerStatement(startDate = null, endDate = null) {
    if (startDate && endDate && startDate > endDate) {
      throw new Error("startDate cannot be after endDate");
    }

    if (startDate && isNaN(startDate.getTime())) {
      throw new Error("startDate is not a valid date");
    }

    if (endDate && isNaN(endDate.getTime())) {
      throw new Error("endDate is not a valid date");
    }

    const ledger = this.ledger;
    const lines = [];

    lines.push("GENERAL LEDGER");
    lines.push("==============");
    lines.push("");

    const entries = [
      ...ledger.journalEntries.filter((je) => {
        if (startDate && je.date < startDate) return false;
        if (endDate && je.date > endDate) return false;
        return true;
      }),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const je of entries) {
      lines.push(`Date: ${je.date.toISOString().split("T")[0]}`);
      lines.push(`Desc: ${je.description}`);
      lines.push(`Entry #${je.id}`);
      lines.push("");

      const acctWidth = Math.max(
        ...je.postings.map((p) => p.account.name.length),
        8
      );

      lines.push(`  ${"Account".padEnd(acctWidth)}  Dr      Cr`);
      lines.push("  " + "-".repeat(acctWidth + 14));

      for (const p of je.postings) {
        const dr = p.side === "Debit" ? p.amount.toString() : "";
        const cr = p.side === "Credit" ? p.amount.toString() : "";
        lines.push(
          `  ${p.account.name.padEnd(acctWidth)}  ${dr.padStart(6)}  ${cr.padStart(6)}`
        );
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  // =========================================================
  // CHART OF ACCOUNTS
  // =========================================================

  /**
   * Pretty-print the chart of accounts sorted by GAAP category.
   * @returns {string}
   */
  printChartOfAccounts() {
    const ledger = this.ledger;
    const lines = [];

    lines.push("CHART OF ACCOUNTS");
    lines.push("=================");
    lines.push("");

    /** @type {Record<GaapAccountTypeName, GaapAccount[]>} */
    const groups = {
      Asset: [],
      Liability: [],
      Equity: [],
      Income: [],
      Expense: [],
    };

    for (const acct of ledger.accounts) {
      const typeName = GaapAccountType.toName(acct.type);
      groups[typeName].push(acct);
    }

    for (const [type, accounts] of Object.entries(groups)) {
      lines.push(type.toUpperCase());
      lines.push("-".repeat(type.length));

      const sorted = accounts.sort((a, b) => a.name.localeCompare(b.name));

      if (sorted.length === 0) {
        lines.push("  (none)");
      } else {
        for (const acct of sorted) {
          const cash = acct.isCashAccount ? " (cash)" : "";
          lines.push(
            `  ${acct.id.toString().padStart(3)}  ${acct.name}${cash}`
          );
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }
}

// Export for Node tests
export {
  GaapAccountTypeNames,
  GaapAccountType,
  GAAP_NORMAL_BALANCE_BY_TYPE,
  GaapAccount,
  GaapPostingSide,
  GaapPostingBuilder,
  GaapPosting,
  GaapJournalEntry,
  GaapJournalEntryBuilder,
  GaapLedger,
  GaapMacros,
  GaapOutputGenerator,
  // ...anything else you need in tests
};
