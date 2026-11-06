"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Header from "@/pages/components/Header";
import Footer from "@/pages/components/Footer";
import CartDrawer from "@/pages/components/CartDrawer";
import PopupPoster from "@/components/PopupPoster";

export default function StorefrontChrome({ children }) {
  return (
    <Suspense fallback={children}>
      <StorefrontChromeContent>{children}</StorefrontChromeContent>
    </Suspense>
  );
}

function StorefrontChromeContent({ children }) {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return children;
  }

  return (
    <>
      <Header />
      {children}
      {!pathname.startsWith("/looks/") && <Footer />}
      <CartDrawer />
      <PopupPoster />
    </>
  );
}
