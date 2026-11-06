This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## MongoDB and authentication

1. Copy `.env.example` to `.env` and set `MONGO_URI`, `BETTER_AUTH_SECRET`,
   and `BETTER_AUTH_URL`. Generate a secret with
   `openssl rand -base64 32`. Keep `.env` private.
2. Set `ADMIN_EMAILS` to the comma-separated email addresses allowed to receive
   the admin role. The current `.env` already has the MongoDB and Better Auth
   settings; add `ADMIN_EMAILS` to enable admin sign-up.
3. Run `npm run dev`, then use **Sign Up** in the storefront header.

The sign-up form never accepts a role from the browser. New accounts are
customers by default; only emails in `ADMIN_EMAILS` receive the admin role.
Better Auth stores users, sessions, accounts, and verification records in
MongoDB. The `/admin` route checks the server-side session and role before
rendering.

Products created in the admin catalog are stored in the MongoDB `products`
collection. Product images are stored in GridFS (`productImages.files` and
`productImages.chunks`), so storefront catalog requests return image URLs
instead of embedding image data in every product response. The storefront only
shows active products from this catalog; it does not seed demo products.

Try the Look avatars are stored in the MongoDB `looks` collection, and their
transparent images are stored in the `lookImages` GridFS bucket. Admins can
create, pause, resume, and delete avatars; the storefront carousel displays
only active saved avatars and their associated catalog products.

Orders reserve size-level inventory and promo usage in MongoDB transactions.
Use a MongoDB replica set (MongoDB Atlas is supported); standalone MongoDB
deployments do not support the required transactions. Checkout supports cash
on delivery by default. To enable online payment, configure
`SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD`, and set
`SSLCOMMERZ_IS_LIVE` to `true` only after switching to production credentials.
Online payment remains unavailable until both credentials are present. Pending
online orders reserve stock for 30 minutes and are released as expired orders
when the next checkout or admin order/summary request runs.

Promo codes, store settings, and pop-up/hero posters are stored in MongoDB.
Poster artwork is stored in the `posterImages` GridFS bucket. Admin
notifications reflect open orders and products with ten or fewer units in stock.

Admin role assignment happens at sign-up for emails listed in `ADMIN_EMAILS`.
Existing accounts can also be promoted or demoted from the admin Roles & Security
screen. Email verification and password-reset email delivery are not configured
yet; configure and test those before using this setup for a public production
store.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
