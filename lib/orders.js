import "server-only";
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { mongoClient, mongoDatabase } from "@/lib/mongodb";
import {
  PromoCodeError,
  releasePromoCode,
  reservePromoCode,
} from "@/lib/promo-codes";

const orders = mongoDatabase.collection("orders");
const products = mongoDatabase.collection("products");
const ORDER_STATUSES = new Set([
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
const PAYMENT_METHODS = new Set(["cod", "sslcommerz"]);
const PAYMENT_HOLD_DURATION_MS = 30 * 60 * 1000;

export class OrderValidationError extends Error {}

function requiredString(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new OrderValidationError(`${field} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function normalizeItems(inputItems) {
  if (!Array.isArray(inputItems) || inputItems.length === 0 || inputItems.length > 50) {
    throw new OrderValidationError("Add between 1 and 50 items to your order.");
  }
  const grouped = new Map();
  for (const item of inputItems) {
    const productId = typeof item?.productId === "string" ? item.productId.trim() : "";
    const size = requiredString(item?.size, "Each item's size", 40);
    const quantity = Number(item?.quantity);
    if (!ObjectId.isValid(productId) || new ObjectId(productId).toHexString() !== productId) {
      throw new OrderValidationError("One or more product references are invalid.");
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new OrderValidationError("Item quantities must be whole numbers from 1 to 20.");
    }
    const key = `${productId}:${size}`;
    grouped.set(key, {
      productId,
      size,
      quantity: (grouped.get(key)?.quantity ?? 0) + quantity,
    });
  }
  if ([...grouped.values()].some((item) => item.quantity > 20)) {
    throw new OrderValidationError("A maximum of 20 units is allowed per product size.");
  }
  return [...grouped.values()];
}

function getDeliveryCharge(city) {
  return /dhaka/i.test(city) ? 70 : 120;
}

function serializeOrder(order) {
  const { _id, userId, promoId, ...safeOrder } = order;
  return {
    ...safeOrder,
    id: _id.toString(),
    customerId: userId?.toString() ?? null,
    promoId: promoId?.toString() ?? null,
  };
}

async function expireOrderIfNeeded(order, session, now = new Date()) {
  if (
    order.paymentStatus !== "pending" ||
    !(order.paymentExpiresAt instanceof Date) ||
    order.paymentExpiresAt > now
  ) {
    return null;
  }
  const updated = await orders.findOneAndUpdate(
    { _id: order._id, paymentStatus: "pending", paymentExpiresAt: { $lte: now } },
    {
      $set: {
        paymentStatus: "failed",
        status: "cancelled",
        updatedAt: now,
      },
    },
    { returnDocument: "after", session },
  );
  if (!updated) return null;
  for (const item of order.items) {
    await products.updateOne(
      { _id: item.productId },
      {
        $inc: { "sizes.$[size].quantity": item.quantity, stock: item.quantity },
        $set: { updatedAt: now },
      },
      { arrayFilters: [{ "size.size": item.size }], session },
    );
  }
  if (order.promoId) await releasePromoCode(order.promoId, session);
  return updated;
}

async function expirePendingPayments(session, now = new Date()) {
  const expiredOrders = await orders
    .find({ paymentStatus: "pending", paymentExpiresAt: { $lte: now } }, { session })
    .limit(100)
    .toArray();
  for (const order of expiredOrders) {
    await expireOrderIfNeeded(order, session, now);
  }
}

export async function createOrder(input, sessionUser = null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new OrderValidationError("Order details are required.");
  }
  const customerName = requiredString(input.customer?.name, "Full name", 120);
  const email = requiredString(input.customer?.email, "Email address", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OrderValidationError("Enter a valid email address.");
  }
  const phone = requiredString(input.customer?.phone, "Phone number", 40);
  const address = requiredString(input.customer?.address, "Address", 300);
  const city = requiredString(input.customer?.city, "City", 100);
  const region = typeof input.customer?.region === "string" ? input.customer.region.trim().slice(0, 100) : "";
  const postalCode = requiredString(input.customer?.postalCode, "Postal code", 30);
  if (input.customer?.country !== "BD") {
    throw new OrderValidationError("ODYN currently accepts delivery addresses in Bangladesh only.");
  }
  const paymentMethod = input.paymentMethod;
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw new OrderValidationError("Choose cash on delivery or SSLCommerz.");
  }
  const requestedItems = normalizeItems(input.items);
  const productObjectIds = requestedItems.map(({ productId }) => new ObjectId(productId));
  const objectId = new ObjectId();
  const transactionId = randomUUID();
  const mongoSession = mongoClient.startSession();
  let createdOrder;

  try {
    await mongoSession.withTransaction(async () => {
      await expirePendingPayments(mongoSession);
      const productRecords = await products.find(
        { _id: { $in: productObjectIds }, isActive: { $ne: false } },
        { session: mongoSession },
      ).toArray();
      const productMap = new Map(productRecords.map((product) => [product._id.toString(), product]));
      if (productMap.size !== new Set(requestedItems.map((item) => item.productId)).size) {
        throw new OrderValidationError("A product is no longer available.");
      }

      const orderItems = requestedItems.map(({ productId, size, quantity }) => {
        const product = productMap.get(productId);
        const matchingSize = product.sizes?.find((entry) => entry.size === size);
        if (!matchingSize) {
          throw new OrderValidationError(`${product.name} is not available in size ${size}.`);
        }
        if (matchingSize.quantity < quantity) {
          throw new OrderValidationError(`Only ${matchingSize.quantity} unit(s) of ${product.name} in size ${size} remain.`);
        }
        const discountPercent = Math.min(Math.max(Number(product.discountPercent) || 0, 0), 100);
        const unitPrice = Math.round(product.price * (1 - discountPercent / 100));
        return {
          productId: product._id,
          name: product.name,
          image: `/api/products/${product._id.toString()}/image`,
          category: product.category,
          size,
          quantity,
          unitPrice,
          listPrice: product.price,
          discountPercent,
          lineTotal: unitPrice * quantity,
        };
      });

      const subtotal = orderItems.reduce((sum, item) => sum + item.listPrice * item.quantity, 0);
      const productDiscount = orderItems.reduce(
        (sum, item) => sum + (item.listPrice - item.unitPrice) * item.quantity,
        0,
      );
      const eligibleSubtotal = orderItems.reduce(
        (sum, item) => sum + (item.discountPercent === 0 ? item.lineTotal : 0),
        0,
      );
      let promo = null;
      if (input.promoCode) {
        try {
          promo = await reservePromoCode(input.promoCode, eligibleSubtotal, mongoSession);
        } catch (error) {
          if (error instanceof PromoCodeError) {
            throw new OrderValidationError(error.message);
          }
          throw error;
        }
      }

      for (const item of requestedItems) {
        const result = await products.updateOne(
          {
            _id: new ObjectId(item.productId),
            isActive: { $ne: false },
            sizes: { $elemMatch: { size: item.size, quantity: { $gte: item.quantity } } },
            stock: { $gte: item.quantity },
          },
          {
            $inc: { "sizes.$.quantity": -item.quantity, stock: -item.quantity },
            $set: { updatedAt: new Date() },
          },
          { session: mongoSession },
        );
        if (result.modifiedCount !== 1) {
          throw new OrderValidationError("Inventory changed while placing your order. Please review your bag.");
        }
      }

      const deliveryCharge = getDeliveryCharge(city);
      const total = subtotal - productDiscount - (promo?.discount ?? 0) + deliveryCharge;
      if (paymentMethod === "sslcommerz" && (total < 10 || total > 500000)) {
        throw new OrderValidationError("SSLCommerz supports order totals from ৳10 to ৳500,000.");
      }
      const now = new Date();
      const document = {
        _id: objectId,
        transactionId,
        userId: sessionUser?.role === "customer" ? sessionUser.id : null,
        customer: { name: customerName, email, phone, address, city, region, postalCode, country: "BD" },
        items: orderItems,
        subtotal,
        productDiscount,
        promoCode: promo?.code ?? null,
        promoDiscount: promo?.discount ?? 0,
        promoId: promo?.id ?? null,
        deliveryCharge,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "unpaid" : "pending",
        status: paymentMethod === "cod" ? "processing" : "awaiting-payment",
        ...(paymentMethod === "sslcommerz"
          ? { paymentExpiresAt: new Date(now.getTime() + PAYMENT_HOLD_DURATION_MS) }
          : {}),
        createdAt: now,
        updatedAt: now,
      };
      await orders.insertOne(document, { session: mongoSession });
      createdOrder = serializeOrder(document);
    });
  } finally {
    await mongoSession.endSession();
  }
  return createdOrder;
}

export async function getOrderByTransactionId(transactionId) {
  if (typeof transactionId !== "string" || transactionId.length > 50) return null;
  const order = await orders.findOne({ transactionId });
  return order ? serializeOrder(order) : null;
}

export async function getOrderById(id) {
  if (typeof id !== "string" || !ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id) {
    return null;
  }
  const order = await orders.findOne({ _id: new ObjectId(id) });
  return order ? serializeOrder(order) : null;
}

export async function listCustomerOrders(userId) {
  if (typeof userId !== "string" || !userId) return [];
  const session = mongoClient.startSession();
  try {
    await session.withTransaction(() => expirePendingPayments(session));
  } finally {
    await session.endSession();
  }
  const records = await orders
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return records.map(serializeOrder);
}

export async function findGuestOrder(id, email) {
  if (typeof id !== "string" || !ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id) {
    return null;
  }
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail) return null;
  const order = await orders.findOne({
    _id: new ObjectId(id),
    "customer.email": normalizedEmail,
    userId: null,
  });
  return order ? serializeOrder(order) : null;
}

export async function listAdminOrders({ offset = 0, limit = 25, search = "" } = {}) {
  const session = mongoClient.startSession();
  try {
    await session.withTransaction(() => expirePendingPayments(session));
  } finally {
    await session.endSession();
  }
  const filter = {};
  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const safeSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 100);
    filter.$or = [
      { transactionId: { $regex: safeSearch, $options: "i" } },
      { "customer.name": { $regex: safeSearch, $options: "i" } },
      { "customer.email": { $regex: safeSearch, $options: "i" } },
    ];
  }
  const [records, total] = await Promise.all([
    orders.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
    orders.countDocuments(filter),
  ]);
  return { orders: records.map(serializeOrder), total };
}

export async function getOrderSummary() {
  const session = mongoClient.startSession();
  try {
    await session.withTransaction(() => expirePendingPayments(session));
  } finally {
    await session.endSession();
  }
  const now = new Date();
  const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const yearlyStart = new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1));
  const [orderCount, openOrderCount, customerCount, totals, recentOrders, monthlySales, yearlySales, topSellingProducts] = await Promise.all([
    orders.countDocuments(),
    orders.countDocuments({ status: { $in: ["processing", "awaiting-payment"] } }),
    mongoDatabase.collection("user").countDocuments({ role: "customer" }),
    orders.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, orderValue: { $sum: "$total" }, productsOrdered: { $sum: { $sum: "$items.quantity" } } } },
    ]).toArray(),
    orders.find().sort({ createdAt: -1 }).limit(5).toArray(),
    orders.aggregate([
      { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: monthlyStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          sales: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
    orders.aggregate([
      { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: yearlyStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
          sales: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
    orders.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          image: { $first: "$items.image" },
          category: { $first: "$items.category" },
          quantity: { $sum: "$items.quantity" },
          sales: {
            $sum: {
              $ifNull: [
                "$items.lineTotal",
                { $multiply: ["$items.unitPrice", "$items.quantity"] },
              ],
            },
          },
        },
      },
      { $sort: { quantity: -1, sales: -1, name: 1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          productId: { $toString: "$_id" },
          name: 1,
          image: 1,
          category: 1,
          quantity: 1,
          sales: 1,
        },
      },
    ]).toArray(),
  ]);
  return {
    orderCount,
    openOrderCount,
    customerCount,
    orderValue: totals[0]?.orderValue ?? 0,
    productsOrdered: totals[0]?.productsOrdered ?? 0,
    recentOrders: recentOrders.map(serializeOrder),
    monthlySales,
    yearlySales,
    topSellingProducts,
  };
}

export async function updateOrder(id, input) {
  if (typeof id !== "string" || !ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id) {
    return null;
  }
  if (!input || typeof input.status !== "string" || !ORDER_STATUSES.has(input.status)) {
    throw new OrderValidationError("Choose a valid order status.");
  }
  const _id = new ObjectId(id);
  const session = mongoClient.startSession();
  let updatedOrder = null;
  try {
    await session.withTransaction(async () => {
      const current = await orders.findOne({ _id }, { session });
      if (!current) return;
      if (current.status === "cancelled" && input.status !== "cancelled") {
        throw new OrderValidationError("Cancelled orders cannot be reopened.");
      }
      if (current.paymentStatus === "pending" && input.status !== "cancelled") {
        throw new OrderValidationError("Complete or cancel the pending online payment before processing this order.");
      }
      if (input.status === "cancelled" && current.paymentStatus === "paid") {
        throw new OrderValidationError("Paid orders require a refund before cancellation.");
      }
      if (input.status === "cancelled" && current.status !== "cancelled") {
        for (const item of current.items) {
          await products.updateOne(
            { _id: item.productId },
            {
              $inc: { "sizes.$[size].quantity": item.quantity, stock: item.quantity },
              $set: { updatedAt: new Date() },
            },
            { arrayFilters: [{ "size.size": item.size }], session },
          );
        }
        if (current.promoId) await releasePromoCode(current.promoId, session);
      }
      const result = await orders.findOneAndUpdate(
        { _id, status: current.status },
        {
          $set: {
            status: input.status,
            ...(input.status === "cancelled" && current.paymentStatus === "pending"
              ? { paymentStatus: "cancelled" }
              : {}),
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after", session },
      );
      updatedOrder = result ? serializeOrder(result) : null;
    });
  } finally {
    await session.endSession();
  }
  return updatedOrder;
}

export async function updatePaymentStatus(transactionId, status) {
  if (!["paid", "failed", "cancelled"].includes(status)) {
    throw new OrderValidationError("Payment status is invalid.");
  }
  const session = mongoClient.startSession();
  let resultOrder = null;
  try {
    await session.withTransaction(async () => {
      const current = await orders.findOne({ transactionId }, { session });
      if (!current) return;
      const expired = await expireOrderIfNeeded(current, session);
      if (expired) {
        resultOrder = serializeOrder(expired);
        return;
      }
      if (current.paymentStatus !== "pending") {
        resultOrder = serializeOrder(current);
        return;
      }
      if (status === "paid") {
        if (current.status === "cancelled") {
          resultOrder = serializeOrder(current);
          return;
        }
        const result = await orders.findOneAndUpdate(
          { _id: current._id, paymentStatus: "pending" },
          { $set: { paymentStatus: "paid", status: "processing", updatedAt: new Date() } },
          { returnDocument: "after", session },
        );
        resultOrder = result ? serializeOrder(result) : null;
        return;
      }

      for (const item of current.items) {
        await products.updateOne(
          { _id: item.productId },
          {
            $inc: { "sizes.$[size].quantity": item.quantity, stock: item.quantity },
            $set: { updatedAt: new Date() },
          },
          { arrayFilters: [{ "size.size": item.size }], session },
        );
      }
      if (current.promoId) await releasePromoCode(current.promoId, session);
      const result = await orders.findOneAndUpdate(
        { _id: current._id, paymentStatus: "pending" },
        {
          $set: {
            paymentStatus: status,
            status: "cancelled",
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after", session },
      );
      resultOrder = result ? serializeOrder(result) : null;
    });
  } finally {
    await session.endSession();
  }
  return resultOrder;
}

export { PAYMENT_METHODS };
