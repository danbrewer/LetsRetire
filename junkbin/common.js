// // Required Minimum Distribution (RMD) calculation
// // Based on IRS Uniform Lifetime Table for 2024+
// /**
//  * @param {boolean} useRmd
//  * @param {number} age
//  * @param {number} retirementAccountBalance
//  */
// function common_calculateRMD(useRmd, age, retirementAccountBalance) {
//   if (!useRmd || age < 73 || retirementAccountBalance <= 0) return 0;

//   // IRS Uniform Lifetime Table (simplified version for common ages)
//   /** @type {Record<number, number>} */
//   const lifeFactor = {
//     73: 26.5,
//     74: 25.5,
//     75: 24.6,
//     76: 23.7,
//     77: 22.9,
//     78: 22.0,
//     79: 21.1,
//     80: 20.2,
//     81: 19.4,
//     82: 18.5,
//     83: 17.7,
//     84: 16.8,
//     85: 16.0,
//     86: 15.2,
//     87: 14.4,
//     88: 13.7,
//     89: 12.9,
//     90: 12.2,
//     91: 11.5,
//     92: 10.8,
//     93: 10.1,
//     94: 9.5,
//     95: 8.9,
//     96: 8.4,
//     97: 7.8,
//     98: 7.3,
//     99: 6.8,
//     100: 6.4,
//   };

//   debugger;
//   // For ages beyond 100, use declining factors
//   let factor;
//   if (age <= 100) {
//     factor = lifeFactor[age] ?? lifeFactor[100];
//   } else {
//     // Linear decline after 100
//     factor = Math.max(1.0, lifeFactor[100] - (age - 100) * 0.1);
//   }

//   return (retirementAccountBalance / factor).asCurrency();
// }

// // Function to calculate initial benefit amounts for retirement
// /**
//  * @param {Inputs} inputs
//  */
// function common_calculateInitialBenefitAmounts(inputs) {
//   // Declare and initialize the result object at the top
//   const result = {
//     ssAnnual: 0,
//     penAnnual: 0,
//     spouseSsAnnual: 0,
//     spousePenAnnual: 0,
//   };

//   result.ssAnnual =
//     inputs.ssMonthly *
//     12 *
//     (inputs.retireAge >= inputs.ssStartAge
//       ? compoundedRate(inputs.ssCola, inputs.retireAge - inputs.ssStartAge)
//       : 1);
//   result.penAnnual =
//     inputs.penMonthly *
//     12 *
//     (inputs.retireAge >= inputs.penStartAge
//       ? compoundedRate(inputs.penCola, inputs.retireAge - inputs.penStartAge)
//       : 1);

//   if (inputs.hasSpouse) {
//     result.spouseSsAnnual = inputs.spouseSsMonthly * 12;
//     result.spousePenAnnual = inputs.spousePenMonthly * 12;
//   }

//   return result;
// }
