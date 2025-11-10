// Test file for Expenditures class
// This demonstrates how to use the Expenditures class

// Load the Expenditures class (assuming it's available)
// In a real application, you'd import/require the cExpenditures.js file

/**
 * Test function to demonstrate Expenditures functionality
 */
function testExpenditures() {
  console.log("=== Testing Expenditures Class ===\n");

  // Create a new Expenditures instance
  const expenditures = new Expenditures();

  // Add some expenditures for 2024
  console.log("Adding expenditures for 2024...");

  expenditures.addExpenditure(
    3000,
    EXPENDITURE_CATEGORY.HOUSING,
    "Monthly rent payment",
    ACCOUNT_TYPES.SAVINGS,
    2024
  );

  expenditures.addExpenditure(
    1500,
    EXPENDITURE_CATEGORY.LIVING_EXPENSES,
    "Groceries and utilities",
    ACCOUNT_TYPES.SAVINGS,
    2024
  );

  expenditures.addExpenditure(
    5000,
    EXPENDITURE_CATEGORY.TRAVEL,
    "Family vacation",
    ACCOUNT_TYPES.TRAD_401K,
    2024
  );

  expenditures.addExpenditure(
    2000,
    EXPENDITURE_CATEGORY.HEALTHCARE,
    "Medical expenses",
    ACCOUNT_TYPES.TRAD_ROTH,
    2024
  );

  expenditures.addExpenditure(
    800,
    EXPENDITURE_CATEGORY.ENTERTAINMENT,
    "Dining and entertainment",
    ACCOUNT_TYPES.SAVINGS,
    2024
  );

  // Display total spending
  console.log(
    `Total spending for 2024: $${expenditures.getTotalSpend(2024).toLocaleString()}`
  );
  console.log(
    `Total spending (all years): $${expenditures.getTotalSpend().toLocaleString()}\n`
  );

  // Display spending by category
  console.log("=== Spending by Category ===");
  const categoryBreakdown = expenditures.getCategoryBreakdown(2024);
  for (const [category, amount] of Object.entries(categoryBreakdown)) {
    if (amount > 0) {
      console.log(`${category}: $${amount.toLocaleString()}`);
    }
  }
  console.log();

  // Display spending by account
  console.log("=== Spending by Account Source ===");
  const accountBreakdown = expenditures.getAccountBreakdown(2024);
  for (const [account, amount] of Object.entries(accountBreakdown)) {
    if (amount > 0) {
      console.log(`${account}: $${amount.toLocaleString()}`);
    }
  }
  console.log();

  // Display funding contributions with proportions
  console.log("=== Funding Contributions ===");
  const fundingContributions = expenditures.getFundingContributions();
  for (const contribution of fundingContributions) {
    console.log(
      `${contribution.accountName}: $${contribution.amount.toLocaleString()} (${contribution.proportionAsPercentage}%)`
    );
  }
  console.log();

  // Display comprehensive summary
  console.log("=== Complete Summary ===");
  const summary = expenditures.getSummary(2024);
  console.log(
    `Total Spend: $${/** @type {any} */ (summary).totalSpend.toLocaleString()}`
  );
  console.log(
    `Number of Expenditures: ${/** @type {any} */ (summary).numberOfExpenditures}`
  );
  console.log("\nCategory Breakdown:");
  for (const [category, amount] of Object.entries(
    /** @type {any} */ (summary).categoryBreakdown
  )) {
    if (amount > 0) {
      console.log(`  ${category}: $${amount.toLocaleString()}`);
    }
  }
  console.log("\nAccount Breakdown:");
  for (const [account, amount] of Object.entries(
    /** @type {any} */ (summary).accountBreakdown
  )) {
    if (amount > 0) {
      console.log(`  ${account}: $${amount.toLocaleString()}`);
    }
  }
  console.log("\nFunding Contributions:");
  for (const contribution of /** @type {any} */ (summary)
    .fundingContributions) {
    console.log(
      `  ${contribution.accountName}: $${contribution.amount.toLocaleString()} (${contribution.proportionAsPercentage}%)`
    );
  }

  // Test specific account spending
  console.log("\n=== Specific Account Analysis ===");
  const savingsSpending = expenditures.getSpendingByAccount(
    ACCOUNT_TYPES.SAVINGS,
    2024
  );
  const tradRothSpending = expenditures.getSpendingByAccount(
    ACCOUNT_TYPES.TRAD_ROTH,
    2024
  );

  console.log(`Spending from Savings: $${savingsSpending.toLocaleString()}`);
  console.log(`Spending from Roth IRA: $${tradRothSpending.toLocaleString()}`);

  // Test specific category spending
  console.log("\n=== Specific Category Analysis ===");
  const housingSpending = expenditures.getSpendingByCategory(
    EXPENDITURE_CATEGORY.HOUSING,
    2024
  );
  const travelSpending = expenditures.getSpendingByCategory(
    EXPENDITURE_CATEGORY.TRAVEL,
    2024
  );

  console.log(`Housing expenses: $${housingSpending.toLocaleString()}`);
  console.log(`Travel expenses: $${travelSpending.toLocaleString()}`);

  console.log("\n=== Test Complete ===");
}

/**
 * Example of integrating with retirement planning
 */
function exampleRetirementIntegration() {
  console.log("\n=== Retirement Planning Integration Example ===\n");

  const expenditures = new Expenditures();

  // Simulate a retirement year with various funding sources
  console.log("Simulating retirement year spending...");

  // Living expenses funded from different sources
  expenditures.addExpenditure(
    25000,
    EXPENDITURE_CATEGORY.LIVING_EXPENSES,
    "Annual living expenses",
    ACCOUNT_TYPES.SAVINGS,
    2024
  );

  expenditures.addExpenditure(
    15000,
    EXPENDITURE_CATEGORY.HEALTHCARE,
    "Healthcare and insurance",
    ACCOUNT_TYPES.TRAD_401K,
    2024
  );

  expenditures.addExpenditure(
    8000,
    EXPENDITURE_CATEGORY.TRAVEL,
    "Retirement travel",
    ACCOUNT_TYPES.TRAD_ROTH,
    2024
  );

  expenditures.addExpenditure(
    12000,
    EXPENDITURE_CATEGORY.TAXES,
    "Federal and state taxes",
    ACCOUNT_TYPES.TRAD_401K,
    2024
  );

  const summary = expenditures.getSummary(2024);

  console.log(
    `Total retirement spending: $${/** @type {any} */ (summary).totalSpend.toLocaleString()}`
  );
  console.log("\nFunding source breakdown:");

  for (const contribution of /** @type {any} */ (summary)
    .fundingContributions) {
    console.log(
      `  ${contribution.accountName}: $${contribution.amount.toLocaleString()} (${contribution.proportionAsPercentage}% of total)`
    );
  }

  // Calculate which accounts are being drawn down most heavily
  const contributions = /** @type {any} */ (summary).fundingContributions.sort(
    /** @param {any} a @param {any} b */ (a, b) => b.amount - a.amount
  );
  console.log(
    `\nLargest funding source: ${contributions[0].accountName} at ${contributions[0].proportionAsPercentage}%`
  );

  console.log("\n=== Integration Example Complete ===");
}

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  // Node.js environment
  try {
    // In a real scenario, you'd require/import the necessary files
    console.log("This test file demonstrates Expenditures class usage.");
    console.log(
      "To run, ensure cExpenditures.js and related dependencies are loaded.\n"
    );

    // testExpenditures();
    // exampleRetirementIntegration();
  } catch (error) {
    console.error("Error running tests:", /** @type {Error} */ (error).message);
  }
} else {
  // Browser environment
  console.log("Expenditures test functions are available:");
  console.log("- testExpenditures()");
  console.log("- exampleRetirementIntegration()");
}
