"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function AuthForm({
  isOpen,
  onClose,
  onSuccess,
  defaultMode = "signup",
}) {
  const [mode, setMode] = useState(defaultMode);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    emailRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email")).trim().toLowerCase();
    const password = String(formData.get("password"));

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: String(formData.get("name")).trim(),
          email: submittedEmail,
          password,
        });

        if (result.error) {
          setMessage(result.error.message || "Account creation failed. Try again.");
          return;
        }

        if (!result.data?.user) {
          setMessage("Account creation completed without a user record.");
          return;
        }

        setEmail(submittedEmail);
        changeMode("signin");
        setMessage("Your account is ready. Sign in to continue.");
        return;
      }

      const result = await authClient.signIn.email({
        email: submittedEmail,
        password,
      });

      if (result.error) {
        setMessage(result.error.message || "Sign-in failed. Check your details.");
        return;
      }

      if (!result.data?.user) {
        setMessage("Sign-in completed without a user session.");
        return;
      }

      onSuccess?.(result.data);
    } catch (error) {
      console.error("ODYN authentication request failed.", error);
      setMessage("We could not complete your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setIsPasswordVisible(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#151914]/70 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="auth-title"
        aria-modal="true"
        className="relative my-auto w-full max-w-[490px] overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-[0_32px_100px_-24px_rgba(0,0,0,0.5)]"
        role="dialog"
      >
        <button
          aria-label="Close sign-in dialog"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#374036] shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#879078] sm:right-5 sm:top-5"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>

        <div className="px-6 py-10 sm:px-12 sm:py-12">
          <div className="mx-auto w-full max-w-[360px]">
            <div className="mb-8">
              <Image
                alt="ODYN"
                className="h-auto w-24"
                height={100}
                priority
                src="/odyn-logo.png"
                width={100}
              />
            </div>

            <div className="mb-8">
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#858a70]">
                {mode === "signup" ? "A place in the studio" : "Your ODYN account"}
              </p>
              <h1
                className="font-serif text-[38px] font-normal leading-[1.04] tracking-[-0.045em] text-[#252b24] sm:text-[42px]"
                id="auth-title"
              >
                {mode === "signup" ? (
                  <>
                    Make yourself
                    <br />
                    <span className="italic">at home.</span>
                  </>
                ) : (
                  <>
                    Good to have
                    <br />
                    <span className="italic">you back.</span>
                  </>
                )}
              </h1>
              <p className="mt-4 max-w-[310px] text-[13px] leading-[1.8] text-[#73766d]">
                {mode === "signup"
                  ? "Join us for considered pieces, early collection access, and notes from the studio."
                  : "Sign in to pick up where you left off and keep your everyday in good company."}
              </p>
            </div>

            <form className="space-y-[18px]" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div>
                  <label
                    className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.15em] text-[#51584e]"
                    htmlFor="auth-name"
                  >
                    Full name
                  </label>
                  <input
                    autoComplete="name"
                    className="h-[48px] w-full rounded-md border border-[#e4e2da] bg-white/70 px-3.5 text-[13px] text-[#252b24] outline-none transition placeholder:text-[#aaaba2] hover:border-[#c5c7ba] focus:border-[#777e6b] focus:ring-2 focus:ring-[#777e6b]/10"
                    id="auth-name"
                    name="name"
                    placeholder="Your name"
                    required
                  />
                </div>
              )}

              <div>
                <label
                  className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.15em] text-[#51584e]"
                  htmlFor="auth-email"
                >
                  Email address
                </label>
                <input
                  autoComplete="email"
                  className="h-[48px] w-full rounded-md border border-[#e4e2da] bg-white/70 px-3.5 text-[13px] text-[#252b24] outline-none transition placeholder:text-[#aaaba2] hover:border-[#c5c7ba] focus:border-[#777e6b] focus:ring-2 focus:ring-[#777e6b]/10"
                  id="auth-email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  ref={emailRef}
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-[#51584e]"
                    htmlFor="auth-password"
                  >
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      className="text-[10px] text-[#777e6b] transition-colors hover:text-[#252b24]"
                      onClick={() =>
                        setMessage(
                          "Password reset is not configured yet. Contact the store for help.",
                        )
                      }
                      type="button"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    className="h-[48px] w-full rounded-md border border-[#e4e2da] bg-white/70 px-3.5 pr-12 text-[13px] text-[#252b24] outline-none transition placeholder:text-[#aaaba2] hover:border-[#c5c7ba] focus:border-[#777e6b] focus:ring-2 focus:ring-[#777e6b]/10"
                    id="auth-password"
                    minLength={8}
                    name="password"
                    placeholder={
                      mode === "signup"
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                    required
                    type={isPasswordVisible ? "text" : "password"}
                  />
                  <button
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    aria-pressed={isPasswordVisible}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-[#8b8d82] transition-colors hover:text-[#333a31] focus:outline-none focus:text-[#333a31]"
                    onClick={() =>
                      setIsPasswordVisible((visible) => !visible)
                    }
                    type="button"
                  >
                    {isPasswordVisible ? (
                      <EyeOff
                        aria-hidden="true"
                        className="h-[18px] w-[18px]"
                      />
                    ) : (
                      <Eye
                        aria-hidden="true"
                        className="h-[18px] w-[18px]"
                      />
                    )}
                  </button>
                </div>
              </div>

              {message && (
                <p
                  className="rounded-md border border-[#e6dec9] bg-[#f7f3e9] px-3.5 py-3 text-xs leading-5 text-[#6a6048]"
                  role="status"
                >
                  {message}
                </p>
              )}

              <button
                className="group flex h-[50px] w-full items-center justify-center gap-3 rounded-md bg-[#293128] px-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-[#414b3d] focus:outline-none focus:ring-2 focus:ring-[#777e6b] focus:ring-offset-2"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Create your account"
                    : "Sign in"}
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </button>
            </form>

            <p className="mt-7 text-center text-[12px] text-[#777a71]">
              {mode === "signup" ? "Already have an account?" : "New to ODYN?"}{" "}
              <button
                className="font-semibold text-[#343c32] underline decoration-[#b4b8aa] underline-offset-4 transition-colors hover:text-[#7c8067]"
                onClick={() =>
                  changeMode(mode === "signup" ? "signin" : "signup")
                }
                type="button"
              >
                {mode === "signup" ? "Sign in" : "Create an account"}
              </button>
            </p>

            <p className="mt-7 text-center text-[9px] leading-5 text-[#a0a096]">
              By continuing, you agree to our{" "}
              <a
                className="underline underline-offset-2 transition-colors hover:text-[#5f6657]"
                href="#terms"
                onClick={onClose}
              >
                terms
              </a>{" "}
              and{" "}
              <a
                className="underline underline-offset-2 transition-colors hover:text-[#5f6657]"
                href="#privacy"
                onClick={onClose}
              >
                privacy policy
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
