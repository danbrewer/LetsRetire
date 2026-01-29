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
  static dumpOrder = [
    "fiscalYear",
    "subjectAge",
    "partnerAge",
    "spend",
    "accountBalances",
    "takeHome",
  ];
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
    "subject401k",
    "partner401k",
    "subjectTradRoth",
    "partnerTradRoth",
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
    this.subject401k = Balance.CreateUsing(
      accountYear,
      ACCOUNT_TYPES.SUBJECT_401K
    );
    this.partner401k = Balance.CreateUsing(
      accountYear,
      ACCOUNT_TYPES.PARTNER_401K
    );
    this.subjectTradRoth = Balance.CreateUsing(
      accountYear,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
    this.partnerTradRoth = Balance.CreateUsing(
      accountYear,
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
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
        subject401k:
          this.subject401k.endingBalanceForYear,
        partner401k:
          this.partner401k.endingBalanceForYear,
        subjectRoth:
          this.subjectTradRoth.endingBalanceForYear,
        partnerRoth:
          this.partnerTradRoth.endingBalanceForYear,
      },
    };
  }

  get allAccountBalances() {
    return this.balances.allBalances;
  }

  get demographics() {
    return this.#demographics;
  }

  get subjectAge() {
    return this.#demographics.currentAge;
  }

  get partnerAge() {
    return this.#demographics.currentAgeOfPartner;
  }
}

export { RetirementYearData };
