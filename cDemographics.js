import { Inputs } from "./cInputs.js";

class Demographics {
  /**
   * @param {number} currentAge
   * @param {number} ssStartAge
   * @param {number} penStartAge
   * @param {number} subjectLifeSpan
   * @param {number} subject401kStartAge
   * @param {number} partner401kStartAge
   * @param {number} currentYear
   * @param {number} yearIndex
   * @param {string} preferredFilingStatus
   */
  constructor(
    currentAge,
    ssStartAge,
    penStartAge,
    subject401kStartAge,
    subjectLifeSpan,
    currentYear,
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
    this.retirementYear = currentYear;
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
   * @param {Inputs} inputs - Retirement calculation inputs object containing:
   * @param {boolean} isRetired - Whether the primary person is currently retired.
   * @param {boolean} isWorking - Whether the primary person is currently working.
   * @returns {Demographics} A fully configured Demographics instance with:
   */
  static CreateUsing(inputs, isRetired, isWorking) {
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
