// // Integration example showing how Disbursements class works with existing Account class
// // This demonstrates the relationship between Account withdrawals and Disbursement tracking

// /**
//  * Example integration between Account and Disbursements classes
//  */
// function demonstrateAccountDisbursementIntegration() {
//   console.log("=== Account-Disbursement Integration Example ===\n");

//   // Create accounts (using existing Account class pattern)
//   // Note: In actual implementation, these would be Account instances
//   const accounts = {
//     savings: { name: "Emergency Savings", balance: 50000 },
//     trad401k: { name: "Traditional 401k", balance: 300000 },
//     rothIra: { name: "Roth IRA", balance: 150000 },
//   };

//   // Create disbursements tracker
//   const disbursements = new Disbursements();

//   console.log("Initial account balances:");
//   for (const [, account] of Object.entries(accounts)) {
//     console.log(`  ${account.name}: $${account.balance.toLocaleString()}`);
//   }
//   console.log();

//   // Simulate retirement year disbursements
//   console.log("Processing 2024 retirement disbursements...\n");

//   // Withdraw from savings for emergency
//   const emergencyAmount = 5000;
//   disbursements.addDisbursement(
//     emergencyAmount,
//     "savings",
//     accounts.savings.name,
//     DISBURSEMENT_TYPE.EMERGENCY,
//     "Medical emergency",
//     false, // Savings withdrawals are typically non-taxable
//     2024
//   );
//   accounts.savings.balance -= emergencyAmount;
//   console.log(
//     `Emergency withdrawal: $${emergencyAmount.toLocaleString()} from ${accounts.savings.name}`
//   );

//   // Regular 401k withdrawal for living expenses
//   const livingExpenses = 25000;
//   disbursements.addDisbursement(
//     livingExpenses,
//     "trad401k",
//     accounts.trad401k.name,
//     DISBURSEMENT_TYPE.REGULAR,
//     "Annual living expenses",
//     true, // Traditional 401k withdrawals are taxable
//     2024
//   );
//   accounts.trad401k.balance -= livingExpenses;
//   console.log(
//     `Regular withdrawal: $${livingExpenses.toLocaleString()} from ${accounts.trad401k.name}`
//   );

//   // Required Minimum Distribution
//   const rmdAmount = 12000;
//   disbursements.addDisbursement(
//     rmdAmount,
//     "trad401k",
//     accounts.trad401k.name,
//     DISBURSEMENT_TYPE.RMD,
//     "Required minimum distribution",
//     true, // RMDs are taxable
//     2024
//   );
//   accounts.trad401k.balance -= rmdAmount;
//   console.log(
//     `RMD withdrawal: $${rmdAmount.toLocaleString()} from ${accounts.trad401k.name}`
//   );

//   // Roth IRA withdrawal (tax-free)
//   const rothAmount = 15000;
//   disbursements.addDisbursement(
//     rothAmount,
//     "rothIra",
//     accounts.rothIra.name,
//     DISBURSEMENT_TYPE.PLANNED,
//     "Tax-free retirement income",
//     false, // Roth withdrawals are typically non-taxable
//     2024
//   );
//   accounts.rothIra.balance -= rothAmount;
//   console.log(
//     `Roth withdrawal: $${rothAmount.toLocaleString()} from ${accounts.rothIra.name}`
//   );

//   console.log("\nUpdated account balances:");
//   for (const [, account] of Object.entries(accounts)) {
//     console.log(`  ${account.name}: $${account.balance.toLocaleString()}`);
//   }

//   // Analyze disbursements
//   console.log("\n=== Disbursement Analysis ===");
//   const summary = disbursements.getSummary(2024);

//   console.log(
//     `Total disbursements: $${/** @type {any} */ (summary).totalDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `Taxable portion: $${/** @type {any} */ (summary).taxableDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `Tax-free portion: $${/** @type {any} */ (summary).nonTaxableDisbursements.toLocaleString()}`
//   );

//   const taxEfficiency =
//     /** @type {any} */ ((summary).nonTaxableDisbursements /
//       /** @type {any} */ (summary).totalDisbursements) *
//     100;
//   console.log(
//     `Tax efficiency: ${taxEfficiency.toFixed(1)}% of disbursements are tax-free`
//   );

//   // Account utilization breakdown
//   console.log("\nAccount utilization:");
//   console.log(
//     `  Savings: $${/** @type {any} */ (summary).savingsWithdrawals.toLocaleString()} (${/** @type {any} */ (((summary).savingsWithdrawals / /** @type {any} */ (summary).totalDisbursements) * 100).toFixed(1)}%)`
//   );
//   console.log(
//     `  Traditional 401k: $${/** @type {any} */ (summary).trad401kWithdrawals.toLocaleString()} (${/** @type {any} */ (((summary).trad401kWithdrawals / /** @type {any} */ (summary).totalDisbursements) * 100).toFixed(1)}%)`
//   );
//   console.log(
//     `  Roth IRA: $${/** @type {any} */ (summary).rothIraWithdrawals.toLocaleString()} (${/** @type {any} */ (((summary).rothIraWithdrawals / /** @type {any} */ (summary).totalDisbursements) * 100).toFixed(1)}%)`
//   );

//   // RMD tracking
//   const rmdTotal = disbursements.getRMDsForYear(2024);
//   console.log(`\nRequired distributions: $${rmdTotal.toLocaleString()}`);

//   console.log("\n=== Integration Example Complete ===");
// }

// /**
//  * Example showing how to track disbursements for tax planning
//  */
// function demonstrateTaxPlanningWithDisbursements() {
//   console.log("\n=== Tax Planning with Disbursements ===\n");

//   const disbursements = new Disbursements();

//   // Scenario: Retiree wants to minimize tax burden
//   console.log("Tax-efficient disbursement strategy for 2024...\n");

//   // Start with tax-free sources (Roth and savings)
//   disbursements.addDisbursement(
//     20000,
//     "rothIra",
//     "Roth IRA",
//     DISBURSEMENT_TYPE.PLANNED,
//     "Tax-free base income",
//     false,
//     2024
//   );
//   disbursements.addDisbursement(
//     10000,
//     "savings",
//     "Savings",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Non-taxable supplement",
//     false,
//     2024
//   );

//   // Add minimal taxable income to stay in lower tax bracket
//   disbursements.addDisbursement(
//     15000,
//     "trad401k",
//     "Traditional 401k",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Controlled taxable income",
//     true,
//     2024
//   );

//   // Required RMD (no choice)
//   disbursements.addDisbursement(
//     8000,
//     "trad401k",
//     "Traditional 401k",
//     DISBURSEMENT_TYPE.RMD,
//     "Required distribution",
//     true,
//     2024
//   );

//   const summary = disbursements.getSummary(2024);

//   console.log("Tax-efficient disbursement results:");
//   console.log(
//     `Total income: $${/** @type {any} */ (summary).totalDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `Taxable income: $${/** @type {any} */ (summary).taxableDisbursements.toLocaleString()}`
//   );
//   console.log(
//     `Tax-free income: $${/** @type {any} */ (summary).nonTaxableDisbursements.toLocaleString()}`
//   );

//   const effectiveTaxRate =
//     /** @type {any} */ ((summary).taxableDisbursements /
//       /** @type {any} */ (summary).totalDisbursements) *
//     100;
//   console.log(
//     `Effective tax exposure: ${effectiveTaxRate.toFixed(1)}% of total income`
//   );

//   console.log("\n=== Tax Planning Example Complete ===");
// }

// /**
//  * Function to demonstrate validation between Account withdrawals and Disbursement tracking
//  */
// function demonstrateValidationChecks() {
//   console.log("\n=== Validation and Reconciliation ===\n");

//   const disbursements = new Disbursements();

//   // Simulate account withdrawal tracking
//   const accountWithdrawals = {
//     "Traditional 401k": 25000,
//     "Roth IRA": 15000,
//     "Savings Account": 8000,
//   };

//   // Record disbursements
//   disbursements.addDisbursement(
//     25000,
//     "trad401k",
//     "Traditional 401k",
//     DISBURSEMENT_TYPE.REGULAR,
//     "Living expenses",
//     true,
//     2024
//   );
//   disbursements.addDisbursement(
//     15000,
//     "rothIra",
//     "Roth IRA",
//     DISBURSEMENT_TYPE.PLANNED,
//     "Supplemental income",
//     false,
//     2024
//   );
//   disbursements.addDisbursement(
//     8000,
//     "savings",
//     "Savings Account",
//     DISBURSEMENT_TYPE.EMERGENCY,
//     "Emergency fund",
//     false,
//     2024
//   );

//   // Validate totals match
//   console.log(
//     "Validation check - Account withdrawals vs. Disbursement tracking:"
//   );

//   let accountTotal = 0;
//   for (const [account, amount] of Object.entries(accountWithdrawals)) {
//     accountTotal += amount;
//     const disbursementAmount = disbursements.getDisbursementsByAccount(
//       account,
//       2024
//     );
//     const match = amount === disbursementAmount;
//     console.log(
//       `  ${account}: Account($${amount.toLocaleString()}) vs Disbursement($${disbursementAmount.toLocaleString()}) - ${match ? "✓" : "✗"}`
//     );
//   }

//   const disbursementTotal = disbursements.getTotalDisbursements(2024);
//   const totalsMatch = accountTotal === disbursementTotal;

//   console.log(`\nTotal validation:`);
//   console.log(`  Account withdrawals: $${accountTotal.toLocaleString()}`);
//   console.log(
//     `  Disbursement tracking: $${disbursementTotal.toLocaleString()}`
//   );
//   console.log(`  Match: ${totalsMatch ? "✓" : "✗"}`);

//   console.log("\n=== Validation Example Complete ===");
// }

// // Export functions for use in other files or testing
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = {
//     demonstrateAccountDisbursementIntegration,
//     demonstrateTaxPlanningWithDisbursements,
//     demonstrateValidationChecks,
//   };
// }

// // Browser environment
// if (typeof window !== "undefined") {
//   console.log("Account-Disbursement integration functions are available:");
//   console.log("- demonstrateAccountDisbursementIntegration()");
//   console.log("- demonstrateTaxPlanningWithDisbursements()");
//   console.log("- demonstrateValidationChecks()");
// }
