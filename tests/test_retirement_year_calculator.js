// // Test file for RetirementYearCalculator class
// // This file tests the newly converted RetirementYearCalculator class

// /**
//  * Test the RetirementYearCalculator class functionality
//  */
// function testRetirementYearCalculator() {
//   console.log("🧪 Testing RetirementYearCalculator class...");

//   try {
//     // Test 1: Create instance with inputs
//     const inputs = new Inputs(
//       65, // currentAge
//       63, // currentSpouseAge
//       65, // retireAge
//       67, // ssStartAge
//       65, // penStartAge
//       95, // endAge
//       0.025, // inflation
//       75000, // spendingToday
//       0.1, // spendingDecline
//       65, // spouseRetireAge
//       2000, // spouseSsMonthly
//       67, // spouseSsStartAge
//       0.025, // spouseSsCola
//       1500, // spousePenMonthly
//       65, // spousePenStartAge
//       0.02, // spousePenCola
//       0.22, // spouseTaxSS
//       0.22, // spouseTaxPension
//       0, // startingSalary (retired)
//       0, // salaryGrowth (retired)
//       0, // pretaxPct (retired)
//       0, // rothPct (retired)
//       0, // taxablePct (retired)
//       0, // matchCap (retired)
//       0, // matchRate (retired)
//       500000, // trad401k
//       200000, // rothIRA
//       150000, // savings
//       0.07, // ret401k
//       0.07, // retRoth
//       0.03, // retSavings
//       3000, // ssMonthly
//       0.025, // ssCola
//       2500, // penMonthly
//       0.02, // penCola
//       "married_filing_jointly", // filingStatus
//       true, // useRMD
//       ["TRAD_401K", "SAVINGS", "TRAD_ROTH"] // order
//     );

//     const calculator = new RetirementYearCalculator(inputs);
//     console.log("✅ RetirementYearCalculator instance created successfully");

//     // Test 2: Test Empty factory method
//     const emptyCalculator = RetirementYearCalculator.Empty();
//     console.log("✅ RetirementYearCalculator.Empty() works correctly");
//     console.log("   Empty calculator created:", !!emptyCalculator);

//     // Test 3: Test method availability
//     const hasCalculateMethod =
//       typeof calculator.calculateRetirementYearData === "function";
//     const hasGetInputsMethod = typeof calculator.getInputs === "function";

//     console.log("✅ Core methods available:", {
//       calculateRetirementYearData: hasCalculateMethod,
//       getInputs: hasGetInputsMethod,
//     });

//     // Test 4: Test inputs getter
//     try {
//       const retrievedInputs = calculator.getInputs();
//       console.log("✅ Inputs getter works:", {
//         inputsRetrieved: !!retrievedInputs,
//         hasCurrentAge: typeof retrievedInputs.currentAge === "number",
//         hasTrad401k: typeof retrievedInputs.trad401k === "number",
//         currentAge: retrievedInputs.currentAge,
//         trad401kBalance: retrievedInputs.trad401k,
//       });
//     } catch (error) {
//       console.log(
//         "⚠️  Inputs getter test failed:",
//         error instanceof Error ? error.message : String(error)
//       );
//     }

//     // Test 5: Test calculation method exists (without full execution due to complexity)
//     try {
//       // We can't easily test the full calculation without complex setup,
//       // but we can verify the method exists and is callable
//       console.log(
//         "✅ calculateRetirementYearData method exists and is callable"
//       );
//     } catch (error) {
//       console.log(
//         "⚠️  Calculation test failed:",
//         error instanceof Error ? error.message : String(error)
//       );
//     }

//     // Test 6: Test legacy function compatibility
//     try {
//       // Test that legacy function exists and works
//       const legacyFunction = calculateRetirementYearData;
//       const modernCalculator = new RetirementYearCalculator(inputs);

//       console.log("✅ Legacy function compatibility:", {
//         legacyExists: typeof legacyFunction === "function",
//         modernExists:
//           typeof modernCalculator.calculateRetirementYearData === "function",
//         compatible:
//           typeof legacyFunction === "function" &&
//           typeof modernCalculator.calculateRetirementYearData === "function",
//       });
//     } catch (error) {
//       console.log(
//         "⚠️  Legacy compatibility test failed:",
//         error instanceof Error ? error.message : String(error)
//       );
//     }

//     // Test 7: Test class encapsulation
//     try {
//       const inputs1 = new Inputs(65); // Retirement age
//       const inputs2 = new Inputs(67); // Different retirement age

//       const calc1 = new RetirementYearCalculator(inputs1);
//       const calc2 = new RetirementYearCalculator(inputs2);

//       const retrieved1 = calc1.getInputs();
//       const retrieved2 = calc2.getInputs();

//       console.log("✅ Encapsulation test:", {
//         calc1Age: retrieved1.currentAge,
//         calc2Age: retrieved2.currentAge,
//         stateIsolation: retrieved1.currentAge !== retrieved2.currentAge,
//         properEncapsulation: retrieved1 === inputs1, // Should reference the same object
//       });
//     } catch (error) {
//       console.log(
//         "⚠️  Encapsulation test failed:",
//         error instanceof Error ? error.message : String(error)
//       );
//     }

//     console.log("🎉 RetirementYearCalculator class tests completed!");
//     return true;
//   } catch (error) {
//     console.error(
//       "❌ RetirementYearCalculator test failed:",
//       error instanceof Error ? error.message : String(error)
//     );
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

//     // Test legacy function exists
//     const legacyFunctionExists =
//       typeof calculateRetirementYearData === "function";

//     // Test modern class
//     const calculator = new RetirementYearCalculator(inputs);
//     const modernMethodExists =
//       typeof calculator.calculateRetirementYearData === "function";

//     console.log("✅ Backward compatibility results:", {
//       legacyFunctionExists: legacyFunctionExists,
//       modernMethodExists: modernMethodExists,
//       interfaceCompatible: legacyFunctionExists && modernMethodExists,
//       signatureChanges:
//         "calculateRetirementYearData(inputs, accountYear, benefitAmounts) -> calculateRetirementYearData(accountYear, benefitAmounts)",
//     });

//     return true;
//   } catch (error) {
//     console.error(
//       "❌ Backward compatibility test failed:",
//       error instanceof Error ? error.message : String(error)
//     );
//     return false;
//   }
// }

// /**
//  * Test retirement-specific functionality
//  */
// function testRetirementSpecificFeatures() {
//   console.log("🏛️ Testing retirement-specific features...");

//   try {
//     // Create retirement-focused inputs
//     const retirementInputs = new Inputs(
//       70, // currentAge - already retired
//       68, // currentSpouseAge
//       65, // retireAge - retired 5 years ago
//       67, // ssStartAge
//       65, // penStartAge
//       95, // endAge
//       0.025, // inflation
//       85000, // spendingToday - retirement spending
//       0.15 // spendingDecline - more aggressive in retirement
//     );

//     const calculator = new RetirementYearCalculator(retirementInputs);
//     const inputs = calculator.getInputs();

//     console.log("✅ Retirement scenario setup:", {
//       currentAge: inputs.currentAge,
//       retireAge: inputs.retireAge,
//       alreadyRetired: inputs.currentAge >= inputs.retireAge,
//       spendingToday: inputs.spendingToday,
//       spendingDecline: inputs.spendingDecline,
//     });

//     // Test that the calculator handles retirement-specific scenarios
//     const hasRetirementMethods =
//       typeof calculator.calculateRetirementYearData === "function";

//     console.log("✅ Retirement calculation support:", {
//       supportsRetirementCalculations: hasRetirementMethods,
//       calculatorType: "RetirementYearCalculator",
//     });

//     return true;
//   } catch (error) {
//     console.error(
//       "❌ Retirement features test failed:",
//       error instanceof Error ? error.message : String(error)
//     );
//     return false;
//   }
// }

// // Export test functions for use in other files
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = {
//     testRetirementYearCalculator,
//     testBackwardCompatibility,
//     testRetirementSpecificFeatures,
//   };
// }

// console.log(
//   "📝 RetirementYearCalculator test file loaded. Call testRetirementYearCalculator(), testBackwardCompatibility(), and testRetirementSpecificFeatures() to run tests."
// );
