import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AccountPortioner } from "./cAccountPortioner.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { IncomeRs } from "./cIncomeRs.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { PERIODIC_FREQUENCY } from "./consts.js";
import { RetirementIncomeCalculator } from "./cRetirementIncomeCalculator.js";
import { TransactionCategory } from "./cTransaction.js";
import { WorkingIncomeCalculator } from "./cWorkingIncomeCalculator.js";
import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";

/**
 * WithdrawalFactory class - Handles withdrawal operations for retirement accounts
 * Manages withdrawals from different account types with tax calculations
 */
class WithdrawalFactory {
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;

  /** @type {AdjustableIncomeStreams} */
  #adjustableIncomeStreams;

  /** @type {FiscalData} */
  #fiscalData;

  /** @type {Demographics} */
  #demographics;

  /** @type {AccountingYear} */
  #accountYear;

  /** @type {IncomeBreakdown} */
  #incomeBreakdown;

  /** @type {RetirementIncomeCalculator} */
  #retirementIncomeCalculator;

  // /** @type {WorkingIncomeCalculator} */
  // #workingIncomeCalculator;

  /** @type {AccountPortioner | null} */
  #accountPortioner = null;

  /**
   * Create withdrawal factory for a specific retirement year
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
   */
  constructor(
    fixedIncomeStreams,
    adjustableIncomeStreams,
    fiscalData,
    demographics,
    accountYear
  ) {
    // **************
    // Sanity checks
    // **************
    if (!accountYear) {
      console.error(`accounts is null or undefined.  This is a fatal error`);
      throw new Error("accounts is required");
    }
    // **************

    this.#fixedIncomeStreams = fixedIncomeStreams;
    this.#adjustableIncomeStreams = adjustableIncomeStreams;
    this.#fiscalData = fiscalData;
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#retirementIncomeCalculator = new RetirementIncomeCalculator(
      demographics,
      fiscalData
    );
    // this.#workingIncomeCalculator = new WorkingIncomeCalculator(
    //   demographics,
    //   fiscalData
    // );

    this.#incomeBreakdown = IncomeBreakdown.CreateFrom(
      fixedIncomeStreams,
      adjustableIncomeStreams,
      demographics,
      fiscalData
    );

    this.#accountPortioner = AccountPortioner.CreateFrom(
      this.#accountYear,
      this.#fiscalData,
      this.#demographics,
      this.#fixedIncomeStreams,
      this.#retirementIncomeCalculator
    );
  }

  processWithdrawals() {
    // Dump misc non-taxable income into savings account just to get it accounted for
    this.#processNonTaxableIncome();

    // Process non-variable income streams into savings account
    this.#processPensionIncome();
    this.#processSocialSecurityIncome();
    this.#processWorkingIncome();

    // reduce the "ask" by the estimated net income from SS, Pension, etc
    // let amountToPortion = this.#fiscalData.spend - estimatedFixedIncomeOnlyNet; // whittle down recurring net income by 5%
    this.#determineWithdrawalPortions();

    let shortfall = this.#fiscalData.spend;

    // Take withdrawals in order of Savings, Roth, 401k
    shortfall = this.#withdrawFromSavings(shortfall);
    this.#applySavingsInterest();

    shortfall = this.#withdrawRothPortion(shortfall);
    this.#applyRothInterest();

    // Finally determine the 401k withdrawal needed to cover any remaining shortfall, or if no shortfall, to cover the fixed income net to zero out the income taxes
    shortfall = this.#withdrawFromTrad401k(shortfall);
    this.#apply401kInterestEarned();

    // if anything hasn't already been accounted for (like income taxes due when 401k is empty), try taking it from Savings
    shortfall = this.#coverAnyReminingShortfallIfPossible(shortfall);

    // If still shortfall, we're busted
    if (shortfall > 0) {
      console.error(`Unable to cover shortfall: ${shortfall}`);
    }
  }

  #determineWithdrawalPortions() {
    this.#accountPortioner?.calculatePortions(this.#fiscalData.spend);
  }

  #processWorkingIncome() {
    const workingIncome = this.#incomeBreakdown?.earnedIncomeNetIncome ?? 0;
    if (workingIncome == 0) return;
    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Income,
      workingIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Working Income"
    );
  }

  #processSocialSecurityIncome() {
    const ssIncome =
      this.#incomeBreakdown?.combinedSocialSecurityActualIncome ?? 0;
    if (ssIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.SocialSecurity,
      ssIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Social Security Income"
    );
  }

  #processPensionIncome() {
    const pensionIncome = this.#incomeBreakdown?.pensionTakeHome ?? 0;
    if (pensionIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Pension,
      pensionIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Pension Income"
    );
  }

  #processNonTaxableIncome() {
    const nonTaxableIncome =
      this.#incomeBreakdown?.miscNonTaxableActualIncome ?? 0;

    if (nonTaxableIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.OtherNonTaxable,
      nonTaxableIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Tax-free income"
    );
  }

  /** @param {Number} shortfall */
  #coverAnyReminingShortfallIfPossible(shortfall) {
    if (shortfall > 0) {
      shortfall -= this.#withdrawFromSavings(shortfall);
    }

    return shortfall;
  }

  #apply401kInterestEarned() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SUBJECT_401K);
  }

  /** @param {Number} shortfall */
  #withdrawFromTrad401k(shortfall) {
    if (shortfall <= 0) return 0;

    const ask = this.#accountPortioner?.trad401kWithdrawal ?? 0;
    if (ask <= 0) return shortfall;

    const fundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SUBJECT_401K,
    ]);

    if (fundsAvailable <= 0) return shortfall;

    const withdrawalAmount = Math.min(ask, fundsAvailable);

    this.#processTrad401kTransactions(withdrawalAmount);

    return shortfall - withdrawalAmount;
  }

  #applyRothInterest() {
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
  }

  /** @param {Number} shortfall */
  #withdrawRothPortion(shortfall) {
    if (shortfall < 0) return 0;

    const ask = this.#accountPortioner?.rothIraWithdrawal ?? 0;
    if (ask <= 0) return shortfall;

    const avaiableFunds = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ]);

    if (avaiableFunds <= 0) return shortfall;

    const withdrawalAmount = Math.min(ask, avaiableFunds);

    this.#processRothTransactions(withdrawalAmount);

    return shortfall - withdrawalAmount;
  }

  /**
   * @param {number} amount
   */
  #calculateIncomeBreakdown(amount) {
    return this.#retirementIncomeCalculator.calculateIncomeBreakdown(
      this.#fixedIncomeStreams,
      this.#adjustableIncomeStreams,
      [amount]
    );
  }

  /** @param {Number} shortfall */
  #withdrawFromSavings(shortfall) {
    if (shortfall < 0) return 0;

    const ask = this.#accountPortioner?.savingsWithdrawal ?? 0;
    if (ask <= 0) return shortfall;

    const avaiableFunds = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SAVINGS,
    ]);

    if (avaiableFunds <= 0) return shortfall;

    const withdrawalAmount = Math.min(ask, avaiableFunds);

    this.#processSavingsTransactions(withdrawalAmount);

    return shortfall - withdrawalAmount;
  }

  #applySavingsInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);
  }

  /**
   * Withdraw from a targeted account
   * @param {number} amount - Amount to withdraw
   * @param {string} accountType - Type of account to withdraw from
   * @param {boolean} [trialRun=true] - Whether this is a trial run or actual withdrawal
   * @returns {number} - Net amount received after taxes and fees
   */
  // #withdrawFromTargetedAccount(amount, accountType, trialRun = true) {
  //   // Withdrawal amount to be determined
  //   switch (accountType) {
  //     case ACCOUNT_TYPES.SUBJECT_401K: {
  //       return this.#processTrad401kWithdrawal(amount, trialRun);
  //     }
  //     case ACCOUNT_TYPES.SAVINGS: {
  //       return this.#handleSavingsWithdrawal(amount, trialRun);
  //     }
  //     case ACCOUNT_TYPES.SUBJECT_ROTH_IRA: {
  //       return this.#handleRothWithdrawal(amount, trialRun);
  //     }
  //     default:
  //       console.error("Unsupported account type:", accountType);
  //       return 0;
  //   }
  // }

  // /**
  //  * Handle Traditional 401k withdrawal with tax calculations
  //  * @param {number} desiredNetAmount - Target net amount
  //  * @returns {number} - Net amount received
  //  */
  // #processTrad401kWithdrawal(desiredNetAmount) {
  //   const fundsAvailable = this.#accountYear.getAvailableFunds([
  //     ACCOUNT_TYPES.SUBJECT_401K,
  //   ]);
  //   let gross401kWithdrawal = 0;

  //   if (this.#fiscalData.useTrad401k) {
  //     // const withdrawals =
  //     //   this.#retirementIncomeCalculator.determineGrossAdjustableIncomeNeededToHitNetTargetOf(
  //     //     netTargetAmount,
  //     //     this.#fixedIncomeStreams
  //     //   );

  //     gross401kWithdrawal = Math.min(
  //       Math.max(
  //         this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.SUBJECT_401K]) -
  //           this.#fixedIncomeStreams.subjectRMD,
  //         0
  //       ),
  //       withdrawals.variableIncomeNeededToHitTarget
  //     );
  //   }

  //   // Calculate actual income breakdown using the sophisticated tax calculation
  //   this.#incomeBreakdown =
  //     this.#retirementIncomeCalculator.calculateIncomeBreakdown(
  //       gross401kWithdrawal,
  //       this.#fixedIncomeStreams
  //     );

  //   if (this.#incomeBreakdown == null) {
  //     console.error(
  //       "Income results are null after calculating income with 401k withdrawal."
  //     );
  //     throw new Error("Income results calculation failed.");
  //   }

  //   if (!trialRun) {
  //     this.#processTrad401kTransactions(gross401kWithdrawal);
  //   }

  //   return Math.max(this.#incomeBreakdown.netIncome, 0);
  // }

  /**
   * Process Traditional 401k transactions
   * @param {number} gross401kWithdrawal - Gross withdrawal amount
   */
  #processTrad401kTransactions(gross401kWithdrawal) {
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.SUBJECT_401K,
      TransactionCategory.Disbursement,
      gross401kWithdrawal,
      PERIODIC_FREQUENCY.MONTHLY,
      "401k Withdrawal"
    );

    // this.#accountYear.withdrawal(
    //   ACCOUNT_TYPES.SUBJECT_401K,
    //   TransactionCategory.Disbursement,
    //   this.#fixedIncomeStreams.subjectRMD
    // );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.Trad401k,
      gross401kWithdrawal
    );
    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
    //   TransactionCategory.RMD,
    //   this.#fixedIncomeStreams.subjectRMD
    // );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.Pension,
      (this.#incomeBreakdown?.combinedPensionGross ?? 0) +
        (this.#incomeBreakdown?.combinedPensionGross ?? 0)
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.SocialSecurity,
      this.#incomeBreakdown?.combinedSocialSecurityGross ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.SocialSecurity,
      this.#incomeBreakdown?.miscTaxableIncome ?? 0
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.Interest,
      this.#incomeBreakdown?.interestEarnedOnSavings ?? 0
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Trad401k,
      this.#incomeBreakdown?.trad401kTakeHome ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Pension,
      this.#incomeBreakdown?.pensionTakeHome ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.SocialSecurity,
      this.#incomeBreakdown?.socialSecurityTakeHome ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.OtherTaxableIncome,
      this.#incomeBreakdown?.miscTaxableActualIncome ?? 0
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Interest,
      this.#incomeBreakdown?.earnedInterestNetIncome ?? 0
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
    // Log the monthly spending for savings
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Disbursement,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "Savings Withdrawal"
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.Savings,
      withdrawalAmount
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Savings,
      withdrawalAmount
    );
  }

  // /**
  //  * Handle Roth IRA withdrawal
  //  * @param {number} amount - Amount needed
  //  * @returns {number} - Withdrawal amount
  //  */
  // #handleRothWithdrawal(amount) {
  //   // Roth withdrawal (no tax impact)
  //   const fundsNeeded = amount;
  //   const fundsAvailable = this.#accountYear.getAvailableFunds([
  //     ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
  //   ]);

  //   if (fundsAvailable == 0) return 0;

  //   // Determine how much to withdraw to meet the desired spend
  //   let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

  //   if (!trialRun) {
  //     this.#processRothTransactions(withdrawalAmount);
  //   }

  //   return withdrawalAmount;
  // }

  /**
   * Process Roth IRA transactions
   * @param {number} withdrawalAmount - Amount to withdraw
   */
  #processRothTransactions(withdrawalAmount) {
    // Reduce the account balance by the net received amount
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      TransactionCategory.Disbursement,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "Roth Withdrawal"
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.TradRoth,
      withdrawalAmount
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.TradRoth,
      withdrawalAmount
    );
  }

  /**
   * Get the final income results from the last withdrawal calculation
   * @returns {IncomeBreakdown} - Final income results
   */
  getFinalIncomeBreakdown() {
    if (!this.#incomeBreakdown) {
      console.error(
        "Income results requested before any withdrawals were processed."
      );
      throw new Error("Income results are not available.");
    }
    return this.#incomeBreakdown;
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
      case ACCOUNT_TYPES.SUBJECT_401K:
        return this.#fiscalData.useTrad401k;
      case ACCOUNT_TYPES.SAVINGS:
        return this.#fiscalData.useSavings;
      case ACCOUNT_TYPES.SUBJECT_ROTH_IRA:
        return true; // Roth is typically always available if funds exist
      default:
        return false;
    }
  }

  //   /**
  //    * Get current income streams
  //    * @returns {IncomeStreams} - Current income streams
  //    */
  //   getIncomeStreams() {
  //     return this.fixedIncomeStreams;
  //   }

  //   /**
  //    * Get fiscal data configuration
  //    * @returns {FiscalData} - Fiscal data
  //    */
  //   getFiscalData() {
  //     return this.#fiscalData;
  //   }

  //   /**
  //    * Get demographics information
  //    * @returns {Demographics} - Demographics
  //    */
  //   getDemographics() {
  //     return this.#demographics;
  //   }

  //   /**
  //    * Get account year instance
  //    * @returns {AccountYear} - Account year
  //    */
  //   getAccountYear() {
  //     return this.#accountYear;
  //   }

  //   /**
  //    * Create an empty WithdrawalFactory instance
  //    * @param {AccountYear} accountYear - Account year instance
  //    * @returns {WithdrawalFactory} - Empty withdrawal factory
  //    */
  //   static Empty(accountYear) {
  //     return new WithdrawalFactory(
  //       IncomeStreams.Empty(),
  //       FiscalData.Empty(),
  //       Demographics.Empty(),
  //       accountYear
  //     );
  //   }

  /**
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
   */
  static CreateUsing(fixedIncomeStreams, adjustableIncomeStreams, fiscalData, demographics, accountYear) {
    return new WithdrawalFactory(
      fixedIncomeStreams,
      adjustableIncomeStreams,
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

export { WithdrawalFactory };
