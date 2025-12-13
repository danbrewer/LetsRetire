class EnumBase {
  /**
   * @param {string} enumName
   * @param {string[]} names
   */
  constructor(enumName, names) {
    this.enumName = enumName;

    /** @type {Record<string, symbol>} */
    this.map = {};

    /** @type {Map<symbol, string>} */
    this.reverse = new Map();

    for (const name of names) {
      const sym = Symbol(`${enumName}.${name}`);
      this.map[name] = sym;
      this.reverse.set(sym, name);
    }

    Object.freeze(this.map);
    Object.freeze(this);
  }

  /** @returns {symbol[]} */
  values() {
    return Object.values(this.map);
  }

  /** @returns {string[]} */
  names() {
    return Object.keys(this.map);
  }

  /**
   * Parse string → enum symbol
   * @param {string} name
   * @returns {symbol}
   */
  parse(name) {
    const val = this.map[name];
    if (!val) throw new Error(`Invalid ${this.enumName} value: '${name}'`);
    return val;
  }

  /**
   * TryParse string → enum symbol or null
   * @param {string} name
   */
  tryParse(name) {
    return this.map[name] ?? null;
  }

  /**
   * Convert enum symbol → string name
   * @param {symbol} sym
   * @returns {string | undefined}
   */
  toName(sym) {
    return this.reverse.get(sym);
  }
}

// // Make EnumBase available to Node (CommonJS) only when actually in Node
// if (typeof module !== "undefined" && module.exports && typeof window === "undefined") {
//   module.exports = { EnumBase };
// }


