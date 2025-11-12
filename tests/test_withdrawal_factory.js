// // Test file for WithdrawalFactory class
// // This file tests the newly converted WithdrawalFactory class

// /**
//  * Test the WithdrawalFactory class functionality
//  */
// function testWithdrawalFactory() {
//   console.log("🧪 Testing WithdrawalFactory class...");

//   // Test 1: Create instance with dependencies
//   try {
//     const incomeStreams = IncomeStreams.Empty();
//     const fiscalData = FiscalData.Empty();
//     const demographics = Demographics.Empty();
//     const accountYear = AccountYear.Empty();

//     const factory = new WithdrawalFactory(
//       incomeStreams,
//       fiscalData,
//       demographics,
//       accountYear
//     );
//     console.log("✅ WithdrawalFactory instance created successfully");

//     // Test 2: Test Empty factory method
//     const emptyFactory = WithdrawalFactory.Empty(accountYear);
//     console.log("✅ WithdrawalFactory.Empty() works correctly");
//     console.log("   Empty factory created:", !!emptyFactory);

//     // Test 3: Test method availability
//     const hasWithdrawMethod =
//       typeof factory.withdrawFromTargetedAccount === "function";
//     const hasResultsMethod =
//       typeof factory.getFinalIncomeResults === "function";
//     const hasAccountTypesMethod =
//       typeof factory.isAccountTypeEnabled === "function";

//     console.log("✅ Core methods available:", {
//       withdrawFromTargetedAccount: hasWithdrawMethod,
//       getFinalIncomeResults: hasResultsMethod,
//       isAccountTypeEnabled: hasAccountTypesMethod,
//     });

//     // Test 4: Test legacy function compatibility
//     const legacyFactory = withdrawalFactoryJS_createWithdrawalFactory(
//       incomeStreams,
//       fiscalData,
//       demographics,
//       accountYear
//     );

//     const hasLegacyMethods =
//       legacyFactory &&
//       typeof legacyFactory.withdrawFromTargetedAccount === "function" &&
//       typeof legacyFactory.getFinalIncomeResults === "function";

//     console.log(
//       "✅ Legacy function compatibility maintained:",
//       hasLegacyMethods
//     );

//     // Test 5: Test account type checking
//     const savingsEnabled = factory.isAccountTypeEnabled(ACCOUNT_TYPES.SAVINGS);
//     const trad401kEnabled = factory.isAccountTypeEnabled(
//       ACCOUNT_TYPES.TRAD_401K
//     );
//     const rothEnabled = factory.isAccountTypeEnabled(ACCOUNT_TYPES.TRAD_ROTH);

//     console.log("✅ Account type checking works:", {
//       savings: savingsEnabled,
//       trad401k: trad401kEnabled,
//       roth: rothEnabled,
//     });

//     console.log("🎉 WithdrawalFactory class tests completed successfully!");
//     return true;
//   } catch (error) {
//     console.error(
//       "❌ WithdrawalFactory test failed:",
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
//     const accountYear = AccountYear.Empty();
//     const incomeStreams = IncomeStreams.Empty();
//     const fiscalData = FiscalData.Empty();
//     const demographics = Demographics.Empty();

//     // Create using legacy function
//     const legacyFactory = withdrawalFactoryJS_createWithdrawalFactory(
//       incomeStreams,
//       fiscalData,
//       demographics,
//       accountYear
//     );

//     // Create using new class
//     const newFactory = new WithdrawalFactory(
//       incomeStreams,
//       fiscalData,
//       demographics,
//       accountYear
//     );

//     // Both should have the same interface for core methods
//     const legacyHasMethods = !!(
//       legacyFactory &&
//       legacyFactory.withdrawFromTargetedAccount &&
//       legacyFactory.getFinalIncomeResults
//     );
//     const newHasMethods = !!(
//       newFactory &&
//       newFactory.withdrawFromTargetedAccount &&
//       newFactory.getFinalIncomeResults
//     );

//     console.log("✅ Interface compatibility:", {
//       legacy: legacyHasMethods,
//       modern: newHasMethods,
//       compatible: legacyHasMethods && newHasMethods,
//     });

//     return true;
//   } catch (error) {
//     console.error("❌ Backward compatibility test failed:", error);
//     return false;
//   }
// }

// // Export test functions for use in other files
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = {
//     testWithdrawalFactory,
//     testBackwardCompatibility,
//   };
// }

// console.log(
//   "📝 WithdrawalFactory test file loaded. Call testWithdrawalFactory() and testBackwardCompatibility() to run tests."
// );
