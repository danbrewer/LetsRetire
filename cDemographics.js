import { Inputs } from "./cInputs.js";

class Demographics {
  /**
   * @param {number} currentAge
   * @param {number} ssStartAge
   * @param {number} penStartAge
   * @param {number} subjectLifeSpan
   * @param {number} subject401kStartAge
   * @param {number} partner401kStartAge
   * @param {number} retirementYear
   * @param {number} yearIndex
   * @param {string} preferredFilingStatus
   */
  constructor(
    currentAge,
    ssStartAge,
    penStartAge,
    subject401kStartAge,
    subjectLifeSpan,
    retirementYear,
    yearIndex,
    isRetired = true,
    isWorking = false,
    hasPartner = false,
    currentPartnerAge = 0,
    partnerSsStartAge = Number.MAX_VALUE,
    partnerPenStartAge = Number.MAX_VALUE,
    partner401kStartAge = Number.MAX_VALUE,
    partnerLifeSpan = Number.MIN_VALUE,
    preferredFilingStatus = "single"
  ) {
    this.currentAge = currentAge;
    this.ssStartAge = ssStartAge;
    this.penStartAge = penStartAge;
    this.subjectLifeSpan = subjectLifeSpan;
    this.subject401kStartAge = subject401kStartAge;
    this.retirementYear = retirementYear;
    this.isRetired = isRetired;
    this.isWorking = isWorking;
    this.hasPartner = hasPartner;
    this.currentAgeOfPartner = currentPartnerAge;
    this.ssStartAgeOfPartner = hasPartner
      ? partnerSsStartAge
      : Number.MAX_VALUE;
    this.penStartAgeOfPartner = hasPartner
      ? partnerPenStartAge
      : Number.MAX_VALUE;
    this.trad401kStartAgeOfPartner = hasPartner
      ? partner401kStartAge
      : Number.MAX_VALUE;
    this.partnerLifeSpan = hasPartner ? partnerLifeSpan : Number.MIN_VALUE;
    this.preferredFilingStatus = preferredFilingStatus;
    this._description = `Retirement Year ${yearIndex + 1} (Age ${this.currentAge}) (Year ${this.retirementYear})`;
  }

  get filingStatus() {
    if (this.hasPartner && !this.isWidowed) {
      return this.preferredFilingStatus;
    } else {
      return "single";
    }
  }

  get subjectIsLiving() {
    const isLiving = this.currentAge <= this.subjectLifeSpan;
    return isLiving;
  }

  get partnerIsLiving() {
    return this.currentAgeOfPartner <= this.partnerLifeSpan;
  }

  get spouseIsLiving() {
    return this.subjectIsLiving && this.partnerIsLiving;
  }

  get isWidowed() {
    return this.hasPartner && !(this.subjectIsLiving && this.spouseIsLiving);
  }

  get isSubjectEligibleForSs() {
    return this.currentAge >= this.ssStartAge;
  }

  get isSubjectEligibleForPension() {
    return this.currentAge >= this.penStartAge;
  }

  get isPartnerEligibleForSs() {
    return (
      this.hasPartner && this.currentAgeOfPartner >= this.ssStartAgeOfPartner
    );
  }

  get isPartnerEligibleForPension() {
    return (
      this.hasPartner && this.currentAgeOfPartner >= this.penStartAgeOfPartner
    );
  }

  get isPartnerEligibleFor401k() {
    return (
      this.hasPartner &&
      this.currentAgeOfPartner >= this.trad401kStartAgeOfPartner
    );
  }

  get isSubjectEligibleFor401k() {
    return this.currentAge >= this.subject401kStartAge;
  }

  //   // Getter for description to maintain compatibility
  //   get description() {
  //     return this._description;
  //   }

  //   // Method to update age for multi-year calculations
  //   /**
  //    * @param {number} newAge
  //    * @param {number} yearIndex
  //    */
  //   updateAge(newAge, yearIndex) {
  //     this.age = newAge;
  //     if (this.hasSpouse) {
  //       this.ageOfSpouse = this.ageOfSpouse + 1; // Assuming partner ages at same rate
  //     }
  //     this._description = `Retirement Year ${yearIndex + 1} (Age ${this.age}) (Year ${this.retirementYear + yearIndex})`;
  //   }

  // Method to get current eligibility status
  getEligibilityStatuses() {
    return {
      isSubjectEligibleForSs: this.isSubjectEligibleForSs,
      isSubjectEligibleForPension: this.isSubjectEligibleForPension,
      isSpouseEligibleForSs: this.isPartnerEligibleForSs,
      isSpouseEligibleForPension: this.isPartnerEligibleForPension,
    };
  }

  /**
   * Factory method to create a Demographics instance from retirement calculation inputs.
   *
   * This method provides a convenient way to construct Demographics objects by extracting
   * the relevant demographic information from a comprehensive inputs object. It handles
   * both single and married filing scenarios, automatically setting partner-related
   * properties based on the hasSpouse flag.
   *
   * @param {Inputs} inputs - Retirement calculation inputs object containing:
   *   - age: Primary person's current age
   *   - ssStartAge: Age when primary person starts collecting Social Security
   *   - penStartAge: Age when primary person starts collecting pension
   *   - retirementYear: Calendar year of retirement
   *   - yearIndex: Index of the current retirement year (0-based)
   *   - hasSpouse: Boolean indicating if married filing jointly
   *   - partnerAge: Spouse's current age (required if hasSpouse is true)
   *   - partnerSsStartAge: Age when partner starts Social Security (required if hasSpouse)
   *   - partnerPenStartAge: Age when partner starts pension (required if hasSpouse)
   *   - filingStatus: Tax filing status ("single", "married_filing_jointly", etc.)
   *
   * @param {boolean} isRetired - Whether the primary person is currently retired.
   *   Affects eligibility calculations and income stream determinations.
   *
   * @param {boolean} isWorking - Whether the primary person is currently working.
   *   Used for earned income calculations and Social Security benefit adjustments.
   *
   * @returns {Demographics} A fully configured Demographics instance with:
   *   - All age and eligibility information for primary and partner
   *   - Retirement status and working status flags
   *   - Calculated eligibility methods for benefits
   *   - Descriptive information for reporting
   *
   * @throws {Error} When required partner information is missing but hasSpouse is true
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
   *   hasSpouse: true, partnerAge: 63,
   *   partnerSsStartAge: 67, partnerPenStartAge: 65,
   *   filingStatus: "married_filing_jointly"
   * };
   * const demographics = Demographics.CreateUsing(marriedInputs, true, false);
   * console.log(demographics.partnerEligibleForSs()); // false (63 < 67)
   *
   * @see {@link Demographics#constructor} For detailed parameter descriptions
   * @see {@link Demographics#getEligibilityStatuses} For checking all benefit eligibilities
   * @see {@link IncomeStreams} For complete input object structure
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(inputs, isRetired, isWorking) {
    // debugger;
    return new Demographics(
      inputs.subjectAge,
      inputs.subjectSsStartAge,
      inputs.subjectPensionStartAge,
      inputs.subject401kStartAge,
      inputs.subjectLifeSpan,
      inputs.currentYear,
      inputs.yearIndex,
      isRetired,
      isWorking,
      inputs.hasPartner,
      inputs.partnerAge,
      inputs.partnerSsStartAge,
      inputs.partnerPenStartAge,
      inputs.partner401kStartAge,
      inputs.partnerLifeSpan,
      inputs.filingStatus
    );
  }
}

export { Demographics };
