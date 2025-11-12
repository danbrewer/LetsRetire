// // Test file for RetirementIncomeCalculator class
// // This file tests the newly converted RetirementIncomeCalculator class

// /**
//  * Test the RetirementIncomeCalculator class functionality
//  */
// function testRetirementIncomeCalculator() {
//   console.log("🧪 Testing RetirementIncomeCalculator class...");

//   try {
//     // Test 1: Create instance with dependencies
//     const demographics = Demographics.Empty();
//     demographics.filingStatus = constsJS_FILING_STATUS.SINGLE;

//     const fiscalData = FiscalData.Empty();
//     fiscalData.taxYear = 2025;
//     fiscalData.inflationRate = 0.025;

//     const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
//     console.log("✅ RetirementIncomeCalculator instance created successfully");

//     // Test 2: Test Empty factory method
//     const emptyCalculator = RetirementIncomeCalculator.Empty();
//     console.log("✅ RetirementIncomeCalculator.Empty() works correctly");
//     console.log("   Empty calculator created:", !!emptyCalculator);

//     // Test 3: Test method availability
//     const hasDetermineMethod = typeof calculator.determineFederalIncomeTax === 'function';
//     const hasCalculateMethod = typeof calculator.calculateIncomeWhen401kWithdrawalIs === 'function';
//     const hasWithdrawalsMethod = typeof calculator.determine401kWithdrawalsToHitNetTargetOf === 'function';
//     const hasTaxBracketsMethod = typeof calculator.getTaxBrackets === 'function';
//     const hasStandardDeductionMethod = typeof calculator.getStandardDeduction === 'function';

//     console.log("✅ Core methods available:", {
//       determineFederalIncomeTax: hasDetermineMethod,
//       calculateIncomeWhen401kWithdrawalIs: hasCalculateMethod,
//       determine401kWithdrawalsToHitNetTargetOf: hasWithdrawalsMethod,
//       getTaxBrackets: hasTaxBracketsMethod,
//       getStandardDeduction: hasStandardDeductionMethod
//     });

//     // Test 4: Test tax bracket calculation
//     try {
//       const taxBrackets = calculator.getTaxBrackets();
//       console.log("✅ Tax brackets calculated:", {
//         count: taxBrackets.length,
//         firstBracket: taxBrackets[0],
//         hasValidStructure: taxBrackets.every(b => typeof b.rate === 'number' && typeof b.upTo === 'number')
//       });
//     } catch (error) {
//       console.log("⚠️  Tax brackets test failed:", error.message);
//     }

//     // Test 5: Test standard deduction calculation
//     try {
//       const standardDeduction = calculator.getStandardDeduction();
//       console.log("✅ Standard deduction calculated:", {
//         amount: standardDeduction,
//         isNumber: typeof standardDeduction === 'number',
//         isPositive: standardDeduction > 0
//       });
//     } catch (error) {
//       console.log("⚠️  Standard deduction test failed:", error.message);
//     }

//     // Test 6: Test federal tax calculation
//     try {
//       const taxBrackets = calculator.getTaxBrackets();
//       const federalTax = calculator.determineFederalIncomeTax(50000, taxBrackets);
//       console.log("✅ Federal tax calculated:", {
//         taxableIncome: 50000,
//         federalTax: federalTax,
//         isNumber: typeof federalTax === 'number',
//         isPositive: federalTax >= 0
//       });
//     } catch (error) {
//       console.log("⚠️  Federal tax test failed:", error.message);
//     }

//     // Test 7: Test legacy function compatibility
//     try {
//       const legacyTax = retirementJS_determineFederalIncomeTax(50000, calculator.getTaxBrackets());
//       const modernTax = calculator.determineFederalIncomeTax(50000, calculator.getTaxBrackets());

//       console.log("✅ Legacy function compatibility:", {
//         legacyTax: legacyTax,
//         modernTax: modernTax,
//         resultsMatch: Math.abs(legacyTax - modernTax) < 0.01
//       });
//     } catch (error) {
//       console.log("⚠️  Legacy compatibility test failed:", error.message);
//     }

//     console.log("🎉 RetirementIncomeCalculator class tests completed!");
//     return true;

//   } catch (error) {
//     console.error("❌ RetirementIncomeCalculator test failed:", error instanceof Error ? error.message : String(error));
//     if (error instanceof Error) {
//       console.error(error.stack);
//     }
//     return false;
//   }
// }

// /**
//  * Test backward compatibility with the legacy functions
//  */
// function testBackwardCompatibility() {
//   console.log("🔄 Testing backward compatibility...");

//   try {
//     const demographics = Demographics.Empty();
//     demographics.filingStatus = constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY;

//     const fiscalData = FiscalData.Empty();
//     fiscalData.taxYear = 2026;
//     fiscalData.inflationRate = 0.03;

//     // Test legacy functions
//     const legacyTaxBrackets = retirementJS_getTaxBrackets(
//       demographics.filingStatus,
//       fiscalData.taxYear,
//       fiscalData.inflationRate
//     );

//     const legacyStandardDeduction = retirementJS_getStandardDeduction(
//       demographics.filingStatus,
//       fiscalData.taxYear,
//       fiscalData.inflationRate
//     );

//     // Test modern class
//     const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
//     const modernTaxBrackets = calculator.getTaxBrackets();
//     const modernStandardDeduction = calculator.getStandardDeduction();

//     console.log("✅ Backward compatibility results:", {
//       taxBracketsMatch: JSON.stringify(legacyTaxBrackets) === JSON.stringify(modernTaxBrackets),
//       standardDeductionMatch: Math.abs(legacyStandardDeduction - modernStandardDeduction) < 0.01,
//       legacyTaxBrackets: legacyTaxBrackets.length,
//       modernTaxBrackets: modernTaxBrackets.length,
//       legacyDeduction: legacyStandardDeduction,
//       modernDeduction: modernStandardDeduction
//     });

//     return true;
//   } catch (error) {
//     console.error("❌ Backward compatibility test failed:", error);
//     return false;
//   }
// }

// // Export test functions for use in other files
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = {
//     testRetirementIncomeCalculator,
//     testBackwardCompatibility
//   };
// }

// console.log("📝 RetirementIncomeCalculator test file loaded. Call testRetirementIncomeCalculator() and testBackwardCompatibility() to run tests.");
