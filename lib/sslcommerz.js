import "server-only";

function getCredentials() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.");
  }
  const live = process.env.SSLCOMMERZ_IS_LIVE === "true";
  return {
    storeId,
    storePassword,
    apiBase: live
      ? "https://securepay.sslcommerz.com"
      : "https://sandbox.sslcommerz.com",
  };
}

export function isSslcommerzConfigured() {
  return Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);
}

export async function initiateSslcommerzPayment(order, origin) {
  const credentials = getCredentials();
  const callbackBase = `${origin}/api/payments/sslcommerz`;
  const form = new URLSearchParams({
    store_id: credentials.storeId,
    store_passwd: credentials.storePassword,
    total_amount: order.total.toFixed(2),
    currency: "BDT",
    tran_id: order.transactionId,
    success_url: `${callbackBase}/success`,
    fail_url: `${callbackBase}/fail`,
    cancel_url: `${callbackBase}/cancel`,
    ipn_url: `${callbackBase}/ipn`,
    shipping_method: "NO",
    product_name: order.items.map((item) => item.name).join(", ").slice(0, 250),
    product_category: "Apparel",
    product_profile: "physical-goods",
    cus_name: order.customer.name,
    cus_email: order.customer.email,
    cus_add1: order.customer.address,
    cus_city: order.customer.city,
    cus_postcode: order.customer.postalCode,
    cus_country: "Bangladesh",
    cus_phone: order.customer.phone,
    ship_name: order.customer.name,
    ship_add1: order.customer.address,
    ship_city: order.customer.city,
    ship_postcode: order.customer.postalCode,
    ship_country: "Bangladesh",
  });
  const response = await fetch(`${credentials.apiBase}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`SSLCommerz session creation failed with HTTP ${response.status}.`);
  }
  const result = await response.json();
  if (result.status !== "SUCCESS" || typeof result.GatewayPageURL !== "string") {
    throw new Error("SSLCommerz did not return a valid payment session.");
  }
  const gatewayUrl = new URL(result.GatewayPageURL);
  const allowedGatewayHosts = new Set(["securepay.sslcommerz.com", "sandbox.sslcommerz.com"]);
  const isGatewayPath =
    gatewayUrl.pathname.startsWith("/gwprocess/v4/") ||
    gatewayUrl.pathname.startsWith("/EasyCheckOut/");
  if (
    gatewayUrl.protocol !== "https:" ||
    !allowedGatewayHosts.has(gatewayUrl.hostname) ||
    gatewayUrl.username ||
    gatewayUrl.password ||
    gatewayUrl.port ||
    !isGatewayPath
  ) {
    throw new Error(
      `SSLCommerz returned an unexpected payment URL (host=${gatewayUrl.hostname || "invalid"}, path=${gatewayUrl.pathname || "/"}).`,
    );
  }
  return gatewayUrl.toString();
}

export async function validateSslcommerzPayment(formData) {
  const credentials = getCredentials();
  const valId = formData.get("val_id");
  if (typeof valId !== "string" || !valId || valId.length > 200) {
    throw new Error("SSLCommerz payment validation id is missing.");
  }
  const params = new URLSearchParams({
    val_id: valId,
    store_id: credentials.storeId,
    store_passwd: credentials.storePassword,
    format: "json",
  });
  const response = await fetch(
    `${credentials.apiBase}/validator/api/validationserverAPI.php?${params}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`SSLCommerz payment validation failed with HTTP ${response.status}.`);
  }
  return response.json();
}
