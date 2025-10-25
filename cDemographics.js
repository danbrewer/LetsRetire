class Demographics {
  constructor(
    age,
    ssStartAge,
    penStartAge,
    retirementYear,
    yearIndex,
    isRetired = true,
    isWorking = false,
    hasSpouse = false,
    spouseAge = undefined,
    spouseSsStartAge = undefined,
    spousePenStartAge = undefined,
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
    this.ssStartAgeOfSpouse = hasSpouse ? spouseSsStartAge : undefined;
    this.penStartAgeOfSpouse = hasSpouse ? spousePenStartAge : undefined;
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

  // Static factory method for creating demographics from inputs
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
