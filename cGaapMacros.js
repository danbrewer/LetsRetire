
// /* ============================================================
//    FLOW-BASED ARG TYPES WITH NORMAL BALANCE PREFIXES
//    dr* = Asset or Expense (debit-normal)
//    cr* = Liability, Income, Equity (credit-normal)
//    ============================================================ */

// /** -------------------- SALE -------------------- */
// /**
//  * Revenue (credit-normal) increases → Asset (debit-normal) increases
//  * @typedef {object} RevenueToAssetArgs
//  * @property {GaapAccount} drAsset
//  * @property {GaapAccount} crRevenue
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- EXPENSE PAYMENT -------------------- */
// /**
//  * Cash (dr) decreases, Expense (dr) increases
//  * @typedef {object} CashToExpenseArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} drExpense
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- ASSET TRANSFER -------------------- */
// /**
//  * Transfer between two debit-normal accounts (assets)
//  * @typedef {object} AssetToAssetArgs
//  * @property {GaapAccount} drAssetDestination
//  * @property {GaapAccount} drAssetSource
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- LOAN DISBURSEMENT -------------------- */
// /**
//  * Liability (cr) increases, Cash (dr) increases
//  * @typedef {object} LiabilityToCashArgs
//  * @property {GaapAccount} crLiability
//  * @property {GaapAccount} drCash
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- LOAN PAYMENT -------------------- */
// /**
//  * Cash (dr) decreases → Liability (cr) decreases AND Expense (dr) increases
//  * @typedef {object} CashToLiabilityAndExpenseArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} crLoanLiability
//  * @property {GaapAccount} drInterestExpense
//  * @property {number} principal
//  * @property {number} interest
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- PAYROLL -------------------- */
// /**
//  * Income (cr) increases, Cash (dr) increases, Withholding Liabilities (cr) increase
//  * @typedef {object} IncomeToCashAndLiabilitiesArgs
//  * @property {GaapAccount} crIncome
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} crFederalWithholding
//  * @property {GaapAccount} crSSWithholding
//  * @property {GaapAccount} crMedicareWithholding
//  * @property {number} grossPay
//  * @property {number} federalWithholding
//  * @property {number} ssWithholding
//  * @property {number} medicareWithholding
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- 401k CONTRIBUTION -------------------- */
// /**
//  * Cash (dr) decreases, 401k Asset (dr) increases
//  * @typedef {object} CashTo401kArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} dr401k
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- ROTH CONTRIBUTION -------------------- */
// /**
//  * Cash (dr) decreases, Roth Asset (dr) increases
//  * @typedef {object} CashToRothArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} drRoth
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- TRADITIONAL WITHDRAWAL -------------------- */
// /**
//  * 401k (dr) decreases → Cash (dr) increases AND Income (cr) increases
//  * @typedef {object} 401kToCashAndIncomeArgs
//  * @property {GaapAccount} dr401k
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} crIncome
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- ROTH WITHDRAWAL -------------------- */
// /**
//  * Roth (dr) decreases, Cash (dr) increases
//  * @typedef {object} RothToCashArgs
//  * @property {GaapAccount} drRoth
//  * @property {GaapAccount} drCash
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- PENSION INCOME -------------------- */
// /**
//  * Pension Income (cr) increases → Cash (dr) increases
//  * @typedef {object} PensionIncomeToCashArgs
//  * @property {GaapAccount} crPensionIncome
//  * @property {GaapAccount} drCash
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- SOCIAL SECURITY INCOME -------------------- */
// /**
//  * SS Income (cr) increases → Cash (dr) increases
//  * @typedef {object} SSIncomeToCashArgs
//  * @property {GaapAccount} crSSIncome
//  * @property {GaapAccount} drCash
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- INVESTMENT PURCHASE -------------------- */
// /**
//  * Cash (dr) decreases → Investment Asset (dr) increases
//  * @typedef {object} CashToInvestmentArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} drInvestment
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- INVESTMENT SALE -------------------- */
// /**
//  * Investment (dr) decreases → Cash (dr) increases
//  * @typedef {object} InvestmentToCashArgs
//  * @property {GaapAccount} drInvestment
//  * @property {GaapAccount} drCash
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- CAPITAL GAIN -------------------- */
// /**
//  * Investment (dr) decreases → Cash (dr) increases AND Gain (cr) increases
//  * @typedef {object} InvestmentToCashAndGainArgs
//  * @property {GaapAccount} drInvestment
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} crGain
//  * @property {number} proceeds
//  * @property {number} basis
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- INTEREST INCOME -------------------- */
// /**
//  * Interest Income (cr) increases → Cash (dr) increases
//  * @typedef {object} InterestIncomeToCashArgs
//  * @property {GaapAccount} crInterestIncome
//  * @property {GaapAccount} drCash
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- DIVIDEND INCOME -------------------- */
// /**
//  * Dividend Income (cr) increases → Cash (dr) increases
//  * @typedef {object} DividendIncomeToCashArgs
//  * @property {GaapAccount} crDividendIncome
//  * @property {GaapAccount} drCash
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- TAX PAYMENT -------------------- */
// /**
//  * Cash (dr) decreases → Tax Liability (cr) decreases
//  * @typedef {object} CashToTaxLiabilityArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} crTaxLiability
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- ESTIMATED TAX (EXPENSE) -------------------- */
// /**
//  * Cash (dr) decreases → Tax Expense (dr) increases
//  * @typedef {object} CashToTaxExpenseArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} drTaxExpense
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// /** -------------------- ESCROW DEPOSIT -------------------- */
// /**
//  * Cash (dr) decreases → Escrow Asset (dr) increases
//  * @typedef {object} CashToEscrowArgs
//  * @property {GaapAccount} drCash
//  * @property {GaapAccount} drEscrow
//  * @property {number} amount
//  * @property {Date} [date]
//  * @property {string} [desc]
//  */

// class GaapMacros {
//   /**
//    * @param {GaapLedger} ledger
//    */
//   constructor(ledger) {
//     this.ledger = ledger;
//   }

//   // ============================================================
//   // SALE (Revenue increases, Asset increases)
//   // ============================================================
//   /**
//    * @param {RevenueToAssetArgs} args
//    */
//   sale({ drAsset, crRevenue, amount, date = new Date(), desc = "Sale" }) {
//     const b = new GaapPostingBuilder();
//     b.increase(drAsset, amount);
//     b.increase(crRevenue, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // EXPENSE PAYMENT (Cash decreases, Expense increases)
//   // ============================================================
//   /**
//    * @param {CashToExpenseArgs} args
//    */
//   expensePayment({
//     drCash,
//     drExpense,
//     amount,
//     date = new Date(),
//     desc = "Expense Payment",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drCash, amount);
//     b.increase(drExpense, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // ASSET TRANSFER (Asset decreases, another Asset increases)
//   // ============================================================
//   /**
//    * @param {AssetToAssetArgs} args
//    */
//   transfer({
//     drAssetDestination,
//     drAssetSource,
//     amount,
//     date = new Date(),
//     desc = "Transfer",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drAssetSource, amount);
//     b.increase(drAssetDestination, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // LOAN DISBURSEMENT (Liability increases, Cash increases)
//   // ============================================================
//   /**
//    * @param {LiabilityToCashArgs} args
//    */
//   loanDisbursement({
//     crLiability,
//     drCash,
//     amount,
//     date = new Date(),
//     desc = "Loan Disbursement",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.increase(drCash, amount);
//     b.increase(crLiability, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // LOAN PAYMENT:
//   //   Cash decreases,
//   //   Liability decreases,
//   //   Interest Expense increases
//   // ============================================================
//   /**
//    * @param {CashToLiabilityAndExpenseArgs} args
//    */
//   loanPayment({
//     drCash,
//     crLoanLiability,
//     drInterestExpense,
//     principal,
//     interest,
//     date = new Date(),
//     desc = "Loan Payment",
//   }) {
//     const b = new GaapPostingBuilder();
//     const total = principal + interest;

//     b.decrease(drCash, total);
//     b.decrease(crLoanLiability, principal);
//     b.increase(drInterestExpense, interest);

//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // PAYROLL:
//   //   Income increases,
//   //   Cash increases,
//   //   Withholding Liabilities increase
//   // ============================================================
//   /**
//    * @param {IncomeToCashAndLiabilitiesArgs} args
//    */
//   payroll({
//     crIncome,
//     drCash,
//     crFederalWithholding,
//     crSSWithholding,
//     crMedicareWithholding,
//     grossPay,
//     federalWithholding,
//     ssWithholding,
//     medicareWithholding,
//     date = new Date(),
//     desc = "Payroll",
//   }) {
//     const b = new GaapPostingBuilder();

//     const totalWithheld =
//       federalWithholding + ssWithholding + medicareWithholding;

//     const netPay = grossPay - totalWithheld;

//     b.increase(crIncome, grossPay);
//     b.increase(drCash, netPay);

//     b.increase(crFederalWithholding, federalWithholding);
//     b.increase(crSSWithholding, ssWithholding);
//     b.increase(crMedicareWithholding, medicareWithholding);

//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // 401k CONTRIBUTION (Cash decreases, 401k Asset increases)
//   // ============================================================
//   /**
//    * @param {CashTo401kArgs} args
//    */
//   retirementContributionTraditional({
//     drCash,
//     dr401k,
//     amount,
//     date = new Date(),
//     desc = "Traditional 401k Contribution",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drCash, amount);
//     b.increase(dr401k, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // ROTH CONTRIBUTION (Cash decreases, Roth Asset increases)
//   // ============================================================
//   /**
//    * @param {CashToRothArgs} args
//    */
//   retirementContributionRoth({
//     drCash,
//     drRoth,
//     amount,
//     date = new Date(),
//     desc = "Roth Contribution",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drCash, amount);
//     b.increase(drRoth, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // TRADITIONAL WITHDRAWAL (401k decreases, Cash increases, Income increases)
//   // ============================================================
//   /**
//    * @param {401kToCashAndIncomeArgs} args
//    */
//   withdrawFromTraditional({
//     dr401k,
//     drCash,
//     crIncome,
//     amount,
//     date = new Date(),
//     desc = "Traditional Withdrawal",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(dr401k, amount);
//     b.increase(drCash, amount);
//     b.increase(crIncome, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   /**
//    * @param {401kToCashAndIncomeArgs} args
//    */
//   rmdWithdrawal(args) {
//     return this.withdrawFromTraditional({
//       ...args,
//       desc: args.desc ?? "RMD Withdrawal",
//     });
//   }

//   // ============================================================
//   // ROTH WITHDRAWAL (Roth decreases, Cash increases)
//   // ============================================================
//   /**
//    * @param {RothToCashArgs} args
//    */
//   withdrawFromRoth({
//     drRoth,
//     drCash,
//     amount,
//     date = new Date(),
//     desc = "Roth Withdrawal",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drRoth, amount);
//     b.increase(drCash, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // PENSION INCOME (Pension Income increases, Cash increases)
//   // ============================================================
//   /**
//    * @param {PensionIncomeToCashArgs} args
//    */
//   pensionPayment({
//     crPensionIncome,
//     drCash,
//     amount,
//     date = new Date(),
//     desc = "Pension Income",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.increase(crPensionIncome, amount);
//     b.increase(drCash, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // SOCIAL SECURITY INCOME (SS Income increases, Cash increases)
//   // ============================================================
//   /**
//    * @param {SSIncomeToCashArgs} args
//    */
//   socialSecurityIncome({
//     crSSIncome,
//     drCash,
//     amount,
//     date = new Date(),
//     desc = "Social Security Income",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.increase(crSSIncome, amount);
//     b.increase(drCash, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // INVESTMENT PURCHASE (Cash decreases, Investment increases)
//   // ============================================================
//   /**
//    * @param {CashToInvestmentArgs} args
//    */
//   investmentBuy({
//     drCash,
//     drInvestment,
//     amount,
//     date = new Date(),
//     desc = "Investment Purchase",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drCash, amount);
//     b.increase(drInvestment, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // INVESTMENT SALE (Investment decreases, Cash increases)
//   // ============================================================
//   /**
//    * @param {InvestmentToCashArgs} args
//    */
//   investmentSell({
//     drInvestment,
//     drCash,
//     amount,
//     date = new Date(),
//     desc = "Investment Sale",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drInvestment, amount);
//     b.increase(drCash, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // CAPITAL GAIN (Investment decreases, Cash increases, Gain increases)
//   // ============================================================
//   /**
//    * @param {InvestmentToCashAndGainArgs} args
//    */
//   realizeCapitalGain({
//     drInvestment,
//     drCash,
//     crGain,
//     proceeds,
//     basis,
//     date = new Date(),
//     desc = "Capital Gain Realization",
//   }) {
//     const b = new GaapPostingBuilder();

//     b.decrease(drInvestment, basis);
//     b.increase(drCash, proceeds);

//     const gain = proceeds - basis;
//     if (gain > 0) {
//       b.increase(crGain, gain);
//     }

//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // INTEREST INCOME (Income increases, Cash increases)
//   // ============================================================
//   /**
//    * @param {InterestIncomeToCashArgs} args
//    */
//   interestIncome({
//     crInterestIncome,
//     drCash,
//     amount,
//     date = new Date(),
//     desc = "Interest Earned",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.increase(crInterestIncome, amount);
//     b.increase(drCash, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // DIVIDEND INCOME (Dividend Income increases, Cash increases)
//   // ============================================================
//   /**
//    * @param {DividendIncomeToCashArgs} args
//    */
//   dividendIncome({
//     crDividendIncome,
//     drCash,
//     amount,
//     date = new Date(),
//     desc = "Dividend Received",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.increase(crDividendIncome, amount);
//     b.increase(drCash, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // TAX PAYMENT (Cash decreases, Liability decreases)
//   // ============================================================
//   /**
//    * @param {CashToTaxLiabilityArgs} args
//    */
//   taxPayment({
//     drCash,
//     crTaxLiability,
//     amount,
//     date = new Date(),
//     desc = "Tax Payment",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drCash, amount);
//     b.decrease(crTaxLiability, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // ESTIMATED TAX (Cash decreases, Tax Expense increases)
//   // ============================================================
//   /**
//    * @param {CashToTaxExpenseArgs} args
//    */
//   estimatedTaxPayment({
//     drCash,
//     drTaxExpense,
//     amount,
//     date = new Date(),
//     desc = "Estimated Tax Payment",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drCash, amount);
//     b.increase(drTaxExpense, amount);
//     return this.ledger.record(date, desc, b.build());
//   }

//   // ============================================================
//   // ESCROW DEPOSIT (Cash decreases, Escrow Asset increases)
//   // ============================================================
//   /**
//    * @param {CashToEscrowArgs} args
//    */
//   escrowDeposit({
//     drCash,
//     drEscrow,
//     amount,
//     date = new Date(),
//     desc = "Escrow Deposit",
//   }) {
//     const b = new GaapPostingBuilder();
//     b.decrease(drCash, amount);
//     b.increase(drEscrow, amount);
//     return this.ledger.record(date, desc, b.build());
//   }
// }
