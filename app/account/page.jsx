"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AccountProfilePage() {
  const { data: sessionData, isPending } = authClient.useSession();
  const [name, setName] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const user = sessionData?.user;

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) throw new Error(result.error.message || "Profile could not be updated.");
      setMessage("Your profile has been updated.");
    } catch (saveError) {
      console.error("Could not update the ODYN customer profile.", saveError);
      setError(saveError.message || "Profile could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="max-w-2xl rounded-xl border border-[#e8e6df] bg-white p-5 sm:p-7">
      <h2 className="font-serif text-2xl text-[#252b24]">My profile</h2>
      <p className="mt-1 text-xs text-[#74776d]">Your saved account information.</p>
      {isPending ? <p className="mt-6 text-xs text-[#74776d]">Loading account…</p> : (
        <form className="mt-6 space-y-4" onSubmit={saveProfile}>
          <label className="block text-[10px] font-medium uppercase tracking-wide text-[#65695f]">
            Full name
            <input className="mt-2 h-11 w-full rounded border border-[#d8d7ce] px-3 text-sm normal-case tracking-normal text-[#252b24] outline-none focus:border-[#69725e]" maxLength={100} onChange={(event) => setName(event.target.value)} required value={name ?? user?.name ?? ""} />
          </label>
          <label className="block text-[10px] font-medium uppercase tracking-wide text-[#65695f]">
            Email address
            <input className="mt-2 h-11 w-full rounded border border-[#e8e6df] bg-[#f7f6f2] px-3 text-sm normal-case tracking-normal text-[#74776d]" readOnly value={user?.email || ""} />
          </label>
          <button className="rounded bg-[#293128] px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "Saving…" : "Save profile"}</button>
          {message && <p className="text-xs text-emerald-700" role="status">{message}</p>}
          {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
        </form>
      )}
    </article>
  );
}
