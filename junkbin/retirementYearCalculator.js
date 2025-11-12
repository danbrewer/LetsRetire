// /**
//  * Calculate comprehensive retirement year data including income, withdrawals, taxes, and account balances
//  * with proper Social Security taxation based on total income calculations.
//  *
//  * This function performs a complete retirement year simulation by:
//  * 1. Creating demographic and fiscal data contexts
//  * 2. Calculating income streams from various sources (SS, pension, interest)
//  * 3. Determining optimal withdrawal strategy across account types
//  * 4. Computing tax implications with proper SS taxation rules
//  * 5. Updating account balances with interest and transactions
//  * 6. Generating comprehensive breakdown reports
//  *
//  * @param {Inputs} inputs - Retirement calculation inputs containing demographics,
//  *   financial parameters, and configuration settings. Must include properties like:
//  *   - retSavings: savings account growth rate
//  *   - ret401k: 401k growth rate
//  *   - retRoth: Roth IRA growth rate
//  *   - retirement year and age information
//  * @param {AccountYear} accountYear - Collection of retirement accounts for fiscal year
//  *   - savings: Savings account instance
//  *   - trad401k: Traditional 401k account instance
//  *   - rothIra: Roth IRA account instance
//  *   Each account must support withdrawal, deposit, and balance calculation methods
//  * @param {BenefitAmounts} benefitAmounts - Social Security and pension benefit amounts
//  *   for both primary and spouse, used for income stream calculations
//  *
//  * @returns {RetirementYearData} Comprehensive retirement year calculation results containing:
//  *   - demographics: Age and retirement year information
//  *   - fiscalData: Tax year and spending parameters
//  *   - incomeStreams: All income sources (SS, pension, interest, RMD)
//  *   - incomeBreakdown: Detailed taxable/non-taxable income analysis
//  *   - withdrawals: Breakdown of withdrawals from each account type
//  *   - balances: Ending balances for all accounts
//  *   - taxes: Federal tax calculations and effective rates
//  *   - breakdowns: Detailed analysis for SS, pension, savings, and retirement accounts
//  *
//  * @throws {Error} When required account methods are missing or inputs are invalid
//  * @throws {Error} When withdrawal calculations fail due to insufficient funds
//  *
//  * @example
//  * // Calculate retirement year data for a 65-year-old
//  * const inputs = RetirementInputs.CreateUsing(userInputData);
//  * const accounts = AccountGroup.CreateUsing(accountData);
//  * const benefits = BenefitAmounts.CreateUsing(benefitData);
//  *
//  * const yearData = calculateRetirementYearData(inputs, accounts, benefits);
//  * console.log(`Net income: ${yearData.totals.netIncome}`);
//  * console.log(`Federal taxes: ${yearData.taxes.federalTaxes}`);
//  * console.log(`Account balances: ${yearData.balances.total()}`);
//  *
//  * @see {@link IncomeStreams} For income stream calculation details
//  * @see {@link SsBenefits} For Social Security taxation methodology
//  * @see {@link AccountPortioner} For withdrawal strategy logic
//  * @see {@link RetirementYearData} For complete result structure
//  *
//  * @since 1.0.0
//  * @author Retirement Calculator System
//  */
// function calculateRetirementYearData(inputs, accountYear, benefitAmounts) {
//   // kill the logger for now
//   LOG_LEVEL = 0;

//   // Declare and initialize the result object at the top
//   const result = RetirementYearData.Empty();

//   const demographics = Demographics.CreateUsing(inputs, true, false);

//   const fiscalData = FiscalData.CreateUsing(inputs, TAX_BASE_YEAR);

//   const fixedIncomeStreams = IncomeStreams.CreateUsing(
//     demographics,
//     benefitAmounts,
//     accountYear,
//     fiscalData,
//     inputs
//   );

//   // Build complete taxable income picture for withdrawal functions

//   // debugger;
//   // const withdrawalFactory = withdrawalFactoryJS_createWithdrawalFactory(
//   //   fixedIncomeStreams,
//   //   fiscalData,
//   //   demographics,
//   //   accountYear
//   // );

//   const withdrawalFactory = WithdrawalFactory.CreateUsing(
//     fixedIncomeStreams,
//     fiscalData,
//     demographics,
//     accountYear
//   );

//   withdrawalFactory.processWithdrawals();

//   const incomeResults = withdrawalFactory.getFinalIncomeResults();

//   // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
//   // But we can use the taxable amounts from retirement.js

//   const mySsBenefits = {
//     _description: "Social Security Benefits Breakdown",
//     income: fixedIncomeStreams.mySs,
//     taxablePortion: incomeResults.ssBreakdown.myTaxablePortion,
//     nonTaxablePortion: incomeResults.ssBreakdown.myNonTaxablePortion,
//     portionOfTotalBenefits: incomeResults.ssBreakdown.myPortion,
//     calculationDetails: [
//       withLabel("incomeResults.ssBreakdown", incomeResults.ssBreakdown),
//       withLabel("incomeStreams", fixedIncomeStreams),
//     ],
//   };

//   // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals

//   const ssIncome = SocialSecurityIncome.CreateUsing(incomeResults.ssBreakdown);

//   const taxes = Taxes.CreateUsing(
//     0,
//     incomeResults.incomeBreakdown.standardDeduction,
//     incomeResults.incomeBreakdown.federalIncomeTax,
//     0
//   );

//   const totals = {
//     _description: "Totals Breakdown",
//     reportableIncome: incomeResults.incomeBreakdown.totalReportedIncome,
//     taxableIncome: incomeResults.incomeBreakdown.taxableIncome,
//     netIncome: incomeResults.incomeBreakdown.netIncome,
//     calculationDetails: [
//       withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
//     ],
//   };

//   const savings = {
//     _description: "Savings",
//     startingBalance: accountYear.getStartingBalance(ACCOUNT_TYPES.SAVINGS),
//     withdrawals: accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
//     earnedInterest: accountYear.getDeposits(
//       ACCOUNT_TYPES.SAVINGS,
//       TRANSACTION_CATEGORY.INTEREST
//     ),
//     deposits: accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS),
//     endingBalance: accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS),
//     calculationDetails: [withLabel("accounts.savings", accountYear)],
//   };

//   const pensionBreakdown = {
//     subjectPension: incomeResults.incomeBreakdown.subjectPension,
//     federalTaxesPaid:
//       incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfFederalIncomeTax(
//         incomeResults.incomeBreakdown.subjectPension
//       ),
//     subjectNetIncome:
//       incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfNetIncome(
//         incomeResults.incomeBreakdown.subjectPension
//       ),
//     partnerIncome: incomeResults.incomeBreakdown.partnerPension,
//     partnerFederalTaxesPaid:
//       incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfFederalIncomeTax(
//         incomeResults.incomeBreakdown.partnerPension
//       ),
//     partnerNetIncome:
//       incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfNetIncome(
//         incomeResults.incomeBreakdown.partnerPension
//       ),
//     _description: "Pension Benefits Breakdown",
//     calculationDetails: withLabel(
//       "incomeResults.incomeBreakdown",
//       incomeResults.incomeBreakdown
//     ),
//   };

//   const savingsBreakdown = {
//     _description: "Savings Breakdown",
//     startingBalance: savings.startingBalance,
//     withdrawals: savings.withdrawals,
//     growthRate: `${inputs.savingsInterestRate * 100}%`,
//     interestEarned: savings.earnedInterest,
//     deposits: savings.deposits,
//     endingBalance: savings.endingBalance,
//     calculationDetails: [withLabel("savings", savings)],
//   };

//   const spouseSsBenefits = {
//     _description: "Spouse Social Security Benefits Breakdown",
//     income: fixedIncomeStreams.spouseSs,
//     taxablePortion: incomeResults.ssBreakdown.spouseTaxablePortion,
//     nonTaxablePortion: incomeResults.ssBreakdown.spouseNonTaxablePortion,
//     portionOfTotalBenefits: incomeResults.ssBreakdown.spousePortion,
//     calculationDetails: [
//       withLabel("incomeResults.ssBreakdown", incomeResults.ssBreakdown),
//       withLabel("incomeStreams", fixedIncomeStreams),
//     ],
//   };

//   const myPensionBenefits = {
//     _description: "Pension Benefits Breakdown",
//     income: fixedIncomeStreams.myPension,
//   };

//   const spousePensionBenefits = {
//     _description: "Spouse Pension Benefits Breakdown",
//     income: fixedIncomeStreams.spousePension,
//   };

//   // Update all the final values in the result object
//   // result.expenditures = expenditureTracker.totalBudgeted();

//   // result.withdrawals = withdrawals;
//   result.ss = ssIncome;

//   // result.pen = pensionIncome;
//   result.taxes = taxes;
//   // result.standardDeduction = incomeResults.incomeBreakdown.standardDeduction;
//   result.totals = totals;
//   result.balances = Balances.CreateUsing(accountYear);
//   // result.disbursements = Disbursements.CreateUsing(accountYear);
//   result.revenue = Income.CreateFrom(accountYear, ACCOUNT_TYPES.REVENUE);
//   result.grossIncome = Income.CreateFrom(
//     accountYear,
//     ACCOUNT_TYPES.DISBURSEMENT
//   );
//   result.fiscalData = fiscalData;
//   result.demographics = demographics;
//   result.mySsBenefits = mySsBenefits;
//   result.spouseSsBenefits = spouseSsBenefits;
//   result.myPensionBenefits = myPensionBenefits;
//   result.spousePensionBenefits = spousePensionBenefits;
//   result.fixedIncomeStreams = fixedIncomeStreams;
//   result.savings = savings;

//   // Add breakdown data
//   result.incomeBreakdown = incomeResults.incomeBreakdown;
//   // result.withdrawalBreakdown = withdrawals;
//   result.ssBreakdown = incomeResults.ssBreakdown;
//   result.pensionBreakdown = pensionBreakdown;
//   result.savingsBreakdown = savingsBreakdown;

//   // debugger;
//   const description = `
// -----------------------------------------------
// --- Retirement Year ${fiscalData.yearIndex + 1} (Age ${demographics.age}) (Year ${demographics.retirementYear}) ---
// -----------------------------------------------`;

//   console.log(description);
//   // @ts-ignore
//   const debugData = DebugData.CreateUsing(
//     demographics,
//     fiscalData,
//     incomeResults.incomeBreakdown,
//     accountYear,
//     taxes
//   );

//   result._description = description;
//   // @ts-ignore
//   const temp = {
//     income: {
//       netIncome: incomeResults.incomeBreakdown.netIncome.asCurrency(),
//       interestIncome: savings.earnedInterest,
//       spend: fiscalData.spend.asCurrency(),
//       shortfall: Math.max(
//         fiscalData.spend -
//           savings.earnedInterest -
//           accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS),
//         0
//       ).asCurrency(),
//       overage: Math.max(
//         accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS) -
//           savings.earnedInterest -
//           fiscalData.spend,
//         0
//       ).asCurrency(),
//     },
//     savings: {
//       startingBalance: accountYear
//         .getStartingBalance(ACCOUNT_TYPES.SAVINGS)
//         .asCurrency(),
//       withdrawals: accountYear
//         .getWithdrawals(ACCOUNT_TYPES.SAVINGS)
//         .asCurrency(),
//       deposits: accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS).asCurrency(),
//       endingBalance: accountYear
//         .getEndingBalance(ACCOUNT_TYPES.SAVINGS)
//         .asCurrency(),
//       //   .startingBalanceForYear(fiscalData.taxYear)
//       //   .asCurrency(),
//       // withdrawals: accountYear.savings
//       //   .withdrawalsForYear(fiscalData.taxYear)
//       //   .asCurrency(),
//       // deposits: accountYear.savings
//       //   .depositsForYear(fiscalData.taxYear)
//       //   .asCurrency(),
//       // endingBalance: accountYear.savings
//       //   .endingBalanceForYear(fiscalData.taxYear)
//       //   .asCurrency(),
//       // interestEarned: accounts.savings
//       //   .depositsForYear(fiscalData.taxYear, TRANSACTION_CATEGORY.INTEREST)
//       //   .asCurrency(),
//     },
//     trad401k: {
//       startingBalance: accountYear
//         .getStartingBalance(ACCOUNT_TYPES.TRAD_401K)
//         .asCurrency(),
//       withdrawals: accountYear
//         .getWithdrawals(ACCOUNT_TYPES.TRAD_401K)
//         .asCurrency(),
//       deposits: accountYear.getDeposits(ACCOUNT_TYPES.TRAD_401K).asCurrency(),
//       endingBalance: accountYear
//         .getEndingBalance(ACCOUNT_TYPES.TRAD_401K)
//         .asCurrency(),
//       interestEarned: accountYear
//         .getDeposits(ACCOUNT_TYPES.TRAD_401K, TRANSACTION_CATEGORY.INTEREST)
//         .asCurrency(),
//     },
//   };

//   // debugData.dump("Debug Data");
//   // temp.dump("Balances");
//   // debugger;
//   // debugData.dump("debugData");
//   // accounts.savings.dump("Savings");
//   // accounts.trad401k.dump("401k");
//   // debugger;

//   // result.dump("result");

//   // result.income.dump();
//   // result.balances.dump();
//   return result;
// }
