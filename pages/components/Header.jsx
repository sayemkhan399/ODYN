"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Baby,
  Bell,
  ChevronDown,
  Heart,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Ticket,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import AuthForm from "@/pages/form/AuthForm";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function Header({ onCartClick, onSignUpClick }) {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const accountMenuRef = useRef(null);
  const { activeCategory, setActiveCategory, itemCount, setIsCartOpen } =
    useCart();
  const { data: sessionData, isPending: sessionPending } =
    authClient.useSession();
  const user = sessionData?.user;

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  function openAuthForm() {
    setAuthError("");
    setIsAuthOpen(true);
    onSignUpClick?.();
  }

  function handleAuthSuccess(data) {
    setIsAuthOpen(false);
    if (data.user.role === "admin") {
      router.push("/admin");
    }
  }

  async function handleSignOut() {
    setAuthError("");
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setAuthError(result.error.message || "Could not sign out.");
        return;
      }
      setAccountMenuOpen(false);
    } catch (error) {
      console.error("ODYN sign-out request failed.", error);
      setAuthError("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  const accountLinks =
    user?.role === "admin"
      ? [
          { label: "Admin Profile / Account Settings", icon: UserRound, page: "settings" },
          { label: "Dashboard Summary", icon: Package, href: "/admin" },
          { label: "Main Storefront", icon: ShoppingBag, href: "/" },
          { label: "System Settings", icon: Settings, page: "settings" },
          { label: "Admin Notifications", icon: Bell, page: "notifications" },
          { label: "Security & Role Management", icon: Settings, page: "roles" },
        ]
      : [
          { label: "My Profile / Account", icon: UserRound, href: "/account" },
          { label: "My Orders", icon: Package, href: "/account/orders" },
          { label: "Wishlist", icon: Heart, href: "/account/wishlist" },
          { label: "Track Order", icon: Truck, href: "/account/track" },
          { label: "My Coupons", icon: Ticket, href: "/account/coupons" },
          { label: "Settings / Password Change", icon: Settings, href: "/account/settings" },
        ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-20 flex items-center justify-between gap-2">
        {/* LEFT: Brand Logo */}
        <div className="flex items-center shrink-0">
          <Link href="/">
            <Image
              src="/odyn-logo.png"
              alt="ODYN Logo"
              width={100}
              height={100}
              className="w-20 sm:w-28 h-auto object-contain"
            />
          </Link>
        </div>

        {/* MIDDLE: Category Icons (Men, Women, Kids) */}
        <nav className="flex items-center gap-1 sm:gap-3 bg-slate-100/80 p-1 sm:p-1.5 rounded-full border border-slate-200">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-2.5 py-2 text-[10px] font-bold tracking-wider uppercase transition-all duration-200 sm:px-3.5 ${
              activeCategory === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
            aria-pressed={activeCategory === "all"}
            title="All departments"
            type="button"
          >
            All
          </button>
          {/* Men Icon Button */}
          <button
            onClick={() => setActiveCategory("men")}
            className={`flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
              activeCategory === "men"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
            title="Men's Collection"
          >
            <UserRound aria-hidden="true" className="w-4 h-4" />
            <span className="hidden md:inline">Men</span>
          </button>

          {/* Women Icon Button */}
          <button
            onClick={() => setActiveCategory("women")}
            className={`flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
              activeCategory === "women"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
            title="Women's Collection"
          >
            <UsersRound aria-hidden="true" className="w-4 h-4" />
            <span className="hidden md:inline">Women</span>
          </button>

          {/* Kids Icon Button */}
          <button
            onClick={() => setActiveCategory("kids")}
            className={`flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
              activeCategory === "kids"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
            title="Kids' Collection"
          >
            <Baby aria-hidden="true" className="w-4 h-4" />
            <span className="hidden md:inline">Kids</span>
          </button>
        </nav>

        {/* RIGHT: Account & Cart */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
                aria-label={`${user.role === "admin" ? "Admin" : "Customer"} account menu`}
                className="inline-flex max-w-[150px] items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 pr-2.5 text-slate-800 shadow-sm transition hover:bg-slate-50"
                disabled={sessionPending}
                onClick={() => setAccountMenuOpen((open) => !open)}
                type="button"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${user.role === "admin" ? "bg-[#d8c6a9] text-[#302d26]" : "bg-slate-900 text-white"}`}
                >
                  {user.name?.trim()?.[0]?.toUpperCase() ?? <UserRound className="h-4 w-4" />}
                </span>
                <span className="hidden truncate text-[10px] font-semibold uppercase tracking-wider sm:inline">
                  {user.role === "admin" ? "Admin" : user.name?.split(" ")[0] || "Account"}
                </span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              </button>
              {accountMenuOpen && (
                <div
                  className="absolute right-0 top-full z-[70] mt-2 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white py-2 text-slate-800 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-xs font-semibold">{user.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{user.email}</p>
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                      {user.role === "admin" ? "Admin account" : "Customer account"}
                    </span>
                  </div>
                  <nav aria-label="Account options" className="py-1">
                    {accountLinks.map(({ label, icon: Icon, href, page }) =>
                      href ? (
                        <Link
                          className="flex items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-slate-50"
                          href={href}
                          key={label}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <Icon aria-hidden="true" className="h-4 w-4 text-slate-500" />
                          {label}
                        </Link>
                      ) : (
                        <button
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-slate-50"
                          key={label}
                          onClick={() => {
                            if (user.role === "admin") {
                              setAccountMenuOpen(false);
                              router.push(`/admin#${page}`);
                            }
                          }}
                          type="button"
                        >
                          <Icon aria-hidden="true" className="h-4 w-4 text-slate-500" />
                          {label}
                        </button>
                      ),
                    )}
                  </nav>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      disabled={isSigningOut}
                      onClick={handleSignOut}
                      type="button"
                    >
                      <LogOut aria-hidden="true" className="h-4 w-4" />
                      {isSigningOut ? "Signing out…" : user.role === "admin" ? "Logout" : "Sign Out / Logout"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthForm}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white shadow-sm transition-colors duration-200 hover:bg-amber-600 sm:rounded-none sm:px-5 sm:py-2.5"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sessionPending ? "Loading" : "Sign Up"}
              </span>
            </button>
          )}

          {/* Cart Box */}
          <button
            onClick={() => {
              setIsCartOpen(true);
              onCartClick?.();
            }}
            className="relative flex items-center justify-center p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg border border-slate-200 transition-all duration-200 group"
            aria-label={`View shopping bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            type="button"
          >
            <ShoppingBag
              aria-hidden="true"
              className="w-5 h-5 transition-transform group-hover:scale-105"
            />

            {/* Cart Count Badge */}
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] bg-amber-600 text-white font-mono text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md animate-pulse">
                {itemCount}
              </span>
            )}
          </button>
        </div>
        </div>
      </header>
      {authError && (
        <p
        className="fixed right-4 top-24 z-[80] rounded border border-rose-200 bg-white px-4 py-3 text-xs text-rose-800 shadow-lg"
        role="alert"
        >
        {authError}
        </p>
      )}
      <AuthForm
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
