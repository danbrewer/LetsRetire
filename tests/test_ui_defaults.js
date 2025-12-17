import {
  getTaxableIncomeOverride,
  getTaxFreeIncomeOverride,
  getSpendingOverride,
} from "../retirement-ui.js";

// Simple test to verify the UI function defaults are working
console.log("Testing UI function defaults...");

// Test getTaxableIncomeOverride function
if (typeof getTaxableIncomeOverride !== "undefined") {
  const result = getTaxableIncomeOverride(62);
  console.log("✅ getTaxableIncomeOverride(62) returns:", result);
  if (isNaN(result)) {
    console.log("❌ getTaxableIncomeOverride returned NaN!");
  } else {
    console.log("✅ getTaxableIncomeOverride returned a valid number");
  }
} else {
  console.log("❌ getTaxableIncomeOverride is not defined");
}

// Test getTaxFreeIncomeOverride function
if (typeof getTaxFreeIncomeOverride !== "undefined") {
  const result = getTaxFreeIncomeOverride(62);
  console.log("✅ getTaxFreeIncomeOverride(62) returns:", result);
  if (isNaN(result)) {
    console.log("❌ getTaxFreeIncomeOverride returned NaN!");
  } else {
    console.log("✅ getTaxFreeIncomeOverride returned a valid number");
  }
} else {
  console.log("❌ getTaxFreeIncomeOverride is not defined");
}

// Test getSpendingOverride function
if (typeof getSpendingOverride !== "undefined") {
  const result = getSpendingOverride(62);
  console.log("✅ getSpendingOverride(62) returns:", result);
  if (result !== null && isNaN(result)) {
    console.log("❌ getSpendingOverride returned NaN!");
  } else {
    console.log(
      "✅ getSpendingOverride returned a valid value (null or number)"
    );
  }
} else {
  console.log("❌ getSpendingOverride is not defined");
}

console.log("All UI function default tests completed.");
