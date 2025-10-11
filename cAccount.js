// Create a class for the account
class Account {
  #transactions = [];
  #name = "";
  #initialBalance = 0;
  #interestRate = 0; // Annual interest rate as a decimal (e.g., 0.05 for 5%)

  #startingBalanceForYear(yyyy) {
    let startingBalance = this.initialBalance;
    for (const tx of this.#transactions.sort((a, b) => a.date - b.date)) {
      if (tx.date.getFullYear() < yyyy) {
        if (tx.type === TransactionType.DEPOSIT) {
          startingBalance += tx.amount;
        } else if (tx.type === TransactionType.WITHDRAWAL) {
          startingBalance -= tx.amount;
        }
      } else break; // Future transactions don't affect the current year's starting balance
    }
    return startingBalance;
  }

  #endingBalanceForYear(yyyy) {
    let endingBalance = this.#startingBalanceForYear(yyyy);
    for (const tx of this.#transactions.sort((a, b) => a.date - b.date)) {
      if (tx.date.getFullYear() === yyyy) {
        if (tx.type === TransactionType.DEPOSIT) {
          endingBalance += tx.amount;
        } else if (tx.type === TransactionType.WITHDRAWAL) {
          endingBalance -= tx.amount;
        }
      } else if (tx.date.getFullYear() > yyyy) {
        break; // Future transactions don't affect the current year's ending balance
      }
    }
    return endingBalance;
  }

  constructor(name, initialBalance, interestRate) {
    this.#name = name;
    this.#initialBalance = initialBalance;
    this.#interestRate = interestRate; // Annual interest rate as a decimal (e.g., 0.05 for 5%)
  }

  get name() {
    return this.#name;
  }

  get initialBalance() {
    return this.#initialBalance;
  }

  get interestRate() {
    return this.#interestRate;
  }

  deposit(amount, description, yyyy) {
    if (amount <= 0) {
      throw new Error("Deposit amount must be positive.");
    }
    this.#transactions.push(
      new Transaction({
        amount,
        type: TransactionType.DEPOSIT,
        description,
        date: new Date(yyyy, 0, 1), // Set to January 1st of the given year
      })
    );
  }

  withdrawal(amount, description, yyyy) {
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive.");
    }
    const withdrawalAmount = Math.min(amount, this.#endingBalanceForYear(yyyy));
    if (withdrawalAmount < amount) {
      console.warn(
        `Requested withdrawal of ${amount} exceeds available balance. Withdrawing only ${withdrawalAmount}.`
      );
    }
    this.#transactions.push(
      new Transaction({
        amount: withdrawalAmount,
        type: TransactionType.WITHDRAWAL,
        description,
        date: new Date(yyyy, 0, 1), // Set to January 1st of the given year
      })
    );
  }

  // Method to calculate interest earned over a year
  calculateInterestForYear(intensity, yyyy) {
    let interestEarned = 0;
    switch (intensity) {
      case INTEREST_CALCULATION_EPOCH.BEGINNING_OF_YEAR:
        interestEarned = (
          this.#startingBalanceForYear(yyyy) * this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.MID_YEAR:
        interestEarned = (
          ((this.#endingBalanceForYear(yyyy) -
            this.#startingBalanceForYear(yyyy)) /
            2) *
          this.interestRate
        ).asCurrency();
        break;
      case INTEREST_CALCULATION_EPOCH.END_OF_YEAR:
        interestEarned = (
          this.#endingBalanceForYear(yyyy) * this.interestRate
        ).asCurrency();
        break;
    }
    return interestEarned;
  }

  depositsForYear(yyyy) {
    return this.#transactions
      .filter(
        (tx) =>
          tx.type === TransactionType.DEPOSIT && tx.date.getFullYear() === yyyy
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  withdrawalsForYear(yyyy) {
    return this.#transactions
      .filter(
        (tx) =>
          tx.type === TransactionType.WITHDRAWAL &&
          tx.date.getFullYear() === yyyy
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  transactionsForYear(yyyy) {
    return this.#transactions.filter((tx) => tx.date.getFullYear() === yyyy);
  }

  startingBalanceForYear(yyyy) {
    return this.#startingBalanceForYear(yyyy);
  }

  endingBalanceForYear(yyyy) {
    return this.#endingBalanceForYear(yyyy);
  }
}
