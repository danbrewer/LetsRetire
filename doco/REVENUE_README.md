# Revenue Class Documentation

The `Revenue` class is designed to extract and analyze revenue account data through dependency injection of an `AccountYear` instance. It provides comprehensive tracking of income streams, revenue analysis, and financial reporting specifically for `ACCOUNT_TYPES.REVENUE` accounts.

## Features

- **AccountYear Injection**: Uses dependency injection to access account data through AccountYear
- **Revenue Tracking**: Track multiple revenue streams with categorization
- **Growth Analysis**: Compare revenue performance against baselines
- **Recurring vs Non-Recurring**: Distinguish between different types of revenue
- **Target Monitoring**: Check performance against revenue targets
- **Comprehensive Reporting**: Generate detailed revenue reports and breakdowns

## Architecture

The Revenue class follows a dependency injection pattern where it receives an `AccountYear` instance and extracts data specifically from the revenue account type. This design provides:

- **Loose Coupling**: Revenue class doesn't directly depend on AccountsManager
- **Testability**: Easy to inject mock AccountYear instances for testing
- **Single Responsibility**: Focuses solely on revenue analysis
- **Data Consistency**: All revenue data comes through the same AccountYear interface

## Classes

### RevenueItem
Represents a single revenue stream item.

**Properties:**
- `source`: Source of the revenue (e.g., "Salary", "Freelance")
- `amount`: Amount of revenue
- `category`: Category of revenue (e.g., "employment", "consulting")
- `date`: Date of revenue
- `isRecurring`: Whether this is recurring revenue

### Revenue (Main Class)
The primary class for revenue analysis and reporting.

## Methods

### Core Methods

#### `constructor(accountYear)`
Creates a Revenue instance with AccountYear dependency injection.

**Parameters:**
- `accountYear` (AccountYear): AccountYear instance for accessing account data

**Example:**
```javascript
const accountYear = new AccountYear(accountsManager, 2024);
const revenue = new Revenue(accountYear);
```

#### `addRevenueItem(source, amount, category, isRecurring)`
Add a revenue item and deposit it into the revenue account.

**Parameters:**
- `source` (string): Source of the revenue
- `amount` (number): Amount of revenue
- `category` (string): Category of revenue
- `isRecurring` (boolean): Whether this is recurring revenue

**Example:**
```javascript
revenue.addRevenueItem("Salary", 75000, "employment", true);
revenue.addRevenueItem("Bonus", 5000, "employment", false);
```

### Data Extraction Methods

#### `getTotalRevenue()`
Get total revenue for the year from the revenue account.

**Returns:** Total revenue amount

#### `getRevenueByCategory(category)`
Get revenue filtered by category.

**Parameters:**
- `category` (string): Revenue category to filter by

**Returns:** Revenue amount for the specified category

#### `getStartingBalance()`
Get starting balance of the revenue account.

**Returns:** Starting balance amount

#### `getEndingBalance()`
Get ending balance of the revenue account.

**Returns:** Ending balance amount

#### `getTransactions()`
Get all transactions for the revenue account.

**Returns:** Array of Transaction objects

### Analysis Methods

#### `getRevenueBySource()`
Get breakdown of revenue by source.

**Returns:** Object with source names as keys and amounts as values

**Example:**
```javascript
const bySource = revenue.getRevenueBySource();
// Returns: { "Salary": 75000, "Freelance": 15000, "Dividends": 2500 }
```

#### `getRecurringBreakdown()`
Get breakdown of recurring vs non-recurring revenue.

**Returns:** Object with `recurring` and `nonRecurring` properties

**Example:**
```javascript
const breakdown = revenue.getRecurringBreakdown();
// Returns: { recurring: 85000, nonRecurring: 12000 }
```

#### `getRevenueItemsByCategory(category)`
Get revenue items filtered by category.

**Parameters:**
- `category` (string): Category to filter by

**Returns:** Array of RevenueItem objects

#### `getRevenueGrowth(baselineAmount)`
Compare current revenue to a baseline amount.

**Parameters:**
- `baselineAmount` (number): Baseline amount to compare against

**Returns:** Object with `amount` and `percentage` growth

**Example:**
```javascript
const growth = revenue.getRevenueGrowth(90000);
// Returns: { amount: 7500, percentage: 8.33 }
```

#### `checkRevenueTarget(targetAmount)`
Check if revenue meets a target.

**Parameters:**
- `targetAmount` (number): Target revenue amount

**Returns:** Object with `met`, `shortfall`, and `percentage` properties

**Example:**
```javascript
const targetCheck = revenue.checkRevenueTarget(100000);
// Returns: { met: false, shortfall: 2500, percentage: 97.5 }
```

### Utility Methods

#### `getAverageMonthlyRevenue()`
Calculate average monthly revenue.

**Returns:** Average monthly revenue amount

#### `generateReport()`
Generate comprehensive revenue report.

**Returns:** Detailed report object containing:
- `summary`: Total revenue, balances, transaction count
- `breakdown`: By source, category, and recurrence
- `transactions`: All revenue account transactions
- `revenueItems`: All tracked revenue items
- `year`: Tax year

#### `getTaxYear()`
Get the tax year being analyzed.

**Returns:** Tax year number

#### `clearRevenueItems()`
Clear all tracked revenue items.

#### `Revenue.Empty(accountYear)`
Static method to create an empty Revenue instance.

**Parameters:**
- `accountYear` (AccountYear): AccountYear instance

**Returns:** New empty Revenue instance

## Usage Examples

### Basic Revenue Tracking
```javascript
// Create dependencies
const accountsManager = AccountsManager.fromInputs(inputs);
const accountYear = new AccountYear(accountsManager, 2024);

// Create Revenue instance with injection
const revenue = new Revenue(accountYear);

// Add revenue streams
revenue.addRevenueItem("Base Salary", 60000, "employment", true);
revenue.addRevenueItem("Consulting", 15000, "consulting", false);
revenue.addRevenueItem("Investments", 3000, "investment", true);

// Get total revenue
console.log(`Total revenue: $${revenue.getTotalRevenue().toLocaleString()}`);
```

### Revenue Analysis
```javascript
// Analyze revenue sources
const bySource = revenue.getRevenueBySource();
for (const [source, amount] of Object.entries(bySource)) {
  console.log(`${source}: $${amount.toLocaleString()}`);
}

// Check recurring vs non-recurring
const breakdown = revenue.getRecurringBreakdown();
const recurringPercent = (breakdown.recurring / revenue.getTotalRevenue() * 100).toFixed(1);
console.log(`Recurring revenue: ${recurringPercent}%`);
```

### Target Monitoring
```javascript
// Set and check revenue target
const target = 100000;
const targetCheck = revenue.checkRevenueTarget(target);

console.log(`Target: $${target.toLocaleString()}`);
console.log(`Actual: $${revenue.getTotalRevenue().toLocaleString()}`);
console.log(`Achievement: ${targetCheck.percentage.toFixed(1)}%`);

if (!targetCheck.met) {
  console.log(`Shortfall: $${targetCheck.shortfall.toLocaleString()}`);
}
```

### Growth Analysis
```javascript
// Compare to previous year
const previousYearRevenue = 85000;
const growth = revenue.getRevenueGrowth(previousYearRevenue);

console.log(`Previous year: $${previousYearRevenue.toLocaleString()}`);
console.log(`Current year: $${revenue.getTotalRevenue().toLocaleString()}`);
console.log(`Growth: $${growth.amount.toLocaleString()} (${growth.percentage.toFixed(1)}%)`);
```

### Comprehensive Reporting
```javascript
// Generate detailed report
const report = revenue.generateReport();

console.log(`=== Revenue Report for ${report.year} ===`);
console.log(`Total Revenue: $${report.summary.totalRevenue.toLocaleString()}`);
console.log(`Transaction Count: ${report.summary.transactionCount}`);

console.log(`\nBreakdown by Category:`);
for (const [category, amount] of Object.entries(report.breakdown.byCategory)) {
  if (amount > 0) {
    console.log(`  ${category}: $${amount.toLocaleString()}`);
  }
}

console.log(`\nRecurring vs Non-Recurring:`);
console.log(`  Recurring: $${report.breakdown.byRecurrence.recurring.toLocaleString()}`);
console.log(`  Non-recurring: $${report.breakdown.byRecurrence.nonRecurring.toLocaleString()}`);
```

## Integration Patterns

### With Retirement Planning
```javascript
// Track retirement income sources
const retirementRevenue = new Revenue(retirementAccountYear);

retirementRevenue.addRevenueItem("Social Security", 24000, "benefits", true);
retirementRevenue.addRevenueItem("Pension", 36000, "pension", true);
retirementRevenue.addRevenueItem("401k Distributions", 20000, "retirement", true);
retirementRevenue.addRevenueItem("Part-time Work", 12000, "employment", false);

// Analyze retirement income stability
const breakdown = retirementRevenue.getRecurringBreakdown();
const stabilityRatio = breakdown.recurring / retirementRevenue.getTotalRevenue();
console.log(`Income stability: ${(stabilityRatio * 100).toFixed(1)}%`);
```

### With Financial Planning
```javascript
// Monthly budget planning
const monthlyRevenue = revenue.getAverageMonthlyRevenue();
const monthlyExpenses = 4500; // From expenditures tracking

const monthlySurplus = monthlyRevenue - monthlyExpenses;
console.log(`Monthly surplus: $${monthlySurplus.toLocaleString()}`);

// Annual savings potential
const annualSavingsPotential = monthlySurplus * 12;
console.log(`Annual savings potential: $${annualSavingsPotential.toLocaleString()}`);
```

## Design Benefits

### Dependency Injection
- **Testability**: Easy to mock AccountYear for unit testing
- **Flexibility**: Can work with different AccountYear implementations
- **Separation of Concerns**: Revenue analysis is separate from account management

### Data Consistency
- **Single Source**: All revenue data comes through AccountYear interface
- **Transaction Tracking**: Automatically records revenue in the account system
- **Balance Accuracy**: Revenue affects account balances correctly

### Extensibility
- **Additional Metrics**: Easy to add new revenue analysis methods
- **Integration Points**: Clear interfaces for connecting with other systems
- **Reporting Flexibility**: Multiple levels of detail available

## Error Handling

The Revenue class includes comprehensive error handling:
- **Graceful Degradation**: Returns zero or empty arrays when accounts are unavailable
- **Warning Logs**: Logs warnings for debugging while continuing operation
- **Safe Defaults**: Uses current year as fallback when tax year cannot be determined

This robust error handling ensures the Revenue class continues to function even when the underlying account system has issues.