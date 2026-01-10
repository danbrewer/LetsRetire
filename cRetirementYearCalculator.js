import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { Inputs } from "./cInputs.js";
import { TAX_BASE_YEAR } from "./consts.js";
import { RetirementYearData } from "./cRetirementYearData.js";
import { TransactionCategory } from "./cTransaction.js";
import { WithdrawalFactory } from "./cWithdrawalFactory.js";
import { withLabel } from "./debugUtils.js";

/**
 * RetirementYearCalculator class - Handles comprehensive retirement year calculations
 * Provides detailed analysis for the distribution phase of retirement planning
 */
class RetirementYearCalculator {
  /** @type {Inputs} */
  #inputs;
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;
  /** @type {WithdrawalFactory} */
  #withdrawalFactory;
  /** @type {AdjustableIncomeStreams} */
  #adjustableIncomeStreams;

  /**
   * Create retirement year calculator with input configuration
   * @param {Inputs} inputs - Retirement calculation inputs containing demographics,
   * @param {AccountingYear} accountYear - Collection of retirement accounts for fiscal year
   *   - savings: Savings account instance
   *   - trad401k: Traditional 401k account instance
   *   - rothIra: Roth IRA account instance
   *   Each account must support withdrawal, deposit, and balance calculation methods
   *   financial parameters, and configuration settings
   */
  constructor(inputs, accountYear) {
    this.#inputs = inputs;
    this.#accountYear = accountYear;

    this.#demographics = Demographics.CreateUsing(this.#inputs, true, false);

    this.#fiscalData = FiscalData.CreateUsing(this.#inputs, TAX_BASE_YEAR);

    this.#fixedIncomeStreams = FixedIncomeStreams.CreateUsing(
      this.#demographics,
      this.#accountYear,
      this.#fiscalData,
      this.#inputs
    );

    this.#adjustableIncomeStreams = new AdjustableIncomeStreams(
      this.#demographics,
      this.#accountYear,
      this.#fiscalData,
      this.#inputs
    );

    this.#withdrawalFactory = WithdrawalFactory.CreateUsing(
      this.#fixedIncomeStreams,
      this.#adjustableIncomeStreams,
      this.#fiscalData,
      this.#demographics,
      this.#accountYear
    );
  }

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
   * const calculator = new RetirementYearCalculator(inputs);
   * const yearData = calculator.calculateRetirementYearData(accountYear, benefits);
   *
   * console.log(`Net income: ${yearData.totals.netIncome}`);
   * console.log(`Federal taxes: ${yearData.taxes.federalTaxes}`);
   * console.log(`Account balances: ${yearData.balances.total()}`);
   *
   * @see {@link FixedIncomeStreams} For income stream calculation details
   * @see {@link SsBenefits} For Social Security taxation methodology
   * @see {@link AccountPortioner} For withdrawal strategy logic
   * @see {@link RetirementYearData} For complete result structure
   *
   * @since 1.0.0
   * @author Retirement Calculator System
   */
  calculateRetirementYearData() {
    // kill the logger for now

    // Declare and initialize the result object at the top

    // Build complete taxable income picture for withdrawal functions

    this.#withdrawalFactory.processIncome();

    const incomeBreakdown = this.#withdrawalFactory.incomeBreakdown;
    const ssBreakdown = this.#withdrawalFactory.ssBreakdown;
    const taxes = this.#withdrawalFactory.taxes;

    // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
    // But we can use the taxable amounts from retirement.js

    // @ts-ignore
    const mySsBenefits = {
      _description: "Social Security Benefits Breakdown",
      income: this.#fixedIncomeStreams.subjectSsGross,
      // taxablePortion:
      //   incomeBreakdown.ssCalculationDetails?.subjectTaxablePortion,
      // nonTaxablePortion:
      //   incomeBreakdown.ssCalculationDetails?.subjectNonTaxablePortion,
      // portionOfTotalBenefits:
      //   incomeBreakdown.ssCalculationDetails?.subjectPortion,
      calculationDetails: [
        withLabel("ssBreakdown", ssBreakdown),
        // withLabel("incomeStreams", this.#fixedIncomeStreams),
      ],
    };

    // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals

    // const ssIncome = SocialSecurityIncome.CreateUsing(
    //   incomeResults.ssBreakdown
    // );

    const totals = {
      _description: "Totals Breakdown",
      reportableIncome: incomeBreakdown.grossIncome,
      taxableIncome: incomeBreakdown.adjustedGrossIncome,
      netIncome: incomeBreakdown.actualIncome, // getNetIncomeMinusReportedEarnedInterest,
      calculationDetails: [withLabel("incomeResults", incomeBreakdown)],
    };

    const savings = {
      _description: "Savings",
      startingBalance: this.#accountYear.getStartingBalance(
        ACCOUNT_TYPES.SAVINGS
      ),
      withdrawals: this.#accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
      earnedInterest: this.#accountYear.getDeposits(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.Interest
      ),
      deposits: this.#accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS),
      endingBalance: this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS),
      calculationDetails: [withLabel("accounts.savings", this.#accountYear)],
    };

    // const pensionBreakdown = {
    //   subjectPension: incomeResults.incomeBreakdown.pension,
    //   federalTaxesPaid:
    //     incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfFederalIncomeTax(
    //       this.#inputs.subjectPension
    //     ),
    //   subjectNetIncome:
    //     incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfNetIncome(
    //       this.#inputs.subjectPension
    //     ),
    //   partnerIncome: this.#inputs.spousePension, // incomeResults.incomeBreakdown.partnerPension,
    //   partnerFederalTaxesPaid:
    //     incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfFederalIncomeTax(
    //       this.#inputs.spousePension
    //     ),
    //   partnerNetIncome:
    //     incomeResults.incomeBreakdown.grossIncomeAmountAsPercentageOfNetIncome(
    //       this.#inputs.spousePension
    //     ),
    //   _description: "Pension Benefits Breakdown",
    //   calculationDetails: withLabel(
    //     "incomeResults.incomeBreakdown",
    //     incomeResults.incomeBreakdown
    //   ),
    // };

    // const savingsBreakdown = {
    //   _description: "Savings Breakdown",
    //   startingBalance: savings.startingBalance,
    //   withdrawals: savings.withdrawals,
    //   growthRate: `${this.#inputs.savingsInterestRate * 100}%`,
    //   interestEarned: savings.earnedInterest,
    //   deposits: savings.deposits,
    //   endingBalance: savings.endingBalance,
    //   calculationDetails: [withLabel("savings", savings)],
    // };

    const spouseSsBenefits = {
      _description: "Spouse Social Security Benefits Breakdown",
      income: this.#fixedIncomeStreams.spouseSsGross,
      // taxablePortion:
      //   incomeBreakdown.ssCalculationDetails?.partnerTaxablePortion,
      // nonTaxablePortion:
      //   incomeBreakdown.ssCalculationDetails?.partnerNonTaxablePortion,
      // portionOfTotalBenefits:
      //   incomeBreakdown.ssCalculationDetails?.partnerPortion,
      calculationDetails: [
        withLabel(
          "ssBreakdown",
          ssBreakdown //incomeBreakdown.ssCalculationDetails
        ),
        // withLabel("incomeStreams", this.#fixedIncomeStreams),
      ],
    };

    const myPensionBenefits = {
      _description: "Pension Benefits Breakdown",
      income: this.#fixedIncomeStreams.subjectPensionGross,
    };

    const spousePensionBenefits = {
      _description: "Spouse Pension Benefits Breakdown",
      income: this.#fixedIncomeStreams.spousePensionGross,
    };

    const result = RetirementYearData.CreateUsing(
      this.#demographics,
      this.#fiscalData,
      this.#accountYear,
      incomeBreakdown,
      ssBreakdown,
      taxes
    );
    // demographics,
    // fiscalData,
    // // incomeResults.incomeBreakdown,
    // Income.CreateFrom(accountYear, ACCOUNT_TYPES.REVENUE),
    // Income.CreateFrom(accountYear, ACCOUNT_TYPES.DISBURSEMENT),
    // // expenditureTracker.getExpenditures(),
    // // fiscalData.spend,
    // // withdrawalFactory. getContributions(),
    // // withdrawalFactory.getWithdrawals(),
    // Balances.CreateUsing(accountYear),
    // SocialSecurityIncome.CreateUsing(incomeResults.ssBreakdown),
    // // myPensionBenefits,
    // // spousePensionBenefits,
    // // mySsBenefits,
    // // spouseSsBenefits,
    // // fixedIncomeStreams,
    // // incomeResults.incomeBreakdown,
    // taxes,
    // // totals,
    // // myPensionBenefits,
    // // spousePensionBenefits,
    // // mySsBenefits,
    // // spouseSsBenefits,
    // // savingsBreakdown,
    // // // withdrawalFactory. getWithdrawalBreakdown(),
    // // incomeResults.ssBreakdown,
    // // pensionBreakdown,
    // accountYear

    // incomeResults.incomeBreakdown.dump("incomeBreakdown");
    // debugger;

    // result.demographics = demographics;
    // result.fiscalData = fiscalData;
    // result.revenue = Income.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.REVENUE
    // );
    // result.disbursements = Income.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.DISBURSEMENT
    // );
    // result.balances = Balances.CreateUsing(this.#accountYear);

    // result.socialSecurityIncome = SocialSecurityIncome.CreateUsing(
    //   incomeBreakdown.ssCalculationDetails
    // );
    // result.taxes = Taxes.CreateUsing(incomeBreakdown);
    // result.savings = Balance.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.SAVINGS
    // );
    // result.trad401k = Balance.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.TRAD_401K
    // );
    // result.tradRoth = Balance.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.TRAD_ROTH
    // );
    // result.calculationDetails = [
    //   // withLabel("demographics", demographics),
    //   // withLabel("fiscalData", fiscalData),
    //   // withLabel("incomeResults", incomeResults),
    //   // withLabel("withdrawalFactory", withdrawalFactory),
    //   // withLabel("accountYear", this.#accountYear),
    // ];

    // debugData.dump("Debug Data");
    // temp.dump("Balances");
    // debugData.dump("debugData");
    // accounts.savings.dump("Savings");
    // accounts.trad401k.dump("401k");

    // fiscalData.dump("fiscalData");
    // result.livingExpenseFunds.dumpTransactionsByCategory();
    result.savingsTransactionAnalyzer.dumpTransactionsByCategory();

    result.savingsTransactionAnalyzer.dumpTransactionsSummaryByCategory()

    result.savingsTransactionAnalyzer.dumpTransactions();
    // result.dump("RetirementYearData");
    debugger;
    // result.income.dump();
    // result.balances.dump();
    return result;
  }

  /**
   * Get input configuration
   * @returns {Inputs} - Input configuration object
   */
  getInputs() {
    return this.#inputs;
  }
}

export { RetirementYearCalculator };
