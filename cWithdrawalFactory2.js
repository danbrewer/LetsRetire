// import { ACCOUNT_TYPES } from "./cAccount.js";
// import { AccountingYear } from "./cAccountingYear.js";
// import { AccountPortioner } from "./cAccountPortioner.js";
// import { Demographics } from "./cDemographics.js";
// import { FiscalData } from "./cFiscalData.js";
// import { IncomeBreakdown } from "./cIncomeBreakdown.js";
// import { IncomeRs } from "./cIncomeRs.js";
// import { IncomeStreams } from "./cIncomeStreams.js";
// import { PERIODIC_FREQUENCY } from "./consts.js";
// import { RetirementIncomeCalculator } from "./cRetirementIncomeCalculator.js";
// import { TransactionCategory } from "./cTransaction.js";
// import { WorkingIncomeCalculator } from "./cWorkingIncomeCalculator.js";

// /**
//  * WithdrawalFactory2 class - Handles withdrawal operations for retirement accounts
//  * Manages withdrawals from different account types with tax calculations
//  */
// class WithdrawalFactory2 {
//   /** @type {IncomeStreams} */
//   #fixedIncomeStreams;

//   /** @type {number} */
//   #gross401kWithdrawal = 0;

//   /** @type {FiscalData} */
//   #fiscalData;

//   /** @type {Demographics} */
//   #demographics;

//   /** @type {AccountingYear} */
//   #accountYear;

//   /** @type {IncomeBreakdown | null} */
//   #incomeBreakdown = null;

//   /** @type {RetirementIncomeCalculator} */
//   #retirementIncomeCalculator;

//   /** @type {WorkingIncomeCalculator} */
//   #workingIncomeCalculator;

//   /**
//    * Create withdrawal factory for a specific retirement year
//    * @param {IncomeStreams} fixedIncomeStreams
//    * @param {FiscalData} fiscalData
//    * @param {Demographics} demographics
//    * @param {AccountingYear} accountYear
//    */
//   constructor(fixedIncomeStreams, fiscalData, demographics, accountYear) {
//     // **************
//     // Sanity checks
//     // **************
//     if (!accountYear) {
//       console.error(`accounts is null or undefined.  This is a fatal error`);
//       throw new Error("accounts is required");
//     }
//     // **************

//     this.#fixedIncomeStreams = fixedIncomeStreams;
//     this.#fiscalData = fiscalData;
//     this.#demographics = demographics;
//     this.#accountYear = accountYear;
//     this.#retirementIncomeCalculator = new RetirementIncomeCalculator(
//       demographics,
//       fiscalData
//     );
//     this.#workingIncomeCalculator = new WorkingIncomeCalculator(
//       demographics,
//       fiscalData
//     );
//   }

//   #processNonTaxableIncome() {
//     // Dump misc non-taxable income into savings account just to get it accounted for
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.SAVINGS,
//       TransactionCategory.OtherNonTaxable,
//       this.#incomeBreakdown?.otherNonTaxableNetIncome ?? 0
//     );
//   }

//   processAnnualSpending() {
//     // Dump misc non-taxable income into savings account just to get it accounted for
//     this.#processNonTaxableIncome();

//     const fixedIncomeBreakdown =
//       this.#retirementIncomeCalculator.calculateFixedIncomeOnly(
//         this.#fixedIncomeStreams
//       );

//     // reduce the spend temporarily to determine the shortfall that needs to be covered by 401k, savings, and roth
//     const estimatedFixedIncomeNet =
//       fixedIncomeBreakdown.totalIncome - fixedIncomeBreakdown.federalIncomeTax;

//     // reduce the spend by the estimated net income from SS, Pension, etc
//     let amountToPortion = this.#fiscalData.spend - estimatedFixedIncomeNet; // whittle down recurring net income by 5%

//     // Split up the shortfall according to account portioner logic
//     const accountPortioner = new AccountPortioner(
//       this.#accountYear,
//       this.#fiscalData
//     );

//     let annualSpend = this.#fiscalData.spend;

//     // Take withdrawals in order of Savings, Roth, 401k
//     if (annualSpend > 0) {
//       const withdrawal = this.#withdrawFromTargetedAccount(
//         accountPortioner.savingsAsk,
//         ACCOUNT_TYPES.SAVINGS,
//         false
//       );
//       annualSpend -= withdrawal;
//     }
//     this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);

//     if (annualSpend > 0) {
//       const withdrawal = this.#withdrawFromTargetedAccount(
//         accountPortioner.rothAsk,
//         ACCOUNT_TYPES.TRAD_ROTH,
//         false
//       );
//       annualSpend -= withdrawal;
//     }
//     this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.TRAD_ROTH);

//     if (annualSpend < 0) annualSpend = 0;
//     // Finally determine the 401k withdrawal needed to cover any remaining shortfall, or if no shortfall, to cover the fixed income net to zero out the income taxes
//     const withdrawal = this.#withdrawFromTargetedAccount(
//       annualSpend,
//       ACCOUNT_TYPES.TRAD_401K,
//       false
//     );
//     annualSpend -= withdrawal;

//     this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.TRAD_401K);

//     // if anything hasn't already been accounted for (like income taxes due when 401k is empty), try taking it from Savings
//     if (annualSpend > 0) {
//       const withdrawal = this.#withdrawFromTargetedAccount(
//         annualSpend,
//         ACCOUNT_TYPES.SAVINGS,
//         false
//       );

//       annualSpend -= withdrawal;
//     }

//     // If still shortfall, we're busted
//     if (annualSpend > 0) {
//       console.warn(
//         `Unable to cover annual spending shortfall of ${annualSpend.toFixed(
//           2
//         )} after all withdrawals.`
//       );
//     }
//   }

//   /**
//    * Withdraw from a targeted account
//    * @param {number} amount - Amount to withdraw
//    * @param {string} accountType - Type of account to withdraw from
//    * @param {boolean} [trialRun=true] - Whether this is a trial run or actual withdrawal
//    * @returns {number} - Net amount received after taxes and fees
//    */
//   #withdrawFromTargetedAccount(amount, accountType, trialRun = true) {
//     // Withdrawal amount to be determined
//     switch (accountType) {
//       case ACCOUNT_TYPES.TRAD_401K: {
//         return this.#handleTrad401kWithdrawal(amount, trialRun);
//       }
//       case ACCOUNT_TYPES.SAVINGS: {
//         return this.#handleSavingsWithdrawal(amount, trialRun);
//       }
//       case ACCOUNT_TYPES.TRAD_ROTH: {
//         return this.#handleRothWithdrawal(amount, trialRun);
//       }
//       default:
//         console.error("Unsupported account type:", accountType);
//         return 0;
//     }
//   }

//   /**
//    * Handle Traditional 401k withdrawal with tax calculations
//    * @param {number} desiredNetAmount - Target net amount
//    * @param {boolean} trialRun - Whether this is a trial run
//    * @returns {number} - Net amount received
//    */
//   #handleTrad401kWithdrawal(desiredNetAmount, trialRun) {
//     if (this.#fiscalData.useTrad401k) {
//       const withdrawals =
//         this.#retirementIncomeCalculator.determineGrossIncomeNeededToHitNetTargetOf(
//           desiredNetAmount,
//           this.#fixedIncomeStreams
//         );

//       this.#gross401kWithdrawal = Math.min(
//         Math.max(
//           this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.TRAD_401K]) -
//             this.#fixedIncomeStreams.rmd,
//           0
//         ),
//         withdrawals.variableIncomeNeededToHitTarget
//       );
//     }

//     // Calculate actual income breakdown using the sophisticated tax calculation
//     this.#incomeBreakdown =
//       this.#retirementIncomeCalculator.calculateIncomeBreakdown(
//         this.#gross401kWithdrawal,
//         this.#fixedIncomeStreams
//       );

//     if (this.#incomeBreakdown == null) {
//       console.error(
//         "Income results are null after calculating income with 401k withdrawal."
//       );
//       throw new Error("Income results calculation failed.");
//     }

//     if (!trialRun) {
//       this.#processGrossTrad401kWithdrawal();
//       this.#trackDisbursements();
//       this.#depositCash();
//     }

//     return Math.max(this.#incomeBreakdown.netIncome, 0);
//   }

//   #trackDisbursements(){

//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.Trad401k,
//       this.#gross401kWithdrawal
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.RMD,
//       this.#fixedIncomeStreams.rmd
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.Pension,
//       (this.#incomeBreakdown?.pension ?? 0) +
//         (this.#incomeBreakdown?.pension ?? 0)
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.SocialSecurity,
//       this.#incomeBreakdown?.socialSecurity ?? 0
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.OtherTaxableIncome,
//       this.#incomeBreakdown?.miscTaxableIncome ?? 0
//     );

//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.Interest,
//       this.#incomeBreakdown?.interestEarnedOnSavings ?? 0
//     );
//   }

//   #depositCash() {
//     // Now deposit the net amounts into the cash account
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.CASH,
//       TransactionCategory.Trad401k,
//       this.#incomeBreakdown?.trad401kNetIncome ?? 0
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.CASH,
//       TransactionCategory.Pension,
//       this.#incomeBreakdown?.pensionNetIncome ?? 0
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.CASH,
//       TransactionCategory.SocialSecurity,
//       this.#incomeBreakdown?.socialSecurityNetIncome ?? 0
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.CASH,
//       TransactionCategory.OtherTaxableIncome,
//       this.#incomeBreakdown?.otherTaxableNetIncome ?? 0
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.CASH,
//       TransactionCategory.Interest,
//       this.#incomeBreakdown?.earnedInterestNetIncome ?? 0
//     );
//   }

//   /**
//    * Process Traditional 401k transactions
//    */
//   #processGrossTrad401kWithdrawal() {
//     this.#accountYear.processAsPeriodicWithdrawals(
//       ACCOUNT_TYPES.TRAD_401K,
//       TransactionCategory.Disbursement,
//       this.#gross401kWithdrawal,
//       PERIODIC_FREQUENCY.MONTHLY,
//       "401k Withdrawal"
//     );

//     this.#accountYear.withdrawal(
//       ACCOUNT_TYPES.TRAD_401K,
//       TransactionCategory.Disbursement,
//       this.#fixedIncomeStreams.rmd
//     );
//   }

//   /**
//    * Handle Savings account withdrawal
//    * @param {number} amount - Amount needed
//    * @param {boolean} trialRun - Whether this is a trial run
//    * @returns {number} - Withdrawal amount
//    */
//   #handleSavingsWithdrawal(amount, trialRun) {
//     if (!this.#fiscalData.useSavings) return 0; // already processed a savings withdrawal this year

//     const fundsNeeded = amount;
//     const fundsAvailable = this.#accountYear.getAvailableFunds([
//       ACCOUNT_TYPES.SAVINGS,
//     ]);

//     if (fundsAvailable == 0) return 0;

//     // Determine how much to withdraw to meet the desired spend
//     let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

//     if (!trialRun) {
//       this.#processSavingsTransactions(withdrawalAmount);
//     }

//     return withdrawalAmount;
//   }

//   /**
//    * Process Savings account transactions
//    * @param {number} withdrawalAmount - Amount to withdraw
//    */
//   #processSavingsTransactions(withdrawalAmount) {
//     // Log the monthly spending for savings
//     this.#accountYear.processAsPeriodicWithdrawals(
//       ACCOUNT_TYPES.SAVINGS,
//       TransactionCategory.Disbursement,
//       withdrawalAmount,
//       PERIODIC_FREQUENCY.MONTHLY,
//       "Savings Withdrawal"
//     );

//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.Savings,
//       withdrawalAmount
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.CASH,
//       TransactionCategory.Savings,
//       withdrawalAmount
//     );
//   }

//   /**
//    * Handle Roth IRA withdrawal
//    * @param {number} amount - Amount needed
//    * @param {boolean} trialRun - Whether this is a trial run
//    * @returns {number} - Withdrawal amount
//    */
//   #handleRothWithdrawal(amount, trialRun) {
//     // Roth withdrawal (no tax impact)
//     const fundsNeeded = amount;
//     const fundsAvailable = this.#accountYear.getAvailableFunds([
//       ACCOUNT_TYPES.TRAD_ROTH,
//     ]);

//     if (fundsAvailable == 0) return 0;

//     // Determine how much to withdraw to meet the desired spend
//     let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

//     if (!trialRun) {
//       this.#processRothTransactions(withdrawalAmount);
//     }

//     return withdrawalAmount;
//   }

//   /**
//    * Process Roth IRA transactions
//    * @param {number} withdrawalAmount - Amount to withdraw
//    */
//   #processRothTransactions(withdrawalAmount) {
//     // Reduce the account balance by the net received amount
//     this.#accountYear.processAsPeriodicWithdrawals(
//       ACCOUNT_TYPES.TRAD_ROTH,
//       TransactionCategory.Disbursement,
//       withdrawalAmount,
//       PERIODIC_FREQUENCY.MONTHLY,
//       "Roth Withdrawal"
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.CASH,
//       TransactionCategory.TradRoth,
//       withdrawalAmount
//     );
//     this.#accountYear.deposit(
//       ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
//       TransactionCategory.TradRoth,
//       withdrawalAmount
//     );
//   }

//   /**
//    * Get the final income results from the last withdrawal calculation
//    * @returns {IncomeBreakdown} - Final income results
//    */
//   getFinalIncomeBreakdown() {
//     if (!this.#incomeBreakdown) {
//       console.error(
//         "Income results requested before any withdrawals were processed."
//       );
//       throw new Error("Income results are not available.");
//     }
//     return this.#incomeBreakdown;
//   }

//   /**
//    * Get available funds for specific account types
//    * @param {string[]} accountTypes - Array of account types to check
//    * @returns {number} - Total available funds
//    */
//   getAvailableFunds(accountTypes) {
//     return this.#accountYear.getAvailableFunds(accountTypes);
//   }

//   /**
//    * Check if a specific account type is enabled for use
//    * @param {string} accountType - Account type to check
//    * @returns {boolean} - Whether the account type is enabled
//    */
//   isAccountTypeEnabled(accountType) {
//     switch (accountType) {
//       case ACCOUNT_TYPES.TRAD_401K:
//         return this.#fiscalData.useTrad401k;
//       case ACCOUNT_TYPES.SAVINGS:
//         return this.#fiscalData.useSavings;
//       case ACCOUNT_TYPES.TRAD_ROTH:
//         return true; // Roth is typically always available if funds exist
//       default:
//         return false;
//     }
//   }

//   //   /**
//   //    * Get current income streams
//   //    * @returns {IncomeStreams} - Current income streams
//   //    */
//   //   getIncomeStreams() {
//   //     return this.fixedIncomeStreams;
//   //   }

//   //   /**
//   //    * Get fiscal data configuration
//   //    * @returns {FiscalData} - Fiscal data
//   //    */
//   //   getFiscalData() {
//   //     return this.#fiscalData;
//   //   }

//   //   /**
//   //    * Get demographics information
//   //    * @returns {Demographics} - Demographics
//   //    */
//   //   getDemographics() {
//   //     return this.#demographics;
//   //   }

//   //   /**
//   //    * Get account year instance
//   //    * @returns {AccountYear} - Account year
//   //    */
//   //   getAccountYear() {
//   //     return this.#accountYear;
//   //   }

//   //   /**
//   //    * Create an empty WithdrawalFactory instance
//   //    * @param {AccountYear} accountYear - Account year instance
//   //    * @returns {WithdrawalFactory} - Empty withdrawal factory
//   //    */
//   //   static Empty(accountYear) {
//   //     return new WithdrawalFactory(
//   //       IncomeStreams.Empty(),
//   //       FiscalData.Empty(),
//   //       Demographics.Empty(),
//   //       accountYear
//   //     );
//   //   }

//   /**
//    * @param {IncomeStreams} incomeStreams
//    * @param {FiscalData} fiscalData
//    * @param {Demographics} demographics
//    * @param {AccountingYear} accountYear
//    */
//   static CreateUsing(incomeStreams, fiscalData, demographics, accountYear) {
//     return new WithdrawalFactory2(
//       incomeStreams,
//       fiscalData,
//       demographics,
//       accountYear
//     );
//   }
// }

// // // Legacy function for backward compatibility
// // /**
// //  * Create withdrawal function for a specific retirement year
// //  * @deprecated Use WithdrawalFactory class instead
// //  * @param {IncomeStreams} incomeStreams
// //  * @param {FiscalData} fiscalData
// //  * @param {Demographics} demographics
// //  * @param {AccountYear} accountYear
// //  */
// // function withdrawalFactoryJS_createWithdrawalFactory(
// //   incomeStreams,
// //   fiscalData,
// //   demographics,
// //   accountYear
// // ) {
// //   const factory = new WithdrawalFactory(
// //     incomeStreams,
// //     fiscalData,
// //     demographics,
// //     accountYear
// //   );

// //   return {
// //     withdrawFromTargetedAccount:
// //       factory.withdrawFromTargetedAccount.bind(factory),
// //     getFinalIncomeResults: factory.getFinalIncomeResults.bind(factory),
// //   };
// // }

// export { WithdrawalFactory2 };
