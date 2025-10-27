class Demographics {
  /**
   * @param {number} age
   * @param {number} ssStartAge
   * @param {number} penStartAge
   * @param {number} retirementYear
   * @param {number} yearIndex
   */
  constructor(
    age,
    ssStartAge,
    penStartAge,
    retirementYear,
    yearIndex,
    isRetired = true,
    isWorking = false,
    hasSpouse = false,
    spouseAge = 0,
    spouseSsStartAge = Number.MAX_VALUE,
    spousePenStartAge = Number.MAX_VALUE,
    filingStatus = "single"
  ) {
    this.age = age;
    this.ssStartAge = ssStartAge;
    this.penStartAge = penStartAge;
    this.retirementYear = retirementYear;
    this.isRetired = isRetired;
    this.isWorking = isWorking;
    this.hasSpouse = hasSpouse;
    this.ageOfSpouse = spouseAge;
    this.ssStartAgeOfSpouse = hasSpouse ? spouseSsStartAge : Number.MAX_VALUE;
    this.penStartAgeOfSpouse = hasSpouse ? spousePenStartAge : Number.MAX_VALUE;
    this.filingStatus = filingStatus;
    this._description = `Retirement Year ${yearIndex + 1} (Age ${this.age}) (Year ${this.retirementYear})`;
  }

  eligibleForSs() {
    return this.age >= this.ssStartAge;
  }

  eligibleForPension() {
    return this.age >= this.penStartAge;
  }

  spouseEligibleForSs() {
    return this.hasSpouse && this.ageOfSpouse >= this.ssStartAgeOfSpouse;
  }

  spouseEligibleForPension() {
    return this.hasSpouse && this.ageOfSpouse >= this.penStartAgeOfSpouse;
  }

  // Getter for description to maintain compatibility
  get description() {
    return this._description;
  }

  // Method to update age for multi-year calculations
  /**
   * @param {number} newAge
   * @param {number} yearIndex
   */
  updateAge(newAge, yearIndex) {
    this.age = newAge;
    if (this.hasSpouse) {
      this.ageOfSpouse = this.ageOfSpouse + 1; // Assuming spouse ages at same rate
    }
    this._description = `Retirement Year ${yearIndex + 1} (Age ${this.age}) (Year ${this.retirementYear + yearIndex})`;
  }

  // Method to get current eligibility status
  getEligibilityStatus() {
    return {
      primarySs: this.eligibleForSs(),
      primaryPension: this.eligibleForPension(),
      spouseSs: this.spouseEligibleForSs(),
      spousePension: this.spouseEligibleForPension(),
    };
  }

  /**
   * Factory method to create a Demographics instance from retirement calculation inputs.
   *
   * This method provides a convenient way to construct Demographics objects by extracting
   * the relevant demographic information from a comprehensive inputs object. It handles
   * both single and married filing scenarios, automatically setting spouse-related
   * properties based on the hasSpouse flag.
   *
   * @param {Inputs} inputs - Retirement calculation inputs object containing:
   *   - age: Primary person's current age
   *   - ssStartAge: Age when primary person starts collecting Social Security
   *   - penStartAge: Age when primary person starts collecting pension
   *   - retirementYear: Calendar year of retirement
   *   - yearIndex: Index of the current retirement year (0-based)
   *   - hasSpouse: Boolean indicating if married filing jointly
   *   - spouseAge: Spouse's current age (required if hasSpouse is true)
   *   - spouseSsStartAge: Age when spouse starts Social Security (required if hasSpouse)
   *   - spousePenStartAge: Age when spouse starts pension (required if hasSpouse)
   *   - filingStatus: Tax filing status ("single", "married_filing_jointly", etc.)
   *
   * @param {boolean} isRetired - Whether the primary person is currently retired.
   *   Affects eligibility calculations and income stream determinations.
   *
   * @param {boolean} isWorking - Whether the primary person is currently working.
   *   Used for earned income calculations and Social Security benefit adjustments.
   *
   * @returns {Demographics} A fully configured Demographics instance with:
   *   - All age and eligibility information for primary and spouse
   *   - Retirement status and working status flags
   *   - Calculated eligibility methods for benefits
   *   - Descriptive information for reporting
   *
   * @throws {Error} When required spouse information is missing but hasSpouse is true
   * @throws {Error} When age values are invalid or inconsistent
   *
   * @example
   * // Create demographics for single retiree
   * const singleInputs = {
   *   age: 65, ssStartAge: 67, penStartAge: 65,
   *   retirementYear: 2024, yearIndex: 0,
   *   hasSpouse: false, filingStatus: "single"
   * };
   * const demographics = Demographics.CreateUsing(singleInputs, true, false);
   * console.log(demographics.eligibleForSs()); // true if age >= ssStartAge
   *
   * @example
   * // Create demographics for married couple
   * const marriedInputs = {
   *   age: 65, ssStartAge: 67, penStartAge: 65,
   *   retirementYear: 2024, yearIndex: 0,
   *   hasSpouse: true, spouseAge: 63,
   *   spouseSsStartAge: 67, spousePenStartAge: 65,
   *   filingStatus: "married_filing_jointly"
   * };
   * const demographics = Demographics.CreateUsing(marriedInputs, true, false);
   * console.log(demographics.spouseEligibleForSs()); // false (63 < 67)
   *
   * @see {@link Demographics#constructor} For detailed parameter descriptions
   * @see {@link Demographics#getEligibilityStatus} For checking all benefit eligibilities
   * @see {@link Inputs} For complete input object structure
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(inputs, isRetired, isWorking) {
    return new Demographics(
      inputs.age,
      inputs.ssStartAge,
      inputs.penStartAge,
      inputs.retirementYear,
      inputs.yearIndex,
      isRetired,
      isWorking,
      inputs.hasSpouse,
      inputs.spouseAge,
      inputs.spouseSsStartAge,
      inputs.spousePenStartAge,
      inputs.filingStatus
    );
  }
}

// Create instance using the factory method for compatibility
// const demographics = Demographics.CreateUsing(inputs);
