"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/pages/form/AuthForm";

export default function LoginPage() {
  const router = useRouter();

  function handleSuccess(data) {
    if (data.user.role === "admin") {
      router.replace("/admin");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    const destination = next === "account"
      ? "/account"
      : next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
        ? next
        : "/";
    router.replace(destination);
  }

  return (
    <main className="min-h-[60vh]">
      <AuthForm
        defaultMode="signin"
        isOpen
        onClose={() => router.replace("/")}
        onSuccess={handleSuccess}
      />
    </main>
  );
}
