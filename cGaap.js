// @ts-check

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
 *
 * @typedef {typeof GaapAccountTypeNames[keyof typeof GaapAccountTypeNames]} GaapAccountTypeName
 */

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
 * @enum {symbol}
 */
const GaapNormalBalance = Object.freeze({
  Debit: Symbol("Debit"),
  Credit: Symbol("Credit"),
});

/** @enum {symbol} */
const GaapTransactionSide = Object.freeze({
  Debit: Symbol("debit"),
  Credit: Symbol("credit"),
});

/**
 * @type {Record<GaapAccountTypeName, GaapNormalBalance>}
 */
const GAAP_NORMAL_BALANCE_BY_TYPE = Object.freeze({
  Asset: GaapNormalBalance.Debit,
  Expense: GaapNormalBalance.Debit,
  Liability: GaapNormalBalance.Credit,
  Equity: GaapNormalBalance.Credit,
  Income: GaapNormalBalance.Credit,
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
    if (
      account.type === GaapAccountType.Asset ||
      account.type === GaapAccountType.Expense
    )
      return this.#debit(account, amount);
    return this.#credit(account, amount);
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  withdraw(account, amount) {
    if (
      account.type === GaapAccountType.Asset ||
      account.type === GaapAccountType.Expense
    )
      return this.#credit(account, amount);
    return this.#debit(account, amount);
  }

  /**
   * @param {GaapAccount} account
   * @param {number} amount
   */
  #debit(account, amount) {
    this.postings.push({
      accountId: account.id,
      side: GaapTransactionSide.Debit,
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
      side: GaapTransactionSide.Credit,
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
 * @property {GaapTransactionSide} side
 */

// -------------------------------------------------------------
// TRANSACTION
// -------------------------------------------------------------

class GaapTransaction {
  /**
   * @param {Date} date
   * @param {string} description
   * @param {GaapPosting[]} postings
   */
  constructor(date, description, postings) {
    if (!(date instanceof Date)) throw new Error("Date required");
    if (!Array.isArray(postings) || postings.length < 2)
      throw new Error("Transaction must have 2+ postings");

    for (const p of postings) {
      if (p.amount < 0) throw new Error("Amounts must be >= 0");
    }

    const debits = postings
      .filter((p) => p.side === GaapTransactionSide.Debit)
      .reduce((a, b) => a + b.amount, 0);
    const credits = postings
      .filter((p) => p.side === GaapTransactionSide.Credit)
      .reduce((a, b) => a + b.amount, 0);

    if (debits !== credits)
      throw new Error("Transaction unbalanced: debits !== credits");

    /** @type {number} */
    this.id = nextGaapId();
    /** @type {Date} */
    this.date = date;
    /** @type {string} */
    this.description = description;
    /** @type {GaapPosting[]} */
    this.postings = postings;
  }
}

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
    this.normalBalance = GAAP_NORMAL_BALANCE_BY_TYPE[GaapAccountType.toName(type)];
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
   * @param {GaapTransactionSide} side
   * @param {number} amount
   */
  apply(side, amount) {
    const increase =
      (side === GaapTransactionSide.Debit &&
        this.normalBalance === GaapNormalBalance.Debit) ||
      (side === GaapTransactionSide.Credit &&
        this.normalBalance === GaapNormalBalance.Credit);

    return increase ? amount : -amount;
  }

  /**
   * @param {GaapJournalEntry[]} journalEntries
   * @returns {number}
   */
  #getBalance(journalEntries) {
    const postings = journalEntries
      .flatMap((je) => je.transactions)
      .flatMap((txn) => txn.postings)
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
   * @param {GaapTransaction[]} transactions
   */
  constructor(date, description, transactions) {
    this.date = date;
    this.description = description;
    this.transactions = transactions;
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
   * @param {GaapTransaction[]} transactions
   */
  record(date, description, transactions) {
    const journalEntry = new GaapJournalEntry(date, description, transactions);
    this.journalEntries.push(journalEntry);
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

    const transactions = this.journalEntries
      .filter((je) => je.date <= asOf)
      .flatMap((je) => je.transactions);

    for (const txn of transactions) {
      for (const p of txn.postings) {
        if (p.accountId === account.id) {
          balance += account.apply(p.side, p.amount);
        }
      }
    }

    return balance;
  }

  /**
    * Compute net activity in account between dates

    * @param {Number} accountId
    * @param {Date} start
    * @param {Date} end
    */
  _accountActivityBetween(accountId, start, end) {
    // Get all transactions in date range
    const transactions = this.journalEntries
      .filter((je) => je.date >= start && je.date <= end)
      .flatMap((je) => je.transactions);

    // Get all postings for the accountId
    const postings = transactions.flatMap((t) =>
      t.postings.filter((p) => p.accountId === accountId)
    );

    // Sum up all posting amounts for the account
    const amt = postings.reduce((sum, p) => {
      const account = this.accounts.find((a) => a.id === p.accountId);
      if (!account) return sum;
      return sum + account.apply(p.side, p.amount);
    }, 0);

    return amt;
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

  // ---------------------------------------------------------
  // STATEMENT OF CASH FLOWS (PERIOD)
  // ---------------------------------------------------------
  /**
   * @param {Date} startDate
   * @param {Date} endDate
   */
  getCashFlowStatement(startDate, endDate) {
    // First: identify the cash account(s)
    const cashAccountIds = this.accounts
      .filter((a) => a.name.toLowerCase().includes("cash"))
      .map((a) => a.id);

    if (cashAccountIds.length === 0) {
      throw new Error("No cash account found. Name must include 'Cash'.");
    }

    // Combined cash flow from all cash accounts
    let netCashChange = 0;
    for (const cashAcctId of cashAccountIds) {
      netCashChange += this._accountActivityBetween(
        cashAcctId,
        startDate,
        endDate
      );
    }

    const isCashAccount = (/** @type {Number} */ accId) =>
      cashAccountIds.includes(accId);

    // Classify inflows/outflows by account type
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

    const entriesAffectingCash = this.journalEntries
      .filter((je) => je.date >= startDate && je.date <= endDate)
      .filter((je) =>
        je.transactions.some((txn) =>
          txn.postings.some((p) => isCashAccount(p.accountId))
        )
      );

    for (const je of entriesAffectingCash) {
      //   for (const p of txn.postings.filter((p) => isCashAccount(p.accountId))) {
      // Find the OTHER side(s) of the posting
      const otherPostings = je.transactions
        .flatMap((t) => t.postings)
        .filter((p) => isCashAccount(p.accountId) == false);
      for (const otherPosting of otherPostings) {
        const account = this.accounts.find(
          (a) => a.id === otherPosting.accountId
        );
        if (!account) continue;

        // Classify based on account type
        const delta = account.apply(otherPosting.side, otherPosting.amount);

        if (isOperating(account)) operating += delta;
        else if (isInvesting(account)) investing += delta;
        else if (isFinancing(account)) financing += delta;
      }
      //   }
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
