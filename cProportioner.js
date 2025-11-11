class Proportion {
  /**
   * @param {string} name
   * @param {number} value
   */
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
}

class Proportioner {
  /**
   * @param {Proportion[]} proportions
   */
  constructor(proportions) {
    // Convert array to object for easier lookup by name
    /** @type {Record<string, Proportion>} */
    this.proportions = {};
    for (const proportion of proportions) {
      this.proportions[proportion.name] = proportion;
    }
  }

  get aggregate() {
    return Object.values(this.proportions).reduce(
      (sum, proportion) => sum + proportion.value,
      0
    );
  }

  /**
   * @param {string} name
   */
  actualProportion(name) {
    return (this.proportions[name]?.value || 0) / this.aggregate;
  }

  /**
   * @param {number} value
   * @param {string} proportionName
   */
  relativeProportion(value, proportionName) {
    return value * this.actualProportion(proportionName);
  }
}
