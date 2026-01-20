// import { ACCOUNT_TYPES } from "./cAccount.js";
// import { AccountingYear } from "./cAccountingYear.js";

// class AccountServices {
//   /** @type{AccountingYear} */
//   #accountYear;

//   /**
//    * @param {AccountingYear} accountYear
//    */
//   constructor(accountYear) {
//     this.#accountYear = accountYear;
//   }

//   processAnnualSavingsInterest() {

//     let savingsInterestEarned = this.#accountYear.getInterestEarnedForYear(
//       ACCOUNT_TYPES.SAVINGS
//     );

//     if (savingsInterestEarned === 0) {
//       savingsInterestEarned = this.#accountYear.recordInterestEarnedForYear(
//         ACCOUNT_TYPES.SAVINGS
//       );
//     }
//     return savingsInterestEarned;
//   }
// }
