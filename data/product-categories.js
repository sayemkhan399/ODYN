export const PRODUCT_CATEGORIES = [
  {
    name: "Men",
    slug: "men",
    subcategories: [
      {
        name: "Clothing",
        slug: "clothing",
        subcategories: [
          { name: "T-Shirts", items: ["Basic", "Printed", "Graphic", "Polo", "Oversized"] },
          { name: "Shirts", items: ["Formal", "Casual", "Denim", "Check", "Printed"] },
          { name: "Pants", items: ["Jeans", "Chinos", "Formal Trousers", "Cargo", "Joggers"] },
          { name: "Shorts", items: ["Denim", "Casual", "Sports", "Cargo"] },
          { name: "Traditional Wear", items: ["Panjabi", "Kurta", "Fotua", "Sherwani"] },
          { name: "Ethnic Wear", items: ["Lungi", "Dhoti", "Traditional Sets"] },
          { name: "Hoodies & Sweatshirts", items: ["Pullover", "Zip-Up", "Oversized"] },
          { name: "Jackets & Coats", items: ["Denim", "Leather", "Bomber", "Blazer", "Winter Coat"] },
          { name: "Suits & Blazers", items: ["Formal Suit", "Blazer", "Waistcoat"] },
          { name: "Sportswear", items: ["Tracksuits", "Sports T-Shirts", "Sports Pants"] },
          { name: "Innerwear", items: ["Boxers", "Briefs", "Vests", "Undershirts"] },
          { name: "Sleepwear", items: ["Pajamas", "Nightwear", "Lounge Sets"] },
        ],
      },
      {
        name: "Footwear",
        slug: "footwear",
        subcategories: [
          { name: "Casual Shoes", items: ["Sneakers", "Loafers", "Slip-ons"] },
          { name: "Formal Shoes", items: ["Oxford", "Derby", "Monk Strap"] },
          { name: "Sandals", items: ["Slides", "Flip-Flops", "Slippers"] },
          { name: "Boots", items: ["Chelsea", "Lace-up", "Work Boots"] },
        ],
      },
      {
        name: "Accessories",
        slug: "accessories",
        subcategories: [
          { name: "Bags", items: ["Backpacks", "Messenger Bags", "Wallets"] },
          { name: "Belts", items: ["Leather", "Casual", "Formal"] },
          { name: "Watches", items: ["Analog", "Digital", "Smart"] },
          { name: "Other Accessories", items: ["Sunglasses", "Caps", "Ties", "Socks"] },
        ],
      },
    ],
  },
  {
    name: "Women",
    slug: "women",
    subcategories: [
      {
        name: "Clothing",
        slug: "clothing",
        subcategories: [
          { name: "Tops", items: ["Casual Tops", "Crop Tops", "Tunics", "Peplum"] },
          { name: "T-Shirts", items: ["Basic", "Printed", "Oversized", "Polo"] },
          { name: "Shirts", items: ["Formal", "Casual", "Denim", "Linen"] },
          { name: "Dresses", items: ["Maxi", "Midi", "Mini", "Bodycon", "A-Line"] },
          { name: "Sarees", items: ["Cotton", "Silk", "Jamdani", "Georgette", "Party Wear"] },
          { name: "Salwar Kameez", items: ["Three-Piece", "Two-Piece", "Unstitched"] },
          { name: "Kurtis", items: ["Casual", "Formal", "Long", "Short"] },
          { name: "Lehengas", items: ["Bridal", "Party Wear", "Festive"] },
          { name: "Gowns", items: ["Evening", "Party", "Bridal"] },
          { name: "Pants", items: ["Jeans", "Trousers", "Palazzo", "Leggings"] },
          { name: "Skirts", items: ["Mini", "Midi", "Maxi", "Pleated"] },
          { name: "Shorts", items: ["Denim", "Casual", "Sports"] },
          { name: "Jackets & Coats", items: ["Denim", "Leather", "Blazer", "Winter Coat"] },
          { name: "Hoodies & Sweatshirts", items: ["Pullover", "Zip-Up", "Oversized"] },
          { name: "Activewear", items: ["Sports Bra", "Leggings", "Yoga Pants"] },
          { name: "Innerwear", items: ["Bras", "Panties", "Shapewear"] },
          { name: "Sleepwear", items: ["Nightdress", "Pajama Sets", "Robes"] },
          { name: "Maternity Wear", items: ["Maternity Dresses", "Tops", "Pants"] },
        ],
      },
      {
        name: "Footwear",
        slug: "footwear",
        subcategories: [
          { name: "Heels", items: ["Stilettos", "Block Heels", "Wedges"] },
          { name: "Flats", items: ["Ballet Flats", "Loafers", "Slip-ons"] },
          { name: "Casual Shoes", items: ["Sneakers", "Canvas Shoes"] },
          { name: "Sandals", items: ["Flat Sandals", "Slides"] },
          { name: "Boots", items: ["Ankle Boots", "Knee-High Boots"] },
        ],
      },
      {
        name: "Accessories",
        slug: "accessories",
        subcategories: [
          { name: "Bags", items: ["Handbags", "Tote Bags", "Clutches", "Backpacks"] },
          { name: "Jewelry", items: ["Earrings", "Necklaces", "Bracelets", "Rings"] },
          { name: "Watches", items: ["Analog", "Digital", "Smart"] },
          { name: "Other Accessories", items: ["Sunglasses", "Scarves", "Belts", "Hair Accessories"] },
        ],
      },
    ],
  },
  {
    name: "Kids",
    slug: "kids",
    subcategories: [
      {
        name: "Baby Clothing",
        slug: "baby-clothing",
        subcategories: [
          { name: "Tops", items: ["Bodysuits", "T-Shirts", "Shirts"] },
          { name: "Bottoms", items: ["Baby Pants", "Shorts", "Leggings"] },
          { name: "One-Piece", items: ["Rompers", "Jumpsuits", "Sleepsuits"] },
          { name: "Baby Sets", items: ["Matching Sets", "Gift Sets"] },
        ],
      },
      {
        name: "Boys Clothing",
        slug: "boys-clothing",
        subcategories: [
          { name: "Tops", items: ["T-Shirts", "Shirts", "Polo Shirts"] },
          { name: "Bottoms", items: ["Jeans", "Trousers", "Shorts", "Joggers"] },
          { name: "Traditional Wear", items: ["Panjabi", "Kurta", "Sherwani"] },
          { name: "Outerwear", items: ["Jackets", "Hoodies", "Sweatshirts"] },
          { name: "Sets", items: ["Casual Sets", "Formal Sets", "Sports Sets"] },
        ],
      },
      {
        name: "Girls Clothing",
        slug: "girls-clothing",
        subcategories: [
          { name: "Tops", items: ["T-Shirts", "Blouses", "Shirts"] },
          { name: "Dresses", items: ["Frocks", "Maxi", "Party Dresses"] },
          { name: "Traditional Wear", items: ["Three-Piece", "Lehenga", "Salwar Kameez"] },
          { name: "Bottoms", items: ["Jeans", "Leggings", "Skirts", "Shorts"] },
          { name: "Outerwear", items: ["Jackets", "Hoodies", "Cardigans"] },
          { name: "Sets", items: ["Casual Sets", "Party Sets", "Co-ord Sets"] },
        ],
      },
      {
        name: "Footwear",
        slug: "footwear",
        subcategories: [
          { name: "Boys Shoes", items: ["Sneakers", "School Shoes", "Sandals"] },
          { name: "Girls Shoes", items: ["Flats", "Sneakers", "Sandals"] },
          { name: "Baby Shoes", items: ["Soft Shoes", "Booties"] },
        ],
      },
      {
        name: "Accessories",
        slug: "accessories",
        subcategories: [
          { name: "Bags", items: ["School Bags", "Backpacks"] },
          { name: "Accessories", items: ["Caps", "Belts", "Socks", "Hair Accessories"] },
          { name: "Other", items: ["Sunglasses", "Watches"] },
        ],
      },
    ],
  },
];
