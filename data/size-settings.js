const sizeSetting = (sizeType, sizes, unit) => ({ sizeType, sizes, unit });

const alphaMen = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const alphaWomen = ["XS", "S", "M", "L", "XL", "XXL"];
const alphaStandard = ["S", "M", "L", "XL", "XXL"];
const alphaExtended = ["S", "M", "L", "XL", "XXL", "3XL"];
const euMenShoes = ["39", "40", "41", "42", "43", "44", "45"];
const euWomenShoes = ["35", "36", "37", "38", "39", "40", "41"];
const childAges = ["2Y", "3Y", "4Y", "5Y", "6Y", "8Y", "10Y", "12Y", "14Y"];
const makeAlpha = (sizes) => sizeSetting("alpha", sizes, "standard");
const makeShoe = (sizes) => sizeSetting("shoe", sizes, "EU");
const makeAge = (sizes) => sizeSetting("age", sizes, "age");

export const SIZE_SETTINGS = {
  Men: {
    Clothing: {
      "T-Shirts": makeAlpha(alphaMen),
      Shirts: makeAlpha(alphaMen),
      Pants: sizeSetting("waist", ["28", "30", "32", "34", "36", "38", "40", "42"], "inches"),
      Shorts: sizeSetting("waist", ["28", "30", "32", "34", "36", "38", "40"], "inches"),
      "Traditional Wear": makeAlpha(alphaExtended),
      "Hoodies & Sweatshirts": makeAlpha(alphaMen),
      "Jackets & Coats": makeAlpha(alphaExtended),
      "Suits & Blazers": sizeSetting("chest", ["36", "38", "40", "42", "44", "46", "48"], "inches"),
      Innerwear: makeAlpha(alphaExtended),
      Sleepwear: makeAlpha(alphaStandard),
    },
    Footwear: {
      "Casual Shoes": makeShoe(euMenShoes),
      "Formal Shoes": makeShoe(euMenShoes),
      Sandals: makeShoe(euMenShoes),
      Boots: makeShoe(euMenShoes),
    },
  },
  Women: {
    Clothing: {
      Tops: makeAlpha(alphaWomen),
      "T-Shirts": makeAlpha(alphaWomen),
      Shirts: makeAlpha(alphaWomen),
      Dresses: makeAlpha(alphaWomen),
      Sarees: sizeSetting("free", ["Free Size"], "standard"),
      "Salwar Kameez": makeAlpha(["S", "M", "L", "XL", "XXL", "3XL", "4XL"]),
      Kurtis: makeAlpha(alphaExtended),
      Lehengas: makeAlpha(alphaWomen),
      Gowns: makeAlpha(alphaWomen),
      Pants: sizeSetting("waist", ["26", "28", "30", "32", "34", "36", "38"], "inches"),
      Skirts: makeAlpha(alphaWomen),
      Shorts: makeAlpha(alphaWomen),
      Innerwear: sizeSetting(
        "bra",
        ["30A", "30B", "32A", "32B", "32C", "34A", "34B", "34C", "36B", "36C", "38B", "38C"],
        "standard",
      ),
      Sleepwear: makeAlpha(alphaStandard),
      "Maternity Wear": makeAlpha(alphaStandard),
    },
    Footwear: {
      Heels: makeShoe(euWomenShoes),
      Flats: makeShoe(euWomenShoes),
      "Casual Shoes": makeShoe(euWomenShoes),
      Sandals: makeShoe(euWomenShoes),
      Boots: makeShoe(euWomenShoes),
    },
  },
  Kids: {
    "Baby Clothing": {
      Tops: makeAge(["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"]),
      Bottoms: makeAge(["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"]),
      "One-Piece": makeAge(["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"]),
      "Baby Sets": makeAge(["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"]),
    },
    "Boys Clothing": {
      Tops: makeAge(["2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "10Y", "12Y", "14Y"]),
      Bottoms: makeAge(["2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "10Y", "12Y", "14Y"]),
      "Traditional Wear": makeAge(childAges),
      Outerwear: makeAge(childAges),
      Sets: makeAge(childAges),
    },
    "Girls Clothing": {
      Tops: makeAge(["2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "10Y", "12Y", "14Y"]),
      Dresses: makeAge(childAges),
      "Traditional Wear": makeAge(childAges),
      Bottoms: makeAge(childAges),
      Outerwear: makeAge(childAges),
      Sets: makeAge(childAges),
    },
    Footwear: {
      "Boys Shoes": makeShoe(["22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34"]),
      "Girls Shoes": makeShoe(["22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34"]),
      "Baby Shoes": makeShoe(["16", "17", "18", "19", "20", "21", "22"]),
    },
  },
};

export function getSizeSetting({ department, section, category }) {
  return SIZE_SETTINGS[department]?.[section]?.[category] ?? null;
}
