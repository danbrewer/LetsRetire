import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { Inputs } from "./cInputs.js";
import { TAX_BASE_YEAR, PERIODIC_FREQUENCY } from "./consts.js";
import { ReportingYear } from "./cReporting.js";
import { Taxes } from "./cTaxes.js";
import { TransactionCategory } from "./cTransaction.js";
import { WorkingYearData } from "./cWorkingYearData.js";
import { TransactionRoutes } from "./tTransactionRoute.js";

/**
 * WorkingYearIncomeCalculator class - Handles working year income and accumulation calculations
 * Provides comprehensive analysis for the accumulation phase of retirement planning
 */
class WorkingYearCalculator {
  /** @type {Inputs} */
  #inputs;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Demographics} */
  #demographics;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;
  /** @type {ReportingYear} */
  #reportingYear;
  // /** @type {WorkingYearIncome} */
  // #workingYearIncome;

  /**
   * Create working year income calculator with input configuration
   * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
   * @param {AccountingYear} accountYear - AccountYear instance containing all accounts
   * @param {ReportingYear} reportingYear - ReportingYear instance for the year
   */
  constructor(inputs, accountYear, reportingYear) {
    this.#inputs = inputs;
    this.#accountYear = accountYear;
    this.#demographics = Demographics.CreateUsing(inputs, false, true);
    this.#fiscalData = FiscalData.CreateUsing(inputs, TAX_BASE_YEAR);
    this.#reportingYear = reportingYear;

    this.#fixedIncomeStreams = FixedIncomeStreams.CreateUsing(
      this.#demographics,
      accountYear,
      this.#inputs
    );

    // this.#workingYearIncome = WorkingYearIncome.CreateUsing(
    //   this.#fixedIncomeStreams,
    //   this.#demographics,
    //   this.#fiscalData,
    //   this.#accountYear
    // );
  }

  processWorkingYearData() {
    // **************
    // Calculations
    // **************
    this.#processWagesAndCompensation();
    this.#processNonTaxableIncome();
    this.#processRothIraContributions();
    this.#processSavingsContributions();

    this.#processMonthlySpending();

    // Now calculate interest earned on accounts
    this.#applySavingsInterest();
    this.#apply401kInterest();
    this.#applyRothInterest();

    this.#processIncomeTaxes();

    // Declare and initialize the result object at the top
    const workingYearData = WorkingYearData.CreateUsing(
      this.#demographics,
      this.#fiscalData,
      this.#accountYear
    );

    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpCategorySummaries();

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

    workingYearData.dump("working year data");
    return workingYearData;
  }
  #processNonTaxableIncome() {
    const subjectNonTaxableIncome =
      this.#fixedIncomeStreams.subjectCareerNonTaxableSalaryReductions;

    if (subjectNonTaxableIncome > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        TransactionCategory.OtherNonTaxable,
        TransactionRoutes.External,
        subjectNonTaxableIncome,
        PERIODIC_FREQUENCY.MONTHLY
      );
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.CASH,
        subjectNonTaxableIncome,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.OtherNonTaxable
      );
    }
    const partnerNonTaxableIncome =
      this.#fixedIncomeStreams.partnerCareerNonTaxableSalaryReductions;
    if (partnerNonTaxableIncome > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_WAGES,
        TransactionCategory.OtherNonTaxable,
        TransactionRoutes.External,
        partnerNonTaxableIncome,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.CASH,
        partnerNonTaxableIncome,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.OtherNonTaxable
      );
    }
  }

  #processSavingsContributions() {
    const subjectDesiredSavingsContribution = Math.max(
      this.#fixedIncomeStreams.subjectWorkingYearSavingsContributionVariable,
      this.#fixedIncomeStreams.subjectWorkingYearSavingsContributionFixed
    ).asCurrency();

    const partnerDesiredSavingsContribution = Math.max(
      this.#fixedIncomeStreams.partnerWorkingYearSavingsContributionVariable,
      this.#fixedIncomeStreams.partnerWorkingYearSavingsContributionFixed
    ).asCurrency();

    const desiredTransferAmount =
      subjectDesiredSavingsContribution + partnerDesiredSavingsContribution;

    if (desiredTransferAmount <= 0) return;

    const availableCash = this.#accountYear.getEndingBalance(
      ACCOUNT_TYPES.CASH
    );

    if (availableCash <= 0) return;

    const actualTransferAmount = Math.min(availableCash, desiredTransferAmount);

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.SAVINGS,
      actualTransferAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.AutoTransfer,
      "Combined contrib."
    );

    this.#accountYear.analyzers[ACCOUNT_TYPES.CASH].dumpAccountActivity("");

    // debugger;
  }

  #processWagesAndCompensation() {
    // Subject wages and compensation
    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      TransactionCategory.IncomeGross,
      TransactionRoutes.External,
      this.#fixedIncomeStreams.subjectCareerWagesAndCompensationGross,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.SUBJECT_401K,
      this.#fixedIncomeStreams.subjectCareerAllowed401kContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Contribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.TAXES,
      this.#fixedIncomeStreams
        .subjectCareerWagesAndCompensationEstimatedWithholdings,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.SUBJECT_PAYROLL_DEDUCTIONS,
      this.#fixedIncomeStreams.subjectCareerNonTaxableSalaryReductions,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.PayrollDeductions
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams.subjectCareerWagesAndCompensationActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet
    );

    // Partner wages and compensation

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.PARTNER_WAGES,
      TransactionCategory.IncomeGross,
      TransactionRoutes.External,
      this.#fixedIncomeStreams.partnerCareerWagesAndCompensationGross,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.PARTNER_401K,
      this.#fixedIncomeStreams.partnerCareerAllowed401kContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Contribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.PARTNER_PAYROLL_DEDUCTIONS,
      this.#fixedIncomeStreams.partnerCareerNonTaxableSalaryReductions,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.PayrollDeductions
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.TAXES,
      this.#fixedIncomeStreams
        .partnerCareerWagesAndCompensationEstimatedWithholdings,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams.partnerCareerWagesAndCompensationActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet
    );

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_WAGES
    ].dumpAccountActivity("", TransactionCategory.IncomeGross);

    // debugger;
  }

  #processRothIraContributions() {
    if (this.#fixedIncomeStreams.subjectAllowedRothContribution <= 0) return;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      this.#fixedIncomeStreams.subjectAllowedRothContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Contribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.PARTNER_ROTH_IRA,
      this.#fixedIncomeStreams.partnerAllowedRothContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Contribution
    );
  }

  #processMonthlySpending() {
    // Any income left after spending goes into savings

    const cash = this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);

    if (cash <= 0) {
      console.warn("Warning: No cash available to cover spending.");
      return;
    }

    const actualSpend = Math.min(cash, this.#fiscalData.spend);

    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Spend,
      TransactionRoutes.External,
      actualSpend,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.surplusSpend = cash - this.#fiscalData.spend;

    if (this.surplusSpend == 0) return;

    if (this.surplusSpend > 0) {
      // Deposit surplus income into savings account
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.CASH,
        ACCOUNT_TYPES.SAVINGS,
        this.surplusSpend,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.SurplusIncome
      );
    }

    if (this.surplusSpend < 0) {
      // Withdraw from savings to cover spending shortfall
      const availableSavings = this.#accountYear.getEndingBalance(
        ACCOUNT_TYPES.SAVINGS
      );

      if (availableSavings <= 0) {
        console.warn(
          "Warning: No savings available to cover spending shortfall."
        );
        return;
      }

      const withdrawalAmount = Math.min(-this.surplusSpend, availableSavings);

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SAVINGS,
        ACCOUNT_TYPES.CASH,
        withdrawalAmount,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeShortfall
      );

      this.#accountYear.processAsPeriodicWithdrawals(
        ACCOUNT_TYPES.CASH,
        TransactionCategory.Spend,
        TransactionRoutes.External,
        withdrawalAmount,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }

    this.#accountYear.analyzers[ACCOUNT_TYPES.CASH].dumpAccountActivity();
    // debugger;
  }

  #applySavingsInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);

    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpAccountActivity();
    // debugger;
  }

  #apply401kInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SUBJECT_401K);
    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_401K
    ].dumpAccountActivity();
    // debugger;

    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.PARTNER_401K);
    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_401K
    ].dumpAccountActivity();
    // debugger;
  }

  #applyRothInterest() {
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    );

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    ].dumpAccountActivity();
    // debugger;

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    ].dumpAccountActivity();
    // debugger;
  }

  #processIncomeTaxes() {
    const actualTaxes = Taxes.CreateFromTaxableIncome(
      this.#fixedIncomeStreams.grossTaxableIncome,
      this.#fixedIncomeStreams.taxableIncome,
      this.#fiscalData,
      this.#demographics
    );

    const federalIncomeTaxOwed = actualTaxes.federalTaxesOwed.asCurrency();

    const withholdings = Math.max(
      this.#accountYear.getAnnualRevenues(
        ACCOUNT_TYPES.TAXES,
        TransactionCategory.Withholdings
      ),
      0
    );

    const taxesOwed = federalIncomeTaxOwed - withholdings;

    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.TAXES,
      TransactionCategory.TaxPayment,
      TransactionRoutes.External,
      federalIncomeTaxOwed,
      PERIODIC_FREQUENCY.ANNUAL_TRAILING
    );

    if (taxesOwed < 0) {
      const refundAmount = -taxesOwed;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.TAXES,
        ACCOUNT_TYPES.SAVINGS,
        refundAmount,
        PERIODIC_FREQUENCY.ANNUAL_TRAILING,
        TransactionCategory.TaxRefund
      );
    }

    if (taxesOwed > 0) {
      const savingsBalance = this.#accountYear.getEndingBalance(
        ACCOUNT_TYPES.SAVINGS
      );
      if (taxesOwed > savingsBalance) {
        console.warn(
          "Warning: Taxes due exceed available savings. Partial payment will be made."
        );
      }
      const withdrawalAmount = Math.min(taxesOwed, savingsBalance);
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SAVINGS,
        ACCOUNT_TYPES.TAXES,
        withdrawalAmount,
        PERIODIC_FREQUENCY.ANNUAL_TRAILING,
        TransactionCategory.TaxPayment
      );
    }
    this.#accountYear.analyzers[ACCOUNT_TYPES.TAXES].dumpAccountActivity();
    // debugger;
  }
}

export { WorkingYearCalculator };
