/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 */

import { TransactionCategory } from "./cTransaction.js";
import { DateFunctions } from "./utils.js";

class AccountRegisterEntry {
  /**
   * @param {Date} transactionDate
   * @param {string | null} memo
   * @param {number | null} withdrawal
   * @param {number | null} deposit
   * @param {number} balance
   */
  constructor(transactionDate, memo, withdrawal, deposit, balance) {
    this.transactionDate = transactionDate;
    this.memo = memo;
    this.withdrawal = withdrawal;
    this.deposit = deposit;
    this.balance = balance;
  }
}

class AccountRegister {
  /** @type {AccountRegisterEntry[]} */
  #entries;

  /** @type {number} */
  #startingBalance = 0;

  /** @type {number} */
  #endingBalance = 0;

  /**
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {TransactionCategorySymbol | null  } category
   */
  constructor(startDate, endDate, category) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.category = category;
    this.#entries = [];
  }

  /**
   * @param {Date} date
   * @param {string | null} memo
   * @param {number | null} amount
   * @param {number} balance
   */
  addDeposit(date, memo, amount, balance) {
    const entry = new AccountRegisterEntry(date, memo, null, amount, balance);
    this.#entries.push(entry);
  }

  /**
   * @param {Date} date
   * @param {string | null} memo
   * @param {number | null} amount
   * @param {number} balance
   */
  addWithdrawal(date, memo, amount, balance) {
    const entry = new AccountRegisterEntry(date, memo, amount, null, balance);
    this.#entries.push(entry);
  }

  /**
   * @param {Date} date
   * @param {number} balance
   * @param {string} [memo]
   */
  addBalanceUpdate(date, balance, memo = "") {
    const entry = new AccountRegisterEntry(date, memo, null, null, balance);
    this.#entries.push(entry);
  }

  /**
   * @param {number} value
   */
  set startingBalance(value) {
    this.#startingBalance = value;
    this.#entries.unshift(
      new AccountRegisterEntry(
        DateFunctions.addDays(this.startDate, -1),
        "Starting Balance",
        null,
        null,
        value
      )
    );
  }

  get startingBalance() {
    return this.#startingBalance;
  }

  /**
   * @param {number} value
   */
  set endingBalance(value) {
    this.#endingBalance = value;
    this.#entries.push(
      new AccountRegisterEntry(
        this.endDate,
        "Ending Balance",
        null,
        null,
        value
      )
    );
  }

  get endingBalance() {
    return this.#endingBalance;
  }

  get entries() {
    // return a copy to prevent external mutation
    return this.#entries.slice();
  }
}

class AccountRegisterFormatter {
  /**
   * @param {AccountRegister} accountRegister
   * @returns {string[][]} - 2D array representing the register
   */
  static formatAsTable(accountRegister) {
    const table = [];
    // Header row
    table.push(["Date", "Memo", "Withdrawal", "Deposit", "Balance"]);

    for (const entry of accountRegister.entries) {
      table.push([
        entry.transactionDate.toISOString().split("T")[0],
        entry.memo ?? "",
        entry.withdrawal?.asCurrency().toString() ?? "",
        entry.deposit?.asCurrency().toString() ?? "",
        entry.balance.asCurrency().toString(),
      ]);
    }

    return table;
  }

  /**
   * @param {AccountRegister} accountRegister
   */
  static dumpRegisterToConsole(accountRegister) {
    // Enhanced debug output with proper alignment
    console.log("Category:", TransactionCategory.toName(accountRegister.category) ?? "All Categories");
    console.log(
      "Period:",
      DateFunctions.formatDateYYYYMMDD(accountRegister.startDate),
      "to",
      DateFunctions.formatDateYYYYMMDD(accountRegister.endDate)
    );
    console.log("=".repeat(80));

    // Column headers with proper spacing
    const dateCol = "Date".padEnd(12);
    const memoCol = "Description".padEnd(25);
    const depositCol = "Deposit".padStart(15);
    const withdrawalCol = "Withdrawal".padStart(15);
    const balanceCol = "Balance ".padStart(13);

    console.log(
      `${dateCol}${memoCol}${depositCol}${withdrawalCol}${balanceCol}`
    );
    console.log("-".repeat(80));

    // Format each entry with consistent column widths
    for (const entry of accountRegister.entries) {
      const date = DateFunctions.formatDateYYYYMMDD(
        entry.transactionDate
      ).padEnd(12);
      let memo = entry.memo ?? "";
      memo = memo.length > 25 ? memo.substring(0, 22) + "..." : memo.padEnd(25);
      const deposit = (entry.deposit?.toFixed(2) ?? "").padStart(15);
      const withdrawal = (entry.withdrawal?.toFixed(2) ?? "").padStart(15);
      const balance = entry.balance.toFixed(2).padStart(13);
      console.log(`${date}${memo}${deposit}${withdrawal}${balance}`);
    }

    console.log("-".repeat(80));
    console.log(
      `${"Final Balance:".padEnd(42)}${accountRegister.endingBalance.toFixed(2).padStart(38)}`
    );
    console.log("=".repeat(80));
  }
}

export { AccountRegister, AccountRegisterEntry, AccountRegisterFormatter };
