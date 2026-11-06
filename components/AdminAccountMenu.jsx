"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function AdminAccountMenu({ onSelectPage }) {
  const router = useRouter();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const { data: sessionData } = authClient.useSession();
  const adminUser = sessionData?.user;

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function signOutAdmin() {
    setSignOutError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setSignOutError(result.error.message || "Could not sign out.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("ODYN admin sign-out request failed.", error);
      setSignOutError("Could not sign out. Please try again.");
    }
  }

  function choosePage(page) {
    onSelectPage(page);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Admin account menu"
        className="flex items-center gap-2 rounded-full border border-[#e4e1d8] bg-white py-1.5 pl-1.5 pr-3 text-left transition hover:bg-[#f5f3ed]"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d8c6a9] text-[11px] font-semibold text-[#302d26]">
          {adminUser?.name?.trim()?.[0]?.toUpperCase() || "A"}
        </span>
        <span className="hidden max-w-36 sm:block">
          <span className="block truncate text-[10px] font-semibold text-[#34382f]">
            {adminUser?.name || "Admin"}
          </span>
          <span className="block text-[9px] uppercase tracking-wide text-[#99998f]">
            Administrator
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-[#777a71]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e6e3da] bg-white py-2 text-[#34382f] shadow-xl">
          <div className="border-b border-[#eeece6] px-4 py-3">
            <p className="truncate text-xs font-semibold">
              {adminUser?.name || "Admin account"}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-[#85877e]">
              {adminUser?.email || ""}
            </p>
          </div>
          <div className="py-1">
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-[#f7f6f2]"
              onClick={() => choosePage("settings")}
              type="button"
            >
              <Users aria-hidden="true" className="h-4 w-4" />
              Admin Profile / Account Settings
            </button>
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-[#f7f6f2]"
              onClick={() => choosePage("overview")}
              type="button"
            >
              <LayoutDashboard aria-hidden="true" className="h-4 w-4 text-[#85877e]" />
              Dashboard Summary
            </button>
            <Link
              className="flex items-center gap-3 px-4 py-2.5 text-xs transition hover:bg-[#f7f6f2]"
              href="/"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4 text-[#85877e]" />
              Main Storefront
            </Link>
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-[#f7f6f2]"
              onClick={() => choosePage("settings")}
              type="button"
            >
              <Settings aria-hidden="true" className="h-4 w-4 text-[#85877e]" />
              System Settings
            </button>
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-[#f7f6f2]"
              onClick={() => choosePage("notifications")}
              type="button"
            >
              <Bell aria-hidden="true" className="h-4 w-4" />
              Admin Notifications
            </button>
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-[#f7f6f2]"
              onClick={() => choosePage("roles")}
              type="button"
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Security &amp; Role Management
            </button>
          </div>
          {signOutError && (
            <p className="border-t border-[#eeece6] px-4 py-2 text-[10px] text-rose-700" role="alert">
              {signOutError}
            </p>
          )}
          <div className="border-t border-[#eeece6] pt-1">
            <button
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-rose-700 transition hover:bg-rose-50"
              onClick={signOutAdmin}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
