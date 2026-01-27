//  * @param {Expenditures} expenditures - Expenditure data
//  * @param {Object} contributions - Contribution data
//  * @param {Object} withdrawals - Withdrawal data
//   * @param {Object} withdrawalBreakdown - Withdrawal breakdown data
//  * @param {Object} pension - Pension data
//  * @param {Object} savings - Savings account data
//  * @param {SocialSecurityIncome} ss - Social Security data
//  * @param {IncomeStreams} fixedIncomeStreams - Instance of IncomeStreams class
//  * @param {IncomeBreakdown} incomeBreakdown - Instance of IncomeBreakdown class
//  * @param {Object} totals - Total calculations
//  * @param {Object} myPensionBenefits - My pension benefit data
//  * @param {Object} spousePensionBenefits - Spouse pension benefit data
//  * @param {Object} mySsBenefits - My Social Security benefit data
//  * @param {Object} spouseSsBenefits - Spouse Social Security benefit data
//  * @param {Object} savingsBreakdown - Savings breakdown data
//  * @param {SsBenefitsCalculator} ssBreakdown - Instance of SsBenefits class
//  * @param {Object} pensionBreakdown - Pension breakdown data
//  /**
//    * @param {Demographics} demographics - Instance of Demographics class
//    * @param {FiscalData} fiscalData - Instance of FiscalData class
//    * @param {Income} revenue - Revenue data
//    * @param {Income} grossIncome - Gross income data
//    * @param {Balances} balances - Balances data
//    * @param {SocialSecurityIncome} socialSecurityIncome - Social Security income data
//    * @param {Taxes} taxes - Tax data
//    * @param {AccountYear} accountYear - Instance of AccountGroup class

import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Balance } from "./cBalance.js";
import { Balances } from "./cBalances.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
// import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { AccountAnalyzer } from "./cAccountAnalyzer.js";
import { SocialSecurityBreakdown } from "./cSsBreakdown.js";
import { Taxes } from "./cTaxes.js";
import { BaseYearData } from "./cYearDataBase.js";
import { ReportData } from "./rReportData.js";

//    */
class RetirementYearData extends BaseYearData {
  static dumpOrder = ["fiscalYear", "accountBalances", "spend", "takeHome"];
  static dumpIgnore = [
    "taxes",
    "savings",
    "trad401k",
    "tradRoth",
    "takeHomeBreakdown",
    "cashFromSavings",
    "cashFrom401k",
    "cashFromRoth",
    "allAccountBalances",
    "balances",
    "demographics",
    "fiscalData",
  ];
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {ReportData} */
  #reportData;

  /**
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   * @param {AccountingYear} accountYear
   * @param {Taxes} taxes
   * @param {ReportData} reportData
   */
  constructor(demographics, fiscalData, accountYear, taxes, reportData) {
    super(demographics, fiscalData, accountYear);
    this.#fiscalData = Object.freeze(fiscalData);
    this.#demographics = Object.freeze(demographics);

    this.balances = Balances.CreateUsing(accountYear);

    this.taxes = taxes;
    this.savings = Balance.CreateUsing(accountYear, ACCOUNT_TYPES.SAVINGS);
    this.trad401k = Balance.CreateUsing(
      accountYear,
      ACCOUNT_TYPES.SUBJECT_401K
    );
    this.tradRoth = Balance.CreateUsing(
      accountYear,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
    this.#reportData = reportData;
  }

  get fiscalData() {
    return this.#fiscalData;
  }

  /**
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   * @param {AccountingYear} accountYear
   * @param {Taxes} taxes
   * @param {ReportData} reportData
   * @returns {RetirementYearData}
   */
  static CreateUsing(demographics, fiscalData, accountYear, taxes, reportData) {
    const result = new RetirementYearData(
      demographics,
      fiscalData,
      accountYear,
      taxes,
      reportData
    );
    return result;
  }

  // // Factory method to create from existing data
  // /**
  //  * @param {{
  //  * demographics: Demographics;
  //  * fiscalData: FiscalData;
  //  * revenue: Income;
  //  * grossIncome: Income;
  //  * expenditures: Expenditures;
  //  * contributions: Object | undefined;
  //  * withdrawals: Object | undefined;
  //  * balances: Balances;
  //  * disbursements: Disbursements;
  //  * pen: Object | undefined;
  //  * savings: Object | undefined;
  //  * ss: SocialSecurityIncome;
  //  * incomeStreams: IncomeStreams;
  //  * incomeBreakdown: IncomeBreakdown;
  //  * taxes: Taxes;
  //  * totals: Object | undefined;
  //  * myPensionBenefits: Object | undefined;
  //  * spousePensionBenefits: Object | undefined;
  //  * mySsBenefits: Object | undefined;
  //  * spouseSsBenefits: Object | undefined;
  //  * savingsBreakdown: Object | undefined;
  //  * withdrawalBreakdown: Object | undefined;
  //  * ssBreakdown: SsBenefitsCalculator;
  //  * pensionBreakdown: Object | undefined;
  //  * accountYear: AccountYear }} data
  //  */
  // static fromData(data) {
  //   return new RetirementYearData(
  //     data.demographics,
  //     data.fiscalData,
  //     data.revenue,
  //     data.grossIncome,
  //     data.expenditures,
  //     data.contributions,
  //     data.withdrawals,
  //     data.balances,
  //     data.pen,
  //     data.savings,
  //     data.ss,
  //     data.incomeStreams,
  //     data.incomeBreakdown,
  //     data.taxes,
  //     data.totals,
  //     data.myPensionBenefits,
  //     data.spousePensionBenefits,
  //     data.mySsBenefits,
  //     data.spouseSsBenefits,
  //     data.savingsBreakdown,
  //     data.withdrawalBreakdown,
  //     data.ssBreakdown,
  //     data.pensionBreakdown,
  //     data.accountYear
  //   );
  // }

  // // Method to get a summary of the retirement year
  // getYearSummary() {
  //   return {
  //     year: this.fiscalData?.taxYear || "Unknown",
  //     age: this.demographics?.age || "Unknown",
  //     // totalIncome: this.totalIncome(),
  //     //   totalExpenses: this.getTotalExpenses(),
  //     netIncome: this.netIncome,
  //     totalTaxes: this.totalTaxes,
  //     //   surplusDeficit: this.getSurplusOrDeficit(),
  //     totalBalances: this.totalAccountBalances,
  //     //   hasDeficit: this.hasDeficit(),
  //   };
  // }

  get fiscalYear() {
    return this.#fiscalData.taxYear;
  }

  get spend() {
    return this.#reportData.spend;
  }

  get takeHome() {
    const total = Object.values(this.takeHomeBreakdown).reduce(
      (sum, value) => sum + (value || 0),
      0
    );
    return {
      total: total.asCurrency(),
      breakdown: this.takeHomeBreakdown,
    };
  }

  get takeHomeBreakdown() {
    return {
      income_partnerTakehomeWages: this.#reportData.income_partnerTakehomeWages,
      income_subjectTakehomeWages: this.#reportData.income_subjectTakehomeWages,
      income_subjectPensionTakehome:
        this.#reportData.income_subjectPensionTakehome,
      income_partnerPensionTakehome:
        this.#reportData.income_partnerPensionTakehome,
      ss_subjectSsTakehome: this.#reportData.ss_subjectSsTakehome,
      ss_partnerSsTakehome: this.#reportData.ss_partnerSsTakehome,
      income_miscIncomeTakehome: this.#reportData.income_miscIncomeTakehome,
      income_taxFreeIncome: this.#reportData.income_taxFreeIncome,
      cashFromSavings: this.cashFromSavings,
      cashFrom401k: this.cashFrom401k,
      cashFromRoth: this.cashFromRoth,
    };
  }

  get cashFromSavings() {
    return this.#reportData.savings_Withdrawals.asCurrency();
  }

  get cashFrom401k() {
    return (
      this.#reportData.income_subject401kTakehome +
      this.#reportData.income_partner401kTakehome
    ).asCurrency();
  }

  get cashFromRoth() {
    return (
      this.#reportData.retirementAcct_subjectRothWithdrawals +
      this.#reportData.retirementAcct_partnerRothWithdrawals
    ).asCurrency();
  }

  get accountBalances() {
    return {
      total: this.allAccountBalances,
      breakdown: {
        savings: this.savings.endingBalanceForYear,
        trad401k: this.trad401k.endingBalanceForYear,
        tradRoth: this.tradRoth.endingBalanceForYear,
      },
    };
  }

  get allAccountBalances() {
    return this.balances.allBalances;
  }

  get demographics() {
    return this.#demographics;
  }
}

// Create instance using the factory method for backward compatibility
// const result = RetirementYearData.Empty();

export { RetirementYearData };

/*
      year: this.#fiscalData.taxYear,
      spend: this.#reportingYear.ReportData.spend,
      takeHome: this.#reportingYear.ReportData.takeHome,
      financialHealth:
        this.#reportingYear.ReportData.takeHome >=
        this.#reportingYear.ReportData.spend
          ? "✅"
          : "⚠️",
      savings: this.#reportingYear.ReportData.savings_Balance,
      subject401k:
        this.#reportingYear.ReportData.retirementAcct_subject401kBalance,
      partner401k:
        this.#reportingYear.ReportData.retirementAcct_partner401kBalance,
      subjectRoth:
        this.#reportingYear.ReportData.retirementAcct_subjectRothBalance,
      partnerRoth:
        this.#reportingYear.ReportData.retirementAcct_partnerRothBalance,
      subjectWagesTakehome:
        this.#reportingYear.ReportData.income_subjectTakehomeWages,
      partnerWagesTakehome:
        this.#reportingYear.ReportData.income_partnerTakehomeWages,
      subjectPensionTakehome:
        this.#reportingYear.ReportData.income_subjectPensionTakehome,
      partnerPensionTakehome:
        this.#reportingYear.ReportData.income_partnerPensionTakehome,
      subjectSsTakehome: this.#reportingYear.ReportData.ss_subjectSsTakehome,
      partnerSsTakehome: this.#reportingYear.ReportData.ss_partnerSsTakehome,
*/
