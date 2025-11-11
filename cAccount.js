class ACCOUNT_TYPES {}
ACCOUNT_TYPES.SAVINGS = "savings";
ACCOUNT_TYPES.TRAD_401K = "trad401k";
ACCOUNT_TYPES.TRAD_ROTH = "rothIra";
ACCOUNT_TYPES.REVENUE = "revenue";
ACCOUNT_TYPES.DISBURSEMENT = "disbursement";

// Create a class for the account
class Account {
  /** @type {Transaction[]} */
  #transactions = [];

  /** @type {string} */
  #name = "";

  /** @type {number} */
  #initialBalance = 0;

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
        if (tx.transactionType === TRANSACTION_TYPE.DEPOSIT) {
          startingBalance += tx.amount;
        } else if (tx.transactionType === TRANSACTION_TYPE.WITHDRAWAL) {
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
        if (tx.transactionType === TRANSACTION_TYPE.DEPOSIT) {
          endingBalance += tx.amount;
        } else if (tx.transactionType === TRANSACTION_TYPE.WITHDRAWAL) {
          endingBalance -= tx.amount;
        }
      } else if (tx.date.getFullYear() > yyyy) {
        break; // Future transactions don't affect the current year's ending balance
      }
    }
    return endingBalance;
  }

  /**
   * @param {string} name - Name of the account
   * @param {number} initialBalance - Initial balance of the account
   * @param {number} interestRate - Annual interest rate as a decimal (e.g., 0.05 for 5%)
   */
  constructor(name, initialBalance, interestRate) {
    // Validate that name matches one of the ACCOUNT_TYPES values
    const validAccountTypes = Object.values(ACCOUNT_TYPES);
    if (!validAccountTypes.includes(name)) {
      throw new Error(
        `Invalid account type: ${name}. Must be one of: ${validAccountTypes.join(", ")}`
      );
    }

    this.#name = name;
    this.#initialBalance = initialBalance;
    this.#interestRate = interestRate; // Annual interest rate as a decimal (e.g., 0.05 for 5%)
  }

  get name() {
    return this.#name;
  }

  get initialBalance() {
    return this.#initialBalance.asCurrency();
  }

  get interestRate() {
    return this.#interestRate;
  }

  /**
   * @param {number} amount
   * @param {string} category
   * @param {number} yyyy
   * @param {string} [party]
   */
  deposit(amount, category, yyyy, party = "") {
    if (amount < 0) {
      throw new Error("Deposit amount must be positive.");
    }
    this.#transactions.push(
      new Transaction(
        amount,
        TRANSACTION_TYPE.DEPOSIT,
        category,
        new Date(yyyy, 0, 1), // Set to January 1st of the given year
        party
      )
    );

    return amount.asCurrency();
  }

  /**
   * @param {number} amount - Amount to withdraw
   * @param {string} category - Category of the withdrawal
   * @param {number} yyyy - Year of the withdrawal
   * @param {string} [party] - Optional party associated with the withdrawal
   */
  withdrawal(amount, category, yyyy, party = "") {
    if (amount < 0) {
      throw new Error("Withdrawal amount must be positive.");
    }
    const withdrawalAmount = Math.min(amount, this.#endingBalanceForYear(yyyy));
    if (withdrawalAmount < amount) {
      console.warn(
        `Requested withdrawal of ${amount} exceeds available balance. Withdrawing only ${withdrawalAmount}.`
      );
    }
    this.#transactions.push(
      new Transaction(
        withdrawalAmount,
        TRANSACTION_TYPE.WITHDRAWAL,
        category,
        new Date(yyyy, 0, 1), // Set to January 1st of the given year
        party
      )
    );

    return withdrawalAmount.asCurrency();
  }

  // Method to calculate interest earned over a year
  /**
   * @param {string} intensity
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
    }
    return interestEarned.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {string | undefined} [category = ""]
   * @param {string | undefined} [party = ""]
   */
  depositsForYear(yyyy, category = "", party = "") {
    const transactions = this.#transactions.filter(
      (tx) =>
        tx.transactionType === TRANSACTION_TYPE.DEPOSIT &&
        tx.date.getFullYear() === yyyy &&
        (category === "" ? true : tx.category === category) &&
        (party === "" ? true : tx.party === party)
    );
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return total.asCurrency();
  }

  /**
   * @param {number} yyyy
   * @param {string | undefined} [category = ""]
   */
  withdrawalsForYear(yyyy, category = "") {
    const transactions = this.#transactions.filter(
      (tx) =>
        tx.transactionType === TRANSACTION_TYPE.WITHDRAWAL &&
        tx.date.getFullYear() === yyyy &&
        (category === "" ? true : tx.category === category)
    );
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return total.asCurrency();
  }

  /**
   * @param {number} yyyy
   */
  transactionsForYear(yyyy, type = "") {
    return this.#transactions.filter((tx) =>
      tx.date.getFullYear() === yyyy && type === ""
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
   * @param {string} accountName
   */
  static Empty(accountName) {
    return new Account(accountName, 0, 0);
  }
}
