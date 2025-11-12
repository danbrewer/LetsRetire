// // Test file for Disbursements class
// // This demonstrates how to use the Disbursements class

// /**
//  * Test function to demonstrate Disbursements functionality
//  */
// function testDisbursements() {
//   console.log("=== Testing Disbursements Class ===\n");

//   // Create a new Disbursements instance
//   const disbursements = new Disbursements();

//   // Add some disbursements for 2024
//   console.log("Adding disbursements for 2024...");

//   // Regular withdrawal from savings
//   disbursements.addDisbursement(
//     5000,
//     "savings",
//     "Emergency Fund",
//     DISBURSEMENT_TYPE.EMERGENCY,
//     "Medical emergency",
//     false, // Non-taxable (already taxed)
//     2024
//   );

//   // Traditional 401k withdrawal (taxable)
//   disbursements.addDisbursement(
//     15000,
//     "trad401k",
//     "Primary 401k",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Living expenses",
//     true, // Taxable
//     2024
//   );

//   // Roth IRA withdrawal (contributions are non-taxable)
//   disbursements.addDisbursement(
//     8000,
//     "rothIra",
//     "Roth Account",
//     DISBURSEMENT_TYPE.PLANNED,
//     "Home renovation",
//     false, // Non-taxable (post-tax contributions)
//     2024
//   );

//   // Required Minimum Distribution
//   disbursements.addDisbursement(
//     12000,
//     "trad401k",
//     "Primary 401k",
//     DISBURSEMENT_TYPE.RMD,
//     "Required minimum distribution",
//     true, // Taxable
//     2024
//   );

//   // Another savings withdrawal
//   disbursements.addDisbursement(
//     3000,
//     "savings",
//     "Emergency Fund",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Car repair",
//     false,
//     2024
//   );

//   // Display total disbursements
//   console.log(
//     `Total disbursements for 2024: $${disbursements.getTotalDisbursements(2024).toLocaleString()}`
//   );
//   console.log(
//     `Taxable disbursements: $${disbursements.getTaxableDisbursements(2024).toLocaleString()}`
//   );
//   console.log(
//     `Non-taxable disbursements: $${disbursements.getNonTaxableDisbursements(2024).toLocaleString()}\n`
//   );

//   // Display disbursements by account type
//   console.log("=== Disbursements by Account Type ===");
//   console.log(
//     `Savings: $${disbursements.getDisbursementsByAccountType("savings", 2024).toLocaleString()}`
//   );
//   console.log(
//     `Traditional 401k: $${disbursements.getDisbursementsByAccountType("trad401k", 2024).toLocaleString()}`
//   );
//   console.log(
//     `Roth IRA: $${disbursements.getDisbursementsByAccountType("rothIra", 2024).toLocaleString()}\n`
//   );

//   // Display disbursements by type
//   console.log("=== Disbursements by Type ===");
//   console.log(
//     `Regular: $${disbursements.getDisbursementsByType(DISBURSEMENT_TYPE.REGULAR, 2024).toLocaleString()}`
//   );
//   console.log(
//     `Emergency: $${disbursements.getDisbursementsByType(DISBURSEMENT_TYPE.EMERGENCY, 2024).toLocaleString()}`
//   );
//   console.log(
//     `Planned: $${disbursements.getDisbursementsByType(DISBURSEMENT_TYPE.PLANNED, 2024).toLocaleString()}`
//   );
//   console.log(
//     `RMD: $${disbursements.getDisbursementsByType(DISBURSEMENT_TYPE.RMD, 2024).toLocaleString()}\n`
//   );

//   // Display account type breakdown
//   console.log("=== Account Type Breakdown ===");
//   const accountBreakdown = disbursements.getAccountTypeBreakdown(2024);
//   for (const [accountType, summary] of Object.entries(accountBreakdown)) {
//     console.log(`${accountType}:`);
//     console.log(`  Total: $${summary.totalAmount.toLocaleString()}`);
//     console.log(`  Taxable: $${summary.taxableAmount.toLocaleString()}`);
//     console.log(`  Non-taxable: $${summary.nonTaxableAmount.toLocaleString()}`);
//     console.log(`  Transactions: ${summary.transactionCount}`);
//     console.log(`  Average: $${summary.averageWithdrawal.toLocaleString()}`);
//     console.log();
//   }

//   // Display comprehensive summary
//   console.log("=== Complete Summary ===");
//   const summary = disbursements.getSummary(2024);
//   console.log(`Year: ${/** @type {any} */ (summary).year}`);
//   console.log(
//     `Total Disbursements: $${/** @type {any} */ (summary).totalDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `Taxable: $${/** @type {any} */ (summary).taxableDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `Non-taxable: $${/** @type {any} */ (summary).nonTaxableDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `Transaction Count: ${/** @type {any} */ (summary).transactionCount}`
//   );
//   console.log(
//     `Average Disbursement: $${/** @type {any} */ (summary).averageDisbursement.toLocaleString()}`
//   );
//   console.log(`\nAccount Totals:`);
//   console.log(
//     `  Savings: $${/** @type {any} */ (summary).savingsWithdrawals.toLocaleString()}`
//   );
//   console.log(
//     `  Traditional 401k: $${/** @type {any} */ (summary).trad401kWithdrawals.toLocaleString()}`
//   );
//   console.log(
//     `  Roth IRA: $${/** @type {any} */ (summary).rothIraWithdrawals.toLocaleString()}`
//   );

//   console.log("\n=== Test Complete ===");
// }

// /**
//  * Example of retirement year disbursement tracking
//  */
// function exampleRetirementYearDisbursements() {
//   console.log("\n=== Retirement Year Disbursement Example ===\n");

//   const disbursements = new Disbursements();

//   // Simulate a retirement year with various disbursements
//   console.log("Simulating retirement year disbursements...");

//   // Monthly living expenses from different sources
//   disbursements.addDisbursement(
//     30000,
//     "trad401k",
//     "Traditional 401k",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Annual living expenses",
//     true,
//     2024
//   );

//   // Roth IRA for tax-free income
//   disbursements.addDisbursement(
//     20000,
//     "rothIra",
//     "Roth IRA",
//     DISBURSEMENT_TYPE.PLANNED,
//     "Tax-free retirement income",
//     false,
//     2024
//   );

//   // Emergency fund for unexpected expenses
//   disbursements.addDisbursement(
//     8000,
//     "savings",
//     "Emergency Savings",
//     DISBURSEMENT_TYPE.EMERGENCY,
//     "Healthcare emergency",
//     false,
//     2024
//   );

//   // Required minimum distribution
//   disbursements.addDisbursement(
//     15000,
//     "trad401k",
//     "Traditional 401k",
//     DISBURSEMENT_TYPE.RMD,
//     "IRS required distribution",
//     true,
//     2024
//   );

//   const summary = disbursements.getSummary(2024);

//   console.log(
//     `Total retirement year disbursements: $${/** @type {any} */ (summary).totalDisbursements.toLocaleString()}`
//   );
//   console.log(`Tax implications:`);
//   console.log(
//     `  Taxable income from disbursements: $${/** @type {any} */ (summary).taxableDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `  Tax-free disbursements: $${/** @type {any} */ (summary).nonTaxableDisbursements.toLocaleString()}`
//   );

//   console.log(`\nAccount utilization:`);
//   console.log(
//     `  Traditional 401k: $${/** @type {any} */ (summary).trad401kWithdrawals.toLocaleString()} (${/** @type {any} */ (((summary).trad401kWithdrawals / /** @type {any} */ (summary).totalDisbursements) * 100).toFixed(1)}%)`
//   );
//   console.log(
//     `  Roth IRA: $${/** @type {any} */ (summary).rothIraWithdrawals.toLocaleString()} (${/** @type {any} */ (((summary).rothIraWithdrawals / /** @type {any} */ (summary).totalDisbursements) * 100).toFixed(1)}%)`
//   );
//   console.log(
//     `  Savings: $${/** @type {any} */ (summary).savingsWithdrawals.toLocaleString()} (${/** @type {any} */ (((summary).savingsWithdrawals / /** @type {any} */ (summary).totalDisbursements) * 100).toFixed(1)}%)`
//   );

//   // Calculate tax efficiency
//   const taxEfficiency = /** @type {any} */ (
//     ((summary).nonTaxableDisbursements /
//       /** @type {any} */ (summary).totalDisbursements) *
//     100
//   ).toFixed(1);
//   console.log(
//     `\nTax efficiency: ${taxEfficiency}% of disbursements are tax-free`
//   );

//   // Show RMD impact
//   const rmdAmount = disbursements.getRMDsForYear(2024);
//   console.log(`Required distributions: $${rmdAmount.toLocaleString()}`);

//   console.log("\n=== Retirement Example Complete ===");
// }

// /**
//  * Example of multi-year disbursement tracking
//  */
// function exampleMultiYearTracking() {
//   console.log("\n=== Multi-Year Disbursement Tracking ===\n");

//   const disbursements = new Disbursements();

//   // Add disbursements for multiple years
//   console.log("Adding disbursements for 2024-2026...");

//   // 2024 - Early retirement
//   disbursements.addDisbursement(
//     25000,
//     "savings",
//     "Savings Account",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Bridge income",
//     false,
//     2024
//   );
//   disbursements.addDisbursement(
//     10000,
//     "rothIra",
//     "Roth IRA",
//     DISBURSEMENT_TYPE.PLANNED,
//     "Supplemental income",
//     false,
//     2024
//   );

//   // 2025 - Start 401k withdrawals
//   disbursements.addDisbursement(
//     20000,
//     "savings",
//     "Savings Account",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Living expenses",
//     false,
//     2025
//   );
//   disbursements.addDisbursement(
//     15000,
//     "trad401k",
//     "401k Account",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Retirement income",
//     true,
//     2025
//   );
//   disbursements.addDisbursement(
//     12000,
//     "rothIra",
//     "Roth IRA",
//     DISBURSEMENT_TYPE.PLANNED,
//     "Tax-free income",
//     false,
//     2025
//   );

//   // 2026 - RMDs begin
//   disbursements.addDisbursement(
//     10000,
//     "savings",
//     "Savings Account",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Emergency reserve",
//     false,
//     2026
//   );
//   disbursements.addDisbursement(
//     20000,
//     "trad401k",
//     "401k Account",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Retirement income",
//     true,
//     2026
//   );
//   disbursements.addDisbursement(
//     18000,
//     "trad401k",
//     "401k Account",
//     DISBURSEMENT_TYPE.RMD,
//     "Required distribution",
//     true,
//     2026
//   );
//   disbursements.addDisbursement(
//     15000,
//     "rothIra",
//     "Roth IRA",
//     DISBURSEMENT_TYPE.PLANNED,
//     "Tax-free income",
//     false,
//     2026
//   );

//   // Analyze each year
//   const years = disbursements.getYearsWithDisbursements();
//   console.log(`Years with disbursements: ${years.join(", ")}\n`);

//   for (const year of years) {
//     const summary = disbursements.getSummary(year);
//     console.log(`${year}:`);
//     console.log(
//       `  Total: $${/** @type {any} */ (summary).totalDisbursements.toLocaleString()}`
//     );
//     console.log(
//       `  Taxable: $${/** @type {any} */ (summary).taxableDisbursements.toLocaleString()}`
//     );
//     console.log(
//       `  RMDs: $${disbursements.getRMDsForYear(year).toLocaleString()}`
//     );
//     console.log(
//       `  Tax efficiency: ${/** @type {any} */ (((summary).nonTaxableDisbursements / /** @type {any} */ (summary).totalDisbursements) * 100).toFixed(1)}%`
//     );
//     console.log();
//   }

//   console.log("=== Multi-Year Example Complete ===");
// }

// // Run tests if this file is executed directly
// if (typeof window === "undefined") {
//   // Node.js environment
//   try {
//     console.log("This test file demonstrates Disbursements class usage.");
//     console.log(
//       "To run, ensure cDisbursements.js and related dependencies are loaded.\n"
//     );

//     // testDisbursements();
//     // exampleRetirementYearDisbursements();
//     // exampleMultiYearTracking();
//   } catch (error) {
//     console.error("Error running tests:", /** @type {Error} */ (error).message);
//   }
// } else {
//   // Browser environment
//   console.log("Disbursements test functions are available:");
//   console.log("- testDisbursements()");
//   console.log("- exampleRetirementYearDisbursements()");
//   console.log("- exampleMultiYearTracking()");
// }
