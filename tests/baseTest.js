// ignore type-checking in this file for now to simplify runtime testing

//------------------------------------------------------------
// Simple Assertion Utilities (same style as your other tests)
//------------------------------------------------------------
/**
 * @param {any} condition
 * @param {any} message
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
  constructor() {
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

module.exports = {
  assert,
  assertThrows,
  assertEqual,
  runTest,
  TestTracker,
};
