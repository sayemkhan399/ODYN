<p align="center ">
  <img src="public/odyn-logo.png" alt="ODYN" width="460">
</p>

<p align="center"><strong>Architectural streetwear — a storefront and the admin studio that runs it.</strong></p>

ODYN is a full-stack fashion e-commerce app built with Next.js. Shoppers browse Men, Women and Kids catalogs, try complete outfits on avatars, find their size, and check out with cash on delivery or online payment. Store owners manage everything — orders, products with size-level stock, avatars, promo codes, posters, customers and roles — from one admin workspace.

## Features

### Storefront
- **Catalog:** Men, Women and Kids departments with categories, sale badges, wishlist and quick add to bag
- **Try the Look:** an avatar carousel; each look links to the catalog products worn in it, so a whole outfit can be added in a tap
- **Size Finder & size guide:** enter height, chest and waist to get a recommended size, then see only the products that are in stock in that size
- **Bag drawer:** promo codes and free-shipping progress
- **Checkout:** cash on delivery, or online payment through SSLCommerz
- **Accounts:** sign up / log in, order history, order tracking, wishlist, coupons and settings
- **Track order:** look up an order's status without signing in
- **Pop-up and hero posters** controlled from the admin

### Admin studio (`/admin`)
- **Overview:** order value, order count, active products and customers, with a sales chart and recent orders
- **Orders:** view, update status (Processing, Shipped, Delivered, Cancelled) and export
- **Products:** create and edit products with images, pricing, discounts and per-size stock
- **Try the Look:** create, pause, resume and delete avatars
- **Promo codes:** percent or fixed discounts with usage tracking
- **Posters:** hero and pop-up artwork
- **Customers** and **Notifications** (open orders and products with ten or fewer units left)
- **Roles & security:** promote or demote accounts; access is checked on the server

## Tech stack

| Area | Technology |
|------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Auth | Better Auth with the MongoDB adapter |
| Database | MongoDB (Mongoose + official driver), GridFS for images |
| Payments | SSLCommerz |
| Forms & validation | React Hook Form, Zod |
| UI | Framer Motion, Recharts, Lucide icons |

## Getting started

### Prerequisites
- Node.js 20 or newer
- A MongoDB **replica set** (MongoDB Atlas works). Orders reserve stock and promo usage inside transactions, which standalone MongoDB does not support.

### Install and run

```bash
git clone https://github.com/sayemkhan399/ODYN.git
cd ODYN
npm install
cp .env.example .env     # then fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string (replica set / Atlas) |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Base URL of the app, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Public base URL used in the browser |
| `ADMIN_EMAILS` | Comma-separated emails that receive the admin role when they sign up |
| `SSLCOMMERZ_STORE_ID` | SSLCommerz store ID (leave empty to disable online payment) |
| `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz store password |
| `SSLCOMMERZ_IS_LIVE` | `false` for sandbox; set `true` only with production credentials |

Keep `.env` private and never commit it.

### Create your admin account
1. Put your email in `ADMIN_EMAILS`.
2. Run the app and use **Sign Up** in the storefront header with that email.
3. Open `/admin`.

The sign-up form never accepts a role from the browser: new accounts are customers unless their email is listed in `ADMIN_EMAILS`. Existing accounts can be promoted or demoted later from **Roles & security**.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the project |

## How it works

- **Products** live in the `products` collection. Product images are stored in GridFS (`productImages`), and catalog responses return image URLs instead of embedding image data. The storefront only shows active products; nothing is seeded.
- **Try the Look** avatars live in `looks`, with transparent images in the `lookImages` bucket. Only active avatars appear in the storefront carousel.
- **Orders** reserve size-level inventory and promo usage in a MongoDB transaction.
- **Online payments:** pending SSLCommerz orders hold stock for 30 minutes, then are released as expired the next time checkout or the admin orders/summary is requested. Online payment stays unavailable until both SSLCommerz credentials are set.
- **Promo codes, store settings and posters** are stored in MongoDB. Poster artwork uses the `posterImages` bucket.

## Project structure

```
app/                    Routes (App Router)
  admin/                Admin studio
  account/              Orders, wishlist, coupons, settings, tracking
  api/                  Route handlers: products, looks, orders, checkout,
                        promos, posters, payments (SSLCommerz), admin, auth
  checkout/ products/ looks/ size-guide/ track-order/ login/ information/
components/             Shared UI (SizeFinder, ProductCard, modals, ...)
context/                Cart and wishlist state
data/                   Categories and size reference/settings
hooks/                  Catalog data hooks
lib/                    MongoDB, auth, orders, products, promos, posters,
                        SSLCommerz, store settings, currency helpers
pages/components/       Header, Hero, TryTheLook, CartDrawer, Footer, ...
```

## Before going to production

- Email verification and password-reset email delivery are **not configured yet**. Set up and test both before opening a public store.
- Use SSLCommerz production credentials and set `SSLCOMMERZ_IS_LIVE=true` only when you are ready to take real payments.
- Use a strong `BETTER_AUTH_SECRET`, and set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your real domain.

## Contributing

This project uses a recent Next.js release with changes from older versions. See [`AGENTS.md`](./AGENTS.md) before making framework-level changes, and read the relevant guide in `node_modules/next/dist/docs/`.
