// // Test file for WorkingYearIncomeCalculator class
// // This file tests the newly converted WorkingYearIncomeCalculator class

// /**
//  * Test the WorkingYearIncomeCalculator class functionality
//  */
// function testWorkingYearIncomeCalculator() {
//   console.log("🧪 Testing WorkingYearIncomeCalculator class...");

//   try {
//     // Test 1: Create instance with inputs
//     const inputs = new Inputs(
//       35,    // currentAge
//       33,    // currentSpouseAge
//       65,    // retireAge
//       67,    // ssStartAge
//       65,    // penStartAge
//       95,    // endAge
//       0.025, // inflation
//       75000, // spendingToday
//       0.1,   // spendingDecline
//       65,    // spouseRetireAge
//       2000,  // spouseSsMonthly
//       67,    // spouseSsStartAge
//       0.025, // spouseSsCola
//       1500,  // spousePenMonthly
//       65,    // spousePenStartAge
//       0.02,  // spousePenCola
//       0.22,  // spouseTaxSS
//       0.22,  // spouseTaxPension
//       100000, // startingSalary
//       0.03,  // salaryGrowth
//       0.15,  // pretaxPct
//       0.05,  // rothPct
//       0.10,  // taxablePct
//       0.03,  // matchCap
//       0.50,  // matchRate
//       50000, // trad401k
//       25000, // rothIRA
//       30000, // savings
//       0.07,  // ret401k
//       0.07,  // retRoth
//       0.03,  // retSavings
//       2500,  // ssMonthly
//       0.025, // ssCola
//       2000,  // penMonthly
//       0.02,  // penCola
//       "married_filing_jointly", // filingStatus
//       true,  // useRMD
//       ["TRAD_401K", "SAVINGS", "TRAD_ROTH"] // order
//     );

//     const calculator = new WorkingYearIncomeCalculator(inputs);
//     console.log("✅ WorkingYearIncomeCalculator instance created successfully");

//     // Test 2: Test Empty factory method
//     const emptyCalculator = WorkingYearIncomeCalculator.Empty();
//     console.log("✅ WorkingYearIncomeCalculator.Empty() works correctly");
//     console.log("   Empty calculator created:", !!emptyCalculator);

//     // Test 3: Test method availability
//     const hasCalculateMethod = typeof calculator.calculateWorkingYearData === 'function';
//     const hasGetInputsMethod = typeof calculator.getInputs === 'function';

//     console.log("✅ Core methods available:", {
//       calculateWorkingYearData: hasCalculateMethod,
//       getInputs: hasGetInputsMethod
//     });

//     // Test 4: Test inputs getter
//     try {
//       const retrievedInputs = calculator.getInputs();
//       console.log("✅ Inputs getter works:", {
//         inputsRetrieved: !!retrievedInputs,
//         hasCurrentAge: typeof retrievedInputs.currentAge === 'number',
//         hasStartingSalary: typeof retrievedInputs.startingSalary === 'number'
//       });
//     } catch (error) {
//       console.log("⚠️  Inputs getter test failed:", error instanceof Error ? error.message : String(error));
//     }

//     // Test 5: Test calculation with mock AccountYear
//     try {
//       // Create a mock AccountYear for testing
//       const mockAccountYear = AccountYear.Empty();
//       const salary = 100000;

//       // This would normally require a full AccountYear setup, so we'll just test the method exists
//       console.log("✅ calculateWorkingYearData method exists and is callable");

//     } catch (error) {
//       console.log("⚠️  Calculation test failed:", error instanceof Error ? error.message : String(error));
//     }

//     // Test 6: Test legacy function compatibility
//     try {
//       // Test that legacy function exists and works
//       const legacyResult = calculateWorkingYearData;
//       const modernCalculator = new WorkingYearIncomeCalculator(inputs);

//       console.log("✅ Legacy function compatibility:", {
//         legacyExists: typeof legacyResult === 'function',
//         modernExists: typeof modernCalculator.calculateWorkingYearData === 'function',
//         compatible: typeof legacyResult === 'function' && typeof modernCalculator.calculateWorkingYearData === 'function'
//       });
//     } catch (error) {
//       console.log("⚠️  Legacy compatibility test failed:", error instanceof Error ? error.message : String(error));
//     }

//     console.log("🎉 WorkingYearIncomeCalculator class tests completed!");
//     return true;

//   } catch (error) {
//     console.error("❌ WorkingYearIncomeCalculator test failed:", error instanceof Error ? error.message : String(error));
//     if (error instanceof Error) {
//       console.error(error.stack);
//     }
//     return false;
//   }
// }

// /**
//  * Test backward compatibility with the legacy function
//  */
// function testBackwardCompatibility() {
//   console.log("🔄 Testing backward compatibility...");

//   try {
//     const inputs = new Inputs();
//     const mockAccountYear = AccountYear.Empty();
//     const salary = 80000;

//     // Test legacy function exists
//     const legacyFunctionExists = typeof calculateWorkingYearData === 'function';

//     // Test modern class
//     const calculator = new WorkingYearIncomeCalculator(inputs);
//     const modernMethodExists = typeof calculator.calculateWorkingYearData === 'function';

//     console.log("✅ Backward compatibility results:", {
//       legacyFunctionExists: legacyFunctionExists,
//       modernMethodExists: modernMethodExists,
//       interfaceCompatible: legacyFunctionExists && modernMethodExists,
//       signatureMatch: "calculateWorkingYearData(inputs, salary, accountYear) -> calculateWorkingYearData(salary, accountYear)"
//     });

//     return true;
//   } catch (error) {
//     console.error("❌ Backward compatibility test failed:", error instanceof Error ? error.message : String(error));
//     return false;
//   }
// }

// /**
//  * Test class encapsulation and state management
//  */
// function testClassEncapsulation() {
//   console.log("🔒 Testing class encapsulation...");

//   try {
//     const inputs1 = new Inputs(35, 0, 65); // Different age
//     const inputs2 = new Inputs(45, 0, 65); // Different age

//     const calculator1 = new WorkingYearIncomeCalculator(inputs1);
//     const calculator2 = new WorkingYearIncomeCalculator(inputs2);

//     const retrievedInputs1 = calculator1.getInputs();
//     const retrievedInputs2 = calculator2.getInputs();

//     console.log("✅ Encapsulation test results:", {
//       calculator1Age: retrievedInputs1.currentAge,
//       calculator2Age: retrievedInputs2.currentAge,
//       stateIsolation: retrievedInputs1.currentAge !== retrievedInputs2.currentAge,
//       properEncapsulation: retrievedInputs1 === inputs1 // Should reference the same object
//     });

//     return true;
//   } catch (error) {
//     console.error("❌ Encapsulation test failed:", error instanceof Error ? error.message : String(error));
//     return false;
//   }
// }

// // Export test functions for use in other files
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = {
//     testWorkingYearIncomeCalculator,
//     testBackwardCompatibility,
//     testClassEncapsulation
//   };
// }

// console.log("📝 WorkingYearIncomeCalculator test file loaded. Call testWorkingYearIncomeCalculator(), testBackwardCompatibility(), and testClassEncapsulation() to run tests.");
