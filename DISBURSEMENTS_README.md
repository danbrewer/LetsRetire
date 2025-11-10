# Disbursements Class Documentation

The `Disbursements` class tracks withdrawals from savings, 401k, and Roth IRA accounts for a given year. It provides comprehensive tracking of withdrawal amounts, types, tax implications, and sources to support retirement planning analysis.

## Features

- **Account-Specific Tracking**: Track withdrawals from savings, traditional 401k, and Roth IRA accounts
- **Tax Classification**: Distinguish between taxable and non-taxable withdrawals
- **Disbursement Types**: Categorize withdrawals (regular, RMD, emergency, planned, transfer)
- **Multi-Year Support**: Track and analyze disbursements across multiple years
- **Comprehensive Reporting**: Generate detailed summaries and breakdowns for analysis
- **RMD Tracking**: Specific support for Required Minimum Distribution tracking

## Classes

### DisbursementItem
Represents a single disbursement/withdrawal from an account.

**Properties:**
- `amount`: The amount withdrawn
- `accountType`: Type of account (savings, trad401k, rothIra)
- `accountName`: Specific name of the account
- `disbursementType`: Type of disbursement (from DISBURSEMENT_TYPE)
- `purpose`: Purpose/reason for the withdrawal
- `isTaxable`: Whether the withdrawal is taxable
- `date`: Date of disbursement

### AccountDisbursementSummary
Tracks disbursement summary for a specific account type.

**Properties:**
- `accountType`: Type of account
- `totalAmount`: Total amount withdrawn
- `taxableAmount`: Amount that is taxable
- `nonTaxableAmount`: Amount that is non-taxable
- `transactionCount`: Number of transactions
- `averageWithdrawal`: Average withdrawal amount

### Disbursements (Main Class)
The primary class for tracking withdrawals from retirement accounts.

## Constants

### DISBURSEMENT_TYPE
Predefined disbursement types:
- `REGULAR`: Standard retirement withdrawals
- `RMD`: Required Minimum Distributions
- `EMERGENCY`: Emergency withdrawals
- `PLANNED`: Planned/scheduled withdrawals
- `TRANSFER`: Account-to-account transfers

## Methods

### Core Methods

#### `addDisbursement(amount, accountType, accountName, disbursementType, purpose, isTaxable, year)`
Add a new disbursement/withdrawal.

**Parameters:**
- `amount` (number): Amount withdrawn (must be positive)
- `accountType` (string): Type of account (savings, trad401k, rothIra)
- `accountName` (string): Specific account name
- `disbursementType` (string): Type from DISBURSEMENT_TYPE
- `purpose` (string): Purpose of withdrawal
- `isTaxable` (boolean): Whether withdrawal is taxable
- `year` (number): Year of the disbursement

**Returns:** The amount as currency (rounded to nearest dollar)

**Example:**
```javascript
const disbursements = new Disbursements();
disbursements.addDisbursement(
  15000, 
  "trad401k", 
  "Primary 401k", 
  DISBURSEMENT_TYPE.REGULAR, 
  "Living expenses", 
  true, // Taxable
  2024
);
```

### Query Methods

#### `getTotalDisbursements(year)`
Get total disbursements for a specific year.

**Parameters:**
- `year` (number): Year to filter by

**Returns:** Total disbursement amount

#### `getDisbursementsByAccountType(accountType, year)`
Get total disbursements from a specific account type.

**Parameters:**
- `accountType` (string): Type of account (savings, trad401k, rothIra)
- `year` (number): Year to filter by

**Returns:** Total disbursements from the account type

#### `getDisbursementsByAccount(accountName, year)`
Get disbursements from a specific account.

**Parameters:**
- `accountName` (string): Name of the account
- `year` (number): Year to filter by

**Returns:** Total disbursements from the account

#### `getDisbursementsByType(disbursementType, year)`
Get disbursements by disbursement type.

**Parameters:**
- `disbursementType` (string): Type of disbursement
- `year` (number): Year to filter by

**Returns:** Total disbursements of the specified type

#### `getTaxableDisbursements(year)`
Get total taxable disbursements for a year.

**Parameters:**
- `year` (number): Year to filter by

**Returns:** Total taxable disbursement amount

#### `getNonTaxableDisbursements(year)`
Get total non-taxable disbursements for a year.

**Parameters:**
- `year` (number): Year to filter by

**Returns:** Total non-taxable disbursement amount

#### `getRMDsForYear(year)`
Get Required Minimum Distributions for a year.

**Parameters:**
- `year` (number): Year to filter by

**Returns:** Total RMD amount

### Analysis Methods

#### `getAccountTypeBreakdown(year)`
Get detailed breakdown by account type.

**Parameters:**
- `year` (number): Year to analyze

**Returns:** Record of AccountDisbursementSummary objects

#### `getDisbursementsForYear(year)`
Get all disbursement items for a specific year.

**Parameters:**
- `year` (number): Year to filter by

**Returns:** Array of DisbursementItem objects

#### `getDisbursementsByPurpose(purpose, year)`
Get disbursements by purpose/category.

**Parameters:**
- `purpose` (string): Purpose to search for
- `year` (number): Year to filter by

**Returns:** Total disbursements matching the purpose

#### `getSummary(year)`
Get comprehensive summary statistics for a year.

**Parameters:**
- `year` (number): Year to analyze

**Returns:** Object containing:
- `year`: Year analyzed
- `totalDisbursements`: Total disbursement amount
- `taxableDisbursements`: Total taxable amount
- `nonTaxableDisbursements`: Total non-taxable amount
- `transactionCount`: Number of disbursement transactions
- `averageDisbursement`: Average disbursement amount
- `accountTypeBreakdown`: Detailed breakdown by account type
- `disbursementTypeBreakdown`: Breakdown by disbursement type
- `savingsWithdrawals`: Total from savings accounts
- `trad401kWithdrawals`: Total from traditional 401k accounts
- `rothIraWithdrawals`: Total from Roth IRA accounts

### Utility Methods

#### `hasDisbursementsForYear(year)`
Check if there are any disbursements for a year.

**Parameters:**
- `year` (number): Year to check

**Returns:** Boolean indicating if disbursements exist

#### `getYearsWithDisbursements()`
Get all years that have disbursements.

**Returns:** Array of years (sorted)

#### `clear()`
Clear all disbursements.

#### `Disbursements.Empty()`
Static method to create an empty Disbursements instance.

**Returns:** New empty Disbursements object

## Usage Examples

### Basic Usage
```javascript
// Create disbursements tracker
const disbursements = new Disbursements();

// Add regular 401k withdrawal
disbursements.addDisbursement(
  15000, 
  "trad401k", 
  "Primary 401k", 
  DISBURSEMENT_TYPE.REGULAR, 
  "Living expenses", 
  true, // Taxable
  2024
);

// Add Roth IRA withdrawal (tax-free)
disbursements.addDisbursement(
  8000, 
  "rothIra", 
  "Roth Account", 
  DISBURSEMENT_TYPE.PLANNED, 
  "Home renovation", 
  false, // Non-taxable
  2024
);

// Get total disbursements
const total = disbursements.getTotalDisbursements(2024);
console.log(`Total 2024 disbursements: $${total.toLocaleString()}`);

// Get tax implications
const taxable = disbursements.getTaxableDisbursements(2024);
const nonTaxable = disbursements.getNonTaxableDisbursements(2024);
console.log(`Taxable: $${taxable.toLocaleString()}`);
console.log(`Tax-free: $${nonTaxable.toLocaleString()}`);
```

### Retirement Planning Analysis
```javascript
const disbursements = new Disbursements();

// Add retirement year disbursements
disbursements.addDisbursement(30000, "trad401k", "401k", DISBURSEMENT_TYPE.REGULAR, "Annual living expenses", true, 2024);
disbursements.addDisbursement(20000, "rothIra", "Roth IRA", DISBURSEMENT_TYPE.PLANNED, "Tax-free income", false, 2024);
disbursements.addDisbursement(15000, "trad401k", "401k", DISBURSEMENT_TYPE.RMD, "Required distribution", true, 2024);

// Analyze the retirement year
const summary = disbursements.getSummary(2024);
console.log(`Total retirement disbursements: $${summary.totalDisbursements.toLocaleString()}`);
console.log(`Tax burden: $${summary.taxableDisbursements.toLocaleString()}`);
console.log(`Tax efficiency: ${(summary.nonTaxableDisbursements / summary.totalDisbursements * 100).toFixed(1)}%`);

// Account utilization breakdown
console.log(`401k usage: $${summary.trad401kWithdrawals.toLocaleString()}`);
console.log(`Roth IRA usage: $${summary.rothIraWithdrawals.toLocaleString()}`);
```

### RMD Tracking
```javascript
// Track Required Minimum Distributions
disbursements.addDisbursement(
  18000, 
  "trad401k", 
  "Traditional 401k", 
  DISBURSEMENT_TYPE.RMD, 
  "IRS required distribution", 
  true, 
  2024
);

// Get RMD amounts
const rmdAmount = disbursements.getRMDsForYear(2024);
console.log(`RMDs for 2024: $${rmdAmount.toLocaleString()}`);

// Check RMD compliance
const totalRegular = disbursements.getDisbursementsByType(DISBURSEMENT_TYPE.REGULAR, 2024);
const totalRMD = disbursements.getRMDsForYear(2024);
console.log(`Regular withdrawals: $${totalRegular.toLocaleString()}`);
console.log(`Required RMDs: $${totalRMD.toLocaleString()}`);
```

### Multi-Year Analysis
```javascript
// Add disbursements for multiple years
disbursements.addDisbursement(25000, "savings", "Emergency Fund", DISBURSEMENT_TYPE.REGULAR, "Bridge income", false, 2024);
disbursements.addDisbursement(20000, "trad401k", "401k Account", DISBURSEMENT_TYPE.REGULAR, "Retirement income", true, 2025);
disbursements.addDisbursement(18000, "trad401k", "401k Account", DISBURSEMENT_TYPE.RMD, "Required distribution", true, 2026);

// Analyze progression over years
const years = disbursements.getYearsWithDisbursements();
for (const year of years) {
  const summary = disbursements.getSummary(year);
  console.log(`${year}: $${summary.totalDisbursements.toLocaleString()} total, ${(summary.nonTaxableDisbursements / summary.totalDisbursements * 100).toFixed(1)}% tax-free`);
}
```

### Account Type Breakdown
```javascript
// Get detailed breakdown by account type
const breakdown = disbursements.getAccountTypeBreakdown(2024);
for (const [accountType, summary] of Object.entries(breakdown)) {
  console.log(`${accountType}:`);
  console.log(`  Total: $${summary.totalAmount.toLocaleString()}`);
  console.log(`  Taxable: $${summary.taxableAmount.toLocaleString()}`);
  console.log(`  Tax-free: $${summary.nonTaxableAmount.toLocaleString()}`);
  console.log(`  Transactions: ${summary.transactionCount}`);
  console.log(`  Average withdrawal: $${summary.averageWithdrawal.toLocaleString()}`);
}
```

## Tax Implications by Account Type

### Traditional 401k
- **Taxability**: Generally taxable as ordinary income
- **RMDs**: Subject to Required Minimum Distributions starting at age 73
- **Early Withdrawal**: May incur penalties before age 59½

### Roth IRA
- **Contributions**: Always tax-free (post-tax money)
- **Earnings**: Tax-free after age 59½ and 5-year rule
- **RMDs**: No RMDs during owner's lifetime

### Savings Accounts
- **Taxability**: Generally non-taxable (already taxed income)
- **Interest**: Interest earned is taxable
- **No Restrictions**: No age or withdrawal restrictions

## Integration with Retirement Calculator

The Disbursements class integrates seamlessly with the existing retirement calculator:

1. **Account Types**: Uses existing ACCOUNT_TYPES constants
2. **Currency Handling**: Leverages `.asCurrency()` extension method
3. **Transaction Categories**: Compatible with TRANSACTION_CATEGORY constants
4. **Error Handling**: Follows established error handling patterns

## Performance Considerations

- Efficient year-based filtering for large datasets
- Minimal memory footprint with private fields
- Lazy calculation of summaries and breakdowns
- Optimized queries for common retirement planning scenarios

## Error Handling

- Validates disbursement amounts are positive
- Validates disbursement types against predefined constants
- Provides meaningful error messages for invalid inputs
- Handles edge cases like empty datasets gracefully