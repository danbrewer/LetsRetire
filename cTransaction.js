const TRANSACTION_TYPE = Object.freeze({
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
});

const TRANSACTION_CATEGORY = Object.freeze({
  INTEREST: "interest",
  DISBURSEMENT: "disbursement",
  RMD: "rmd",
  OVERAGE: "overage",
  SHORTAGE: "shortage",
  TRANSFER: "transfer",
  CONTRIBUTION: "contribution",
  INCOME: "income",
  TAXES: "taxes",
  SPEND: "spend",
  SAVINGS: "income_from_savings",
  TRAD_401K: "income_from_401k",
  TRAD_ROTH: "income_from_roth",
  OTHER_TAXABLE_INCOME: "other_taxable_income",
  OTHER_NON_TAXABLE: "other_non_taxable_income",
  SOCIAL_SEC: "income_from_ss",
  PENSION: "income_from_pensions",
  TAX_REFUND: "tax_refund",
  TAX_PAYMENT: "tax_payment",
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
  #party;
  /** @type {Date} */
  #date;

  toJSON() {
    return {
      amount: this.#amount,
      transactionType: this.#transactionType,
      category: this.#category,
      party: this.#party,
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

  get party() {
    return this.#party;
  }

  get date() {
    return this.#date;
  }

  /**
   * @param {number} amount - The amount of the transaction
   * @param {string} [transactionType] - The type of transaction
   * @param {string} [category] - The category of the transaction
   * @param {Date} [date] - Transaction date, defaults to current date
   * @param {string} [party] - The party associated with the transaction
   */
  constructor(
    amount,
    transactionType,
    category,
    date = new Date(),
    party = ""
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
    this.#party = party;
    this.#date = date;
  }
}

export { Transaction, TRANSACTION_TYPE, TRANSACTION_CATEGORY };
export { isValidTransactionType, isValidTransactionCategory };