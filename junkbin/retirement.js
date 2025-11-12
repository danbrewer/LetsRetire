// // retirement.js

// /**
//  * @param {number} taxableIncome
//  * @param {{ rate: number; upTo: number; }[]} brackets
//  */
// function retirementJS_determineFederalIncomeTax(taxableIncome, brackets) {
//   let tax = 0,
//     prev = 0;

//   for (const { upTo, rate } of brackets) {
//     const slice = Math.min(taxableIncome, upTo) - prev;
//     if (slice > 0) tax += slice * rate;
//     if (taxableIncome <= upTo) break;
//     prev = upTo;
//   }
//   // log.info(`Total tax calculated is $${tax.asCurrency()}.`);

//   return tax.asCurrency();
// }

// /**
//  * Calculate comprehensive income breakdown when a specific 401k withdrawal amount is applied.
//  *
//  * This function performs a complete income calculation for a retirement year by:
//  * 1. Determining the appropriate tax brackets and standard deduction for the given year
//  * 2. Calculating Social Security benefit taxation based on total provisional income
//  * 3. Creating a detailed income breakdown including all sources (pension, SS, interest, RMD)
//  * 4. Computing federal taxes and net income after applying the variable 401k withdrawal
//  *
//  * The function is commonly used in iterative calculations to determine optimal withdrawal
//  * strategies or to model income scenarios with different retirement account distributions.
//  *
//  * @param {number} variableIncomeFactor - The 401k/traditional retirement account withdrawal
//  *   amount to include in income calculations. This variable amount affects both reportable
//  *   income and Social Security taxation calculations.
//  *
//  * @param {IncomeStreams} incomeStreams - Collection of all income sources containing:
//  *   - mySs: Primary person's Social Security benefits
//  *   - spouseSs: Spouse's Social Security benefits (if applicable)
//  *   - myPension: Primary person's pension income
//  *   - spousePension: Spouse's pension income (if applicable)
//  *   - reportedEarnedInterest: Taxable interest income from savings
//  *   - rmd: Required Minimum Distribution amounts
//  *   - otherTaxableIncomeAdjustments: Additional taxable income sources
//  *   - nonSsIncome(): Method returning total non-Social Security income
//  *
//  * @param {Demographics} demographics - Demographic information containing:
//  *   - filingStatus: Tax filing status ("single", "married_filing_jointly", etc.)
//  *   - age: Current age for eligibility determinations
//  *   - Other demographic data used for benefit calculations
//  *
//  * @param {FiscalData} fiscalData - Financial and tax calculation parameters containing:
//  *   - taxYear: The actual tax year for calculations (e.g., 2025, 2026, 2052)
//  *   - inflationRate: Annual inflation rate for adjusting tax brackets and deductions
//  *   - yearIndex: Zero-based retirement year index
//  *   - Other fiscal parameters for calculations
//  *
//  * @returns {IncomeRs} Comprehensive income calculation results containing:
//  *   - ssBreakdown: Social Security taxation breakdown with taxable/non-taxable portions,
//  *     provisional income calculations, and detailed methodology
//  *   - incomeBreakdown: Complete income analysis including reportable income, taxable income,
//  *     federal taxes, net income, and utility methods for income analysis
//  *
//  * @throws {Error} When required properties are missing from input objects
//  * @throws {Error} When tax calculation methods fail due to invalid data
//  *
//  * @example
//  * // Calculate income with $50,000 401k withdrawal
//  * const incomeStreams = IncomeStreams.CreateUsing(demographics, benefits, accounts, fiscal, inputs);
//  * const demographics = Demographics.CreateUsing(inputs, true, false);
//  * const fiscalData = FiscalData.CreateUsing(inputs, 2025);
//  *
//  * const results = retirementJS_calculateIncomeWhen401kWithdrawalIs(
//  *   50000, incomeStreams, demographics, fiscalData
//  * );
//  *
//  * console.log(`Total reportable income: ${results.incomeBreakdown.reportableIncome()}`);
//  * console.log(`Federal taxes: ${results.incomeBreakdown.federalIncomeTax}`);
//  * console.log(`Net income: ${results.incomeBreakdown.netIncome()}`);
//  * console.log(`Taxable SS benefits: ${results.ssBreakdown.totalTaxablePortion()}`);
//  *
//  * @example
//  * // Use in iterative withdrawal optimization
//  * for (let withdrawal = 0; withdrawal <= 100000; withdrawal += 5000) {
//  *   const results = retirementJS_calculateIncomeWhen401kWithdrawalIs(
//  *     withdrawal, incomeStreams, demographics, fiscalData
//  *   );
//  *   const netIncome = results.incomeBreakdown.netIncome();
//  *   if (netIncome >= targetNetIncome) {
//  *     console.log(`Optimal withdrawal: ${withdrawal}`);
//  *     break;
//  *   }
//  * }
//  *
//  * @see {@link IncomeBreakdown.CreateFrom} For income breakdown calculation details
//  * @see {@link retirementJS_getTaxBrackets} For tax bracket determination
//  * @see {@link retirementJS_getStandardDeduction} For standard deduction calculation
//  * @see {@link IncomeRs} For result structure and utility methods
//  *
//  * @since 1.0.0
//  * @author Retirement Calculator System
//  */
// function retirementJS_calculateIncomeWhen401kWithdrawalIs(
//   variableIncomeFactor,
//   incomeStreams,
//   demographics,
//   fiscalData
// ) {
//   const standardDeduction = retirementJS_getStandardDeduction(
//     demographics.filingStatus,
//     fiscalData.taxYear, // year is already the actual year (e.g., 2040)
//     fiscalData.inflationRate
//   );

//   const taxBrackets = retirementJS_getTaxBrackets(
//     demographics.filingStatus,
//     fiscalData.taxYear,
//     fiscalData.inflationRate
//   );

//   const ssBreakdown = SsBenefitsCalculator.CalculateUsing(
//     incomeStreams.mySs,
//     incomeStreams.spouseSs,
//     incomeStreams.nonSsIncome
//   );

//   const incomeBreakdown = IncomeBreakdown.CreateFrom(
//     incomeStreams,
//     variableIncomeFactor,
//     ssBreakdown,
//     standardDeduction
//   );

//   incomeBreakdown.federalIncomeTax = retirementJS_determineFederalIncomeTax(
//     incomeBreakdown.taxableIncome,
//     taxBrackets
//   );

//   return new IncomeRs(ssBreakdown, incomeBreakdown);
// }

// /**
//  * @param {number} targetIncome
//  * @param {IncomeStreams} incomeStreams
//  * @param {Demographics} demographics
//  * @param {FiscalData} fiscalData
//  */
// function retirementJS_determine401kWithdrawalsToHitNetTargetOf(
//   targetIncome,
//   incomeStreams,
//   demographics,
//   fiscalData
// ) {
//   // Declare and initialize the result object at the top
//   const result = {
//     net: 0,
//     withdrawalNeeded: 0,
//     tax: 0,
//     rmd: 0,
//     calculationDetails: {},
//   };

//   let lo = 0,
//     hi = targetIncome * 2;

//   /** @type {{ totalIncome: number, taxableIncome: number, tax: number, netIncome: number, ssBreakdown: SsBenefitsCalculator, incomeBreakdown: IncomeBreakdown}} */
//   let income = {
//     totalIncome: 0,
//     taxableIncome: 0,
//     tax: 0,
//     netIncome: 0,
//     ssBreakdown: SsBenefitsCalculator.Empty(),
//     incomeBreakdown: IncomeBreakdown.Empty(),
//   };

//   for (let i = 0; i < 80; i++) {
//     log.info();
//     log.info(
//       `===== Iteration ${i}: lo=$${lo.asCurrency()}, hi=$${hi.asCurrency()} ======`
//     );
//     const guestimate401kWithdrawal = (lo + hi) / 2;
//     log.info(
//       `Guestimate 401k withdrawal: $${guestimate401kWithdrawal.asCurrency()}`
//     );

//     let incomeRs = retirementJS_calculateIncomeWhen401kWithdrawalIs(
//       guestimate401kWithdrawal,
//       incomeStreams,
//       demographics,
//       fiscalData
//     );

//     income.incomeBreakdown = incomeRs.incomeBreakdown;
//     income.ssBreakdown = incomeRs.ssBreakdown;

//     log.info(`Target income is $${targetIncome.asCurrency()}.`);

//     const netIncome = income.incomeBreakdown.netIncome.asCurrency();

//     const highLow =
//       netIncome > targetIncome.asCurrency()
//         ? "TOO HIGH"
//         : netIncome < targetIncome.asCurrency()
//           ? "TOO LOW"
//           : "JUST RIGHT";
//     const highLowTextColor =
//       netIncome > targetIncome.asCurrency()
//         ? "\x1b[31m"
//         : netIncome < targetIncome.asCurrency()
//           ? "\x1b[34m"
//           : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
//     log.info(
//       `When 401k withdrawal is $${guestimate401kWithdrawal.round(
//         0
//       )} then the net income will be $${netIncome} ${highLowTextColor}(${highLow})\x1b[0m`
//     );

//     if (netIncome == targetIncome.asCurrency()) break;
//     if (netIncome < targetIncome) lo = guestimate401kWithdrawal;
//     else hi = guestimate401kWithdrawal;
//     if (hi.asCurrency() - lo.asCurrency() <= 0.01) break;
//   }

//   // Update all the final values in the result object
//   result.net = income.incomeBreakdown.netIncome.asCurrency();
//   result.withdrawalNeeded = hi.asCurrency();
//   result.rmd = incomeStreams.rmd;
//   result.tax = income.incomeBreakdown.federalIncomeTax.asCurrency();
//   result.calculationDetails = [
//     withLabel("income", income),
//     withLabel("incomeStreams", incomeStreams),
//   ];

//   return result;
// }

// /**
//  * @param {string} filingStatus
//  * @param {number} year
//  * @param {number} inflationRate
//  */
// function retirementJS_getTaxBrackets(filingStatus, year, inflationRate) {
//   // The year passed is the actual tax year (e.g., 2025, 2026, 2052, etc.)
//   // The adjustedForInflation expects years from the base (2025)
//   const yearsFromBase = year - 2025;

//   if (filingStatus === constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY) {
//     return constsJS_TAX_TABLES_2025.mfj.map((bracket) => ({
//       rate: bracket.rate,
//       upTo: bracket.upTo.adjustedForInflation(inflationRate, yearsFromBase),
//     }));
//   } else {
//     return constsJS_TAX_TABLES_2025.single.map((bracket) => ({
//       rate: bracket.rate,
//       upTo: bracket.upTo.adjustedForInflation(inflationRate, yearsFromBase),
//     }));
//   }
// }

// /**
//  * @param {string} filingStatus
//  * @param {number} year
//  * @param {number} inflationRate
//  */
// function retirementJS_getStandardDeduction(filingStatus, year, inflationRate) {
//   // Handle potential parameter order issues or missing parameters
//   let correctedFilingStatus = filingStatus;
//   let correctedYear = year;
//   let correctedInflationRate = inflationRate;

//   // If parameters seem to be in wrong order, try to auto-correct
//   if (typeof filingStatus === "number" && typeof year === "string") {
//     log.warn("Parameter order appears incorrect. Auto-correcting.");
//     correctedFilingStatus = year;
//     correctedYear = filingStatus;
//   }

//   // Provide defaults for missing parameters
//   if (correctedInflationRate === undefined || correctedInflationRate === null) {
//     correctedInflationRate = 0.025; // Default 2.5% inflation
//     log.warn(
//       `Missing inflationRate parameter. Using default: ${correctedInflationRate}`
//     );
//   }

//   if (!correctedFilingStatus) {
//     correctedFilingStatus = constsJS_FILING_STATUS.SINGLE;
//     log.warn(
//       `Missing filingStatus parameter. Using default: ${correctedFilingStatus}`
//     );
//   }

//   if (correctedYear === undefined || correctedYear === null) {
//     correctedYear = 2025;
//     log.warn(`Missing year parameter. Using default: ${correctedYear}`);
//   }

//   // The year passed should be the actual tax year (e.g., 2025, 2026, 2052, etc.)
//   // The adjustedForInflation expects years from the base (2025)
//   const yearsFromBase = correctedYear - TAX_BASE_YEAR;

//   if (correctedFilingStatus === constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY) {
//     const baseAmount = constsJS_STANDARD_DEDUCTION_2025.mfj;
//     const adjusted = baseAmount.adjustedForInflation(
//       correctedInflationRate,
//       yearsFromBase
//     );
//     if (isNaN(adjusted)) {
//       log.error(
//         `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${correctedInflationRate}`
//       );
//       return 0;
//     }
//     return adjusted.asCurrency();
//   } else {
//     const baseAmount = constsJS_STANDARD_DEDUCTION_2025.single;
//     const adjusted = baseAmount.adjustedForInflation(
//       correctedInflationRate,
//       yearsFromBase
//     );
//     if (isNaN(adjusted)) {
//       log.error(
//         `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${correctedInflationRate}`
//       );
//       return 0;
//     }
//     return adjusted.asCurrency();
//   }
// }

// // Wrapper function for backward compatibility with existing calls
// /**
//  * @param {number} adjustedGrossIncome
//  * @param {number} standardDeduction
//  */
// function retirementJS_calculateTaxableIncome(
//   adjustedGrossIncome,
//   standardDeduction
// ) {
//   return Math.max(0, adjustedGrossIncome - standardDeduction);
// }

// // Wrapper for federal tax calculation using retirement.js functions
// /**
//  * @param {number} taxableIncome
//  */
// function retirementJS_calculateFederalTax(
//   taxableIncome,
//   filingStatus = constsJS_FILING_STATUS.SINGLE,
//   year = 2025,
//   inflationRate = 0.025
// ) {
//   const taxBrackets = retirementJS_getTaxBrackets(
//     filingStatus,
//     year,
//     inflationRate
//   );
//   return retirementJS_determineFederalIncomeTax(taxableIncome, taxBrackets);
// }

// // ---------------- MODULE EXPORTS ----------------

// // // Only export as module if we're in Node.js environment
// // if (typeof module !== "undefined" && module.exports) {
// //   module.exports = {
// //     log,
// //     determineTaxablePortionOfSocialSecurity: _calculateSsBenefits,
// //     retirementJS_determineFederalIncomeTax:
// //       retirementJS_determineFederalIncomeTax,
// //     retirementJS_calculateIncomeWhen401kWithdrawalIs:
// //       retirementJS_calculateIncomeWhen401kWithdrawalIs,
// //     retirementJS_determine401kWithdrawalsToHitNetTargetOf,
// //     // Export some common tax brackets and standard deductions for convenience
// //     retirementJS_getTaxBrackets,
// //     retirementJS_getStandardDeduction,
// //     constsJS_FILING_STATUS,
// //     round: Number.prototype.round,
// //     adjustedForInflation: Number.prototype.adjustedForInflation,
// //   };
// // }
