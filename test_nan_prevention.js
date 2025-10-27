// ignore type-checking in this file for now

// @ts-nocheck

// Simple test to verify NaN prevention
console.log("Testing NaN prevention...");

// Simulate the scenario where UI functions might be undefined
let testTaxableAdjustment;
let testTaxFreeAdjustment;

// Test the old way (would cause NaN)
function getTaxableIncomeOverride_old(age) {
  return undefined; // Simulates when function isn't loaded yet
}

function getTaxFreeIncomeOverride_old(age) {
  return undefined; // Simulates when function isn't loaded yet
}

testTaxableAdjustment = getTaxableIncomeOverride_old(62);
testTaxFreeAdjustment = getTaxFreeIncomeOverride_old(62);

console.log("Old way - taxableAdjustment:", testTaxableAdjustment);
console.log("Old way - taxFreeAdjustment:", testTaxFreeAdjustment);

let totalIncome_old = 50000 + testTaxableAdjustment + testTaxFreeAdjustment;
console.log("Old way - totalIncome:", totalIncome_old, "(would be NaN)");

// Test the new way (prevents NaN)
testTaxableAdjustment = getTaxableIncomeOverride_old(62) || 0;
testTaxFreeAdjustment = getTaxFreeIncomeOverride_old(62) || 0;

console.log("New way - taxableAdjustment:", testTaxableAdjustment);
console.log("New way - taxFreeAdjustment:", testTaxFreeAdjustment);

let totalIncome_new = 50000 + testTaxableAdjustment + testTaxFreeAdjustment;
console.log("New way - totalIncome:", totalIncome_new, "(should be 50000)");

if (isNaN(totalIncome_old)) {
  console.log("✅ Old way correctly produces NaN");
} else {
  console.log("❌ Old way should have produced NaN");
}

if (!isNaN(totalIncome_new) && totalIncome_new === 50000) {
  console.log("✅ New way correctly prevents NaN");
} else {
  console.log("❌ New way should have prevented NaN");
}

console.log("Test completed.");
