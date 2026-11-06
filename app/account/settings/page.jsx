"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AccountSettingsPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authClient.changePassword({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message || "Password could not be changed.");
      form.reset();
      setMessage("Password changed. Other active sessions were signed out.");
    } catch (changeError) {
      console.error("Could not change the ODYN account password.", changeError);
      setError(changeError.message || "Password could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="max-w-2xl rounded-xl border border-[#e8e6df] bg-white p-5 sm:p-7">
      <h2 className="font-serif text-2xl text-[#252b24]">Password settings</h2>
      <p className="mt-1 text-xs text-[#74776d]">Use your current password to set a new one.</p>
      <form className="mt-6 space-y-4" onSubmit={changePassword}>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-[#65695f]">Current password
          <input autoComplete="current-password" className="mt-2 h-11 w-full rounded border border-[#d8d7ce] px-3 text-sm normal-case tracking-normal" minLength={8} name="currentPassword" required type="password" />
        </label>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-[#65695f]">New password
          <input autoComplete="new-password" className="mt-2 h-11 w-full rounded border border-[#d8d7ce] px-3 text-sm normal-case tracking-normal" minLength={8} name="newPassword" required type="password" />
        </label>
        <button className="rounded bg-[#293128] px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "Updating…" : "Change password"}</button>
        {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      </form>
    </article>
  );
}
