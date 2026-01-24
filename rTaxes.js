import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { BaseReports } from "./cBaseReports.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { ReportingYear } from "./cReporting.js";
import { TaxCalculations } from "./cTaxCalculations.js";
import { TransactionCategory } from "./tTransactionCategory.js";

class TaxReport extends BaseReports {
  constructor() {
    super();
  }

  //   get standardDeduction(){
  //     return this._standardDeduction;
  //   }

  //   get subjectTaxableIncome() {
  //     return this._accountYear
  //       .getDeposits(ACCOUNT_TYPES.SUBJECT_WAGES, TransactionCategory.IncomeGross)
  //       .asCurrency();
  //   }

  //   get partnerTaxableIncome() {
  //     return this._accountYear
  //       .getDeposits(ACCOUNT_TYPES.PARTNER_WAGES, TransactionCategory.IncomeGross)
  //       .asCurrency();
  //   }

  //   get combinedTaxableIncome() {
  //     return this.subjectTaxableIncome + this.partnerTaxableIncome;
  //   }

  //   get subjectNonTaxableIncome() {
  //     return this._accountYear
  //       .getDeposits(
  //         ACCOUNT_TYPES.SUBJECT_WAGES,
  //         TransactionCategory.OtherNonTaxable
  //       )
  //       .asCurrency();
  //   }

  //   get partnerNonTaxableIncome() {
  //     return this._accountYear
  //       .getDeposits(
  //         ACCOUNT_TYPES.PARTNER_WAGES,
  //         TransactionCategory.OtherNonTaxable
  //       )
  //       .asCurrency();
  //   }

  //   get combinedNonTaxableIncome() {
  //     return this.subjectNonTaxableIncome + this.partnerNonTaxableIncome;
  //   }
}
