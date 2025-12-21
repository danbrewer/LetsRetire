// ignore type-checking in this file for now to simplify runtime testing

//------------------------------------------------------------
// Simple Assertion Utilities (same style as your other tests)
//------------------------------------------------------------
/**
 * * Runtime assertion + TypeScript narrowing.
 *
 * @param {any} condition
 * @param {string} message
 * @returns {asserts condition}
 */
function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/**
 * @param {() => void} fn
 */
function assertThrows(
  fn,
  message = "Expected function to throw, but it did not."
) {
  let threw = false;
  try {
    fn();
  } catch (_) {
    threw = true;
  }
  if (!threw) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * @param {any} actual
 * @param {any} expected
 * @param {any} message
 */
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}. Expected ${expected}, got ${actual}`
    );
  }
}

class TestTracker {
  /**
   * Tracks test results
   * @param {string} testFixtureName
   */
  constructor(testFixtureName) {
    this.testFixtureName = testFixtureName;
    this.testsRun = 0;
    this.testsPassed = 0;
    this.testsFailed = 0;
  }
  startTest() {
    this.testsRun++;
  }
  recordPass() {
    this.testsPassed++;
  }
  recordFail() {
    this.testsFailed++;
  }

  generateTestReport() {
    //------------------------------------------------------------
    // TEST SUMMARY
    //------------------------------------------------------------
    console.log("\n");
    const summaryTitle = `🧪 TEST SUMMARY FOR ${this.testFixtureName.toUpperCase()}`;
    const separator = "=".repeat(summaryTitle.length + 10);
    console.log(separator);
    console.log("     " + summaryTitle);
    console.log(separator);
    console.log(`📊 Total tests run:    ${this.testsRun}`);
    console.log(`✅ Tests passed:       ${this.testsPassed}`);
    if (this.testsFailed > 0) {
      console.log(`❌ Tests failed:       ${this.testsFailed}`);
    }

    if (this.testsFailed === 0) {
      console.log("\n⭐ ALL TESTS PASSED — BEAUTIFUL WORK!\n");
    } else {
      console.log(
        `\n🔥 ${this.testsFailed} TEST(S) FAILED — REVIEW REQUIRED\n`
      );
    }
    console.log(separator);
    console.log("\n");
  }
}

/**
 * @param {string} testName
 * @param {() => void} testFunction
 * @param {TestTracker} testTracker
 */
function runTest(testName, testFunction, testTracker) {
  testTracker?.startTest();

  try {
    console.log(`\n🧪 Running test: ${testName}`);
    testFunction();
    console.log(`✅ PASSED: ${testName}`);
    testTracker?.recordPass();
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    if (error instanceof Error) {
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`   Non-Error thrown:`, error);
    }

    testTracker?.recordFail();
  }
}

export { assert, assertThrows, assertEqual, runTest, TestTracker };
