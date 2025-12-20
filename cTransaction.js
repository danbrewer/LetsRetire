const TRANSACTION_TYPE = Object.freeze({
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
});

const TRANSACTION_CATEGORY = Object.freeze({
  INTEREST: "Interest",
  DISBURSEMENT: "Disbursement",
  RMD: "RMD",
  OVERAGE: "Overage",
  SHORTAGE: "Shortage",
  TRANSFER: "Transfer",
  CONTRIBUTION: "Contribution",
  INCOME: "Income",
  TAXES: "Taxes",
  SPEND: "Spend",
  SAVINGS: "Income from Savings",
  TRAD_401K: "Income from 401k",
  TRAD_ROTH: "Income from Roth IRA",
  OTHER_TAXABLE_INCOME: "Other Taxable Income",
  OTHER_NON_TAXABLE: "Other Non-Taxable Income",
  SOCIAL_SEC: "Income from Social Security",
  PENSION: "Income from Pensions",
  TAX_REFUND: "Tax Refund",
  TAX_PAYMENT: "Tax Payment",
});

/**
 * Helper function to check if a value is a valid transaction type
 * @param {string} value
 * @returns {boolean}
 */
function isValidTransactionType(value) {
  return /** @type {string[]} */ (Object.values(TRANSACTION_TYPE)).includes(
    value
  );
}

/**
 * Helper function to check if a value is a valid transaction category
 * @param {string} value
 * @returns {boolean}
 */
function isValidTransactionCategory(value) {
  return /** @type {string[]} */ (Object.values(TRANSACTION_CATEGORY)).includes(
    value
  );
}

class Transaction {
  #amount;
  #transactionType;
  #category;
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
   * @param {string} [transactionType] - The type of transaction
   * @param {string} [category] - The category of the transaction
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
    if (transactionType && !isValidTransactionType(transactionType)) {
      throw new Error(
        `Invalid transaction type: ${transactionType}. Must be one of ${Object.values(TRANSACTION_TYPE).join(", ")}.`
      );
    }
    if (category && !isValidTransactionCategory(category)) {
      throw new Error(
        `Invalid category: ${category}. Must be one of ${Object.values(TRANSACTION_CATEGORY).join(", ")}.`
      );
    }
    this.#amount = amount;
    this.#transactionType = transactionType;
    this.#category = category;
    this.#memo = memo;
    this.#date = date;
  }
}

export { Transaction, TRANSACTION_TYPE, TRANSACTION_CATEGORY };
export { isValidTransactionType, isValidTransactionCategory };
