/**
 * WithdrawalFactory class - Handles withdrawal operations for retirement accounts
 * Manages withdrawals from different account types with tax calculations
 */
class WithdrawalFactory {
  /** @type {IncomeStreams} */
  fixedIncomeStreams;

  /** @type {FiscalData} */
  #fiscalData;

  /** @type {Demographics} */
  #demographics;

  /** @type {AccountYear} */
  #accountYear;

  /** @type {IncomeRs} */
  #incomeResults;

  /** @type {RetirementIncomeCalculator} */
  #retirementIncomeCalculator;

  /**
   * Create withdrawal factory for a specific retirement year
   * @param {IncomeStreams} fixedIncomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountYear} accountYear
   */
  constructor(fixedIncomeStreams, fiscalData, demographics, accountYear) {
    // **************
    // Sanity checks
    // **************
    if (!accountYear) {
      console.error(`accounts is null or undefined.  This is a fatal error`);
      throw new Error("accounts is required");
    }
    // **************

    this.fixedIncomeStreams = fixedIncomeStreams;
    this.#fiscalData = fiscalData;
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#incomeResults = IncomeRs.Empty();
    this.#retirementIncomeCalculator = new RetirementIncomeCalculator(
      demographics,
      fiscalData
    );
  }

  processWithdrawals() {
    const fixedIncomeOnly =
      this.#retirementIncomeCalculator.calculateIncomeWhen401kWithdrawalIs(
        0,
        this.fixedIncomeStreams
      );

    // reduce the spend temporarily to determine the shortfall that needs to be covered by 401k, savings, and roth

    const fixedIncomeNet = fixedIncomeOnly.incomeBreakdown.netIncome;

    // reduce the spend by the estimated net income from SS, Pension, etc
    let shortfall = this.#fiscalData.spend - fixedIncomeNet; // whittle down recurring net income by 5%

    // Split up the shortfall according to account portioner logic
    const accountPortioner = new AccountPortioner(
      this.#accountYear,
      this.#fiscalData,
      shortfall
    );

    // Take withdrawals in order of Savings, Roth, 401k
    if (shortfall > 0) {
      const withdrawal = this.#withdrawFromTargetedAccount(
        accountPortioner.savingsAsk,
        ACCOUNT_TYPES.SAVINGS,
        false
      );
      shortfall -= withdrawal;
    }

    if (shortfall > 0) {
      const withdrawal = this.#withdrawFromTargetedAccount(
        accountPortioner.rothAsk,
        ACCOUNT_TYPES.TRAD_ROTH,
        false
      );
      shortfall -= withdrawal;
    }

    if (shortfall > 0) {
      const withdrawal = this.#withdrawFromTargetedAccount(
        shortfall + fixedIncomeNet,
        ACCOUNT_TYPES.TRAD_401K,
        false
      );
      shortfall -= withdrawal;
    }

    // if anything hasn't already been accounted for (like income taxes due when 401k is empty), try taking it from Savings
    if (shortfall > 0) {
      shortfall -= this.#withdrawFromTargetedAccount(
        shortfall,
        ACCOUNT_TYPES.SAVINGS,
        false
      );
    }

    // Update result with any remaining shortfall amount
    result.shortfallAmount = Math.max(shortfall, 0);

    // Deposit interest earned into accounts
    this.fixedIncomeStreams.actualEarnedInterest =
      this.#accountYear.calculateInterestForYear(
        ACCOUNT_TYPES.SAVINGS,
        INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
      );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.INTEREST,
      this.fixedIncomeStreams.actualEarnedInterest
    );

    const trad401kInterest = this.#accountYear.calculateInterestForYear(
      ACCOUNT_TYPES.TRAD_401K,
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.INTEREST,
      trad401kInterest
    );

    const tradRothInterest = this.#accountYear.calculateInterestForYear(
      ACCOUNT_TYPES.TRAD_ROTH,
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.TRAD_ROTH,
      TRANSACTION_CATEGORY.INTEREST,
      tradRothInterest
    );
  }

  /**
   * Withdraw from a targeted account
   * @param {number} amount - Amount to withdraw
   * @param {string} accountType - Type of account to withdraw from
   * @param {boolean} [trialRun=true] - Whether this is a trial run or actual withdrawal
   * @returns {number} - Net amount received after taxes and fees
   */
  #withdrawFromTargetedAccount(amount, accountType, trialRun = true) {
    // Withdrawal amount to be determined
    switch (accountType) {
      case ACCOUNT_TYPES.TRAD_401K: {
        return this.#handleTrad401kWithdrawal(amount, trialRun);
      }
      case ACCOUNT_TYPES.SAVINGS: {
        return this.#handleSavingsWithdrawal(amount, trialRun);
      }
      case ACCOUNT_TYPES.TRAD_ROTH: {
        return this.#handleRothWithdrawal(amount, trialRun);
      }
      default:
        console.error("Unsupported account type:", accountType);
        return 0;
    }
  }

  /**
   * Handle Traditional 401k withdrawal with tax calculations
   * @param {number} amount - Target net amount
   * @param {boolean} trialRun - Whether this is a trial run
   * @returns {number} - Net amount received
   */
  #handleTrad401kWithdrawal(amount, trialRun) {
    let gross401kWithdrawal = 0;

    if (this.#fiscalData.useTrad401k) {
      const withdrawals =
        this.#retirementIncomeCalculator.determine401kWithdrawalsToHitNetTargetOf(
          amount,
          this.fixedIncomeStreams
        );

      gross401kWithdrawal = Math.min(
        Math.max(
          this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.TRAD_401K]) -
            this.fixedIncomeStreams.rmd,
          0
        ),
        withdrawals.withdrawalNeeded
      );
    }

    // Calculate actual net using the sophisticated tax calculation
    this.#incomeResults =
      this.#retirementIncomeCalculator.calculateIncomeWhen401kWithdrawalIs(
        // retirementJS_calculateIncomeWhen401kWithdrawalIs(
        gross401kWithdrawal,
        this.fixedIncomeStreams
      );

    if (!trialRun) {
      this.#processTrad401kTransactions(gross401kWithdrawal);
    }

    return Math.max(
      gross401kWithdrawal -
        this.#incomeResults.incomeBreakdown.federalIncomeTax,
      0
    );
  }

  /**
   * Process Traditional 401k transactions
   * @param {number} gross401kWithdrawal - Gross withdrawal amount
   */
  #processTrad401kTransactions(gross401kWithdrawal) {
    this.#accountYear.withdrawal(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.DISBURSEMENT,
      gross401kWithdrawal
    );
    this.#accountYear.withdrawal(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.DISBURSEMENT,
      this.fixedIncomeStreams.rmd
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TRANSACTION_CATEGORY.TRAD_401K,
      gross401kWithdrawal
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TRANSACTION_CATEGORY.RMD,
      this.fixedIncomeStreams.rmd
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TRANSACTION_CATEGORY.PENSION,
      this.#incomeResults.incomeBreakdown.partnerPension +
        this.#incomeResults.incomeBreakdown.subjectPension
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TRANSACTION_CATEGORY.SOCIAL_SEC,
      this.#incomeResults.incomeBreakdown.socialSecurityIncome
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TRANSACTION_CATEGORY.SOCIAL_SEC,
      this.#incomeResults.incomeBreakdown.otherTaxableNetIncome
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TRANSACTION_CATEGORY.TRAD_401K,
      this.#incomeResults.incomeBreakdown.trad401kNetIncome
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TRANSACTION_CATEGORY.PENSION,
      this.#incomeResults.incomeBreakdown.pensionNetIncome
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TRANSACTION_CATEGORY.SOCIAL_SEC,
      this.#incomeResults.incomeBreakdown.socialSecurityNetIncome
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TRANSACTION_CATEGORY.OTHER_INCOME,
      this.#incomeResults.incomeBreakdown.otherTaxableNetIncome
    );
  }

  /**
   * Handle Savings account withdrawal
   * @param {number} amount - Amount needed
   * @param {boolean} trialRun - Whether this is a trial run
   * @returns {number} - Withdrawal amount
   */
  #handleSavingsWithdrawal(amount, trialRun) {
    if (!this.#fiscalData.useSavings) return 0; // already processed a savings withdrawal this year

    const fundsNeeded = amount;
    const fundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SAVINGS,
    ]);

    if (fundsAvailable == 0) return 0;

    // Determine how much to withdraw to meet the desired spend
    let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

    if (!trialRun) {
      this.#processSavingsTransactions(withdrawalAmount);
    }

    return withdrawalAmount;
  }

  /**
   * Process Savings account transactions
   * @param {number} withdrawalAmount - Amount to withdraw
   */
  #processSavingsTransactions(withdrawalAmount) {
    // Reduce the account balance by the net received amount
    this.#accountYear.withdrawal(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.DISBURSEMENT,
      withdrawalAmount
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TRANSACTION_CATEGORY.SAVINGS,
      withdrawalAmount
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TRANSACTION_CATEGORY.SAVINGS,
      withdrawalAmount
    );
  }

  /**
   * Handle Roth IRA withdrawal
   * @param {number} amount - Amount needed
   * @param {boolean} trialRun - Whether this is a trial run
   * @returns {number} - Withdrawal amount
   */
  #handleRothWithdrawal(amount, trialRun) {
    // Roth withdrawal (no tax impact)
    const fundsNeeded = amount;
    const fundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.TRAD_ROTH,
    ]);

    if (fundsAvailable == 0) return 0;

    // Determine how much to withdraw to meet the desired spend
    let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

    if (!trialRun) {
      this.#processRothTransactions(withdrawalAmount);
    }

    return withdrawalAmount;
  }

  /**
   * Process Roth IRA transactions
   * @param {number} withdrawalAmount - Amount to withdraw
   */
  #processRothTransactions(withdrawalAmount) {
    // Reduce the account balance by the net received amount
    this.#accountYear.withdrawal(
      ACCOUNT_TYPES.TRAD_ROTH,
      TRANSACTION_CATEGORY.DISBURSEMENT,
      withdrawalAmount
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TRANSACTION_CATEGORY.TRAD_ROTH,
      withdrawalAmount
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TRANSACTION_CATEGORY.TRAD_ROTH,
      withdrawalAmount
    );
  }

  /**
   * Get the final income results from the last withdrawal calculation
   * @returns {IncomeRs} - Final income results
   */
  getFinalIncomeResults() {
    return this.#incomeResults;
  }

  /**
   * Get available funds for specific account types
   * @param {string[]} accountTypes - Array of account types to check
   * @returns {number} - Total available funds
   */
  getAvailableFunds(accountTypes) {
    return this.#accountYear.getAvailableFunds(accountTypes);
  }

  /**
   * Check if a specific account type is enabled for use
   * @param {string} accountType - Account type to check
   * @returns {boolean} - Whether the account type is enabled
   */
  isAccountTypeEnabled(accountType) {
    switch (accountType) {
      case ACCOUNT_TYPES.TRAD_401K:
        return this.#fiscalData.useTrad401k;
      case ACCOUNT_TYPES.SAVINGS:
        return this.#fiscalData.useSavings;
      case ACCOUNT_TYPES.TRAD_ROTH:
        return true; // Roth is typically always available if funds exist
      default:
        return false;
    }
  }

  /**
   * Get current income streams
   * @returns {IncomeStreams} - Current income streams
   */
  getIncomeStreams() {
    return this.fixedIncomeStreams;
  }

  /**
   * Get fiscal data configuration
   * @returns {FiscalData} - Fiscal data
   */
  getFiscalData() {
    return this.#fiscalData;
  }

  /**
   * Get demographics information
   * @returns {Demographics} - Demographics
   */
  getDemographics() {
    return this.#demographics;
  }

  /**
   * Get account year instance
   * @returns {AccountYear} - Account year
   */
  getAccountYear() {
    return this.#accountYear;
  }

  /**
   * Create an empty WithdrawalFactory instance
   * @param {AccountYear} accountYear - Account year instance
   * @returns {WithdrawalFactory} - Empty withdrawal factory
   */
  static Empty(accountYear) {
    return new WithdrawalFactory(
      IncomeStreams.Empty(),
      FiscalData.Empty(),
      Demographics.Empty(),
      accountYear
    );
  }

  /**
   * @param {IncomeStreams} incomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountYear} accountYear
   */
  static CreateUsing(incomeStreams, fiscalData, demographics, accountYear) {
    return new WithdrawalFactory(
      incomeStreams,
      fiscalData,
      demographics,
      accountYear
    );
  }
}

// // Legacy function for backward compatibility
// /**
//  * Create withdrawal function for a specific retirement year
//  * @deprecated Use WithdrawalFactory class instead
//  * @param {IncomeStreams} incomeStreams
//  * @param {FiscalData} fiscalData
//  * @param {Demographics} demographics
//  * @param {AccountYear} accountYear
//  */
// function withdrawalFactoryJS_createWithdrawalFactory(
//   incomeStreams,
//   fiscalData,
//   demographics,
//   accountYear
// ) {
//   const factory = new WithdrawalFactory(
//     incomeStreams,
//     fiscalData,
//     demographics,
//     accountYear
//   );

//   return {
//     withdrawFromTargetedAccount:
//       factory.withdrawFromTargetedAccount.bind(factory),
//     getFinalIncomeResults: factory.getFinalIncomeResults.bind(factory),
//   };
// }
