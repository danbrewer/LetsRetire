import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AccountPortioner } from "./cAccountPortioner.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeRs } from "./cIncomeRs.js";
import { IncomeStreams } from "./cIncomeStreams.js";
import { PERIODIC_FREQUENCY } from "./consts.js";
import { RetirementIncomeCalculator } from "./cRetirementIncomeCalculator.js";
import { TransactionCategory } from "./cTransaction.js";
import { WorkingIncomeCalculator } from "./cWorkingIncomeCalculator.js";

/**
 * WithdrawalFactory class - Handles withdrawal operations for retirement accounts
 * Manages withdrawals from different account types with tax calculations
 */
class WithdrawalFactory {
  /** @type {IncomeStreams} */
  #fixedIncomeStreams;

  /** @type {FiscalData} */
  #fiscalData;

  /** @type {Demographics} */
  #demographics;

  /** @type {AccountingYear} */
  #accountYear;

  /** @type {IncomeRs | null} */
  #incomeResults = null;

  /** @type {RetirementIncomeCalculator} */
  #retirementIncomeCalculator;

  /** @type {WorkingIncomeCalculator} */
  #workingIncomeCalculator;

  /**
   * Create withdrawal factory for a specific retirement year
   * @param {IncomeStreams} fixedIncomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
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

    this.#fixedIncomeStreams = fixedIncomeStreams;
    this.#fiscalData = fiscalData;
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#retirementIncomeCalculator = new RetirementIncomeCalculator(
      demographics,
      fiscalData
    );
    this.#workingIncomeCalculator = new WorkingIncomeCalculator(
      demographics,
      fiscalData
    );
  }

  processWithdrawals() {
    // Dump misc non-taxable income into savings account just to get it accounted for
    this.#accountYear.deposit(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.OtherNonTaxable,
      this.#incomeResults?.incomeBreakdown.otherNonTaxableNetIncome ?? 0
    );

    const fixedIncomeOnly =
      this.#retirementIncomeCalculator.calculateFixedIncomeOnly(
        this.#fixedIncomeStreams
      );

    // reduce the spend temporarily to determine the shortfall that needs to be covered by 401k, savings, and roth
    const estimatedFixedIncomeNet =
      fixedIncomeOnly.incomeBreakdown.totalIncome -
      fixedIncomeOnly.incomeBreakdown.federalIncomeTax;
    //   -
    //   fixedIncomeOnly.incomeBreakdown.interestEarnedOnSavings;
    //    -
    //   fixedIncomeOnly.incomeBreakdown.interestEarnedOnSavings;
    //    netIncome -
    //   fixedIncomeOnly.incomeBreakdown.earnedInterestNetIncome;

    // reduce the spend by the estimated net income from SS, Pension, etc
    let amountToPortion = this.#fiscalData.spend - estimatedFixedIncomeNet; // whittle down recurring net income by 5%
    let shortfall = this.#fiscalData.spend;

    // Split up the shortfall according to account portioner logic
    const accountPortioner = new AccountPortioner(
      this.#accountYear,
      this.#fiscalData,
      amountToPortion
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
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);

    if (shortfall > 0) {
      const withdrawal = this.#withdrawFromTargetedAccount(
        accountPortioner.rothAsk,
        ACCOUNT_TYPES.TRAD_ROTH,
        false
      );
      shortfall -= withdrawal;
    }
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.TRAD_ROTH);

    if (shortfall < 0) shortfall = 0;
    // Finally determine the 401k withdrawal needed to cover any remaining shortfall, or if no shortfall, to cover the fixed income net to zero out the income taxes
    const withdrawal = this.#withdrawFromTargetedAccount(
      shortfall,
      ACCOUNT_TYPES.TRAD_401K,
      false
    );
    shortfall -= withdrawal;

    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.TRAD_401K);

    // if anything hasn't already been accounted for (like income taxes due when 401k is empty), try taking it from Savings
    if (shortfall > 0) {
      shortfall -= this.#withdrawFromTargetedAccount(
        shortfall,
        ACCOUNT_TYPES.SAVINGS,
        false
      );
    }

    // If still shortfall, we're busted
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
   * @param {number} netTargetAmount - Target net amount
   * @param {boolean} trialRun - Whether this is a trial run
   * @returns {number} - Net amount received
   */
  #handleTrad401kWithdrawal(netTargetAmount, trialRun) {
    let gross401kWithdrawal = 0;

    if (this.#fiscalData.useTrad401k) {
      const withdrawals =
        this.#retirementIncomeCalculator.determine401kWithdrawalsToHitNetTargetOf(
          netTargetAmount,
          this.#fixedIncomeStreams
        );

      gross401kWithdrawal = Math.min(
        Math.max(
          this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.TRAD_401K]) -
            this.#fixedIncomeStreams.rmd,
          0
        ),
        withdrawals.trad401kWithdrawalNeeded
      );
    }

    // Calculate actual net using the sophisticated tax calculation
    this.#incomeResults =
      this.#retirementIncomeCalculator.calculateIncomeWhen401kWithdrawalIs(
        gross401kWithdrawal,
        this.#fixedIncomeStreams
      );

    if (this.#incomeResults == null) {
      console.error(
        "Income results are null after calculating income with 401k withdrawal."
      );
      throw new Error("Income results calculation failed.");
    }

    if (!trialRun) {
      this.#processTrad401kTransactions(gross401kWithdrawal);
    }

    return Math.max(this.#incomeResults.incomeBreakdown.netIncome, 0);
  }

  /**
   * Process Traditional 401k transactions
   * @param {number} gross401kWithdrawal - Gross withdrawal amount
   */
  #processTrad401kTransactions(gross401kWithdrawal) {
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.TRAD_401K,
      TransactionCategory.Disbursement,
      gross401kWithdrawal,
      PERIODIC_FREQUENCY.MONTHLY,
      "401k Withdrawal"
    );

    this.#accountYear.withdrawal(
      ACCOUNT_TYPES.TRAD_401K,
      TransactionCategory.Disbursement,
      this.#fixedIncomeStreams.rmd
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.Trad401k,
      gross401kWithdrawal
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.RMD,
      this.#fixedIncomeStreams.rmd
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.Pension,
      (this.#incomeResults?.incomeBreakdown.pension ?? 0) +
        (this.#incomeResults?.incomeBreakdown.pension ?? 0)
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.SocialSecurity,
      this.#incomeResults?.incomeBreakdown.socialSecurity ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.SocialSecurity,
      this.#incomeResults?.incomeBreakdown.miscTaxableIncome ?? 0
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.Interest,
      this.#incomeResults?.incomeBreakdown.interestEarnedOnSavings ?? 0
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TransactionCategory.Trad401k,
      this.#incomeResults?.incomeBreakdown.trad401kNetIncome ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TransactionCategory.Pension,
      this.#incomeResults?.incomeBreakdown.pensionNetIncome ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TransactionCategory.SocialSecurity,
      this.#incomeResults?.incomeBreakdown.socialSecurityNetIncome ?? 0
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TransactionCategory.OtherTaxableIncome,
      this.#incomeResults?.incomeBreakdown.otherTaxableNetIncome ?? 0
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TransactionCategory.Interest,
      this.#incomeResults?.incomeBreakdown.earnedInterestNetIncome ?? 0
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
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.Savings,
      withdrawalAmount
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TransactionCategory.Savings,
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
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.TRAD_ROTH,
      TransactionCategory.Disbursement,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "Roth Withdrawal"
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.REVENUE,
      TransactionCategory.TradRoth,
      withdrawalAmount
    );
    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT,
      TransactionCategory.TradRoth,
      withdrawalAmount
    );
  }

  /**
   * Get the final income results from the last withdrawal calculation
   * @returns {IncomeRs} - Final income results
   */
  getFinalIncomeResults() {
    if (!this.#incomeResults) {
      console.error(
        "Income results requested before any withdrawals were processed."
      );
      throw new Error("Income results are not available.");
    }
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
   * @param {IncomeStreams} incomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
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

export { WithdrawalFactory };
