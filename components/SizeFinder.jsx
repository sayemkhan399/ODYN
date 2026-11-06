"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { getReferenceChart } from "@/data/size-reference";

const departments = ["Men", "Women", "Kids"];
const emptyProfile = {
  age: "",
  height: "",
  chest: "",
  waist: "",
  hip: "",
  footLength: "",
};

function normalizeSize(size) {
  return size.trim().toLowerCase().replace(/^eu\s*/, "").replace(/\s*eu$/, "");
}

function getFitScore(chart, profile, measurementKeys) {
  let score = 0;
  let comparedDimensions = 0;

  for (const key of measurementKeys) {
    const value = profile[key];
    const range = chart[key];
    if (value == null || !range) continue;

    const min = Number(range.min);
    const max = Number(range.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) continue;
    if (value < min || value > max) return null;

    const midpoint = (min + max) / 2;
    const halfRange = Math.max((max - min) / 2, 1);
    score += ((value - midpoint) / halfRange) ** 2;
    comparedDimensions += 1;
  }

  return comparedDimensions > 0 ? score / comparedDimensions : null;
}

function chartRange(chart, key) {
  const range = chart[key];
  return Array.isArray(range) ? { min: range[0], max: range[1] } : range;
}

function getProductRecommendations(products, profile, department, productType, measurementKeys) {
  const selectedProducts = products.filter((product) => {
    const productDepartment = product.taxonomy?.department ?? product.collection;
    const section = product.taxonomy?.section?.toLowerCase() ?? "";
    const isFootwear = section === "footwear" || /shoe|footwear/i.test(product.category ?? "");
    const departmentMatches =
      productDepartment === department ||
      (productDepartment === "Unisex" && department !== "Kids");
    return departmentMatches && isFootwear === (productType === "footwear");
  });

  return selectedProducts.map((product) => {
    const inventorySizes = product.sizes ?? [];
    const productCharts = (product.sizeChart ?? []).map((chart) => ({
      ...chart,
      inventory: inventorySizes.find((entry) => entry.size === chart.size),
    }));
    const hasProductChart = productCharts.some((chart) =>
      measurementKeys.some((key) => chartRange(chart, key)),
    );
    const reference = getReferenceChart(department, productType) ?? [];
    const chartRows = hasProductChart
      ? productCharts.map((chart) => ({
          size: chart.size,
          ranges: chart,
          inventory: chart.inventory,
          source: "product",
        }))
      : reference.map((row) => ({
          size: row.size,
          ranges: Object.fromEntries(
            measurementKeys.flatMap((key) =>
              row[key] ? [[key, chartRange(row, key)]] : [],
            ),
          ),
          inventory: inventorySizes.find(
            (entry) => normalizeSize(entry.size) === normalizeSize(row.size),
          ),
          source: "reference",
        }));

    const matches = chartRows.flatMap((row) => {
      if (!row.inventory || row.inventory.quantity <= 0) return [];
      const fitScore = getFitScore(row.ranges, profile, measurementKeys);
      return fitScore == null ? [] : [{ size: row.size, fitScore }];
    });
    matches.sort((first, second) => first.fitScore - second.fitScore);

    const hasApplicableChart = chartRows.some((row) =>
      measurementKeys.some((key) => chartRange(row.ranges, key)),
    );
    return {
      product,
      size: matches[0]?.size ?? "",
      availableSizes: inventorySizes
        .filter((entry) => entry.quantity > 0)
        .map((entry) => entry.size),
      chartConfigured: hasProductChart || hasApplicableChart,
      hasApplicableChart,
      source: matches[0]?.source ?? (hasProductChart ? "product" : "reference"),
    };
  });
}

function formatRange(row, key, unit = "cm") {
  const range = chartRange(row, key);
  if (!range) return "—";
  return `${range.min}–${range.max} ${unit}`;
}

export default function SizeFinder({ products }) {
  const [department, setDepartment] = useState("Men");
  const [productType, setProductType] = useState("apparel");
  const [profile, setProfile] = useState(emptyProfile);
  const [recommendations, setRecommendations] = useState(null);
  const [formError, setFormError] = useState("");

  const isKids = department === "Kids";
  const isFootwear = productType === "footwear";
  const reference = getReferenceChart(department, productType) ?? [];
  const measurementKeys = isFootwear
    ? ["footLength"]
    : isKids
      ? ["age", "height"]
      : department === "Women"
        ? ["chest", "waist", "hip", "height", "age"]
        : ["chest", "waist", "height", "age"];
  const inputFields = isFootwear
    ? [
        { key: "footLength", label: "Foot length", unit: "cm", min: 1, max: 50, step: "0.1" },
      ]
    : isKids
      ? [
          { key: "age", label: "Age", unit: "years", min: 0, max: 18, step: "1" },
          { key: "height", label: "Height", unit: "cm", min: 40, max: 200, step: "0.5" },
        ]
      : department === "Women"
        ? [
            { key: "height", label: "Height", unit: "cm", min: 100, max: 230, step: "0.5" },
            { key: "chest", label: "Bust", unit: "cm", min: 40, max: 200, step: "0.5" },
            { key: "waist", label: "Waist", unit: "cm", min: 40, max: 200, step: "0.5" },
            { key: "hip", label: "Hip", unit: "cm", min: 40, max: 220, step: "0.5" },
            { key: "age", label: "Age (optional)", unit: "years", min: 1, max: 120, step: "1" },
          ]
        : [
            { key: "height", label: "Height", unit: "cm", min: 100, max: 230, step: "0.5" },
            { key: "chest", label: "Chest", unit: "cm", min: 40, max: 220, step: "0.5" },
            { key: "waist", label: "Waist", unit: "cm", min: 40, max: 220, step: "0.5" },
            { key: "age", label: "Age (optional)", unit: "years", min: 1, max: 120, step: "1" },
          ];

  function submitMeasurements(event) {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(profile).map(([key, value]) => [
        key,
        value === "" ? null : Number(value),
      ]),
    );
    const requiredKeys = isFootwear
      ? ["footLength"]
      : isKids
        ? ["age", "height"]
        : ["chest", "waist"];
    if (requiredKeys.some((key) => values[key] == null)) {
      setFormError(
        isFootwear
          ? "Enter foot length to calculate shoe size."
          : isKids
            ? "Enter both age and height for kids' sizing."
            : "Enter chest/bust and waist measurements to find your size.",
      );
      setRecommendations(null);
      return;
    }

    setFormError("");
    setRecommendations(
      getProductRecommendations(
        products,
        values,
        department,
        productType,
        measurementKeys,
      ),
    );
  }

  function updateProfile(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
    setRecommendations(null);
    setFormError("");
  }

  const matchingProducts = recommendations?.filter((entry) => entry.size) ?? [];
  const referenceDimensions = isFootwear
    ? [{ key: "footLength", label: "Foot length", unit: "cm" }]
    : isKids
      ? [
          { key: "age", label: "Age", unit: "years" },
          { key: "height", label: "Height", unit: "cm" },
        ]
      : [
          { key: "chest", label: department === "Women" ? "Bust" : "Chest", unit: "cm" },
          { key: "waist", label: "Waist", unit: "cm" },
          { key: "hip", label: "Hip", unit: "cm" },
        ];

  return (
    <section
      aria-labelledby="size-finder-title"
      className="my-7 rounded-lg border border-[#e8e6df] bg-white p-4 sm:my-9 sm:p-6"
      id="size-finder"
    >
      <div className="max-w-2xl">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#858a70]">
          Find your fit
        </p>
        <h2 id="size-finder-title" className="mt-1 font-serif text-2xl text-[#252b24] sm:text-3xl">
          Calculate your size
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-[#74776d] sm:text-xs">
          Choose a size group and enter measurements in centimeters. Product charts take priority; the built-in Bangladesh-market reference is an indicative guide, not a universal or brand-specific standard.
        </p>
      </div>

      <form className="mt-5" onSubmit={submitMeasurements}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-medium text-[#555b50]">
            Size group
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-[#dedcd3] bg-[#fbfaf7] px-3 text-xs text-[#252b24] outline-none focus:border-[#69725e]"
              onChange={(event) => {
                setDepartment(event.target.value);
                setProfile(emptyProfile);
                setRecommendations(null);
                setFormError("");
              }}
              value={department}
            >
              {departments.map((entry) => <option key={entry}>{entry}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-medium text-[#555b50]">
            Product type
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-[#dedcd3] bg-[#fbfaf7] px-3 text-xs text-[#252b24] outline-none focus:border-[#69725e]"
              onChange={(event) => {
                setProductType(event.target.value);
                setProfile(emptyProfile);
                setRecommendations(null);
                setFormError("");
              }}
              value={productType}
            >
              <option value="apparel">Clothing</option>
              <option value="footwear">Footwear</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inputFields.map(({ key, label, unit, min, max, step }) => (
            <label className="text-[10px] font-medium text-[#555b50]" key={key}>
              {label}
              <span className="ml-1 font-normal text-[#92958b]">({unit})</span>
              <input
                autoComplete="off"
                className="mt-1.5 h-10 w-full rounded-md border border-[#dedcd3] bg-[#fbfaf7] px-3 text-xs text-[#252b24] outline-none focus:border-[#69725e]"
                max={max}
                min={min}
                onChange={(event) => updateProfile(key, event.target.value)}
                placeholder="Enter measurement"
                required={!label.includes("optional")}
                step={step}
                type="number"
                value={profile[key]}
              />
            </label>
          ))}
        </div>
        {formError && <p className="mt-3 text-[10px] text-rose-700" role="alert">{formError}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="min-h-10 bg-[#293128] px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-white transition-colors hover:bg-[#414b3d]"
            type="submit"
          >
            Find my sizes
          </button>
          <p className="text-[9px] text-[#92958b]">
            Measurements stay on this page and are not sent or saved.
          </p>
        </div>
      </form>

      <div className="mt-7 border-t border-[#eeeae2] pt-5">
        <h3 className="font-serif text-xl text-[#252b24]">Built-in size chart</h3>
        <p className="mt-1 text-[10px] leading-5 text-[#74776d]">
          Indicative Bangladesh-market reference. Always prefer a product&apos;s own size chart where provided.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead className="border-b border-[#e8e6df] text-[9px] uppercase tracking-[0.1em] text-[#85867d]">
              <tr>
                <th className="py-2 pr-4 font-medium">Size</th>
                {referenceDimensions.map(({ key, label, unit }) => (
                  <th className="px-3 py-2 font-medium" key={key}>{label} ({unit})</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0eee8]">
              {reference.map((row) => (
                <tr key={row.size}>
                  <th className="py-2.5 pr-4 text-[10px] font-medium text-[#394239]">{row.size}</th>
                  {referenceDimensions.map(({ key, unit }) => (
                    <td className="px-3 py-2.5 text-[10px] text-[#74776d]" key={key}>
                      {formatRange(row, key, unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recommendations && (
        <div aria-live="polite" className="mt-7 border-t border-[#eeeae2] pt-5">
          <h3 className="font-serif text-xl text-[#252b24]">Your size chart</h3>
          <p className="mt-1 text-[10px] text-[#74776d]">
            Showing {department.toLowerCase()} {isFootwear ? "footwear" : "clothing"} matches and available stock.
          </p>
          {recommendations.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="border-b border-[#e8e6df] text-[9px] uppercase tracking-[0.1em] text-[#85867d]">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium">Recommended size</th>
                    <th className="px-4 py-2 font-medium">Available sizes</th>
                    <th className="py-2 pl-4 font-medium">Guide status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eee8]">
                  {recommendations.map(({ product, size, availableSizes, chartConfigured, hasApplicableChart, source }) => (
                    <tr key={product.id}>
                      <th className="py-3 pr-4 text-[10px] font-medium text-[#394239]">{product.name}</th>
                      <td className="px-4 py-3 text-[10px] font-semibold text-[#394239]">{size || "—"}</td>
                      <td className="px-4 py-3 text-[10px] text-[#74776d]">
                        {availableSizes.length ? availableSizes.join(", ") : "Out of stock"}
                      </td>
                      <td className="py-3 pl-4 text-[10px] text-[#74776d]">
                        {!availableSizes.length
                          ? "Out of stock"
                          : size
                            ? source === "product" ? "Product chart" : "Reference estimate"
                            : !chartConfigured
                              ? "No size chart"
                              : hasApplicableChart
                                ? "No available size matches"
                                : "No chart for these measurements"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-[11px] text-[#74776d]">
              No {department.toLowerCase()} {isFootwear ? "footwear" : "clothing"} products are currently listed.
            </p>
          )}

          {matchingProducts.length > 0 ? (
            <div className="mt-7">
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#394239]">
                Available products in your size ({matchingProducts.length})
              </h3>
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10">
                {matchingProducts.map(({ product, size }) => (
                  <ProductCard key={product.id} product={product} recommendedSize={size} />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-[11px] text-[#74776d]">
              No available size matches your measurements. Check the product-specific chart or contact ODYN for help.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
