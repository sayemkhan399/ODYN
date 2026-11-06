"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  CircleHelp,
  Command,
  CreditCard,
  ImagePlus,
  LayoutDashboard,
  Menu,
  Pause,
  PanelsTopLeft,
  Package,
  Play,
  Plus,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  Ticket,
  Trash2,
  Users,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminAccountMenu from "@/components/AdminAccountMenu";
import { PRODUCT_CATEGORIES } from "@/data/product-categories";
import { getSizeSetting } from "@/data/size-settings";
import { formatTaka } from "@/lib/currency";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "products", label: "Products", icon: Package },
  { id: "try-the-look", label: "Try the Look", icon: Shirt },
  { id: "promo-codes", label: "Promo Codes", icon: Ticket },
  { id: "posters", label: "Posters", icon: PanelsTopLeft },
  { id: "customers", label: "Customers", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "roles", label: "Roles & security", icon: ShieldCheck },
];
const customerPageSize = 25;
const defaultStoreSettings = {
  name: "ODYN",
  email: "",
  description: "",
};
const emptyProductTaxonomy = {
  department: "",
  section: "",
  category: "",
  item: "",
};

const sizeChartDimensions = [
  { key: "age", label: "Age (years)", step: "1" },
  { key: "height", label: "Height (cm)", step: "1" },
  { key: "chest", label: "Chest / bust (cm)", step: "0.5" },
  { key: "waist", label: "Waist (cm)", step: "0.5" },
  { key: "hip", label: "Hip (cm)", step: "0.5" },
  { key: "footLength", label: "Foot length (cm)", step: "0.1" },
];

function createProductSizeRow(size = "", quantity = 0, sizeChartEntry = null) {
  return {
    size,
    quantity,
    measurements: Object.fromEntries(
      sizeChartDimensions.map(({ key }) => [
        key,
        {
          min: sizeChartEntry?.[key]?.min ?? "",
          max: sizeChartEntry?.[key]?.max ?? "",
        },
      ]),
    ),
  };
}

function getSizeRows(taxonomy, product = null) {
  const setting = getSizeSetting(taxonomy);
  const rows = product?.sizes?.length
    ? product.sizes
    : setting
      ? setting.sizes.map((size) => ({ size, quantity: 0 }))
      : [{ size: "S", quantity: product?.stock ?? 0 }];
  return rows.map((row) =>
    createProductSizeRow(
      row.size,
      row.quantity,
      product?.sizeChart?.find((entry) => entry.size === row.size),
    ),
  );
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildSalesChartData(summary, period) {
  const isMonthly = period === "monthly";
  const records = new Map(
    (isMonthly ? summary?.monthlySales : summary?.yearlySales)?.map((record) => [
      record._id,
      record,
    ]) ?? [],
  );
  const now = new Date();
  const count = isMonthly ? 12 : 5;

  return Array.from({ length: count }, (_, index) => {
    const date = isMonthly
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + index + 1, 1))
      : new Date(Date.UTC(now.getUTCFullYear() - count + index + 1, 0, 1));
    const key = isMonthly
      ? date.toISOString().slice(0, 7)
      : String(date.getUTCFullYear());
    const record = records.get(key);
    return {
      label: isMonthly
        ? date.toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" })
        : key,
      sales: record?.sales ?? 0,
    };
  });
}

async function adminRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return result;
}

function StatusBadge({ status }) {
  const styles = {
    processing: "bg-amber-50 text-amber-800 ring-amber-200",
    "awaiting-payment": "bg-orange-50 text-orange-800 ring-orange-200",
    shipped: "bg-sky-50 text-sky-700 ring-sky-200",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  const label = status === "awaiting-payment"
    ? "Awaiting payment"
    : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${styles[status] ?? styles.cancelled}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export default function AdminPage() {
  const { data: sessionData } = authClient.useSession();
  const [activePage, setActivePage] = useState("overview");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersOffset, setCustomersOffset] = useState(0);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchField, setCustomerSearchField] = useState("email");
  const [updatingCustomerId, setUpdatingCustomerId] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersOffset, setOrdersOffset] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [salesPeriod, setSalesPeriod] = useState("monthly");
  const [notifications, setNotifications] = useState([]);
  const [notificationsError, setNotificationsError] = useState("");
  const [roleData, setRoleData] = useState({ admins: [], customers: [] });
  const [rolesError, setRolesError] = useState("");
  const [updatingRoleId, setUpdatingRoleId] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [productSaving, setProductSaving] = useState(false);
  const [adminLooks, setAdminLooks] = useState([]);
  const [looksLoading, setLooksLoading] = useState(true);
  const [looksError, setLooksError] = useState("");
  const [lookSaving, setLookSaving] = useState(false);
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoCodesError, setPromoCodesError] = useState("");
  const [promoCodesLoading, setPromoCodesLoading] = useState(true);
  const [posters, setPosters] = useState([]);
  const [postersError, setPostersError] = useState("");
  const [postersLoading, setPostersLoading] = useState(true);
  const [promoFormOpen, setPromoFormOpen] = useState(false);
  const [posterFormOpen, setPosterFormOpen] = useState(false);
  const [posterImage, setPosterImage] = useState("");
  const [posterImageError, setPosterImageError] = useState("");
  const [avatarFormOpen, setAvatarFormOpen] = useState(false);
  const [avatarImage, setAvatarImage] = useState("");
  const [avatarImageError, setAvatarImageError] = useState("");
  const [avatarDepartment, setAvatarDepartment] = useState("");
  const [avatarProductSearch, setAvatarProductSearch] = useState("");
  const [selectedLookProductIds, setSelectedLookProductIds] = useState([]);
  const [avatarFormError, setAvatarFormError] = useState("");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [storeSettings, setStoreSettings] = useState(defaultStoreSettings);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [productTaxonomy, setProductTaxonomy] = useState(emptyProductTaxonomy);
  const [productSizes, setProductSizes] = useState([{ size: "S", quantity: 0 }]);
  const [productImage, setProductImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [productFormError, setProductFormError] = useState("");
  useEffect(() => {
    const requestedPage = window.location.hash.slice(1);
    const validPages = new Set([...navigation.map((item) => item.id), "settings"]);
    if (!validPages.has(requestedPage)) return undefined;
    const timer = window.setTimeout(() => setActivePage(requestedPage), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch("/api/products?admin=1", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Products could not be loaded.");
        }
        setProducts(result.products);
        setProductsError("");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN admin products.", error);
          setProductsError(error.message || "Products could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLooks() {
      try {
        const response = await fetch("/api/looks?admin=1", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Try the Look avatars could not be loaded.");
        }
        setAdminLooks(result.looks);
        setLooksError("");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN Try the Look avatars.", error);
          setLooksError(error.message || "Try the Look avatars could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLooksLoading(false);
      }
    }

    loadLooks();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (activePage !== "customers") return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCustomersLoading(true);
      setCustomersError("");
      const params = new URLSearchParams({
        offset: String(customersOffset),
        field: customerSearchField,
      });
      if (customerSearch.trim()) params.set("search", customerSearch.trim());

      try {
        const response = await fetch(`/api/admin/customers?${params}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Customer accounts could not be loaded.");
        }
        setCustomers(result.users);
        setCustomersTotal(result.total);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN customer accounts.", error);
          setCustomersError(error.message || "Customer accounts could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setCustomersLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activePage, customersOffset, customerSearch, customerSearchField]);

  useEffect(() => {
    if (activePage !== "overview") return undefined;
    const controller = new AbortController();
    fetch("/api/admin/summary", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Dashboard data could not be loaded.");
        setSummary(result);
        setSummaryError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load the ODYN dashboard summary.", error);
          setSummaryError(error.message || "Dashboard data could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "orders") return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setOrdersLoading(true);
      setOrdersError("");
      const params = new URLSearchParams({
        offset: String(ordersOffset),
        search: search.trim(),
      });
      try {
        const response = await fetch(`/api/admin/orders?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Orders could not be loaded.");
        setOrders(result.orders);
        setOrdersTotal(result.total);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not load the ODYN order list.", error);
          setOrdersError(error.message || "Orders could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setOrdersLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activePage, ordersOffset, search]);

  useEffect(() => {
    if (activePage !== "promo-codes") return undefined;
    const controller = new AbortController();
    fetch("/api/promos?admin=1", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Promo codes could not be loaded.");
        setPromoCodes(result.promoCodes);
        setPromoCodesError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN promo codes.", error);
          setPromoCodesError(error.message || "Promo codes could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPromoCodesLoading(false);
      });
    return () => controller.abort();
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "posters") return undefined;
    const controller = new AbortController();
    fetch("/api/posters?admin=1", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Posters could not be loaded.");
        setPosters(result.posters);
        setPostersError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN posters.", error);
          setPostersError(error.message || "Posters could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPostersLoading(false);
      });
    return () => controller.abort();
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "settings") return undefined;
    const controller = new AbortController();
    fetch("/api/admin/settings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Store settings could not be loaded.");
        setStoreSettings({ ...defaultStoreSettings, ...result.settings });
        setPaymentSettings(result.payments);
        setSettingsError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN admin settings.", error);
          setSettingsError(error.message || "Store settings could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "notifications") return undefined;
    const controller = new AbortController();
    fetch("/api/admin/notifications", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Notifications could not be loaded.");
        setNotifications(result.notifications);
        setNotificationsError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN admin notifications.", error);
          setNotificationsError(error.message || "Notifications could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "roles") return undefined;
    const controller = new AbortController();
    fetch("/api/admin/roles", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Role data could not be loaded.");
        setRoleData(result);
        setRolesError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN role data.", error);
          setRolesError(error.message || "Role data could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [activePage]);


  const selectedDepartment = PRODUCT_CATEGORIES.find(
    (department) => department.name === productTaxonomy.department,
  );
  const selectedSection = selectedDepartment?.subcategories.find(
    (section) => section.name === productTaxonomy.section,
  );
  const selectedCategory = selectedSection?.subcategories.find(
    (category) => category.name === productTaxonomy.category,
  );
  const productSizeSetting = getSizeSetting(productTaxonomy);

  const productDepartments = [
    ...new Set([
      ...PRODUCT_CATEGORIES.map((department) => department.name),
      ...products.map((product) => product.taxonomy?.department ?? product.collection),
    ]),
  ];
  const filteredProducts = products.filter((product) => {
    const matchesDepartment =
      !departmentFilter ||
      (product.taxonomy?.department ?? product.collection) === departmentFilter;
    const matchesSearch = `${product.name} ${product.description ?? ""} ${product.category} ${product.collection} ${product.taxonomy?.item ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesDepartment && matchesSearch;
  });
  const avatarProductOptions = products.filter((product) => {
    if (product.isActive === false || !avatarDepartment) return false;
    const department = product.taxonomy?.department ?? product.collection;
    const availableForDepartment =
      department === avatarDepartment ||
      department === "Accessories" ||
      (department === "Unisex" && ["Men", "Women"].includes(avatarDepartment));
    const matchesProductSearch =
      `${product.name} ${product.taxonomy?.category ?? product.category ?? ""} ${product.taxonomy?.item ?? ""}`
        .toLowerCase()
        .includes(avatarProductSearch.trim().toLowerCase());
    return availableForDepartment && matchesProductSearch;
  });
  const selectedLookProducts = products.filter((product) =>
    selectedLookProductIds.includes(product.id),
  );
  const pageTitle = activePage === "settings"
    ? "Settings"
    : activePage === "try-the-look"
      ? "Try the Look"
      : activePage === "promo-codes"
        ? "Promo Codes"
        : activePage === "roles"
          ? "Security & roles"
    : navigation.find((item) => item.id === activePage)?.label ?? "Overview";
  const salesChartData = buildSalesChartData(summary, salesPeriod);

  function selectPage(id) {
    setActivePage(id);
    setSearch("");
    setMobileNavOpen(false);
    if (id === "promo-codes" && activePage !== "promo-codes") setPromoCodesLoading(true);
    if (id === "posters" && activePage !== "posters") setPostersLoading(true);
    if (id === "customers") {
      setCustomersOffset(0);
      setCustomerSearch("");
      setCustomersError("");
    }
    if (id === "orders") {
      setOrdersOffset(0);
      setOrdersError("");
    }
  }

  async function updateCustomerStatus(userId, status) {
    if (status === "blocked" && !window.confirm("Block this customer account? They will not be able to sign in until unblocked.")) {
      return;
    }
    setUpdatingCustomerId(userId);
    setCustomersError("");
    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Customer account could not be updated.");
      }
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === userId ? { ...customer, ...result.user } : customer,
        ),
      );
    } catch (error) {
      console.error("Could not update ODYN customer account status.", error);
      setCustomersError(error.message || "Customer account could not be updated.");
    } finally {
      setUpdatingCustomerId("");
    }
  }

  function openProductForm(product = null) {
    const taxonomy = product?.taxonomy ?? emptyProductTaxonomy;
    setEditingProduct(product);
    setProductTaxonomy(taxonomy);
    setProductSizes(getSizeRows(taxonomy, product));
    setProductImage(product?.image ?? "");
    setImageError("");
    setProductFormError("");
    setProductFormOpen(true);
  }

  function updateProductTaxonomy(field, value) {
    const nextTaxonomy = {
      ...productTaxonomy,
      [field]: value,
      ...(field === "department" ? { section: "", category: "", item: "" } : {}),
      ...(field === "section" ? { category: "", item: "" } : {}),
      ...(field === "category" ? { item: "" } : {}),
    };

    setProductTaxonomy(nextTaxonomy);
    if (field !== "item") {
      setProductSizes(getSizeRows(nextTaxonomy));
      setProductFormError("");
    }
  }

  function handleProductImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type)) {
      setImageError("Choose a JPG, PNG, WebP, GIF, or AVIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProductImage(reader.result);
        setImageError("");
      } else {
        setImageError("The selected image could not be read.");
      }
    };
    reader.onerror = () => setImageError("The selected image could not be read.");
    reader.readAsDataURL(file);
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!productImage) {
      setImageError("Choose a product image before saving.");
      return;
    }

    const sizes = productSizes.map(({ size, quantity }) => ({
      size: size.trim(),
      quantity: Number(quantity),
    }));
    if (sizes.some(({ size, quantity }) => !size || !Number.isInteger(quantity) || quantity < 0)) {
      setProductFormError("Add a size and a valid non-negative quantity for every row.");
      return;
    }

    const normalizedSizes = sizes.filter(({ size }) => size);
    if (normalizedSizes.length === 0) {
      setProductFormError("Add at least one product size.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const productDetails = {
      name: formData.get("name").trim(),
      description: formData.get("description").trim(),
      collection: productTaxonomy.department,
      category: productTaxonomy.category,
      taxonomy: { ...productTaxonomy },
      price: Number(formData.get("price")),
      discountPercent: Number(formData.get("discountPercent")),
      sizes: normalizedSizes,
      sizeChart: productSizes
        .filter(({ size }) => normalizedSizes.some((entry) => entry.size === size))
        .map(({ size, measurements }) => ({
          size: size.trim(),
          ...Object.fromEntries(
            sizeChartDimensions.flatMap(({ key }) => {
              const { min, max } = measurements[key];
              return min === "" && max === ""
                ? []
                : [[key, { min, max }]];
            }),
          ),
        }))
        .filter((entry) => Object.keys(entry).length > 1),
      stock: normalizedSizes.reduce((total, size) => total + size.quantity, 0),
      badge: editingProduct?.badge ?? "",
      image: productImage,
      isActive: editingProduct?.isActive ?? true,
    };

    setProductSaving(true);
    setProductsError("");
    try {
      const response = await fetch(
        editingProduct ? `/api/products/${editingProduct.id}` : "/api/products",
        {
          method: editingProduct ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productDetails),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Product could not be saved.");
      }
      setProducts((current) =>
        editingProduct
          ? current.map((product) =>
              product.id === editingProduct.id ? result.product : product,
            )
          : [result.product, ...current],
      );
      setProductFormOpen(false);
      setEditingProduct(null);
      setProductFormError("");
    } catch (error) {
      console.error("Could not save an ODYN product.", error);
      setProductFormError(error.message || "Product could not be saved.");
    } finally {
      setProductSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}" from the catalog?`)) return;
    setProductsError("");
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Product could not be deleted.");
      }
      setProducts((current) => current.filter((entry) => entry.id !== product.id));
    } catch (error) {
      console.error("Could not delete an ODYN product.", error);
      setProductsError(error.message || "Product could not be deleted.");
    }
  }

  async function toggleProductStatus(product) {
    setProductsError("");
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Product status could not be updated.");
      }
      setProducts((current) =>
        current.map((entry) => entry.id === product.id ? result.product : entry),
      );
    } catch (error) {
      console.error("Could not update ODYN product status.", error);
      setProductsError(error.message || "Product status could not be updated.");
    }
  }

  function readLookImage(event, setImage, setError) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/webp"].includes(file.type)) {
      setError("Upload a transparent PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
        setError("");
      } else {
        setError("The selected image could not be read.");
      }
    };
    reader.onerror = () => setError("The selected image could not be read.");
    reader.readAsDataURL(file);
  }

  async function saveAvatar(event) {
    event.preventDefault();
    if (!avatarImage || selectedLookProducts.length === 0) {
      if (!avatarImage) setAvatarImageError("Upload the 3D avatar image.");
      if (selectedLookProducts.length === 0) {
        setAvatarFormError("Select at least one product from the catalog.");
      }
      return;
    }

    const formData = new FormData(event.currentTarget);
    setLookSaving(true);
    setAvatarFormError("");
    setLooksError("");
    try {
      const response = await fetch("/api/looks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("avatarName").trim(),
          department: avatarDepartment,
          image: avatarImage,
          productIds: selectedLookProductIds,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Avatar could not be saved.");
      }
      setAdminLooks((current) => [result.look, ...current]);
      setAvatarFormOpen(false);
      setAvatarImage("");
      setAvatarImageError("");
      setAvatarDepartment("");
      setAvatarProductSearch("");
      setSelectedLookProductIds([]);
      setAvatarFormError("");
    } catch (error) {
      console.error("Could not save an ODYN Try the Look avatar.", error);
      setAvatarFormError(error.message || "Avatar could not be saved.");
    } finally {
      setLookSaving(false);
    }
  }

  async function updateLookStatus(look) {
    setLooksError("");
    try {
      const response = await fetch(`/api/looks/${look.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !look.isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Avatar status could not be updated.");
      setAdminLooks((current) =>
        current.map((entry) => entry.id === look.id ? result.look : entry),
      );
    } catch (error) {
      console.error("Could not update ODYN avatar status.", error);
      setLooksError(error.message || "Avatar status could not be updated.");
    }
  }

  async function deleteLook(look) {
    if (!window.confirm(`Delete "${look.name}" from Try the Look?`)) return;
    setLooksError("");
    try {
      const response = await fetch(`/api/looks/${look.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Avatar could not be deleted.");
      setAdminLooks((current) => current.filter((entry) => entry.id !== look.id));
    } catch (error) {
      console.error("Could not delete an ODYN Try the Look avatar.", error);
      setLooksError(error.message || "Avatar could not be deleted.");
    }
  }

  function openAvatarForm() {
    setAvatarImage("");
    setAvatarImageError("");
    setAvatarDepartment("");
    setAvatarProductSearch("");
    setSelectedLookProductIds([]);
    setAvatarFormError("");
    setAvatarFormOpen(true);
  }

  function toggleLookProduct(productId) {
    setSelectedLookProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
    setAvatarFormError("");
  }

  async function savePromoCode(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPromoCodesError("");
    try {
      const { promoCode } = await adminRequest("/api/promos", {
        method: "POST",
        body: JSON.stringify({
          code: formData.get("code"),
          discountType: formData.get("discountType"),
          value: Number(formData.get("value")),
          expiresAt: formData.get("expiresAt"),
          usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
        }),
      });
      setPromoCodes((current) => [promoCode, ...current]);
      setPromoFormOpen(false);
    } catch (error) {
      console.error("Could not create an ODYN promo code.", error);
      setPromoCodesError(error.message || "Promo code could not be saved.");
    }
  }

  async function updatePromoCode(promoId, active) {
    try {
      const { promoCode } = await adminRequest(`/api/promos/${promoId}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      setPromoCodes((current) => current.map((promo) => promo.id === promoId ? promoCode : promo));
      setPromoCodesError("");
    } catch (error) {
      console.error("Could not update an ODYN promo code.", error);
      setPromoCodesError(error.message || "Promo code could not be updated.");
    }
  }

  async function deletePromoCode(promoId) {
    try {
      await adminRequest(`/api/promos/${promoId}`, { method: "DELETE" });
      setPromoCodes((current) => current.filter((promo) => promo.id !== promoId));
      setPromoCodesError("");
    } catch (error) {
      console.error("Could not delete an ODYN promo code.", error);
      setPromoCodesError(error.message || "Promo code could not be deleted.");
    }
  }

  async function savePoster(event) {
    event.preventDefault();
    if (!posterImage) {
      setPosterImageError("Upload a poster image.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setPostersError("");
    try {
      const { poster } = await adminRequest("/api/posters", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          placement: formData.get("placement"),
          image: posterImage,
          link: formData.get("link"),
        }),
      });
      setPosters((current) => [poster, ...current]);
      setPosterFormOpen(false);
      setPosterImage("");
      setPosterImageError("");
    } catch (error) {
      console.error("Could not create an ODYN poster.", error);
      setPostersError(error.message || "Poster could not be saved.");
    }
  }

  async function updatePosterStatus(posterId, active) {
    try {
      const { poster } = await adminRequest(`/api/posters/${posterId}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      setPosters((current) => current.map((entry) => entry.id === posterId ? poster : entry));
      setPostersError("");
    } catch (error) {
      console.error("Could not update an ODYN poster.", error);
      setPostersError(error.message || "Poster could not be updated.");
    }
  }

  async function deletePoster(posterId) {
    try {
      await adminRequest(`/api/posters/${posterId}`, { method: "DELETE" });
      setPosters((current) => current.filter((entry) => entry.id !== posterId));
      setPostersError("");
    } catch (error) {
      console.error("Could not delete an ODYN poster.", error);
      setPostersError(error.message || "Poster could not be deleted.");
    }
  }

  function handlePosterImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPosterImageError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPosterImageError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPosterImage(reader.result);
        setPosterImageError("");
      } else {
        setPosterImageError("The selected poster could not be read.");
      }
    };
    reader.onerror = () => setPosterImageError("The selected poster could not be read.");
    reader.readAsDataURL(file);
  }

  function exportOrders() {
    const rows = [
      ["Order", "Customer", "Email", "Date", "Items", "Total", "Status", "Payment"],
      ...orders.map((order) => [
        order.id,
        order.customer.name,
        order.customer.email,
        new Date(order.createdAt).toISOString(),
        order.items.reduce((count, item) => count + item.quantity, 0),
        formatTaka(order.total),
        order.status,
        order.paymentMethod,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const file = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = file;
    link.download = "odyn-orders.csv";
    link.click();
    URL.revokeObjectURL(file);
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSettingsSaved(false);
    try {
      const { settings } = await adminRequest("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(storeSettings),
      });
      setStoreSettings(settings);
      setSettingsSaved(true);
      setSettingsError("");
    } catch (error) {
      console.error("Could not save the ODYN store profile.", error);
      setSettingsError(error.message || "Could not save store settings.");
    }
  }

  async function updateOrderStatus(orderId, status) {
    setUpdatingOrderId(orderId);
    setOrdersError("");
    try {
      const { order } = await adminRequest("/api/admin/orders", {
        method: "PATCH",
        body: JSON.stringify({ orderId, status }),
      });
      setOrders((current) => current.map((entry) => entry.id === orderId ? order : entry));
    } catch (error) {
      console.error("Could not update an ODYN order.", error);
      setOrdersError(error.message || "Order could not be updated.");
    } finally {
      setUpdatingOrderId("");
    }
  }

  async function updateAccountRole(userId, role) {
    setUpdatingRoleId(userId);
    setRolesError("");
    try {
      const { user: updatedUser } = await adminRequest("/api/admin/roles", {
        method: "PATCH",
        body: JSON.stringify({ userId, role }),
      });
      setRoleData((current) => ({
        ...current,
        adminTotal: Math.max(0, (current.adminTotal ?? current.admins.length) + (role === "admin" ? 1 : -1)),
        customerTotal: Math.max(0, (current.customerTotal ?? current.customers.length) + (role === "customer" ? 1 : -1)),
        admins: role === "admin"
          ? [updatedUser, ...current.admins.filter((entry) => entry.id !== userId)]
          : current.admins.filter((entry) => entry.id !== userId),
        customers: role === "customer"
          ? [updatedUser, ...current.customers.filter((entry) => entry.id !== userId)]
          : current.customers.filter((entry) => entry.id !== userId),
      }));
    } catch (error) {
      console.error("Could not update an ODYN account role.", error);
      setRolesError(error.message || "Account role could not be updated.");
    } finally {
      setUpdatingRoleId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#242820]">
      <div className="flex min-h-screen">
        {mobileNavOpen && (
          <button className="fixed inset-0 z-30 bg-black/35 lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />
        )}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#202720] px-4 pb-5 pt-6 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between px-3">
            <Link href="/" aria-label="ODYN storefront home" className="inline-flex items-center">
              <Image src="/odyn-logo.png" alt="ODYN" width={104} height={54} className="h-9 w-auto brightness-0 invert" priority />
              <span className="ml-3 border-l border-white/20 pl-3 text-[9px] uppercase tracking-[.2em] text-white/55">Studio</span>
            </Link>
            <button onClick={() => setMobileNavOpen(false)} className="rounded-md p-1 text-white/60 hover:bg-white/10 lg:hidden" aria-label="Close menu"><X size={18} /></button>
          </div>

          <div className="mt-10 px-3 text-[9px] font-medium uppercase tracking-[.2em] text-white/40">Workspace</div>
          <nav className="mt-3 space-y-1" aria-label="Admin navigation">
            {navigation.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => selectPage(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${activePage === id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[.06] hover:text-white"}`}
                aria-current={activePage === id ? "page" : undefined}
              >
                <Icon size={17} strokeWidth={1.7} />
                <span className="flex-1">{label}</span>
                {count && <span className="rounded-md bg-[#b58b55] px-1.5 py-0.5 text-[10px] font-medium text-white">{count}</span>}
              </button>
            ))}
          </nav>

          <div className="mt-9 px-3 text-[9px] font-medium uppercase tracking-[.2em] text-white/40">Preferences</div>
          <button onClick={() => selectPage("settings")} className={`mt-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${activePage === "settings" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[.06] hover:text-white"}`}>
            <Settings size={17} strokeWidth={1.7} /> Settings
          </button>

          <div className="mt-auto">
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[.04] p-3.5">
              <div className="flex items-center gap-2 text-[11px] font-medium text-white/85"><CircleHelp size={15} /> Need a hand?</div>
              <p className="mt-1.5 text-[10px] leading-4 text-white/45">Our studio team is here to help you keep things running.</p>
              <a href="mailto:hello@odyn.studio" className="mt-3 inline-flex items-center gap-1 text-[10px] text-[#d4b68c] hover:text-white">Get in touch <ArrowRight size={12} /></a>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#eae8e0] bg-[#f7f6f2]/95 px-4 backdrop-blur sm:px-7 lg:px-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileNavOpen(true)} className="rounded-md p-2 text-[#62665c] hover:bg-[#eceae2] lg:hidden" aria-label="Open navigation"><Menu size={19} /></button>
              <span className="hidden text-[10px] uppercase tracking-[.14em] text-[#92958b] sm:inline">Workspace</span>
              <span className="hidden text-[#c5c2b9] sm:inline">/</span>
              <span className="text-xs font-medium">{pageTitle}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="hidden h-9 w-56 items-center gap-2 rounded-md border border-[#e7e5dd] bg-white px-2.5 sm:flex">
                <Search size={14} className="text-[#96988f]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#a7a89f]" aria-label="Search current view" />
                <kbd className="rounded border border-[#eceae3] px-1 text-[9px] text-[#92958b]"><Command size={9} /></kbd>
              </label>
              <button aria-label="Open admin notifications" onClick={() => selectPage("notifications")} className="relative rounded-md p-2 text-[#62665c] hover:bg-[#eceae2]" type="button"><Bell size={17} />{summary?.openOrderCount > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ae7446] ring-2 ring-[#f7f6f2]" />}</button>
              <span className="hidden h-5 border-l border-[#e4e1d8] sm:block" />
              <span className="hidden text-[10px] text-[#777a71] md:inline">November 2026</span>
              <span className="hidden h-5 border-l border-[#e4e1d8] sm:block" />
              <AdminAccountMenu onSelectPage={selectPage} />
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[.2em] text-[#9a8b73]">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <h1 className="mt-2 text-[27px] font-medium tracking-[-.05em] text-[#242820] sm:text-[32px]">{activePage === "overview" ? "Store overview" : pageTitle}</h1>
                <p className="mt-1 text-[12px] text-[#85877e]">{activePage === "overview" ? "Live totals from your product catalog and customer orders." : `Manage your ${pageTitle.toLowerCase()} and keep the studio in sync.`}</p>
              </div>
              {activePage === "products" && <button onClick={() => openProductForm()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#252c24] px-4 text-[11px] font-medium text-white transition hover:bg-[#3b4739]"><Plus size={15} /> Add product</button>}
              {activePage === "orders" && <button onClick={exportOrders} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e3e1d9] bg-white px-4 text-[11px] font-medium text-[#464940] hover:bg-[#faf9f6]"><CreditCard size={14} /> Export orders</button>}
              {activePage === "try-the-look" && <button onClick={openAvatarForm} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#252c24] px-4 text-[11px] font-medium text-white transition hover:bg-[#3b4739]"><Plus size={15} /> Add avatar</button>}
              {activePage === "promo-codes" && <button onClick={() => setPromoFormOpen((open) => !open)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#252c24] px-4 text-[11px] font-medium text-white transition hover:bg-[#3b4739]"><Plus size={15} /> Add promo code</button>}
              {activePage === "posters" && <button onClick={() => { setPosterImage(""); setPosterImageError(""); setPosterFormOpen((open) => !open); }} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#252c24] px-4 text-[11px] font-medium text-white transition hover:bg-[#3b4739]"><Plus size={15} /> Add poster</button>}
              {(activePage === "customers" || activePage === "settings") && <span className="rounded-md border border-[#e5e3db] bg-white px-3 py-2 text-[10px] text-[#777a71]">ODYN Studio · Online</span>}
            </div>

            {activePage === "overview" && (
              <>
                {summaryError && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{summaryError}</p>}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Order value", value: summary ? formatTaka(summary.orderValue) : "—", icon: CreditCard, note: "Non-cancelled orders" },
                    { label: "Orders", value: summary?.orderCount ?? "—", icon: ShoppingBag, note: `${summary?.openOrderCount ?? 0} open orders` },
                    { label: "Active products", value: summary?.activeProductCount ?? "—", icon: Package, note: `${summary?.lowStockCount ?? 0} low-stock products` },
                    { label: "Customers", value: summary?.customerCount ?? "—", icon: Users, note: "Registered customer accounts" },
                  ].map(({ label, value, icon: Icon, note }) => (
                    <article key={label} className="rounded-xl border border-[#eae8e0] bg-white p-4 sm:p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#777a71]">{label}</span>
                        <Icon size={16} strokeWidth={1.6} className="text-[#9a8b73]" />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-2">
                        <strong className="text-[25px] font-medium tracking-[-.05em]">{value}</strong>
                      </div>
                      <p className="mt-1 text-[10px] text-[#a0a197]">{note}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                  <article className="rounded-xl border border-[#eae8e0] bg-white p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-[13px] font-medium">Sales performance</h2>
                        <p className="mt-1 text-[10px] text-[#92958b]">Revenue from non-cancelled orders</p>
                      </div>
                      <div className="flex rounded-md border border-[#e8e6de] p-0.5" aria-label="Sales chart period">
                        {[
                          { id: "monthly", label: "Monthly" },
                          { id: "yearly", label: "Yearly" },
                        ].map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={salesPeriod === id}
                            onClick={() => setSalesPeriod(id)}
                            className={`rounded px-2.5 py-1.5 text-[10px] transition ${salesPeriod === id ? "bg-[#252c24] text-white" : "text-[#777a71] hover:bg-[#f4f2ec]"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 h-64" aria-label={`${salesPeriod} sales chart`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesChartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                          <CartesianGrid stroke="#f0eee8" vertical={false} />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#92958b", fontSize: 10 }}
                            dy={8}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#92958b", fontSize: 10 }}
                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k` : value}
                            width={42}
                          />
                          <Tooltip
                            formatter={(value) => [formatTaka(Number(value)), "Sales"]}
                            labelStyle={{ color: "#242820", fontSize: 11 }}
                            contentStyle={{ border: "1px solid #eae8e0", borderRadius: 8, fontSize: 11 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="sales"
                            name="Sales"
                            stroke="#9a7652"
                            strokeWidth={2}
                            dot={{ fill: "#9a7652", r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                    <div className="px-4 py-4 sm:px-5">
                      <h2 className="text-[13px] font-medium">Top selling products</h2>
                      <p className="mt-1 text-[10px] text-[#92958b]">Ranked by units sold</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[380px] text-left">
                        <thead className="bg-[#faf9f6] text-[9px] uppercase tracking-[.12em] text-[#92958b]">
                          <tr>
                            <th className="px-4 py-2.5 font-medium">Product</th>
                            <th className="px-3 py-2.5 text-right font-medium">Units</th>
                            <th className="px-4 py-2.5 text-right font-medium">Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0eee8]">
                          {summary?.topSellingProducts?.map((product, index) => (
                            <tr key={product.productId} className="hover:bg-[#fcfbf9]">
                              <td className="px-4 py-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="w-4 shrink-0 text-[10px] text-[#a0a197]">{index + 1}</span>
                                  {product.image ? (
                                    <Image src={product.image} alt="" width={32} height={38} unoptimized className="h-10 w-8 shrink-0 rounded bg-[#f1f0eb] object-cover" />
                                  ) : (
                                    <span className="h-10 w-8 shrink-0 rounded bg-[#f1f0eb]" aria-hidden="true" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="truncate text-[10px] font-medium text-[#383c34]">{product.name}</p>
                                    <p className="mt-0.5 truncate text-[9px] text-[#989a91]">{product.category || "Product"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-[10px] text-[#55584f]">{product.quantity}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-[10px] text-[#55584f]">{formatTaka(product.sales)}</td>
                            </tr>
                          ))}
                          {!summary?.topSellingProducts?.length && (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-[10px] text-[#92958b]">
                                {summary ? "Product sales will appear here after orders are placed." : "Loading product sales…"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <article className="rounded-xl border border-[#eae8e0] bg-white p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div><h2 className="text-[13px] font-medium">Catalog highlights</h2><p className="mt-1 text-[10px] text-[#92958b]">Recently added products</p></div>
                      <button onClick={() => selectPage("products")} className="text-[10px] text-[#85714f] hover:text-[#242820]">View all</button>
                    </div>
                    <div className="mt-4 divide-y divide-[#f0eee8]">
                      {products.slice(0, 4).map((product, index) => (
                        <div key={product.id} className="flex items-center gap-3 py-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f4f2ec] text-[10px] text-[#8b8b80]">{index + 1}</span>
                          <div className="h-10 w-9 shrink-0 rounded bg-[#f1f0eb]" style={{ backgroundImage: `url("${product.image}")`, backgroundPosition: "center", backgroundSize: "cover" }} />
                          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{product.name}</p><p className="mt-0.5 text-[10px] text-[#989a91]">{product.collection} · {product.category}</p></div>
                        </div>
                      ))}
                      {productsLoading && <p className="py-6 text-center text-[10px] text-[#92958b]">Loading products…</p>}
                      {!productsLoading && products.length === 0 && <p className="py-6 text-center text-[10px] text-[#92958b]">{productsError || "Products you add will appear here."}</p>}
                    </div>
                  </article>
                </div>

                <article className="mt-4 overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                  <div className="flex items-center justify-between px-4 py-4 sm:px-6">
                    <div><h2 className="text-[13px] font-medium">Recent orders</h2><p className="mt-1 text-[10px] text-[#92958b]">A look at your latest customer orders</p></div>
                    <button onClick={() => selectPage("orders")} className="inline-flex items-center gap-1 text-[10px] text-[#85714f] hover:text-[#242820]">All orders <ArrowRight size={12} /></button>
                  </div>
                  {summary?.recentOrders?.length ? (
                    <OrdersTable rows={summary.recentOrders} onStatusChange={updateOrderStatus} updatingOrderId={updatingOrderId} />
                  ) : (
                    <p className="px-5 py-10 text-center text-xs text-[#92958b]">{summaryError || "No orders have been placed yet."}</p>
                  )}
                </article>
              </>
            )}

            {activePage === "products" && (
              <article className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeece6] px-4 py-4 sm:px-6">
                  <div><h2 className="text-[13px] font-medium">{departmentFilter ? `${departmentFilter} products` : "All products"} <span className="ml-1 text-[10px] font-normal text-[#9a9b91]">{filteredProducts.length}</span></h2><p className="mt-1 text-[10px] text-[#92958b]">Manage your catalog and inventory</p></div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <label className="flex h-8 items-center gap-2 rounded-md border border-[#e8e6de] bg-white px-2.5 sm:w-40">
                      <span className="sr-only">Filter by department</span>
                      <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label="Filter products by department" className="w-full bg-transparent text-[10px] text-[#55584f] outline-none">
                        <option value="">All departments</option>
                        {productDepartments.map((department) => <option key={department} value={department}>{department}</option>)}
                      </select>
                    </label>
                    <label className="flex h-8 items-center gap-2 rounded-md border border-[#e8e6de] px-2.5 sm:w-52"><Search size={13} className="text-[#96988f]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." className="w-full bg-transparent text-[10px] outline-none placeholder:text-[#a7a89f]" /></label>
                  </div>
                </div>
                {productsError && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-[11px] text-rose-800 sm:px-6">{productsError}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1020px] text-left">
                    <thead className="bg-[#faf9f6] text-[9px] uppercase tracking-[.12em] text-[#92958b]"><tr><th className="px-5 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Subcategory</th><th className="px-4 py-3 font-medium">Price</th><th className="px-4 py-3 font-medium">Size / quantity</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
                    <tbody className="divide-y divide-[#f0eee8]">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className={`transition-colors hover:bg-[#fcfbf9] ${product.isActive === false ? "opacity-55" : ""}`}>
                          <td className="px-5 py-3"><div className="flex items-center gap-3"><Image src={product.image} alt="" width={40} height={48} unoptimized className="h-12 w-10 shrink-0 rounded bg-[#f1f0eb] object-cover" /><div><p className="max-w-40 truncate text-[11px] font-medium">{product.name}</p><p className="mt-0.5 text-[10px] text-[#989a91]">{product.collection}</p></div></div></td>
                          <td className="px-4 py-3 text-[10px] text-[#74776d]">{product.taxonomy?.section ?? product.category ?? "—"}</td>
                          <td className="px-4 py-3"><p className="text-[10px] text-[#55584f]">{product.taxonomy?.category ?? "—"}</p>{product.taxonomy?.item && <p className="mt-0.5 text-[9px] text-[#989a91]">{product.taxonomy.item}</p>}</td>
                          <td className="px-4 py-3 text-[10px] text-[#454940]">{product.discountPercent > 0 ? <><span className="font-medium">{formatTaka(Math.round(product.price * (1 - product.discountPercent / 100)))}</span><span className="ml-1.5 text-[9px] text-[#92958b] line-through">{formatTaka(product.price)}</span><span className="ml-1.5 rounded bg-rose-50 px-1 py-0.5 text-[9px] text-rose-700">-{product.discountPercent}%</span></> : formatTaka(product.price)}</td>
                          <td className="px-4 py-3"><div className="flex max-w-[260px] flex-wrap gap-1">{product.sizes?.length ? product.sizes.map(({ size, quantity }) => <span key={size} className="rounded bg-[#f4f2ec] px-1.5 py-1 text-[9px] text-[#62665c]">{size}: <strong className="font-medium text-[#383c34]">{quantity}</strong></span>) : <span className="text-[10px] text-[#989a91]">Size not set · {product.stock} total</span>}</div></td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] ${product.isActive === false ? "bg-slate-100 text-slate-600" : product.stock === 0 ? "bg-rose-50 text-rose-700" : product.stock < 10 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{product.isActive === false ? "Paused" : product.stock === 0 ? "Out of stock" : product.stock < 10 ? "Low stock" : "Active"}</span></td>
                          <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                            <button onClick={() => openProductForm(product)} className="rounded px-2 py-1.5 text-[10px] text-[#62665c] hover:bg-[#f1f0eb]" aria-label={`Edit ${product.name}`}>Edit</button>
                            <button onClick={() => toggleProductStatus(product)} className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-[10px] text-[#62665c] hover:bg-[#f1f0eb]" aria-label={`${product.isActive === false ? "Resume" : "Pause"} ${product.name}`} title={product.isActive === false ? "Resume product" : "Pause product"}>{product.isActive === false ? <Play size={12} /> : <Pause size={12} />}{product.isActive === false ? "Resume" : "Pause"}</button>
                            <button onClick={() => deleteProduct(product)} className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-[10px] text-rose-700 hover:bg-rose-50" aria-label={`Delete ${product.name}`}><Trash2 size={12} /> Delete</button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!productsLoading && filteredProducts.length === 0 && <p className="px-5 py-12 text-center text-xs text-[#92958b]">{productsError ? "Products could not be loaded." : products.length === 0 ? "No products yet. Add a product to publish it to the storefront." : "No products match your search."}</p>}
                  {productsLoading && <p className="px-5 py-12 text-center text-xs text-[#92958b]">Loading products…</p>}
                </div>
              </article>
            )}

            {activePage === "orders" && (
              <article className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeece6] px-4 py-4 sm:px-6">
                  <div><h2 className="text-[13px] font-medium">All orders <span className="ml-1 text-[10px] font-normal text-[#9a9b91]">{ordersTotal}</span></h2><p className="mt-1 text-[10px] text-[#92958b]">Track and fulfill customer orders</p></div>
                  <label className="flex h-8 w-full items-center gap-2 rounded-md border border-[#e8e6de] px-2.5 sm:w-52"><Search size={13} className="text-[#96988f]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders..." className="w-full bg-transparent text-[10px] outline-none placeholder:text-[#a7a89f]" /></label>
                </div>
                {ordersError && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-[11px] text-rose-800 sm:px-6">{ordersError}</p>}
                {ordersLoading ? (
                  <p className="px-5 py-12 text-center text-xs text-[#92958b]">Loading orders…</p>
                ) : orders.length ? (
                  <OrdersTable rows={orders} onStatusChange={updateOrderStatus} updatingOrderId={updatingOrderId} />
                ) : (
                  <p className="px-5 py-12 text-center text-xs text-[#92958b]">{ordersError ? "Orders could not be loaded." : search ? "No orders match your search." : "No customer orders have been placed yet."}</p>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-[#eeece6] px-4 py-3 sm:px-6">
                  <p className="text-[10px] text-[#92958b]">{ordersTotal ? `${ordersOffset + 1}–${Math.min(ordersOffset + 25, ordersTotal)} of ${ordersTotal} orders` : "0 orders"}</p>
                  <div className="flex gap-2">
                    <button disabled={ordersOffset === 0 || ordersLoading} onClick={() => setOrdersOffset((offset) => Math.max(0, offset - 25))} className="rounded-md border border-[#e8e6de] px-3 py-1.5 text-[10px] text-[#55584f] disabled:opacity-40">Previous</button>
                    <button disabled={ordersOffset + 25 >= ordersTotal || ordersLoading} onClick={() => setOrdersOffset((offset) => offset + 25)} className="rounded-md border border-[#e8e6de] px-3 py-1.5 text-[10px] text-[#55584f] disabled:opacity-40">Next</button>
                  </div>
                </div>
              </article>
            )}

            {activePage === "try-the-look" && (
              <section aria-label="Try the Look collection">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eae8e0] bg-white px-4 py-4 sm:px-6">
                  <div>
                    <h2 className="text-[13px] font-medium">Styled looks <span className="ml-1 text-[10px] font-normal text-[#9a9b91]">{adminLooks.length}</span></h2>
                    <p className="mt-1 text-[10px] text-[#92958b]">Manage database-backed avatars featured in the storefront carousel.</p>
                  </div>
                  <Link href="/" className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e3db] px-3 py-2 text-[10px] font-medium text-[#55584f] transition hover:bg-[#faf9f6]">View storefront <ArrowRight size={13} /></Link>
                </div>
                {looksError && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{looksError}</p>}
                {looksLoading ? (
                  <p className="rounded-xl border border-[#eae8e0] bg-white px-5 py-12 text-center text-xs text-[#92958b]">Loading avatars…</p>
                ) : adminLooks.length === 0 ? (
                  <p className="rounded-xl border border-[#eae8e0] bg-white px-5 py-12 text-center text-xs text-[#92958b]">No avatars yet. Add one to feature it in Try the Look on the storefront.</p>
                ) : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {adminLooks.map((look) => {
                    const wornProducts = look.products ?? [];

                    return (
                      <article key={look.id} className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                        <div className="relative aspect-[4/3] bg-[#f3f1eb]">
                          <Image src={look.image} alt={look.name} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-contain p-3" />
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-medium text-[#55584f] backdrop-blur">{look.gender}</span>
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="text-[12px] font-medium">{look.name}</p><p className="mt-1 text-[10px] text-[#92958b]">Look {look.id}</p></div>
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${look.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{look.isActive ? "Live" : "Paused"}</span>
                          </div>
                          <div className="mt-4 border-t border-[#f0eee8] pt-3">
                            <p className="text-[9px] uppercase tracking-[.12em] text-[#9a9b91]">Wearing {wornProducts.length} {wornProducts.length === 1 ? "product" : "products"}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {wornProducts.map((product) => (
                                <span key={product.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#f7f6f2] py-1 pl-1 pr-2">
                                  {product.image && <Image src={product.image} alt="" width={24} height={28} unoptimized className="h-7 w-6 shrink-0 rounded object-cover" />}
                                  <span className="max-w-32 truncate text-[9px] text-[#55584f]">{product.name}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-1 border-t border-[#f0eee8] pt-3">
                            <button onClick={() => updateLookStatus(look)} className="rounded px-2 py-1.5 text-[10px] text-[#62665c] hover:bg-[#f1f0eb]">{look.isActive ? "Pause" : "Resume"}</button>
                            <button onClick={() => deleteLook(look)} className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-[10px] text-rose-700 hover:bg-rose-50"><Trash2 size={12} /> Delete</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>}
              </section>
            )}

            {activePage === "promo-codes" && (
              <section aria-label="Promo code management">
                {promoCodesError && (
                  <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800" role="alert">
                    {promoCodesError}
                  </p>
                )}
                {promoFormOpen && (
                  <form onSubmit={savePromoCode} className="mb-4 rounded-xl border border-[#eae8e0] bg-white p-4 sm:p-6">
                    <div className="mb-4"><h2 className="text-[13px] font-medium">Create promo code</h2><p className="mt-1 text-[10px] text-[#92958b]">Set a discount and optional expiry or usage limit.</p></div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-[10px] text-[#777a71]">Code
                        <input name="code" required maxLength={24} pattern="[A-Za-z0-9_-]+" onInput={(event) => event.currentTarget.setCustomValidity("")} placeholder="e.g. ODYN10" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] uppercase text-[#242820] outline-none placeholder:normal-case placeholder:text-[#a7a89f] focus:border-[#a47c47]" />
                      </label>
                      <label className="text-[10px] text-[#777a71]">Discount type
                        <select name="discountType" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-white px-2.5 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]"><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (৳)</option></select>
                      </label>
                      <label className="text-[10px] text-[#777a71]">Discount value
                        <input name="value" type="number" min="1" step="1" required onInput={(event) => event.currentTarget.setCustomValidity("")} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" />
                      </label>
                      <label className="text-[10px] text-[#777a71]">Expiry date
                        <input name="expiresAt" type="date" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" />
                      </label>
                      <label className="text-[10px] text-[#777a71] sm:col-span-2">Usage limit <span className="text-[#a0a197]">(optional)</span>
                        <input name="usageLimit" type="number" min="1" step="1" placeholder="Unlimited" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none placeholder:text-[#a7a89f] focus:border-[#a47c47]" />
                      </label>
                      <div className="flex items-end gap-2 sm:col-span-2">
                        <button type="button" onClick={() => setPromoFormOpen(false)} className="h-9 rounded-md border border-[#e8e6de] px-3 text-[10px] text-[#62665c] hover:bg-[#faf9f6]">Cancel</button>
                        <button type="submit" className="h-9 rounded-md bg-[#252c24] px-4 text-[10px] font-medium text-white hover:bg-[#3b4739]">Create code</button>
                      </div>
                    </div>
                  </form>
                )}
                <article className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                  <div className="border-b border-[#eeece6] px-4 py-4 sm:px-6"><h2 className="text-[13px] font-medium">Promo codes <span className="ml-1 text-[10px] font-normal text-[#9a9b91]">{promoCodes.length}</span></h2><p className="mt-1 text-[10px] text-[#92958b]">Manage discounts available to your customers.</p></div>
                  {promoCodesLoading ? (
                    <p className="px-5 py-12 text-center text-xs text-[#92958b]">Loading promo codes…</p>
                  ) : promoCodes.length === 0 ? (
                    <p className="px-5 py-12 text-center text-xs text-[#92958b]">No promo codes yet. Create one to offer a store discount.</p>
                  ) : (
                    <div className="divide-y divide-[#f0eee8]">
                      {promoCodes.map((promo) => (
                        <div key={promo.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f2ec] text-[#8b7654]"><Ticket size={17} /></span>
                          <div className="min-w-[140px] flex-1"><p className="font-mono text-[11px] font-semibold tracking-wide">{promo.code}</p><p className="mt-1 text-[10px] text-[#92958b]">{promo.discountType === "percent" ? `${promo.value}% off` : `${formatTaka(promo.value)} off`}{promo.expiresAt ? ` · Expires ${promo.expiresAt}` : " · No expiry"}</p></div>
                          <span className="text-[10px] text-[#74776d]">{promo.uses}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""} uses</span>
                          <span className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${promo.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{promo.active ? "Active" : "Paused"}</span>
                          <div className="flex items-center gap-1"><button onClick={() => updatePromoCode(promo.id, !promo.active)} className="rounded px-2 py-1.5 text-[10px] text-[#62665c] hover:bg-[#f1f0eb]">{promo.active ? "Pause" : "Resume"}</button><button onClick={() => deletePromoCode(promo.id)} className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-[10px] text-rose-700 hover:bg-rose-50"><Trash2 size={12} /> Delete</button></div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </section>
            )}

            {activePage === "posters" && (
              <section aria-label="Poster management">
                {postersError && (
                  <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800" role="alert">
                    {postersError}
                  </p>
                )}
                {posterFormOpen && (
                  <form onSubmit={savePoster} className="mb-4 rounded-xl border border-[#eae8e0] bg-white p-4 sm:p-6">
                    <div className="mb-4"><h2 className="text-[13px] font-medium">Create poster</h2><p className="mt-1 text-[10px] text-[#92958b]">Add a promotional image to a storefront placement.</p></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-[10px] text-[#777a71]">Poster title
                        <input name="title" required maxLength={80} placeholder="e.g. New season collection" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none placeholder:text-[#a7a89f] focus:border-[#a47c47]" />
                      </label>
                      <label className="text-[10px] text-[#777a71]">Placement
                        <select name="placement" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-white px-2.5 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]"><option value="Hero">Hero component</option><option value="Pop-up">Pop-up</option></select>
                      </label>
                      <label className="text-[10px] text-[#777a71] sm:col-span-2">Poster image
                        <span className="mt-1.5 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[#dcd9cf] p-3">
                          {posterImage ? <Image src={posterImage} alt="Poster preview" width={120} height={72} unoptimized className="h-[72px] w-[120px] rounded-md bg-[#f1f0eb] object-cover" /> : <span className="flex h-[72px] w-[120px] items-center justify-center rounded-md bg-[#f1f0eb] text-[#9a9b91]"><ImagePlus size={20} /></span>}
                          <span className="min-w-[180px] flex-1"><span className="block text-[11px] font-medium text-[#464940]">Upload poster artwork</span><span className="mt-1 block text-[10px] text-[#92958b]">JPG, PNG, or WebP · up to 5 MB</span><input name="posterImage" type="file" accept="image/jpeg,image/png,image/webp" required={!posterImage} onChange={handlePosterImage} className="mt-2 block w-full text-[10px] text-[#777a71] file:mr-2 file:rounded-md file:border-0 file:bg-[#efeee9] file:px-2.5 file:py-1.5 file:text-[10px] file:font-medium file:text-[#454940]" /></span>
                        </span>
                        {posterImageError && <span role="alert" className="mt-1.5 block text-[10px] text-rose-700">{posterImageError}</span>}
                      </label>
                      <label className="text-[10px] text-[#777a71] sm:col-span-2">Link URL <span className="text-[#a0a197]">(optional)</span>
                        <input name="link" type="url" placeholder="https://..." className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none placeholder:text-[#a7a89f] focus:border-[#a47c47]" />
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPosterFormOpen(false)} className="rounded-md border border-[#e8e6de] px-3.5 py-2 text-[10px] text-[#62665c] hover:bg-[#faf9f6]">Cancel</button><button type="submit" className="rounded-md bg-[#252c24] px-4 py-2 text-[10px] font-medium text-white hover:bg-[#3b4739]">Create poster</button></div>
                  </form>
                )}
                {postersLoading ? (
                  <p className="rounded-xl border border-[#eae8e0] bg-white px-5 py-12 text-center text-xs text-[#92958b]">Loading posters…</p>
                ) : posters.length === 0 ? (
                  <article className="rounded-xl border border-[#eae8e0] bg-white px-5 py-12 text-center"><PanelsTopLeft size={25} className="mx-auto text-[#a0a197]" /><h2 className="mt-3 text-[13px] font-medium">No posters yet</h2><p className="mt-1 text-[10px] text-[#92958b]">Create a poster to prepare promotional artwork for the storefront.</p></article>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {posters.map((poster) => (
                      <article key={poster.id} className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                        <div className="relative aspect-[16/9] bg-[#f1f0eb]"><Image src={poster.image} alt={poster.title} fill unoptimized className="object-cover" /></div>
                        <div className="p-4"><div className="flex items-start justify-between gap-2"><div><h2 className="text-[12px] font-medium">{poster.title}</h2><p className="mt-1 text-[10px] text-[#92958b]">{poster.placement === "Hero" ? "Hero component" : poster.placement}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${poster.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{poster.active ? "Active" : "Paused"}</span></div>{poster.link && <p className="mt-2 truncate text-[9px] text-[#92958b]">{poster.link}</p>}<div className="mt-3 flex justify-end gap-1 border-t border-[#f0eee8] pt-3"><button onClick={() => updatePosterStatus(poster.id, !poster.active)} className="rounded px-2 py-1.5 text-[10px] text-[#62665c] hover:bg-[#f1f0eb]">{poster.active ? "Pause" : "Resume"}</button><button onClick={() => deletePoster(poster.id)} className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-[10px] text-rose-700 hover:bg-rose-50"><Trash2 size={12} /> Delete</button></div></div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activePage === "customers" && (
              <article className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eeece6] px-4 py-4 sm:px-6">
                  <div><h2 className="text-[13px] font-medium">Customer accounts <span className="ml-1 text-[10px] font-normal text-[#92958b]">{customersTotal}</span></h2><p className="mt-1 text-[10px] text-[#92958b]">Pause accounts until resumed, or block sign-in until they are unblocked.</p></div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <select aria-label="Search customers by" value={customerSearchField} onChange={(event) => { setCustomerSearchField(event.target.value); setCustomersOffset(0); }} className="h-9 rounded-md border border-[#e8e6de] bg-white px-2 text-[10px] text-[#55584f] outline-none focus:border-[#a47c47]"><option value="email">Email</option><option value="name">Name</option></select>
                    <input aria-label="Search customer accounts" value={customerSearch} onChange={(event) => { setCustomerSearch(event.target.value); setCustomersOffset(0); }} placeholder="Search customers" className="h-9 min-w-0 flex-1 rounded-md border border-[#e8e6de] px-3 text-[10px] outline-none placeholder:text-[#a7a89f] focus:border-[#a47c47] sm:w-48" />
                  </div>
                </div>
                {customersError && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-[11px] text-rose-800 sm:px-6">{customersError}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-[#faf9f6] text-[9px] uppercase tracking-[.12em] text-[#92958b]"><tr><th className="px-5 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Joined</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Account actions</th></tr></thead>
                    <tbody className="divide-y divide-[#f0eee8]">
                      {customersLoading ? (
                        <tr><td colSpan={4} className="px-5 py-12 text-center text-[11px] text-[#92958b]">Loading customer accounts…</td></tr>
                      ) : customers.length === 0 ? (
                        <tr><td colSpan={4} className="px-5 py-12 text-center text-[11px] text-[#92958b]">{customerSearch ? "No matching customer accounts." : "No customer accounts yet."}</td></tr>
                      ) : customers.map((customer) => {
                        const name = customer.name || "Customer";
                        const isPaused = customer.banned && customer.banReason === "ODYN_ACCOUNT_PAUSED";
                        const status = !customer.banned ? "Active" : isPaused ? "Paused" : "Blocked";
                        const statusStyle = !customer.banned
                          ? "bg-emerald-50 text-emerald-700"
                          : isPaused
                            ? "bg-amber-50 text-amber-800"
                            : "bg-rose-50 text-rose-700";
                        const joinedAt = new Date(customer.createdAt);
                        return (
                          <tr key={customer.id} className="hover:bg-[#fcfbf9]">
                            <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eee8dc] text-[9px] font-medium text-[#78694f]">{initials(name)}</span><div><p className="text-[10px] font-medium text-[#383c34]">{name}</p><p className="mt-0.5 text-[10px] text-[#92958b]">{customer.email}</p></div></div></td>
                            <td className="px-4 py-3 text-[10px] text-[#74776d]">{Number.isNaN(joinedAt.getTime()) ? "—" : joinedAt.toLocaleDateString()}</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${statusStyle}`}>{status}</span></td>
                            <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                              {!customer.banned ? (
                                <>
                                  <button disabled={updatingCustomerId === customer.id} onClick={() => updateCustomerStatus(customer.id, "paused")} className="inline-flex items-center gap-1 rounded-md border border-[#e8e6de] px-2.5 py-1.5 text-[9px] font-medium text-[#62665c] hover:bg-[#f5f4ef] disabled:opacity-50"><Pause size={11} /> Pause</button>
                                  <button disabled={updatingCustomerId === customer.id} onClick={() => updateCustomerStatus(customer.id, "blocked")} className="rounded-md border border-rose-200 px-2.5 py-1.5 text-[9px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Block</button>
                                </>
                              ) : (
                                <>
                                  <button disabled={updatingCustomerId === customer.id} onClick={() => updateCustomerStatus(customer.id, "active")} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-[9px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Play size={11} /> {isPaused ? "Resume" : "Unblock"}</button>
                                  {isPaused ? (
                                    <button disabled={updatingCustomerId === customer.id} onClick={() => updateCustomerStatus(customer.id, "blocked")} className="rounded-md border border-rose-200 px-2.5 py-1.5 text-[9px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Block</button>
                                  ) : (
                                    <button disabled={updatingCustomerId === customer.id} onClick={() => updateCustomerStatus(customer.id, "paused")} className="inline-flex items-center gap-1 rounded-md border border-[#e8e6de] px-2.5 py-1.5 text-[9px] font-medium text-[#62665c] hover:bg-[#f5f4ef] disabled:opacity-50"><Pause size={11} /> Pause</button>
                                  )}
                                </>
                              )}
                              {updatingCustomerId === customer.id && <span className="self-center text-[9px] text-[#92958b]">Saving…</span>}
                            </div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eeece6] px-4 py-3 sm:px-6">
                  <p className="text-[10px] text-[#92958b]">{customersTotal ? `${customersOffset + 1}–${Math.min(customersOffset + customerPageSize, customersTotal)} of ${customersTotal} accounts` : "0 accounts"}</p>
                  <div className="flex gap-2">
                    <button disabled={customersOffset === 0 || customersLoading} onClick={() => setCustomersOffset((offset) => Math.max(0, offset - customerPageSize))} className="rounded-md border border-[#e8e6de] px-3 py-1.5 text-[10px] text-[#55584f] hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                    <button disabled={customersOffset + customerPageSize >= customersTotal || customersLoading} onClick={() => setCustomersOffset((offset) => offset + customerPageSize)} className="rounded-md border border-[#e8e6de] px-3 py-1.5 text-[10px] text-[#55584f] hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                  </div>
                </div>
              </article>
            )}

            {activePage === "notifications" && (
              <section aria-label="Admin notifications" className="space-y-3">
                {notificationsError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{notificationsError}</p>}
                {notifications.length ? notifications.map((notification) => (
                  <article key={notification.id} className="flex items-start gap-3 rounded-xl border border-[#eae8e0] bg-white p-4">
                    <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${notification.type === "order" ? "bg-amber-500" : "bg-rose-500"}`} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-medium">{notification.title}</h2>
                      <p className="mt-1 text-[10px] text-[#74776d]">{notification.description}</p>
                      {notification.createdAt && <p className="mt-1 text-[9px] text-[#92958b]">{new Date(notification.createdAt).toLocaleString()}</p>}
                    </div>
                    <button className="text-[9px] font-semibold uppercase tracking-wide text-[#85714f] underline underline-offset-4" onClick={() => selectPage(notification.type === "order" ? "orders" : "products")} type="button">View</button>
                  </article>
                )) : !notificationsError ? (
                  <p className="rounded-xl border border-dashed border-[#d8d7ce] bg-white p-10 text-center text-sm text-[#74776d]">No open-order or low-stock notifications right now.</p>
                ) : null}
              </section>
            )}

            {activePage === "roles" && (
              <section className="space-y-4">
                {rolesError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{rolesError}</p>}
                <article className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                  <div className="border-b border-[#eeece6] px-4 py-4 sm:px-6"><h2 className="text-[13px] font-medium">Administrators <span className="ml-1 text-[10px] font-normal text-[#92958b]">{roleData.adminTotal ?? roleData.admins.length}</span></h2><p className="mt-1 text-[10px] text-[#92958b]">Grant or revoke access for registered accounts. At least one administrator must remain.</p></div>
                  <div className="divide-y divide-[#f0eee8]">
                    {roleData.admins.map((member) => <RoleRow key={member.id} member={member} updating={updatingRoleId === member.id} isCurrentUser={member.id === sessionData?.user?.id} onChange={updateAccountRole} />)}
                    {!roleData.admins.length && <p className="p-6 text-center text-xs text-[#74776d]">No administrator accounts were returned.</p>}
                  </div>
                </article>
                <article className="overflow-hidden rounded-xl border border-[#eae8e0] bg-white">
                  <div className="border-b border-[#eeece6] px-4 py-4 sm:px-6"><h2 className="text-[13px] font-medium">Customer accounts eligible for admin access <span className="ml-1 text-[10px] font-normal text-[#92958b]">{roleData.customerTotal ?? roleData.customers.length}</span></h2><p className="mt-1 text-[10px] text-[#92958b]">Only promote trusted users. Role changes take effect immediately.</p></div>
                  <div className="divide-y divide-[#f0eee8]">
                    {roleData.customers.map((member) => <RoleRow key={member.id} member={member} updating={updatingRoleId === member.id} isCurrentUser={member.id === sessionData?.user?.id} onChange={updateAccountRole} />)}
                    {!roleData.customers.length && <p className="p-6 text-center text-xs text-[#74776d]">No customer accounts were returned.</p>}
                  </div>
                  {(roleData.customerTotal > roleData.limit || roleData.adminTotal > roleData.limit) && <p className="border-t border-[#eeece6] px-4 py-3 text-[10px] text-[#74776d]">Showing the most recently created {roleData.limit} accounts per role.</p>}
                </article>
              </section>
            )}

            {activePage === "settings" && (
              <div className="max-w-2xl space-y-4">
              <form onSubmit={saveSettings} className="rounded-xl border border-[#eae8e0] bg-white p-5 sm:p-7">
                <h2 className="text-[13px] font-medium">Store profile</h2><p className="mt-1 text-[10px] text-[#92958b]">The details customers see when they visit your store.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="text-[10px] text-[#777a71]">Store name<input value={storeSettings.name} onChange={(event) => { setStoreSettings({ ...storeSettings, name: event.target.value }); setSettingsSaved(false); }} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
                  <label className="text-[10px] text-[#777a71]">Contact email<input type="email" value={storeSettings.email} onChange={(event) => { setStoreSettings({ ...storeSettings, email: event.target.value }); setSettingsSaved(false); }} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
                  <label className="text-[10px] text-[#777a71] sm:col-span-2">Store description<textarea value={storeSettings.description} onChange={(event) => { setStoreSettings({ ...storeSettings, description: event.target.value }); setSettingsSaved(false); }} rows={3} className="mt-1.5 w-full resize-y rounded-md border border-[#e8e6de] px-3 py-2 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
                </div>
                <button type="submit" className="mt-5 rounded-md bg-[#252c24] px-4 py-2.5 text-[10px] font-medium text-white hover:bg-[#3b4739]">Save changes</button>
                {settingsSaved && <p role="status" className="ml-3 inline text-[10px] text-emerald-700">Saved to MongoDB.</p>}
                {settingsError && <p role="alert" className="mt-3 text-[10px] text-rose-700">{settingsError}</p>}
              </form>
              <article className="rounded-xl border border-[#eae8e0] bg-white p-5 sm:p-7">
                <h2 className="text-[13px] font-medium">Payment configuration</h2>
                <p className="mt-1 text-[10px] text-[#92958b]">Payment credentials remain on the server and are never shown in this dashboard.</p>
                <div className="mt-5 space-y-3 text-xs">
                  <p className="flex items-center justify-between gap-3"><span>Cash on delivery</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] text-emerald-700">Enabled</span></p>
                  <p className="flex items-center justify-between gap-3"><span>SSLCommerz online payment</span><span className={`rounded-full px-2.5 py-1 text-[9px] ${paymentSettings?.sslcommerzConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{paymentSettings?.sslcommerzConfigured ? `Enabled · ${paymentSettings.sslcommerzMode}` : "Not configured"}</span></p>
                  {!paymentSettings?.sslcommerzConfigured && <p className="leading-5 text-[#74776d]">Set <code>SSLCOMMERZ_STORE_ID</code>, <code>SSLCOMMERZ_STORE_PASSWORD</code>, and <code>SSLCOMMERZ_IS_LIVE</code> in the server environment, then restart the app.</p>}
                </div>
              </article>
              <AdminAccountSettings />
              </div>
            )}

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#eae8e0] pt-4 text-[9px] text-[#a0a197]">
              <span>© 2025 ODYN Studio. Admin workspace.</span><span>Made with intention.</span>
            </footer>
          </div>
        </section>
        {avatarFormOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#171b16]/45 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAvatarFormOpen(false);
            }}
          >
            <form
              onSubmit={saveAvatar}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6"
              aria-labelledby="avatar-form-title"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 id="avatar-form-title" className="text-[16px] font-medium">Add an avatar</h2>
                  <p className="mt-1 text-[11px] text-[#92958b]">Create a new outfit for the Try the Look carousel.</p>
                </div>
                <button type="button" onClick={() => setAvatarFormOpen(false)} className="rounded-md p-1 text-[#777a71] hover:bg-[#f1f0eb]" aria-label="Close form"><X size={17} /></button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-[10px] text-[#777a71]">Avatar name
                  <input name="avatarName" required maxLength={60} placeholder="e.g. Studio Streetwear" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none placeholder:text-[#a7a89f] focus:border-[#a47c47]" />
                </label>
                <label className="text-[10px] text-[#777a71]">Department
                  <select name="department" required value={avatarDepartment} onChange={(event) => { setAvatarDepartment(event.target.value); setSelectedLookProductIds([]); setAvatarProductSearch(""); setAvatarFormError(""); }} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-white px-2.5 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]">
                    <option value="" disabled>Select department</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                  </select>
                </label>

                <label className="text-[10px] text-[#777a71] sm:col-span-2">3D avatar image
                  <span className="mt-1.5 grid gap-3 rounded-lg border border-dashed border-[#dcd9cf] p-3 sm:grid-cols-[120px_1fr]">
                    <span
                      className="relative flex h-36 items-center justify-center overflow-hidden rounded-md"
                      style={{
                        backgroundColor: "#f7f6f2",
                        backgroundImage: "linear-gradient(45deg, #e9e7df 25%, transparent 25%), linear-gradient(-45deg, #e9e7df 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e9e7df 75%), linear-gradient(-45deg, transparent 75%, #e9e7df 75%)",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
                        backgroundSize: "16px 16px",
                      }}
                    >
                      {avatarImage ? <Image src={avatarImage} alt="Avatar preview" fill unoptimized className="object-contain" /> : <ImagePlus size={22} className="text-[#9a9b91]" />}
                    </span>
                    <span className="self-center">
                      <span className="block text-[11px] font-medium text-[#464940]">Transparent background required</span>
                      <span className="mt-1 block text-[10px] leading-4 text-[#92958b]">Upload a front-facing 3D outfit render as PNG or WebP with transparency. Maximum 5 MB.</span>
                      <input name="avatarImage" type="file" accept="image/png,image/webp" required={!avatarImage} onChange={(event) => readLookImage(event, setAvatarImage, setAvatarImageError)} className="mt-2 block w-full text-[10px] text-[#777a71] file:mr-2 file:rounded-md file:border-0 file:bg-[#efeee9] file:px-2.5 file:py-1.5 file:text-[10px] file:font-medium file:text-[#454940]" />
                      {avatarImageError && <span role="alert" className="mt-1.5 block text-[10px] text-rose-700">{avatarImageError}</span>}
                    </span>
                  </span>
                </label>

                <div className="sm:col-span-2">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium text-[#777a71]">Products worn by avatar</p>
                      <p className="mt-1 text-[9px] text-[#a0a197]">Choose multiple products from the catalog. Product names and images are filled from inventory.</p>
                    </div>
                    <span className="rounded-full bg-[#f4f2ec] px-2.5 py-1 text-[9px] text-[#62665c]">{selectedLookProducts.length} selected</span>
                  </div>
                  {selectedLookProducts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedLookProducts.map((product) => (
                        <button key={product.id} type="button" onClick={() => toggleLookProduct(product.id)} className="inline-flex max-w-full items-center gap-2 rounded-md border border-[#e8e6de] bg-[#faf9f6] p-1.5 pr-2.5 text-left hover:border-[#cfc9bb]" aria-label={`Remove ${product.name}`}>
                          <Image src={product.image} alt="" width={28} height={32} unoptimized className="h-8 w-7 shrink-0 rounded object-cover" />
                          <span className="max-w-40 truncate text-[9px] text-[#55584f]">{product.name}</span>
                          <X size={12} className="shrink-0 text-[#92958b]" />
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="mt-3 flex h-9 items-center gap-2 rounded-md border border-[#e8e6de] px-3">
                    <Search size={14} className="text-[#96988f]" />
                    <span className="sr-only">Search catalog products</span>
                    <input value={avatarProductSearch} onChange={(event) => setAvatarProductSearch(event.target.value)} disabled={!avatarDepartment} placeholder={avatarDepartment ? "Search by product or category..." : "Select a department first"} className="w-full bg-transparent text-[10px] outline-none placeholder:text-[#a7a89f] disabled:cursor-not-allowed" />
                  </label>
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#eeece6]">
                    {!avatarDepartment ? (
                      <p className="px-3 py-5 text-center text-[10px] text-[#92958b]">Select a department to browse matching catalog products.</p>
                    ) : avatarProductOptions.length === 0 ? (
                      <p className="px-3 py-5 text-center text-[10px] text-[#92958b]">No matching products found in this department.</p>
                    ) : (
                      avatarProductOptions.map((product) => {
                        const selected = selectedLookProductIds.includes(product.id);
                        return (
                          <button key={product.id} type="button" onClick={() => toggleLookProduct(product.id)} aria-pressed={selected} className={`flex w-full items-center gap-3 border-b border-[#f0eee8] px-3 py-2 text-left last:border-b-0 ${selected ? "bg-[#f4f2ec]" : "hover:bg-[#faf9f6]"}`}>
                            <Image src={product.image} alt="" width={36} height={42} unoptimized className="h-[42px] w-9 shrink-0 rounded bg-[#f1f0eb] object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[10px] font-medium text-[#454940]">{product.name}</span>
                              <span className="mt-0.5 block truncate text-[9px] text-[#92958b]">{product.taxonomy?.category ?? product.category} · {product.taxonomy?.department ?? product.collection}</span>
                            </span>
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${selected ? "border-[#454940] bg-[#454940] text-white" : "border-[#d8d6ce] bg-white"}`}>{selected ? "✓" : ""}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {avatarFormError && <p role="alert" className="mt-2 text-[10px] text-rose-700">{avatarFormError}</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" disabled={lookSaving} onClick={() => setAvatarFormOpen(false)} className="rounded-md border border-[#e8e6de] px-3.5 py-2 text-[10px] text-[#62665c] hover:bg-[#faf9f6] disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={lookSaving} className="inline-flex items-center gap-1.5 rounded-md bg-[#252c24] px-4 py-2 text-[10px] font-medium text-white hover:bg-[#3b4739] disabled:opacity-50"><Plus size={13} /> {lookSaving ? "Saving…" : "Add avatar"}</button>
              </div>
            </form>
          </div>
        )}
        {productFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171b16]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductFormOpen(false); }}>
            <form onSubmit={saveProduct} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6" aria-labelledby="product-form-title">
              <div className="flex items-start justify-between">
                <div><h2 id="product-form-title" className="text-[16px] font-medium">{editingProduct ? "Edit product" : "Add a product"}</h2><p className="mt-1 text-[11px] text-[#92958b]">Update your ODYN catalog details.</p></div>
                <button type="button" onClick={() => setProductFormOpen(false)} className="rounded-md p-1 text-[#777a71] hover:bg-[#f1f0eb]" aria-label="Close form"><X size={17} /></button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-[10px] text-[#777a71] sm:col-span-2">Product image
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[#dcd9cf] p-3">
                    {productImage ? (
                      <Image src={productImage} alt="Product preview" width={72} height={88} unoptimized className="h-[88px] w-[72px] rounded-md bg-[#f1f0eb] object-cover" />
                    ) : (
                      <span className="flex h-[88px] w-[72px] items-center justify-center rounded-md bg-[#f1f0eb] text-[#9a9b91]"><ImagePlus size={20} /></span>
                    )}
                    <span className="min-w-[180px] flex-1">
                      <span className="block text-[11px] font-medium text-[#464940]">{productImage ? "Choose a new image" : "Upload a product image"}</span>
                      <span className="mt-1 block text-[10px] text-[#92958b]">JPG, PNG, WebP or GIF · up to 5 MB</span>
                      <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleProductImage} required={!productImage} className="mt-2 block w-full text-[10px] text-[#777a71] file:mr-2 file:rounded-md file:border-0 file:bg-[#efeee9] file:px-2.5 file:py-1.5 file:text-[10px] file:font-medium file:text-[#454940]" />
                    </span>
                  </div>
                  {imageError && <span role="alert" className="mt-1.5 block text-[10px] text-rose-700">{imageError}</span>}
                </label>
                <label className="text-[10px] text-[#777a71] sm:col-span-2">Product name<input name="name" required defaultValue={editingProduct?.name ?? ""} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
                <label className="text-[10px] text-[#777a71] sm:col-span-2">Description<textarea name="description" rows={3} defaultValue={editingProduct?.description ?? ""} placeholder="Describe the product, its materials, fit, and details..." className="mt-1.5 w-full resize-y rounded-md border border-[#e8e6de] px-3 py-2 text-[11px] text-[#242820] outline-none placeholder:text-[#a7a89f] focus:border-[#a47c47]" /></label>
                <label className="text-[10px] text-[#777a71]">Department<select required value={productTaxonomy.department} onChange={(event) => updateProductTaxonomy("department", event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-white px-2.5 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]"><option value="">Select department</option>{PRODUCT_CATEGORIES.map((department) => <option key={department.slug} value={department.name}>{department.name}</option>)}</select></label>
                <label className="text-[10px] text-[#777a71]">Category group<select required value={productTaxonomy.section} disabled={!selectedDepartment} onChange={(event) => updateProductTaxonomy("section", event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-white px-2.5 text-[11px] text-[#242820] outline-none focus:border-[#a47c47] disabled:bg-[#f5f4f0]"><option value="">Select group</option>{selectedDepartment?.subcategories.map((section) => <option key={section.slug} value={section.name}>{section.name}</option>)}</select></label>
                <label className="text-[10px] text-[#777a71]">Product category<select required value={productTaxonomy.category} disabled={!selectedSection} onChange={(event) => updateProductTaxonomy("category", event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-white px-2.5 text-[11px] text-[#242820] outline-none focus:border-[#a47c47] disabled:bg-[#f5f4f0]"><option value="">Select category</option>{selectedSection?.subcategories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}</select></label>
                <label className="text-[10px] text-[#777a71]">Style / type<select required value={productTaxonomy.item} disabled={!selectedCategory} onChange={(event) => setProductTaxonomy({ ...productTaxonomy, item: event.target.value })} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-white px-2.5 text-[11px] text-[#242820] outline-none focus:border-[#a47c47] disabled:bg-[#f5f4f0]"><option value="">Select style / type</option>{selectedCategory?.items.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="text-[10px] text-[#777a71]">Price (৳)<input name="price" type="number" min="0" step="1" required defaultValue={editingProduct?.price ?? ""} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
                <label className="text-[10px] text-[#777a71]">Discount (%)<input name="discountPercent" type="number" min="0" max="100" step="1" required defaultValue={editingProduct?.discountPercent ?? 0} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#777a71]">Size and quantity</p>
                      <p className="mt-0.5 text-[9px] text-[#a0a197]">
                        {productSizeSetting
                          ? `${productSizeSetting.sizeType} sizing · ${productSizeSetting.unit}`
                          : "Add a size and its stock quantity."}
                      </p>
                    </div>
                    {!productSizeSetting && <button type="button" onClick={() => { setProductSizes([...productSizes, createProductSizeRow()]); setProductFormError(""); }} className="inline-flex items-center gap-1 rounded-md border border-[#e8e6de] px-2.5 py-1.5 text-[10px] text-[#55584f] hover:bg-[#faf9f6]"><Plus size={12} /> Add size</button>}
                  </div>
                  <div className="mt-2 space-y-2">
                    {productSizes.map((size, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <label className="min-w-0 flex-1"><span className="sr-only">Size</span>{productSizeSetting ? <span className="flex h-9 items-center rounded-md border border-[#e8e6de] bg-[#faf9f6] px-3 text-[10px] font-medium text-[#454940]">{size.size}</span> : <input value={size.size} onChange={(event) => { setProductSizes(productSizes.map((entry, row) => row === index ? { ...entry, size: event.target.value } : entry)); setProductFormError(""); }} placeholder="e.g. S, M, EU 38 or One size" required className="h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[10px] text-[#242820] outline-none placeholder:text-[#a7a89f] focus:border-[#a47c47]" />}</label>
                        <label className="w-28 shrink-0"><span className="sr-only">Quantity</span><input type="number" min="0" step="1" value={size.quantity} onChange={(event) => { setProductSizes(productSizes.map((entry, row) => row === index ? { ...entry, quantity: event.target.value } : entry)); setProductFormError(""); }} required aria-label={`Quantity for size ${size.size || index + 1}`} className="h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[10px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
                        {!productSizeSetting && <button type="button" onClick={() => { setProductSizes(productSizes.filter((_, row) => row !== index)); setProductFormError(""); }} className="rounded-md p-2 text-[#96988f] hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove size ${size.size || index + 1}`}><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-right text-[10px] text-[#777a71]">Total stock: {productSizes.reduce((total, size) => total + (Number(size.quantity) || 0), 0)}</p>
                  <div className="mt-5 border-t border-[#eeeae2] pt-4">
                    <p className="text-[10px] font-medium text-[#55584f]">Customer fit ranges (optional)</p>
                    <p className="mt-1 text-[9px] leading-4 text-[#92958b]">
                      Enter complete ranges for the body measurements relevant to each size. Leave dimensions blank when they do not apply.
                    </p>
                    <div className="mt-3 space-y-3">
                      {productSizes.map((size, index) => (
                        <fieldset key={`chart-${index}`} className="rounded-md border border-[#eeeae2] p-3">
                          <legend className="px-1 text-[10px] font-medium text-[#454940]">{size.size || `Size ${index + 1}`}</legend>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {sizeChartDimensions.map(({ key, label, step }) => (
                              <div key={key}>
                                <p className="mb-1.5 text-[9px] text-[#777a71]">{label}</p>
                                <div className="flex items-center gap-2">
                                  <label className="min-w-0 flex-1">
                                    <span className="sr-only">{label} minimum for size {size.size || index + 1}</span>
                                    <input
                                      aria-label={`${label} minimum for size ${size.size || index + 1}`}
                                      className="h-8 w-full rounded-md border border-[#e8e6de] px-2 text-[10px] text-[#242820] outline-none focus:border-[#a47c47]"
                                      max={key === "age" ? 120 : key === "footLength" ? 50 : 300}
                                      min={key === "age" ? 0 : 1}
                                      onChange={(event) => {
                                        setProductSizes((current) => current.map((entry, row) =>
                                          row === index
                                            ? { ...entry, measurements: { ...entry.measurements, [key]: { ...entry.measurements[key], min: event.target.value } } }
                                            : entry,
                                        ));
                                      }}
                                      placeholder="Min"
                                      step={step}
                                      type="number"
                                      value={size.measurements[key].min}
                                    />
                                  </label>
                                  <span className="text-[9px] text-[#a0a197]">to</span>
                                  <label className="min-w-0 flex-1">
                                    <span className="sr-only">{label} maximum for size {size.size || index + 1}</span>
                                    <input
                                      aria-label={`${label} maximum for size ${size.size || index + 1}`}
                                      className="h-8 w-full rounded-md border border-[#e8e6de] px-2 text-[10px] text-[#242820] outline-none focus:border-[#a47c47]"
                                      max={key === "age" ? 120 : key === "footLength" ? 50 : 300}
                                      min={key === "age" ? 0 : 1}
                                      onChange={(event) => {
                                        setProductSizes((current) => current.map((entry, row) =>
                                          row === index
                                            ? { ...entry, measurements: { ...entry.measurements, [key]: { ...entry.measurements[key], max: event.target.value } } }
                                            : entry,
                                        ));
                                      }}
                                      placeholder="Max"
                                      step={step}
                                      type="number"
                                      value={size.measurements[key].max}
                                    />
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {productFormError && <p role="alert" className="mt-3 text-[10px] text-rose-700">{productFormError}</p>}
              <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={productSaving} onClick={() => setProductFormOpen(false)} className="rounded-md border border-[#e8e6de] px-3.5 py-2 text-[10px] text-[#62665c] hover:bg-[#faf9f6] disabled:opacity-50">Cancel</button><button type="submit" disabled={productSaving} className="rounded-md bg-[#252c24] px-4 py-2 text-[10px] font-medium text-white hover:bg-[#3b4739] disabled:opacity-50">{productSaving ? "Saving…" : editingProduct ? "Save product" : "Add product"}</button></div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

function OrdersTable({ rows, onStatusChange, updatingOrderId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead className="bg-[#faf9f6] text-[9px] uppercase tracking-[.12em] text-[#92958b]"><tr><th className="px-5 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Items</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Update</th></tr></thead>
        <tbody className="divide-y divide-[#f0eee8]">
          {rows.map((order) => <tr key={order.id} className="hover:bg-[#fcfbf9]">
            <td className="px-5 py-3 text-[10px] font-medium" title={order.id}>{order.transactionId}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eee8dc] text-[9px] font-medium text-[#78694f]">{initials(order.customer?.name || "Customer")}</span><div><span className="block text-[10px] text-[#55584f]">{order.customer?.name || "Customer"}</span><span className="block text-[9px] text-[#92958b]">{order.customer?.email}</span></div></div></td>
            <td className="px-4 py-3 text-[10px] text-[#85877e]">{new Date(order.createdAt).toLocaleDateString()}</td>
            <td className="px-4 py-3 text-[10px] text-[#74776d]">{order.items.reduce((count, item) => count + item.quantity, 0)}</td>
            <td className="px-4 py-3 text-[10px] font-medium">{formatTaka(order.total)}<span className="mt-1 block text-[9px] font-normal text-[#92958b]">{order.paymentMethod === "cod" ? "Cash on delivery" : `Online · ${order.paymentStatus}`}</span></td>
            <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
            <td className="px-4 py-3">
              <select
                aria-label={`Update order ${order.transactionId} status`}
                className="h-8 rounded border border-[#e8e6de] bg-white px-2 text-[10px] disabled:opacity-50"
                disabled={order.status === "cancelled" || updatingOrderId === order.id}
                onChange={(event) => onStatusChange(order.id, event.target.value)}
                value={order.status}
              >
                {order.status === "awaiting-payment" && <option value="awaiting-payment">Awaiting payment</option>}
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}

function RoleRow({ member, updating, isCurrentUser, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-[#383c34]">{member.name || "Account"}</p>
        <p className="mt-0.5 truncate text-[10px] text-[#92958b]">{member.email}{isCurrentUser ? " · You" : ""}</p>
      </div>
      <label className="flex items-center gap-2 text-[9px] uppercase tracking-wide text-[#777a71]">
        Role
        <select
          aria-label={`Role for ${member.email}`}
          className="h-8 rounded-md border border-[#e8e6de] bg-white px-2 text-[10px] normal-case tracking-normal text-[#383c34] disabled:bg-[#f5f4f0] disabled:opacity-60"
          disabled={updating || isCurrentUser}
          onChange={(event) => onChange(member.id, event.target.value)}
          value={member.role}
        >
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {updating && <span className="text-[9px] text-[#92958b]">Saving…</span>}
    </div>
  );
}

function AdminAccountSettings() {
  const { data: sessionData, isPending } = authClient.useSession();
  const [name, setName] = useState(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const user = sessionData?.user;

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) throw new Error(result.error.message || "Admin profile could not be updated.");
      setProfileMessage("Admin profile updated.");
    } catch (error) {
      console.error("Could not update the ODYN admin profile.", error);
      setProfileError(error.message || "Admin profile could not be updated.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");
    try {
      const result = await authClient.changePassword({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message || "Password could not be changed.");
      form.reset();
      setPasswordMessage("Password changed. Other active sessions were signed out.");
    } catch (error) {
      console.error("Could not change the ODYN admin password.", error);
      setPasswordError(error.message || "Password could not be changed.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-4">
      <article className="rounded-xl border border-[#eae8e0] bg-white p-5 sm:p-7">
        <h2 className="text-[13px] font-medium">Admin account</h2>
        <p className="mt-1 text-[10px] text-[#92958b]">Update your profile information and sign-in password.</p>
        {isPending ? <p className="mt-4 text-[11px] text-[#74776d]">Loading account…</p> : (
          <form onSubmit={saveProfile} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] text-[#777a71]">Full name<input autoComplete="name" maxLength={100} onChange={(event) => setName(event.target.value)} required value={name ?? user?.name ?? ""} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] text-[#242820] outline-none focus:border-[#a47c47]" /></label>
            <label className="text-[10px] text-[#777a71]">Email address<input readOnly value={user?.email || ""} className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] bg-[#f7f6f2] px-3 text-[11px] text-[#74776d]" /></label>
            <div className="sm:col-span-2"><button disabled={savingProfile} type="submit" className="rounded-md bg-[#252c24] px-4 py-2.5 text-[10px] font-medium text-white disabled:opacity-50">{savingProfile ? "Saving…" : "Save admin profile"}</button>{profileMessage && <p role="status" className="mt-2 text-[10px] text-emerald-700">{profileMessage}</p>}{profileError && <p role="alert" className="mt-2 text-[10px] text-rose-700">{profileError}</p>}</div>
          </form>
        )}
      </article>
      <article className="rounded-xl border border-[#eae8e0] bg-white p-5 sm:p-7">
        <h2 className="text-[13px] font-medium">Change password</h2>
        <form onSubmit={changePassword} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] text-[#777a71]">Current password<input autoComplete="current-password" minLength={8} name="currentPassword" required type="password" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] outline-none focus:border-[#a47c47]" /></label>
          <label className="text-[10px] text-[#777a71]">New password<input autoComplete="new-password" minLength={8} name="newPassword" required type="password" className="mt-1.5 h-9 w-full rounded-md border border-[#e8e6de] px-3 text-[11px] outline-none focus:border-[#a47c47]" /></label>
          <div className="sm:col-span-2"><button disabled={savingPassword} type="submit" className="rounded-md border border-[#e8e6de] px-4 py-2.5 text-[10px] font-medium text-[#55584f] disabled:opacity-50">{savingPassword ? "Updating…" : "Change password"}</button>{passwordMessage && <p role="status" className="mt-2 text-[10px] text-emerald-700">{passwordMessage}</p>}{passwordError && <p role="alert" className="mt-2 text-[10px] text-rose-700">{passwordError}</p>}</div>
        </form>
      </article>
    </div>
  );
}
