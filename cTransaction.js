// const TRANSACTION_TYPE = Object.freeze({
//   DEPOSIT: "deposit",
//   WITHDRAWAL: "withdrawal",
// });

import { EnumBase } from "./cEnum.js";

// const TRANSACTION_CATEGORY = Object.freeze({
//   INTEREST: "Interest",
//   DISBURSEMENT: "Disbursement",
//   RMD: "RMD",
//   OVERAGE: "Overage",
//   SHORTAGE: "Shortage",
//   TRANSFER: "Transfer",
//   CONTRIBUTION: "Contribution",
//   INCOME: "Income",
//   TAXES: "Taxes",
//   SPEND: "Spend",
//   SAVINGS: "Income from Savings",
//   TRAD_401K: "Income from 401k",
//   TRAD_ROTH: "Income from Roth IRA",
//   OTHER_TAXABLE_INCOME: "Other Taxable Income",
//   OTHER_NON_TAXABLE: "Other Non-Taxable Income",
//   SOCIAL_SEC: "Income from Social Security",
//   PENSION: "Income from Pensions",
//   TAX_REFUND: "Tax Refund",
//   TAX_PAYMENT: "Tax Payment",
// });

// -------------------------------------------------------------
// TRANSACTION TYPE ENUM
// -------------------------------------------------------------

const TransactionTypeNames = /** @type {const} */ ({
  Deposit: "deposit",
  Withdrawal: "withdrawal",
});

/**
 * @typedef {typeof TransactionTypeNames[keyof typeof TransactionTypeNames]} TransactionTypeName
 */

class TransactionTypeEnum extends EnumBase {
  constructor() {
    super("TransactionType", Object.values(TransactionTypeNames));
  }

  get Deposit() {
    return this.map.deposit;
  }

  get Withdrawal() {
    return this.map.withdrawal;
  }

  /**
   * @param {symbol} sym
   * @returns {TransactionTypeName}
   */
  toName(sym) {
    const name = super.toName(sym);
    if (!name) throw new Error(`Invalid TransactionType symbol: ${String(sym)}`);
    return /** @type {TransactionTypeName} */ (name);
  }
}

const TransactionType = new TransactionTypeEnum();

/**
 * @typedef {typeof TransactionType.Deposit
 *         | typeof TransactionType.Withdrawal} TransactionTypeSymbol
 */


// -------------------------------------------------------------
// TRANSACTION CATEGORY ENUM
// -------------------------------------------------------------

const TransactionCategoryNames = /** @type {const} */ ({
  Interest: "Interest",
  Disbursement: "Disbursement",
  RMD: "RMD",
  Overage: "Overage",
  Shortage: "Shortage",
  Transfer: "Transfer",
  Contribution: "Contribution",
  Income: "Income",
  Taxes: "Taxes",
  Spend: "Spend",
  Savings: "Income from Savings",
  Trad401k: "Income from 401k",
  TradRoth: "Income from Roth IRA",
  OtherTaxableIncome: "Other Taxable Income",
  OtherNonTaxable: "Other Non-Taxable Income",
  SocialSecurity: "Income from Social Security",
  Pension: "Income from Pensions",
  TaxRefund: "Tax Refund",
  TaxPayment: "Tax Payment",
});

/**
 * @typedef {typeof TransactionCategoryNames[keyof typeof TransactionCategoryNames]} TransactionCategoryName
 */

class TransactionCategoryEnum extends EnumBase {
  constructor() {
    super("TransactionCategory", Object.values(TransactionCategoryNames));
  }

  get Interest() {
    return this.map["Interest"];
  }

  get Disbursement() {
    return this.map["Disbursement"];
  }

  get RMD() {
    return this.map["RMD"];
  }

  get Overage() {
    return this.map["Overage"];
  }

  get Shortage() {
    return this.map["Shortage"];
  }

  get Transfer() {
    return this.map["Transfer"];
  }

  get Contribution() {
    return this.map["Contribution"];
  }

  get Income() {
    return this.map["Income"];
  }

  get Taxes() {
    return this.map["Taxes"];
  }

  get Spend() {
    return this.map["Spend"];
  }

  get Savings() {
    return this.map["Income from Savings"];
  }

  get Trad401k() {
    return this.map["Income from 401k"];
  }

  get TradRoth() {
    return this.map["Income from Roth IRA"];
  }

  get OtherTaxableIncome() {
    return this.map["Other Taxable Income"];
  }

  get OtherNonTaxable() {
    return this.map["Other Non-Taxable Income"];
  }

  get SocialSecurity() {
    return this.map["Income from Social Security"];
  }

  get Pension() {
    return this.map["Income from Pensions"];
  }

  get TaxRefund() {
    return this.map["Tax Refund"];
  }

  get TaxPayment() {
    return this.map["Tax Payment"];
  }

  // (others optional — same as GaapAccountType)

  /**
   * @param {symbol | undefined | null} sym
   * @returns {string | undefined}
   */
  toName(sym) {

    if (sym === undefined || sym === null) {
      return undefined;
    }

    const name = super.toName(sym);
    if (!name)
      throw new Error(`Invalid TransactionCategory symbol: ${String(sym)}`);
    return /** @type {TransactionCategoryName} */ (name);
  }
}

const TransactionCategory = new TransactionCategoryEnum();

/**
 * @typedef {typeof TransactionCategory.Interest
 *         | typeof TransactionCategory.Disbursement
 *         | typeof TransactionCategory.RMD
 *         | typeof TransactionCategory.Overage
 *         | typeof TransactionCategory.Shortage
 *         | typeof TransactionCategory.Transfer
 *         | typeof TransactionCategory.Contribution
 *         | typeof TransactionCategory.Income
 *         | typeof TransactionCategory.Taxes
 *         | typeof TransactionCategory.Spend
 *         | typeof TransactionCategory.Savings
 *         | typeof TransactionCategory.Trad401k
 *         | typeof TransactionCategory.TradRoth
 *         | typeof TransactionCategory.OtherTaxableIncome
 *         | typeof TransactionCategory.OtherNonTaxable
 *         | typeof TransactionCategory.SocialSecurity
 *         | typeof TransactionCategory.Pension
 *         | typeof TransactionCategory.TaxRefund
 *         | typeof TransactionCategory.TaxPayment
 *         } TransactionCategorySymbol
 */






// /**
//  * @typedef {typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE]} TransactionType
//  */

// /**
//  * @typedef {typeof TRANSACTION_CATEGORY[keyof typeof TRANSACTION_CATEGORY]} TransactionCategory
//  */

// /**
//  * Helper function to check if a value is a valid transaction type
//  * @param {string} value
//  * @returns {boolean}
//  */
// function isValidTransactionType(value) {
//   return /** @type {string[]} */ (Object.values(TRANSACTION_TYPE)).includes(
//     value
//   );
// }

// /**
//  * Helper function to check if a value is a valid transaction category
//  * @param {string} value
//  * @returns {boolean}
//  */
// function isValidTransactionCategory(value) {
//   return /** @type {string[]} */ (Object.values(TRANSACTION_CATEGORY)).includes(
//     value
//   );
// }

class Transaction {
  /** @type {number} */
  #amount;
  /** @type {TransactionTypeSymbol} */
  #transactionType;
  /** @type {TransactionCategorySymbol} */
  #category;
  /** @type {string | null} */
  #memo;
  /** @type {Date} */
  #date;

  toJSON() {
    return {
      amount: this.#amount,
      transactionType: this.#transactionType,
      category: this.#category,
      memo: this.#memo,
      date: this.#date,
    };
  }

  get amount() {
    return this.#amount;
  }

  get transactionType() {
    return this.#transactionType;
  }

  get category() {
    return this.#category;
  }

  get memo() {
    return this.#memo;
  }

  get date() {
    return this.#date;
  }

  /**
   * @param {number} amount - The amount of the transaction
   * @param {TransactionTypeSymbol} transactionType - The type of transaction
   * @param {TransactionCategorySymbol} category - The category of the transaction
   * @param {Date} [date] - Transaction date, defaults to current date
   * @param {string | null} [memo] - The party associated with the transaction
   */
  constructor(
    amount,
    transactionType,
    category,
    date = new Date(),
    memo = null
  ) {
    if (!TransactionType.values().includes(transactionType)) {
      throw new Error("Invalid TransactionType");
    }
    if (!TransactionCategory.values().includes(category)) {
      throw new Error("Invalid TransactionCategory");
    }
    if (amount <= 0) {
      throw new Error("Transaction amounts must always be positive and non-zero.");
    }
    this.#amount = amount;
    this.#transactionType = transactionType;
    this.#category = category;
    this.#memo = memo;
    this.#date = date;
  }
}

export { Transaction, TransactionType, TransactionCategory };
// export { isValidTransactionType, isValidTransactionCategory };
