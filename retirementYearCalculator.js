/**
 * Calculate comprehensive retirement year data including income, withdrawals, taxes, and account balances
 * with proper Social Security taxation based on total income calculations.
 *
 * This function performs a complete retirement year simulation by:
 * 1. Creating demographic and fiscal data contexts
 * 2. Calculating income streams from various sources (SS, pension, interest)
 * 3. Determining optimal withdrawal strategy across account types
 * 4. Computing tax implications with proper SS taxation rules
 * 5. Updating account balances with interest and transactions
 * 6. Generating comprehensive breakdown reports
 *
 * @param {Inputs} inputs - Retirement calculation inputs containing demographics,
 *   financial parameters, and configuration settings. Must include properties like:
 *   - retSavings: savings account growth rate
 *   - ret401k: 401k growth rate
 *   - retRoth: Roth IRA growth rate
 *   - retirement year and age information
 * @param {AccountGroup} accounts - Collection of retirement accounts including:
 *   - savings: Savings account instance
 *   - trad401k: Traditional 401k account instance
 *   - rothIra: Roth IRA account instance
 *   Each account must support withdrawal, deposit, and balance calculation methods
 * @param {BenefitAmounts} benefitAmounts - Social Security and pension benefit amounts
 *   for both primary and spouse, used for income stream calculations
 *
 * @returns {RetirementYearData} Comprehensive retirement year calculation results containing:
 *   - demographics: Age and retirement year information
 *   - fiscalData: Tax year and spending parameters
 *   - incomeStreams: All income sources (SS, pension, interest, RMD)
 *   - incomeBreakdown: Detailed taxable/non-taxable income analysis
 *   - withdrawals: Breakdown of withdrawals from each account type
 *   - balances: Ending balances for all accounts
 *   - taxes: Federal tax calculations and effective rates
 *   - breakdowns: Detailed analysis for SS, pension, savings, and retirement accounts
 *
 * @throws {Error} When required account methods are missing or inputs are invalid
 * @throws {Error} When withdrawal calculations fail due to insufficient funds
 *
 * @example
 * // Calculate retirement year data for a 65-year-old
 * const inputs = RetirementInputs.CreateUsing(userInputData);
 * const accounts = AccountGroup.CreateUsing(accountData);
 * const benefits = BenefitAmounts.CreateUsing(benefitData);
 *
 * const yearData = calculateRetirementYearData(inputs, accounts, benefits);
 * console.log(`Net income: ${yearData.totals.netIncome}`);
 * console.log(`Federal taxes: ${yearData.taxes.federalTaxes}`);
 * console.log(`Account balances: ${yearData.balances.total()}`);
 *
 * @see {@link IncomeStreams} For income stream calculation details
 * @see {@link SsBenefits} For Social Security taxation methodology
 * @see {@link AccountPortioner} For withdrawal strategy logic
 * @see {@link RetirementYearData} For complete result structure
 *
 * @since 1.0.0
 * @author Retirement Calculator System
 */
function calculateRetirementYearData(inputs, accounts, benefitAmounts) {
  // kill the logger for now
  LOG_LEVEL = 0;

  // Declare and initialize the result object at the top
  const result = RetirementYearData.Empty();

  const demographics = Demographics.CreateUsing(inputs, true, false);

  const fiscalData = FiscalData.CreateUsing(inputs, TAX_BASE_YEAR);

  const incomeStreams = IncomeStreams.CreateUsing(
    demographics,
    benefitAmounts,
    accounts,
    fiscalData,
    inputs
  );

  // Build complete taxable income picture for withdrawal functions

  // debugger;
  const withdrawalFactory = withdrawalFactoryJS_createWithdrawalFactory(
    incomeStreams,
    fiscalData,
    demographics,
    accounts
  );

  const estimatedIncomeBefore401kWithdrawal =
    retirementJS_calculateIncomeWhen401kWithdrawalIs(
      0,
      incomeStreams,
      demographics,
      fiscalData
    );

  // reduce the spend temporarily to determine the shortfall that needs to be covered by 401k, savings, and roth

  const estimatedFixedRecurringIncomeNet =
    estimatedIncomeBefore401kWithdrawal.incomeBreakdown.netIncomeLessReportedEarnedInterest();

  // reduce the spend by the estimated net income from SS, Pension, etc
  let shortfall = fiscalData.spend - estimatedFixedRecurringIncomeNet; // whittle down recurring net income by 5%

  const accountPortioner = new AccountPortioner(
    accounts,
    fiscalData,
    shortfall
  );

  // let totalWithdrawals = 0;

  const withdrawalBreakdown = {
    retirementAccount: 0,
    savings: 0,
    roth: 0,
    rmd: incomeStreams.rmd,
    totalWithdrawals() {
      return this.retirementAccount + this.savings + this.roth + this.rmd;
    },
  };

  if (shortfall > 0) {
    const withdrawal = withdrawalFactory.withdrawFromTargetedAccount(
      accountPortioner.savingsAsk(),
      ACCOUNT_TYPES.SAVINGS
    );
    shortfall -= withdrawal;
    withdrawalBreakdown.savings = withdrawal;
  }

  if (shortfall > 0) {
    // let thisSpend = spend * 0.1;
    const withdrawal = withdrawalFactory.withdrawFromTargetedAccount(
      accountPortioner.rothAsk(),
      ACCOUNT_TYPES.ROTH_IRA
    );
    shortfall -= withdrawal;
    withdrawalBreakdown.roth = withdrawal;
  }
  if (shortfall > 0) {
    const withdrawal = withdrawalFactory.withdrawFromTargetedAccount(
      shortfall + estimatedFixedRecurringIncomeNet,
      ACCOUNT_TYPES.TRADITIONAL_401K,
      false
    );
    shortfall -= withdrawal;
    withdrawalBreakdown.retirementAccount = withdrawal;
  }

  // if anything hasn't already been accounted for (like income taxes due when 401k is empty), try taking it from Savings
  if (shortfall > 0) {
    shortfall -= withdrawalFactory.withdrawFromTargetedAccount(
      shortfall,
      ACCOUNT_TYPES.SAVINGS,
      false
    );
  }

  //TODO: What if remainingSpend still isn't zero at this point?

  // Deposit interest earned into accounts

  incomeStreams.actualEarnedInterest =
    accounts.savings.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    );

  accounts.savings.deposit(
    incomeStreams.actualEarnedInterest,
    "interest",
    fiscalData.taxYear
  );

  const actualSpend = Math.min(
    accounts.savings.endingBalanceForYear(fiscalData.taxYear),
    fiscalData.spend.asCurrency()
  );
  accounts.savings.withdrawal(
    actualSpend,
    TRANSACTION_CATEGORY.DISBURSEMENT,
    fiscalData.taxYear
  );

  accounts.trad401k.deposit(
    accounts.trad401k.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    ),
    "interest",
    fiscalData.taxYear
  );
  accounts.rothIra.deposit(
    accounts.rothIra.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    ),
    "interest",
    fiscalData.taxYear
  );

  const incomeResults = withdrawalFactory.getFinalIncomeResults();

  // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
  // But we can use the taxable amounts from retirement.js

  const mySsBenefits = {
    _description: "Social Security Benefits Breakdown",
    income: incomeStreams.mySs,
    taxablePortion: incomeResults.ssBreakdown.myTaxablePortion(),
    nonTaxablePortion: incomeResults.ssBreakdown.myNonTaxablePortion(),
    portionOfTotalBenefits: incomeResults.ssBreakdown.myPortion,
    calculationDetails: [
      withLabel("incomeResults.ssBreakdown", incomeResults.ssBreakdown),
      withLabel("incomeStreams", incomeStreams),
    ],
  };

  // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals

  const ssIncome = {
    _description: "Social Security Income",
    mySsGross: incomeResults.ssBreakdown.myPortion,
    myTaxablePortion: incomeResults.ssBreakdown.myTaxablePortion(),
    myNonTaxablePortion: incomeResults.ssBreakdown.myNonTaxablePortion(),
    spouseSsGross: incomeResults.ssBreakdown.spousePortion,
    spouseTaxablePortion: incomeResults.ssBreakdown.spouseTaxablePortion() || 0,
    spouseNonTaxable: incomeResults.ssBreakdown.spouseNonTaxablePortion() || 0,
    provisionalIncome: incomeResults.ssBreakdown.provisionalIncome,
    calculationDetails: withLabel(
      "incomeResults.ssBreakdown",
      incomeResults.ssBreakdown
    ),
  };

  const taxes = Taxes.CreateUsing(
    0,
    incomeResults.incomeBreakdown.standardDeduction,
    incomeResults.incomeBreakdown.federalIncomeTax,
    0
  );

  // const taxes = {
  //   _description: "Taxes Income",
  //   federalTaxes: incomeResults.incomeBreakdown.federalIncomeTax,
  //   effectiveTaxRate: incomeResults.incomeBreakdown.effectiveTaxRate(),
  //   standardDeduction: incomeResults.incomeBreakdown.standardDeduction,
  //   calculationDetails: withLabel(
  //     "incomeResults.incomeBreakdown",
  //     incomeResults.incomeBreakdown
  //   ),
  // };

  const balances = Balances.CreateUsing(accounts, fiscalData);
  // const balances = {
  //   _description: "Account Balances",
  //   savings: accounts.savings
  //     .endingBalanceForYear(fiscalData.taxYear)
  //     .asCurrency(),
  //   trad401k: accounts.trad401k
  //     .endingBalanceForYear(fiscalData.taxYear)
  //     .asCurrency(),
  //   rothIra: accounts.rothIra
  //     .endingBalanceForYear(fiscalData.taxYear)
  //     .asCurrency(),
  //   total() {
  //     return this.savings + this.trad401k + this.rothIra;
  //   },
  //   calculationDetails: withLabel("accountBalances", accounts),
  // };
  //

  const withdrawals = Withdrawals.CreateUsing(
    accounts,
    incomeStreams,
    fiscalData
  );

  // {
  //   _description: "Withdrawals Breakdown",
  //   trad401k: accounts.trad401k.withdrawalsForYear(fiscalData.taxYear),
  //   savings: accounts.savings.withdrawalsForYear(fiscalData.taxYear),
  //   roth: accounts.rothIra.withdrawalsForYear(fiscalData.taxYear),
  //   rmd: incomeResults.incomeBreakdown.rmd,
  //   total() {
  //     return this.trad401k + this.savings + this.roth + this.rmd;
  //   },
  //   calculationDetails: [
  //     withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
  //     withLabel("accounts", accounts),
  //   ],
  // };

  // const deposits = {
  //   _description: "Deposits Breakdown",
  //   trad401k: accounts.trad401k.depositsForYear(fiscalData.taxYear),
  //   savings: accounts.savings.depositsForYear(fiscalData.taxYear),
  //   roth: accounts.rothIra.depositsForYear(fiscalData.taxYear),
  //   rmd: incomeResults.incomeBreakdown.rmd,
  //   total() {
  //     return this.trad401k + this.savings + this.roth + this.rmd;
  //   },
  //   calculationDetails: [
  //     withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
  //     withLabel("accounts", accounts),
  //   ],
  // };

  const totals = {
    _description: "Totals Breakdown",
    reportableIncome: incomeResults.incomeBreakdown.reportableIncome(),
    taxableIncome: incomeResults.incomeBreakdown.taxableIncome(),
    netIncome:
      incomeResults.incomeBreakdown.netIncomeLessReportedEarnedInterest(),
    calculationDetails: [
      withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
    ],
  };

  const savings = {
    _description: "Savings",
    startingBalance: accounts.savings.startingBalanceForYear(
      fiscalData.taxYear
    ),
    withdrawals: accounts.savings.withdrawalsForYear(fiscalData.taxYear),
    earnedInterest: accounts.savings.depositsForYear(
      fiscalData.taxYear,
      TRANSACTION_CATEGORY.INTEREST
    ),
    deposits: accounts.savings.depositsForYear(fiscalData.taxYear),
    endingBalance: accounts.savings
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency(),
    calculationDetails: [withLabel("accounts.savings", accounts.savings)],
  };

  const pensionBreakdown = {
    myIncome: incomeResults.incomeBreakdown.myPension,
    myFederalTaxes:
      incomeResults.incomeBreakdown.translateGrossAmountToPortionOfFederalIncomeTax(
        incomeResults.incomeBreakdown.myPension
      ),
    myNetIncome: incomeResults.incomeBreakdown.translateGrossAmountToNet(
      incomeResults.incomeBreakdown.myPension
    ),
    spouseIncome: incomeResults.incomeBreakdown.spousePension,
    spouseFederalTaxes:
      incomeResults.incomeBreakdown.translateGrossAmountToPortionOfFederalIncomeTax(
        incomeResults.incomeBreakdown.spousePension
      ),
    spouseNetIncome: incomeResults.incomeBreakdown.translateGrossAmountToNet(
      incomeResults.incomeBreakdown.spousePension
    ),
    _description: "Pension Benefits Breakdown",
    calculationDetails: withLabel(
      "incomeResults.incomeBreakdown",
      incomeResults.incomeBreakdown
    ),
  };

  // const ssBreakdown = {
  //   _description: "Social Security Benefits Breakdown",
  //   mySsGross: incomeResults.ssBreakdown.myPortion, // Total gross SS benefits from retirement.js
  //   mySsTaxableAmount: incomeResults.ssBreakdown.myTaxablePortion(), // Total taxable portion from retirement.js
  //   mySsNonTaxable: incomeResults.ssBreakdown.myNonTaxablePortion(), // Total non-taxable portion from retirement.js
  //   ssSpouseTaxableAmount:
  //     incomeResults.ssBreakdown.spouseTaxablePortion() || 0, // Total taxable portion from retirement.js
  //   ssSpouseNonTaxable:
  //     incomeResults.ssBreakdown.spouseNonTaxablePortion() || 0,
  //   calculationDetails: withLabel(
  //     "incomeResults.ssBreakdown",
  //     incomeResults.ssBreakdown
  //   ), // Detailed calculation methodology from retirement.js
  // };

  const savingsBreakdown = {
    _description: "Savings Breakdown",
    startingBalance: savings.startingBalance,
    withdrawals: savings.withdrawals,
    growthRate: `${inputs.retSavings * 100}%`,
    interestEarned: savings.earnedInterest,
    deposits: savings.deposits,
    endingBalance: savings.endingBalance,
    calculationDetails: [withLabel("savings", savings)],
  };

  const retirementAccountBreakdown = RetirementAccountBreakdown.CreateUsing(
    accounts.trad401k,
    fiscalData,
    inputs.ret401k
  );

  // const retirementAccountBreakdown = {
  //   _description: "Retirement Account Breakdown",
  //   startingBalance: accounts.trad401k.startingBalanceForYear(
  //     fiscalData.taxYear
  //   ),
  //   withdrawals: accounts.trad401k.withdrawalsForYear(fiscalData.taxYear),
  //   growthRate: `${inputs.ret401k * 100}%`,
  //   interestEarned: accounts.trad401k.depositsForYear(
  //     fiscalData.taxYear,
  //     TRANSACTION_CATEGORY.INTEREST
  //   ),
  //   deposits: accounts.trad401k.depositsForYear(fiscalData.taxYear),
  //   endingBalance: accounts.trad401k
  //     .endingBalanceForYear(fiscalData.taxYear)
  //     .asCurrency(),
  // };

  const rothAccountBreakdown = RetirementAccountBreakdown.CreateUsing(
    accounts.rothIra,
    fiscalData,
    inputs.retRoth
  );

  // {
  //   _description: "Retirement Account Breakdown",
  //   startingBalance: accounts.rothIra.startingBalanceForYear(
  //     fiscalData.taxYear
  //   ),
  //   withdrawals: accounts.rothIra.withdrawalsForYear(fiscalData.taxYear),
  //   growthRate: `${inputs.retRoth * 100}%`,
  //   interestEarned: accounts.rothIra.depositsForYear(
  //     fiscalData.taxYear,
  //     TRANSACTION_CATEGORY.INTEREST
  //   ),
  //   deposits: accounts.rothIra.depositsForYear(fiscalData.taxYear),
  //   endingBalance: accounts.rothIra
  //     .endingBalanceForYear(fiscalData.taxYear)
  //     .asCurrency(),
  // };

  // const expenditureBreakdown = {
  //   _description: "Expenditures Breakdown",
  //   budgeted: expenditureTracker.budgeted,
  //   additionalSpending: expenditureTracker.additionalSpending,
  //   totalBudgeted: expenditureTracker.totalBudgeted(),
  //   withdrawalsMade: expenditureTracker.withdrawalsMade.total(),
  //   depositsMade: expenditureTracker.depositsMade.total(),
  //   actualExpenditures: expenditureTracker.actualExpenditures(),
  //   shortfall: expenditureTracker.shortfall(),
  //   calculationDetails: [withLabel("expenditureTracker", expenditureTracker)],
  // };

  // const incomeBreakdown = {
  //   _description: "Income Breakdown",
  //   myPension: incomeResults.incomeBreakdown.myPension,
  //   spousePension: incomeResults.incomeBreakdown.spousePension,
  //   reportedEarnedInterest:
  //     incomeResults.incomeBreakdown.reportedEarnedInterest,
  //   actualEarnedInterest: incomeResults.incomeBreakdown.actualEarnedInterest,
  //   otherTaxableIncomeAdjustments:
  //     incomeResults.incomeBreakdown.otherTaxableIncomeAdjustments,
  //   rmd: incomeResults.incomeBreakdown.rmd,
  //   mySs: incomeResults.ssBreakdown.myPortion,
  //   spouseSs: incomeResults.ssBreakdown.spousePortion,
  //   taxFreeIncomeAdjustment: inputs.taxFreeIncomeAdjustment,
  //   reportableIncome: incomeResults.incomeBreakdown.reportableIncome(),
  //   taxableIncome: incomeResults.incomeBreakdown.taxableIncome(),
  //   federalIncomeTax: incomeResults.incomeBreakdown.federalIncomeTax,
  //   netIncome:
  //     incomeResults.incomeBreakdown.netIncomeLessReportedEarnedInterest(),
  //   calculationDetails: [
  //     withLabel("incomeStreams", incomeStreams),
  //     withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
  //   ],
  // };

  const spouseSsBenefits = {
    _description: "Spouse Social Security Benefits Breakdown",
    income: incomeStreams.spouseSs,
    taxablePortion: incomeResults.ssBreakdown.spouseTaxablePortion(),
    nonTaxablePortion: incomeResults.ssBreakdown.spouseNonTaxablePortion(),
    portionOfTotalBenefits: incomeResults.ssBreakdown.spousePortion,
    calculationDetails: [
      withLabel("incomeResults.ssBreakdown", incomeResults.ssBreakdown),
      withLabel("incomeStreams", incomeStreams),
    ],
  };

  const myPensionBenefits = {
    _description: "Pension Benefits Breakdown",
    income: incomeStreams.myPension,
  };

  const spousePensionBenefits = {
    _description: "Spouse Pension Benefits Breakdown",
    income: incomeStreams.spousePension,
  };

  // Update all the final values in the result object
  // result.expenditures = expenditureTracker.totalBudgeted();

  result.withdrawals = withdrawals;
  result.ss = ssIncome;

  // result.pen = pensionIncome;
  result.taxes = taxes;
  // result.standardDeduction = incomeResults.incomeBreakdown.standardDeduction;
  result.totals = totals;
  result.balances = balances;
  result.fiscalData = fiscalData;
  result.demographics = demographics;
  result.mySsBenefits = mySsBenefits;
  result.spouseSsBenefits = spouseSsBenefits;
  result.myPensionBenefits = myPensionBenefits;
  result.spousePensionBenefits = spousePensionBenefits;
  result.incomeStreams = incomeStreams;
  result.savings = savings;

  // Add breakdown data
  result.incomeBreakdown = incomeResults.incomeBreakdown;
  result.withdrawalBreakdown = withdrawalBreakdown;
  result.ssBreakdown = incomeResults.ssBreakdown;
  result.pensionBreakdown = pensionBreakdown;
  result.savingsBreakdown = savingsBreakdown;
  result.retirementAccountBreakdown = retirementAccountBreakdown;
  result.rothAccountBreakdown = rothAccountBreakdown;
  // result.expendituresBreakdown = expenditureBreakdown;

  // debugger;
  const description = `
-----------------------------------------------
--- Retirement Year ${fiscalData.yearIndex + 1} (Age ${demographics.age}) (Year ${demographics.retirementYear}) ---
-----------------------------------------------`;

  console.log(description);

  // const debugData = {
  //   age: demographics.age,
  //   spend: fiscalData.spend,
  //   income: {
  //     total: result.incomeStreams.totalIncome(),
  //     breakdown: {
  //       socialSec: result.incomeStreams.ssIncome(),
  //       pension: result.incomeStreams.pensionIncome(),
  //       interest: accounts.savings
  //         .calculateInterestForYear(
  //           INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
  //           fiscalData.taxYear
  //         )
  //         .asCurrency(),
  //       rmd: result.incomeStreams.rmd,
  //       otherTaxableIncome: result.incomeStreams.otherTaxableIncomeAdjustments,
  //       taxFreeIncome: result.incomeStreams.taxFreeIncomeAdjustment,
  //     },
  //   },
  //   federalTaxes: taxes.federalTaxesOwed,
  //   netIncome: incomeResults.incomeBreakdown.netIncome,
  //   deposits: {
  //     total: deposits.total().asCurrency(),
  //     breakdown: {
  //       savings: deposits.savings,
  //       roth: deposits.roth,
  //       trad401k: deposits.trad401k,
  //     },
  //   },
  //   withdrawals: {
  //     total: withdrawals.total(),
  //     breakdown: {
  //       savings: withdrawals.savings,
  //       roth: withdrawals.roth,
  //       trad401k: withdrawals.trad401k,
  //       rmd: withdrawals.rmd,
  //     },
  //   },
  //   accounts: { ...accounts },
  // };

  // const temp = {
  //   income: {
  //     netIncome: incomeResults.incomeBreakdown
  //       .netIncomeLessReportedEarnedInterest()
  //       .asCurrency(),
  //     interestIncome: savings.earnedInterest,
  //     spend: fiscalData.spend.asCurrency(),
  //     shortfall: Math.max(
  //       fiscalData.spend -
  //         savings.earnedInterest -
  //         accounts.savings.depositsForYear(fiscalData.taxYear),
  //       0
  //     ).asCurrency(),
  //     overage: Math.max(
  //       accounts.savings.depositsForYear(fiscalData.taxYear) -
  //         savings.earnedInterest -
  //         fiscalData.spend,
  //       0
  //     ).asCurrency(),
  //   },
  //   savings: {
  //     startingBalance: accounts.savings
  //       .startingBalanceForYear(fiscalData.taxYear)
  //       .asCurrency(),
  //     withdrawals: accounts.savings
  //       .withdrawalsForYear(fiscalData.taxYear)
  //       .asCurrency(),
  //     deposits: accounts.savings
  //       .depositsForYear(fiscalData.taxYear)
  //       .asCurrency(),
  //     endingBalance: accounts.savings
  //       .endingBalanceForYear(fiscalData.taxYear)
  //       .asCurrency(),
  //     // interestEarned: accounts.savings
  //     //   .depositsForYear(fiscalData.taxYear, TRANSACTION_CATEGORY.INTEREST)
  //     //   .asCurrency(),
  //   },
  //   trad401k: {
  //     startingBalance: accounts.trad401k
  //       .startingBalanceForYear(fiscalData.taxYear)
  //       .asCurrency(),
  //     withdrawals: accounts.trad401k.withdrawalsForYear(fiscalData.taxYear),
  //     deposits: accounts.trad401k
  //       .depositsForYear(fiscalData.taxYear)
  //       .asCurrency(),
  //     endingBalance: accounts.trad401k
  //       .endingBalanceForYear(fiscalData.taxYear)
  //       .asCurrency(),
  //     interestEarned: accounts.trad401k
  //       .depositsForYear(fiscalData.taxYear, TRANSACTION_CATEGORY.INTEREST)
  //       .asCurrency(),
  //   },
  // };

  // temp.dump("Balances");
  // debugger;
  // debugData.dump("debugData");
  // accounts.savings.dump("Savings");
  // accounts.trad401k.dump("401k");
  // debugger;

  // result.dump("result");

  // result.income.dump();
  // result.balances.dump();
  return result;
}
