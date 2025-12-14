// -------------------------------------------------------------
// ANALYZER RETURN TYPES
// -------------------------------------------------------------

import { GaapAccount, GaapLedger, GaapAccountType } from "./cGaap.js";

/**
 * @typedef {object} GaapAccountActivity
 * @property {Date} date
 * @property {string} description
 * @property {import("./cGaap").GaapPostingSideName} side
 * @property {number} amount
 * @property {number} journalEntryId
 */

/**
 * @typedef {object} GaapBalanceSheetLine
 * @property {GaapAccount} account
 * @property {number} balance
 */

/**
 * @typedef {object} GaapBalanceSheetStatement
 * @property {Date} date
 * @property {GaapBalanceSheetLine[]} assets
 * @property {GaapBalanceSheetLine[]} liabilities
 * @property {GaapBalanceSheetLine[]} equity
 * @property {{assets:number, liabilities:number, equity:number, balanceCheck:number}} totals
 */

/**
 * @typedef {object} GaapIncomeStatementLine
 * @property {GaapAccount} account
 * @property {number} amount
 */

/**
 * @typedef {object} GaapIncomeStatement
 * @property {Date} start
 * @property {Date} end
 * @property {GaapIncomeStatementLine[]} income
 * @property {GaapIncomeStatementLine[]} expenses
 * @property {{income:number, expenses:number, netIncome:number}} totals
 */

/**
 * @typedef {object} GaapCashFlowStatement
 * @property {Date} start
 * @property {Date} end
 * @property {number} operating
 * @property {number} investing
 * @property {number} financing
 * @property {number} netCashChange
 */

/**
 * @typedef {object} GaapTrialBalanceLine
 * @property {GaapAccount} account
 * @property {number} balance
 * @property {import("./cGaap").GaapAccountTypeName} type
 */

/**
 * @typedef {object} GaapJournalEntrySummaryPosting
 * @property {GaapAccount} account
 * @property {import("./cGaap").GaapPostingSideName} side
 * @property {number} amount
 */

/**
 * @typedef {object} GaapJournalEntrySummary
 * @property {number} id
 * @property {Date} date
 * @property {string} description
 * @property {GaapJournalEntrySummaryPosting[]} postings
 */

// -------------------------------------------------------------
// GAAP ANALYZER (Pure Data Analysis Layer)
// -------------------------------------------------------------

class GaapAnalyzer {
  /**
   * @param {GaapLedger} ledger
   */
  constructor(ledger) {
    if (!(ledger instanceof GaapLedger)) {
      throw new Error("GaapAnalyzer requires a GaapLedger instance");
    }
    this.ledger = ledger;
  }

  // ============================================================
  // ACCOUNT ACTIVITY + BALANCE LOGIC
  // ============================================================

  /**
   * Return all postings for a given account (chronological, unformatted).
   * @param {GaapAccount} account
   * @returns {GaapAccountActivity[]}
   */
  getAccountActivity(account) {
    return this.ledger.journalEntries.flatMap((je) =>
      je.postings
        .filter((p) => p.account.id === account.id)
        .map((p) => ({
          date: je.date,
          description: je.description,
          side: p.side,
          amount: p.amount,
          journalEntryId: je.id,
        }))
    );
  }

  /**
   * Balance of account up to and including a given date.
   * @param {GaapAccount} account
   * @param {Date} asOf
   * @returns {number}
   */
  getAccountBalanceAsOf(account, asOf) {
    const entries = this.getAccountActivity(account).filter(
      (e) => e.date <= asOf
    );
    return entries.reduce((bal, e) => bal + account.apply(e.side, e.amount), 0);
  }

  /**
   * Net change in account during a period.
   * @param {GaapAccount} account
   * @param {Date} start
   * @param {Date} end
   * @returns {number}
   */
  getAccountChange(account, start, end) {
    const entries = this.getAccountActivity(account).filter(
      (e) => e.date >= start && e.date <= end
    );
    return entries.reduce((bal, e) => bal + account.apply(e.side, e.amount), 0);
  }

  // ============================================================
  // BALANCE SHEET
  // ============================================================

  /**
   * Build a complete GAAP Balance Sheet
   * @param {Date} asOf
   * @returns {GaapBalanceSheetStatement}
   */
  getBalanceSheet(asOf) {
    const assets = [];
    const liabilities = [];
    const equity = [];

    for (const acct of this.ledger.accounts) {
      const bal = this.getAccountBalanceAsOf(acct, asOf);
      const typeName = GaapAccountType.toName(acct.type);

      if (typeName === "Asset") assets.push({ account: acct, balance: bal });
      else if (typeName === "Liability")
        liabilities.push({ account: acct, balance: bal });
      else if (typeName === "Equity")
        equity.push({ account: acct, balance: bal });
    }

    const totalAssets = assets.reduce((s, x) => s + x.balance, 0);
    const totalLiabilities = liabilities.reduce((s, x) => s + x.balance, 0);
    const totalEquity = equity.reduce((s, x) => s + x.balance, 0);

    return {
      date: asOf,
      assets,
      liabilities,
      equity,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        balanceCheck: totalAssets - totalLiabilities - totalEquity,
      },
    };
  }

  // ============================================================
  // INCOME STATEMENT
  // ============================================================

  /**
   * Build a GAAP Income Statement for the given period.
   * @param {Date} start
   * @param {Date} end
   * @returns {GaapIncomeStatement}
   */
  getIncomeStatement(start, end) {
    const income = [];
    const expenses = [];

    for (const acct of this.ledger.accounts) {
      const type = GaapAccountType.toName(acct.type);
      const amt = this.getAccountChange(acct, start, end);

      if (type === "Income") income.push({ account: acct, amount: amt });
      else if (type === "Expense")
        expenses.push({ account: acct, amount: amt });
    }

    const totalIncome = income.reduce((s, x) => s + x.amount, 0);
    const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);

    return {
      start,
      end,
      income,
      expenses,
      totals: {
        income: totalIncome,
        expenses: totalExpenses,
        netIncome: totalIncome - totalExpenses,
      },
    };
  }

  // ============================================================
  // CASH FLOW STATEMENT
  // ============================================================

  /**
   * Wrapper around GaapLedger.getCashFlowStatement.
   * @param {Date} start
   * @param {Date} end
   * @returns {GaapCashFlowStatement}
   */
  getCashFlowStatement(start, end) {
    const cfs = this.ledger.getCashFlowStatement(start, end);

    return {
      start,
      end,
      operating: cfs.operating,
      investing: cfs.investing,
      financing: cfs.financing,
      netCashChange: cfs.netCashChange,
    };
  }

  // ============================================================
  // TRIAL BALANCE
  // ============================================================

  /**
   * Build a Trial Balance snapshot.
   * @param {Date} asOf
   * @returns {GaapTrialBalanceLine[]}
   */
  getTrialBalance(asOf) {
    return this.ledger.accounts.map((acct) => ({
      account: acct,
      balance: this.getAccountBalanceAsOf(acct, asOf),
      type: GaapAccountType.toName(acct.type),
    }));
  }

  // ============================================================
  // JOURNAL ENTRY SUMMARIES
  // ============================================================

  /**
   * All journal entries in structured form.
   * @returns {GaapJournalEntrySummary[]}
   */
  getJournalSummary() {
    return this.ledger.journalEntries.map((je) => ({
      id: je.id,
      date: je.date,
      description: je.description,
      postings: je.postings.map((p) => ({
        account: p.account,
        side: p.side,
        amount: p.amount,
      })),
    }));
  }

  /**
   * Journal entries filtered by date range.
   * @param {Date} start
   * @param {Date} end
   * @returns {GaapJournalEntrySummary[]}
   */
  getJournalSummaryBetween(start, end) {
    return this.getJournalSummary().filter(
      (e) => e.date >= start && e.date <= end
    );
  }
}

export { GaapAnalyzer };
