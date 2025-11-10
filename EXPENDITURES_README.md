# Expenditures Class Documentation

The `Expenditures` class is designed to track where money is pulled from and where it goes in a retirement planning system. It provides comprehensive tracking of spending patterns and funding sources.

## Features

- **Total Spending Tracking**: Track total expenditures for any given year
- **Category Breakdown**: Organize spending by predefined categories
- **Account Source Tracking**: Monitor which accounts (savings, 401k, Roth IRA) fund expenses
- **Proportional Analysis**: Calculate what percentage each account contributes to total spending
- **Flexible Reporting**: Generate summaries and breakdowns for analysis

## Classes

### ExpenditureItem
Represents a single expenditure with funding source information.

**Properties:**
- `amount`: The amount spent
- `category`: Category of expenditure (from EXPENDITURE_CATEGORY)
- `description`: Description of the expenditure
- `accountSource`: Which account the money came from
- `date`: Date of expenditure

### FundingContribution
Tracks funding contribution from a specific account.

**Properties:**
- `accountName`: Name of the contributing account
- `amount`: Amount contributed from this account
- `proportion`: Proportion of total expenditures (0-1)
- `proportionAsPercentage`: Proportion as a percentage (0-100)

### Expenditures (Main Class)
The primary class for tracking expenditures and funding sources.

## Constants

### EXPENDITURE_CATEGORY
Predefined expenditure categories:
- `LIVING_EXPENSES`: Basic living costs
- `HEALTHCARE`: Medical and health-related expenses
- `TRAVEL`: Travel and vacation expenses
- `HOUSING`: Housing-related costs
- `ENTERTAINMENT`: Entertainment and leisure
- `TAXES`: Tax obligations
- `OTHER`: Miscellaneous expenses

## Methods

### Core Methods

#### `addExpenditure(amount, category, description, accountSource, year)`
Add a new expenditure item.

**Parameters:**
- `amount` (number): The amount spent (must be positive)
- `category` (string): Category from EXPENDITURE_CATEGORY
- `description` (string): Description of the expenditure
- `accountSource` (string): Source account name
- `year` (number): Year of the expenditure

**Returns:** The amount as currency (rounded to nearest dollar)

**Example:**
```javascript
const expenditures = new Expenditures();
expenditures.addExpenditure(
  3000, 
  EXPENDITURE_CATEGORY.HOUSING, 
  "Monthly rent payment", 
  ACCOUNT_TYPES.SAVINGS, 
  2024
);
```

#### `addFunding(accountName, amount)`
Add funding from a specific account (alternative to addExpenditure for bulk tracking).

**Parameters:**
- `accountName` (string): Name of the funding account
- `amount` (number): Amount provided by this account

### Query Methods

#### `getTotalSpend(year?)`
Get total spending for the year or all years.

**Parameters:**
- `year` (number, optional): Year to filter by

**Returns:** Total spending amount

#### `getSpendingByCategory(category, year?)`
Get spending for a specific category.

**Parameters:**
- `category` (string): Expenditure category
- `year` (number, optional): Year to filter by

**Returns:** Total spending for the category

#### `getSpendingByAccount(accountName, year?)`
Get spending funded by a specific account.

**Parameters:**
- `accountName` (string): Name of the account
- `year` (number, optional): Year to filter by

**Returns:** Total spending from the account

#### `getFundingContributions()`
Get all funding contributions with proportional information.

**Returns:** Array of FundingContribution objects

#### `getFundingContribution(accountName)`
Get funding contribution from a specific account.

**Parameters:**
- `accountName` (string): Name of the account

**Returns:** FundingContribution object or null

### Analysis Methods

#### `getCategoryBreakdown(year?)`
Get breakdown of expenditures by category.

**Parameters:**
- `year` (number, optional): Year to filter by

**Returns:** Object with category names as keys and amounts as values

#### `getAccountBreakdown(year?)`
Get breakdown of expenditures by account source.

**Parameters:**
- `year` (number, optional): Year to filter by

**Returns:** Object with account names as keys and amounts as values

#### `getExpendituresForYear(year)`
Get all expenditure items for a specific year.

**Parameters:**
- `year` (number): Year to filter by

**Returns:** Array of ExpenditureItem objects

#### `getSummary(year?)`
Get comprehensive summary statistics.

**Parameters:**
- `year` (number, optional): Year to filter by

**Returns:** Object containing:
- `totalSpend`: Total spending amount
- `categoryBreakdown`: Spending by category
- `accountBreakdown`: Spending by account
- `fundingContributions`: Array of funding contribution details
- `numberOfExpenditures`: Count of expenditure items

### Utility Methods

#### `clear()`
Clear all expenditures and funding contributions.

#### `Expenditures.Empty()`
Static method to create an empty Expenditures instance.

**Returns:** New empty Expenditures object

## Usage Examples

### Basic Usage
```javascript
// Create expenditures tracker
const expenditures = new Expenditures();

// Add some expenditures
expenditures.addExpenditure(
  3000, 
  EXPENDITURE_CATEGORY.HOUSING, 
  "Monthly rent", 
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

// Get total spending
const totalSpend = expenditures.getTotalSpend(2024);
console.log(`Total 2024 spending: $${totalSpend.toLocaleString()}`);

// Get funding breakdown
const fundingContributions = expenditures.getFundingContributions();
for (const contribution of fundingContributions) {
  console.log(
    `${contribution.accountName}: $${contribution.amount.toLocaleString()} (${contribution.proportionAsPercentage}%)`
  );
}
```

### Retirement Planning Analysis
```javascript
const expenditures = new Expenditures();

// Add retirement year expenses
expenditures.addExpenditure(25000, EXPENDITURE_CATEGORY.LIVING_EXPENSES, "Annual living expenses", ACCOUNT_TYPES.SAVINGS, 2024);
expenditures.addExpenditure(15000, EXPENDITURE_CATEGORY.HEALTHCARE, "Healthcare costs", ACCOUNT_TYPES.TRAD_401K, 2024);
expenditures.addExpenditure(8000, EXPENDITURE_CATEGORY.TRAVEL, "Retirement travel", ACCOUNT_TYPES.TRAD_ROTH, 2024);

// Analyze funding sources
const summary = expenditures.getSummary(2024);
console.log(`Total retirement spending: $${summary.totalSpend.toLocaleString()}`);

// Find largest funding source
const contributions = summary.fundingContributions.sort((a, b) => b.amount - a.amount);
console.log(`Primary funding source: ${contributions[0].accountName} (${contributions[0].proportionAsPercentage}%)`);
```

### Category Analysis
```javascript
// Analyze spending patterns
const categoryBreakdown = expenditures.getCategoryBreakdown(2024);
for (const [category, amount] of Object.entries(categoryBreakdown)) {
  if (amount > 0) {
    const percentage = (amount / expenditures.getTotalSpend(2024) * 100).toFixed(1);
    console.log(`${category}: $${amount.toLocaleString()} (${percentage}%)`);
  }
}
```

## Integration with Retirement Calculator

The Expenditures class is designed to integrate seamlessly with the existing retirement calculator codebase:

1. **Account Integration**: Uses existing ACCOUNT_TYPES constants
2. **Currency Handling**: Leverages the `.asCurrency()` extension method
3. **Date Handling**: Uses standard JavaScript Date objects
4. **Error Handling**: Follows existing error handling patterns

## Error Handling

The class includes comprehensive error checking:
- Validates expenditure amounts are positive
- Validates expenditure categories against predefined constants
- Provides meaningful error messages for invalid inputs

## Performance Considerations

- Efficient filtering for year-based queries
- Automatic recalculation of funding proportions
- Minimal memory footprint with private fields
- Lazy calculation of breakdowns and summaries