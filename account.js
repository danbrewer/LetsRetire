// Create a class for the account
class Account {
  constructor(name, initialBalance, interestRate) {
    this.name = name;
    this.balance = initialBalance;
    this.interestRate = interestRate; // Annual interest rate as a decimal (e.g., 0.05 for 5%)
    this.deposits = 0; // Total deposits made during the year
  }

  // Method to calculate interest earned over a year
  calculateInterest(intensity, logDetails) {
    let interestEarned = 0;
    switch (intensity) {
      case INTEREST_CALCULATION_INTENSITY.CONSERVATIVE:
        interestEarned = this.balance * (this.interestRate * 0.5);
        break;
      case INTEREST_CALCULATION_INTENSITY.MODERATE:
        interestEarned = this.balance * (this.interestRate * 0.75);
        break;
      case INTEREST_CALCULATION_INTENSITY.AGGRESSIVE:
        interestEarned = this.balance * this.interestRate;
        break;
    }
    if (logDetails) {
      console.log(
        `Interest earned for ${this.name} (${intensity}): ${interestEarned}`
      );
    }
    return interestEarned;
  }
}
