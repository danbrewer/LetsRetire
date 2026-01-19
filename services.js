class IdentifierGenerator {
  static nextId = 0;
  /**
   * @returns {number}
   */
  static generateId() {
    return ++IdentifierGenerator.nextId;
  }

  static generateSixCharAlphaId() {
    const id = IdentifierGenerator.generateId();
    return IdentifierGenerator.#numberToSixCharAlpha(id);
  }

  /**
   * @param {number} num
   * @returns {string}
   */
  static #numberToSixCharAlpha(num) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result = chars[num % chars.length] + result;
      num = Math.floor(num / chars.length);
    }
    return result;
  }

  /**
   * Convert an integer to a fixed-width base-26 "A..Z" code.
   * 0 -> AAAAAA, 1 -> AAAAAB, ... , 25 -> AAAAAZ, 26 -> AAAABA, ... , 26^6-1 -> ZZZZZZ
   *
   * @param {number | bigint} input
   * @param {number} width default 6
   * @returns {string}
   * // Examples:
console.log(toAlphaBase26(0));            // AAAAAA
console.log(toAlphaBase26(1));            // AAAAAB
console.log(toAlphaBase26(2));            // AAAAAC
console.log(toAlphaBase26(25));           // AAAAAZ
console.log(toAlphaBase26(26));           // AAAABA
console.log(toAlphaBase26(11881375));     // (this is 26^5 - 1) -> AZZZZZ
console.log(toAlphaBase26(308915775));    // (26^6 - 1) -> ZZZZZZ
   */
  #toAlphaBase26(input, width = 6) {
    if (typeof width !== "number" || !Number.isInteger(width) || width <= 0) {
      throw new RangeError("width must be a positive integer");
    }

    let n = typeof input === "bigint" ? input : BigInt(input);

    // Validate numeric input if it wasn't bigint
    if (typeof input !== "bigint") {
      if (!Number.isFinite(input) || !Number.isInteger(input)) {
        throw new TypeError("input must be a finite integer");
      }
    }

    const base = 26n;
    const maxExclusive = base ** BigInt(width);

    if (n < 0n) throw new RangeError("input must be >= 0");
    if (n >= maxExclusive) {
      throw new RangeError(
        `input must be < ${maxExclusive.toString()} (i.e., 26^${width})`
      );
    }

    const chars = Array(width).fill("A");
    for (let i = width - 1; i >= 0; i--) {
      const digit = Number(n % base); // 0..25
      chars[i] = String.fromCharCode(65 + digit); // 'A' + digit
      n = n / base;
    }
    return chars.join("");
  }
}

export { IdentifierGenerator };
