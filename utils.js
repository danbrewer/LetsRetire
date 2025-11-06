// =====================
// Number prototype helpers
// =====================

/**
 * @this {number}
 * @param {number} [decimals=0]
 * @returns {number}
 */
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

/**
 * @this {number}
 * @returns {number}
 */
Number.prototype.asCurrency = function () {
  return this.round(0);
};

/**
 * @this {number}
 * @param {number} value
 * @returns {number}
 */
Number.prototype.minus = function (value) {
  return this - value;
};

/**
 * @this {number}
 * @param {number} value
 * @returns {number}
 */
Number.prototype.plus = function (value) {
  return this + value;
};

/**
 * @this {number}
 * @param {number} inflationRate
 * @param {number} years
 * @returns {number}
 */
Number.prototype.adjustedForInflation = function (inflationRate, years) {
  const adjustedValue = this * Math.pow(1 + inflationRate, years);
  return adjustedValue;
};

const compoundedRate = (/** @type {number} */ r, /** @type {number} */ n) =>
  Math.pow(1 + r, n);
