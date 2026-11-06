export const FREE_SHIPPING_THRESHOLD = 15000;

const takaFormatter = new Intl.NumberFormat("en-BD", {
  maximumFractionDigits: 0,
});

export function formatTaka(amount) {
  return `৳${takaFormatter.format(amount)}`;
}
