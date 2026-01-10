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

/**
 * @this {number}
 * @param {number} total
 * @returns {number}
 */
Number.prototype.asPercentageOf = function (total) {
  if (total === 0) return 0;
  return (this / total).round(3);
};

/**
 * @this {number}
 * @returns {number}
 */
Number.prototype.asPercentage = function () {
  return this.asPercentageOf(100);
};

const compoundedRate = (/** @type {number} */ r, /** @type {number} */ n) =>
  Math.pow(1 + r, n);

class DateFunctions {
  /**
   * @param {Date} date
   * @param {number} years
   */
  static addYears(date, years) {
    const month = date.getMonth();
    const day = date.getDay();
    const newYear = date.getFullYear() + years;

    let newDate = new Date(newYear, month, day);

    const isLeapYear = newDate.getMonth() === 1;

    if (!isLeapYear && day === 29) newDate = new Date(newYear, month, 28);

    return newDate;
  }

  /**
   * @param {Date} date
   * @param {number} days
   */
  static addDays(date, days) {
    const ticks = days * 86400000;
    return new Date(date.getMilliseconds() + ticks);
  }

  /**
   * @param {Date} date
   */
  static formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

class StringFunctions {
  /**
   * @param {string} str
   */
  static capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Pads a string to a fixed width.
   *
   * @param {string | number} value
   * @param {number} width
   * @param {"left" | "right" | "center"} [align = "left"]
   * @param {string} [padChar=" "]
   */
  static padAndAlign(value, width, align = "left", padChar = " ") {
    const str = String(value);

    if (str.length >= width) return str;

    if (align === "center") {
      const totalPadding = width - str.length;
      const leftPadding = Math.floor(totalPadding / 2);
      const rightPadding = totalPadding - leftPadding;
      return (
        str.padStart(str.length + leftPadding, padChar).padEnd(width, padChar)
      );
    }
    return align === "right"
      ? str.padStart(width, padChar)
      : str.padEnd(width, padChar);
  }

  /**
   * @param {string} str
   * @param {number} count
   */
  static repeat(str, count) {
    return str.repeat(count);
  }
}

export { compoundedRate, DateFunctions, StringFunctions };
