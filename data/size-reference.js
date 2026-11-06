const adultSizes = ["XS", "S", "M", "L", "XL", "XXL"];

function makeAdultChart(rows) {
  return adultSizes.map((size, index) => ({
    size,
    ...rows[index],
  }));
}

export const APPAREL_SIZE_REFERENCE = {
  Men: makeAdultChart([
    { chest: [82, 87], waist: [68, 73], hip: [84, 89] },
    { chest: [88, 93], waist: [74, 79], hip: [90, 95] },
    { chest: [94, 99], waist: [80, 85], hip: [96, 101] },
    { chest: [100, 105], waist: [86, 91], hip: [102, 107] },
    { chest: [106, 113], waist: [92, 99], hip: [108, 115] },
    { chest: [114, 121], waist: [100, 107], hip: [116, 123] },
  ]),
  Women: makeAdultChart([
    { chest: [76, 81], waist: [60, 65], hip: [84, 89] },
    { chest: [82, 87], waist: [66, 71], hip: [90, 95] },
    { chest: [88, 93], waist: [72, 77], hip: [96, 101] },
    { chest: [94, 101], waist: [78, 85], hip: [102, 109] },
    { chest: [102, 109], waist: [86, 93], hip: [110, 117] },
    { chest: [110, 117], waist: [94, 101], hip: [118, 125] },
  ]),
};

export const KIDS_SIZE_REFERENCE = [
  { size: "2Y", age: [2, 2], height: [86, 92] },
  { size: "3Y", age: [3, 3], height: [92, 98] },
  { size: "4Y", age: [4, 4], height: [98, 104] },
  { size: "5Y", age: [5, 5], height: [104, 110] },
  { size: "6Y", age: [6, 6], height: [110, 116] },
  { size: "8Y", age: [7, 8], height: [122, 128] },
  { size: "10Y", age: [9, 10], height: [134, 140] },
  { size: "12Y", age: [11, 12], height: [146, 152] },
  { size: "14Y", age: [13, 14], height: [158, 164] },
];

export const FOOTWEAR_SIZE_REFERENCE = {
  Men: [
    { size: "39", footLength: [24.1, 24.7] },
    { size: "40", footLength: [24.8, 25.3] },
    { size: "41", footLength: [25.4, 26.0] },
    { size: "42", footLength: [26.1, 26.7] },
    { size: "43", footLength: [26.8, 27.3] },
    { size: "44", footLength: [27.4, 28.0] },
    { size: "45", footLength: [28.1, 28.7] },
  ],
  Women: [
    { size: "35", footLength: [21.6, 22.0] },
    { size: "36", footLength: [22.1, 22.7] },
    { size: "37", footLength: [22.8, 23.3] },
    { size: "38", footLength: [23.4, 24.0] },
    { size: "39", footLength: [24.1, 24.7] },
    { size: "40", footLength: [24.8, 25.3] },
    { size: "41", footLength: [25.4, 26.0] },
  ],
  Kids: [
    { size: "22", footLength: [13.1, 13.7] },
    { size: "23", footLength: [13.8, 14.3] },
    { size: "24", footLength: [14.4, 15.0] },
    { size: "25", footLength: [15.1, 15.7] },
    { size: "26", footLength: [15.8, 16.3] },
    { size: "27", footLength: [16.4, 17.0] },
    { size: "28", footLength: [17.1, 17.7] },
    { size: "29", footLength: [17.8, 18.3] },
    { size: "30", footLength: [18.4, 19.0] },
    { size: "31", footLength: [19.1, 19.7] },
    { size: "32", footLength: [19.8, 20.3] },
    { size: "33", footLength: [20.4, 21.0] },
    { size: "34", footLength: [21.1, 21.7] },
  ],
};

export function getReferenceChart(department, productType) {
  if (productType === "footwear") return FOOTWEAR_SIZE_REFERENCE[department];
  if (department === "Kids") return KIDS_SIZE_REFERENCE;
  return APPAREL_SIZE_REFERENCE[department];
}
