import { ACCOUNT_TYPES } from "./cAccount";
import { AccountingYear } from "./cAccountingYear";
import { Demographics } from "./cDemographics";
import { FiscalData } from "./cFiscalData";
import { Inputs } from "./cInputs";
import { TAX_BASE_YEAR, PERIODIC_FREQUENCY } from "./consts";
import { WorkingYearData } from "./cWorkingYearData";
import { WorkingYearIncome } from "./cWorkingYearIncome";

/**
 * WorkingYearIncomeCalculator class - Handles working year income and accumulation calculations
 * Provides comprehensive analysis for the accumulation phase of retirement planning
 */
class WorkingYearCalculator {
  /** @type {Inputs} */
  #inputs;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {Demographics} */
  #demographics;

  /**
   * Create working year income calculator with input configuration
   * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
   * @param {AccountingYear} accountYear - AccountYear instance containing all accounts
   */
  constructor(inputs, accountYear) {
    this.#inputs = inputs;
    this.accountYear = accountYear;
    this.#demographics = Demographics.CreateUsing(inputs, false, true);
    this.#fiscalData = FiscalData.CreateUsing(inputs, TAX_BASE_YEAR);
  }

  calculateWorkingYearData() {
    // debugger;

    const workingYearIncome = WorkingYearIncome.CreateUsing(
      this.#inputs,
      this.#demographics,
      this.#fiscalData,
      this.accountYear
    );

    // **************
    // Calculations
    // **************

    workingYearIncome.estimateWithholdings();

    // Dump any 401k contributions into the Traditional 401k account
    this.accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.CONTRIBUTION,
      workingYearIncome.nonTaxableIncomeReductions,
      PERIODIC_FREQUENCY.MONTHLY
    );
    this.accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.TRAD_401K);

    // Any income left after spending goes into savings
    const surplusIncome = Math.max(
      workingYearIncome.estimatedNetIncome - this.#inputs.spend,
      0
    );
    // Deposit surplus income into savings account
    this.accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.INCOME,
      surplusIncome,
      PERIODIC_FREQUENCY.MONTHLY
    );

    // Now calculate interest earned on accounts
    this.accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);
    this.accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.TRAD_ROTH);

    workingYearIncome.reconcileTaxes();

    // Declare and initialize the result object at the top
    const result = WorkingYearData.CreateFrom(
      this.#demographics,
      this.#fiscalData,
      this.accountYear,
      workingYearIncome
    );

    // const standardDeduction = TaxCalculator.getStandardDeduction(
    //   this.#fiscalData,
    //   this.#demographics
    // );

    // const federalIncomeTaxOwed = TaxCalculator.determineFederalIncomeTax(
    //   workingYearIncome.getTaxableIncome(),
    //   this.#fiscalData,
    //   this.#demographics
    // );

    // const taxes = new Taxes(
    //   workingYearIncome.grossIncome,
    //   workingYearIncome.adjustedGrossIncome,
    //   standardDeduction,
    //   workingYearIncome.adjustedGrossIncome - standardDeduction,
    //   federalIncomeTaxOwed,
    //   0
    // );
    // Money not spent from income goes into savings
    // fiscalData.determineActualSavingsContribution(income.getNetIncome);

    // const withdrawals = {
    //   retirementAccount: this.accountYear.getWithdrawals(
    //     ACCOUNT_TYPES.TRAD_401K
    //   ),
    //   savings: this.accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
    //   rothIra: this.accountYear.getWithdrawals(ACCOUNT_TYPES.TRAD_ROTH),
    //   total() {
    //     return this.retirementAccount + this.savings + this.rothIra;
    //   },
    // };

    // const incomeStreams = IncomeStreams.CreateUsing(
    //   this.#demographics,
    //   this.accountYear,
    //   this.#fiscalData,
    //   this.#inputs
    // );

    // const withdrawals = Withdrawals.CreateUsing(this.accountYear);

    // const balances = Balances.Empty();

    // const pen = {
    //   _description: "Pension Benefits",
    //   myPen: 0,
    //   myPenGross: 0,
    //   spousePen: 0,
    //   spousePenGross: 0,
    //   taxes: 0,
    // };

    // const ss = {
    //   _description: "Social Security Benefits",
    //   mySs: 0,
    //   mySsGross: 0,
    //   spouseSs: 0,
    //   spouseSsGross: 0,
    //   taxes: 0,
    //   provisionalIncome: 0,
    // };

    // const totals = {
    //   _description: "Totals",
    //   totalIncome: 0,
    //   totalNetIncome: 0,
    //   grossTaxableIncome: 0,
    //   calculationDetails: {},
    // };

    // totals.totalIncome = workingYearIncome.allIncomeSources;
    // totals.totalNetIncome = workingYearIncome.netIncome;
    // totals.grossTaxableIncome = workingYearIncome.grossIncome;
    // totals.calculationDetails = withLabel("income", workingYearIncome);

    // Update all the final values in the result object
    // contributions.my401k = employmentInfo.max401kContribution;
    // contributions.myRoth = employmentInfo.rothMaxContribution;
    // contributions.savings = accountYear.getDeposits(
    //   ACCOUNT_TYPES.SUBJECT_SAVINGS,
    //   TRANSACTION_CATEGORY.CONTRIBUTION
    // );
    // contributions.employerMatch = employmentInfo.employer401kMatch;
    // contributions.calculationDetails = [
    //   withLabel("employmentInfo", employmentInfo),
    //   withLabel("accountGroup.savings", accountGroup.savings),
    // ];

    // Note: Spouse contributions not handled in working year calculations

    // result.contributions = Contributions.CreateUsing(
    //   this.accountYear,
    //   employmentInfo
    // );

    // result.ss = ss;
    // result.pen = pen;
    // result.withdrawals = Withdrawals.CreateUsing(this.accountYear);
    // result.taxes = Taxes.CreateForWorkingYearIncome(
    //   workingYearIncome,
    //   this.#fiscalData,
    //   this.#demographics
    // );
    // result.totals = totals;
    // result.balances = balances;
    // result.income = workingYearIncome;
    // result.employmentInfo = employmentInfo;
    // result.roth = accountYear.rothIra;
    // result.savings = accountYear.savings;
    // result.retirementAccount = accountYear.trad401k;

    // // Add breakdown data
    // result.savingsBreakdown = {
    //   startingBalance: this.accountYear.getStartingBalance(
    //     ACCOUNT_TYPES.SAVINGS
    //   ),
    //   withdrawals: this.accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
    //   deposits: this.accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS),
    //   taxFreeIncomeDeposit: workingYearIncome.taxFreeIncomeAdjustment,
    //   interestEarned: this.accountYear.getDeposits(
    //     ACCOUNT_TYPES.SAVINGS,
    //     TRANSACTION_CATEGORY.INTEREST
    //   ),
    //   endingBalance: this.accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS),
    //   growthRate: this.#fiscalData.savingsRateOfReturn,
    //   calculationDetails: [
    //     withLabel("accountYear", this.accountYear),
    //     withLabel(
    //       "income.taxFreeIncomeAdjustment",
    //       workingYearIncome.taxFreeIncomeAdjustment
    //     ),
    //   ],
    // };

    return result;
  }
}

export { WorkingYearCalculator };
