// Test file for Revenue class
// This demonstrates how to use the Revenue class with AccountYear injection

/**
 * Test function to demonstrate Revenue functionality
 */
function testRevenue() {
  console.log("=== Testing Revenue Class ===\n");

  // Create mock AccountsManager and AccountYear for testing
  // In real usage, these would be actual instances from your application

  // Create accounts
  const revenueAccount = new Account(ACCOUNT_TYPES.REVENUE, 0, 0);
  const savingsAccount = new Account(ACCOUNT_TYPES.SAVINGS, 10000, 0.02);
  const trad401kAccount = new Account(ACCOUNT_TYPES.TRAD_401K, 50000, 0.06);
  const rothIraAccount = new Account(ACCOUNT_TYPES.TRAD_ROTH, 25000, 0.05);

  // Create AccountsManager
  const accountsManager = new AccountsManager(
    trad401kAccount,
    rothIraAccount,
    savingsAccount,
    revenueAccount
  );

  // Create AccountYear for 2024
  const accountYear = new AccountYear(accountsManager, 2024);

  // Create Revenue instance with AccountYear injection
  const revenue = new Revenue(accountYear);

  console.log("Adding revenue streams...");

  // Add various revenue items
  revenue.addRevenueItem("Salary", 75000, "employment", true);
  revenue.addRevenueItem("Freelance Work", 15000, "consulting", false);
  revenue.addRevenueItem("Investment Dividends", 2500, "investment", true);
  revenue.addRevenueItem("Bonus", 5000, "employment", false);
  revenue.addRevenueItem("Side Business", 8000, "business", true);

  // Display total revenue
  console.log(
    `Total revenue for ${revenue.getTaxYear()}: $${revenue.getTotalRevenue().toLocaleString()}`
  );

  // Display revenue by category
  console.log("\n=== Revenue by Category ===");
  const employmentRevenue = revenue.getRevenueByCategory("employment");
  const consultingRevenue = revenue.getRevenueByCategory("consulting");
  const investmentRevenue = revenue.getRevenueByCategory("investment");
  const businessRevenue = revenue.getRevenueByCategory("business");

  console.log(`Employment: $${employmentRevenue.toLocaleString()}`);
  console.log(`Consulting: $${consultingRevenue.toLocaleString()}`);
  console.log(`Investment: $${investmentRevenue.toLocaleString()}`);
  console.log(`Business: $${businessRevenue.toLocaleString()}`);

  // Display revenue by source
  console.log("\n=== Revenue by Source ===");
  const revenueBySource = revenue.getRevenueBySource();
  for (const [source, amount] of Object.entries(revenueBySource)) {
    console.log(`${source}: $${amount.toLocaleString()}`);
  }

  // Display recurring vs non-recurring breakdown
  console.log("\n=== Recurring vs Non-Recurring Revenue ===");
  const recurringBreakdown = revenue.getRecurringBreakdown();
  console.log(
    `Recurring revenue: $${recurringBreakdown.recurring.toLocaleString()}`
  );
  console.log(
    `Non-recurring revenue: $${recurringBreakdown.nonRecurring.toLocaleString()}`
  );

  const recurringPercentage = (
    (recurringBreakdown.recurring / revenue.getTotalRevenue()) *
    100
  ).toFixed(1);
  console.log(`Recurring revenue percentage: ${recurringPercentage}%`);

  // Check revenue target
  console.log("\n=== Revenue Target Analysis ===");
  const targetCheck = revenue.checkRevenueTarget(100000);
  console.log(`Target: $100,000`);
  console.log(`Actual: $${revenue.getTotalRevenue().toLocaleString()}`);
  console.log(`Target met: ${targetCheck.met ? "Yes" : "No"}`);
  console.log(`Achievement: ${targetCheck.percentage.toFixed(1)}%`);
  if (!targetCheck.met) {
    console.log(`Shortfall: $${targetCheck.shortfall.toLocaleString()}`);
  }

  // Display average monthly revenue
  console.log(
    `\nAverage monthly revenue: $${revenue.getAverageMonthlyRevenue().toLocaleString()}`
  );

  console.log("\n=== Test Complete ===");
}

/**
 * Example of revenue growth analysis
 */
function testRevenueGrowthAnalysis() {
  console.log("\n=== Revenue Growth Analysis ===\n");

  // Simulate previous year data
  const previousYearRevenue = 95000;

  // Create current year revenue tracking
  const revenueAccount = new Account(ACCOUNT_TYPES.REVENUE, 0, 0);
  const savingsAccount = new Account(ACCOUNT_TYPES.SAVINGS, 10000, 0.02);
  const trad401kAccount = new Account(ACCOUNT_TYPES.TRAD_401K, 50000, 0.06);
  const rothIraAccount = new Account(ACCOUNT_TYPES.TRAD_ROTH, 25000, 0.05);

  const accountsManager = new AccountsManager(
    trad401kAccount,
    rothIraAccount,
    savingsAccount,
    revenueAccount
  );
  const accountYear = new AccountYear(accountsManager, 2024);
  const revenue = new Revenue(accountYear);

  // Add current year revenue
  revenue.addRevenueItem("Salary", 80000, "employment", true);
  revenue.addRevenueItem("Consulting", 18000, "consulting", false);
  revenue.addRevenueItem("Investments", 3000, "investment", true);
  revenue.addRevenueItem("Side Business", 12000, "business", true);

  // Analyze growth
  const growth = revenue.getRevenueGrowth(previousYearRevenue);

  console.log(
    `Previous year revenue: $${previousYearRevenue.toLocaleString()}`
  );
  console.log(
    `Current year revenue: $${revenue.getTotalRevenue().toLocaleString()}`
  );
  console.log(`Growth amount: $${growth.amount.toLocaleString()}`);
  console.log(`Growth percentage: ${growth.percentage.toFixed(1)}%`);

  console.log("\n=== Growth Analysis Complete ===");
}

/**
 * Example of comprehensive revenue reporting
 */
function testRevenueReporting() {
  console.log("\n=== Comprehensive Revenue Report ===\n");

  // Create revenue instance
  const revenueAccount = new Account(ACCOUNT_TYPES.REVENUE, 1000, 0); // Starting with some balance
  const savingsAccount = new Account(ACCOUNT_TYPES.SAVINGS, 10000, 0.02);
  const trad401kAccount = new Account(ACCOUNT_TYPES.TRAD_401K, 50000, 0.06);
  const rothIraAccount = new Account(ACCOUNT_TYPES.TRAD_ROTH, 25000, 0.05);

  const accountsManager = new AccountsManager(
    trad401kAccount,
    rothIraAccount,
    savingsAccount,
    revenueAccount
  );
  const accountYear = new AccountYear(accountsManager, 2024);
  const revenue = new Revenue(accountYear);

  // Add comprehensive revenue data
  revenue.addRevenueItem("Base Salary", 60000, "employment", true);
  revenue.addRevenueItem("Performance Bonus", 8000, "employment", false);
  revenue.addRevenueItem("Overtime Pay", 5000, "employment", false);
  revenue.addRevenueItem("Consulting Project A", 12000, "consulting", false);
  revenue.addRevenueItem("Consulting Project B", 8000, "consulting", false);
  revenue.addRevenueItem("Dividend Income", 2000, "investment", true);
  revenue.addRevenueItem("Interest Income", 500, "investment", true);
  revenue.addRevenueItem("Rental Income", 18000, "rental", true);
  revenue.addRevenueItem("Side Business", 6000, "business", true);

  // Generate comprehensive report
  const report = revenue.generateReport();

  console.log("=== REVENUE SUMMARY ===");
  console.log(`Year: ${/** @type {any} */ (report).year}`);
  console.log(
    `Total Revenue: $${/** @type {any} */ (report).summary.totalRevenue.toLocaleString()}`
  );
  console.log(
    `Starting Balance: $${/** @type {any} */ (report).summary.startingBalance.toLocaleString()}`
  );
  console.log(
    `Ending Balance: $${/** @type {any} */ (report).summary.endingBalance.toLocaleString()}`
  );
  console.log(
    `Net Increase: $${/** @type {any} */ (report).summary.netIncrease.toLocaleString()}`
  );
  console.log(
    `Transaction Count: ${/** @type {any} */ (report).summary.transactionCount}`
  );

  console.log("\n=== BREAKDOWN BY SOURCE ===");
  for (const [source, amount] of Object.entries(
    /** @type {any} */ (report).breakdown.bySource
  )) {
    console.log(`${source}: $${amount.toLocaleString()}`);
  }

  console.log("\n=== BREAKDOWN BY CATEGORY ===");
  for (const [category, amount] of Object.entries(
    /** @type {any} */ (report).breakdown.byCategory
  )) {
    if (amount > 0) {
      console.log(`${category}: $${amount.toLocaleString()}`);
    }
  }

  console.log("\n=== BREAKDOWN BY RECURRENCE ===");
  const recurrenceBreakdown = /** @type {any} */ (report).breakdown
    .byRecurrence;
  console.log(`Recurring: $${recurrenceBreakdown.recurring.toLocaleString()}`);
  console.log(
    `Non-recurring: $${recurrenceBreakdown.nonRecurring.toLocaleString()}`
  );

  console.log("\n=== Revenue Report Complete ===");
}

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  // Node.js environment
  try {
    console.log("This test file demonstrates Revenue class usage.");
    console.log(
      "To run, ensure cRevenue.js and related dependencies are loaded.\n"
    );

    // testRevenue();
    // testRevenueGrowthAnalysis();
    // testRevenueReporting();
  } catch (error) {
    console.error("Error running tests:", /** @type {Error} */ (error).message);
  }
} else {
  // Browser environment
  console.log("Revenue test functions are available:");
  console.log("- testRevenue()");
  console.log("- testRevenueGrowthAnalysis()");
  console.log("- testRevenueReporting()");
}
