"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const POPUP_SEEN_KEY = "odyn-popup-poster-seen";

export default function PopupPoster() {
  const [poster, setPoster] = useState(null);

  useEffect(() => {
    let timer;
    const controller = new AbortController();
    let alreadySeen = false;
    try {
      alreadySeen = Boolean(window.sessionStorage.getItem(POPUP_SEEN_KEY));
    } catch (error) {
      console.error("Could not read popup poster session state.", error);
    }
    if (alreadySeen) return () => controller.abort();

    fetch("/api/posters?placement=Pop-up", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Posters could not be loaded.");
        const activePoster = result.posters?.find((entry) => entry.image);
        if (!activePoster) return;
        timer = window.setTimeout(() => {
          try {
            window.sessionStorage.setItem(POPUP_SEEN_KEY, activePoster.id);
          } catch (error) {
            console.error("Could not save popup poster session state.", error);
          }
          setPoster(activePoster);
        }, 700);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load the storefront popup poster.", error);
        }
      });

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!poster) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setPoster(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [poster]);

  if (!poster) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171b17]/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setPoster(null);
      }}
    >
      <section
        aria-label={poster.title || "Store promotion"}
        aria-modal="true"
        className="relative w-full max-w-2xl overflow-hidden bg-[#fbfaf7] shadow-2xl"
        role="dialog"
      >
        <button
          aria-label="Close promotional poster"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#fbfaf7]/95 text-[#293128] shadow transition hover:bg-white"
          onClick={() => setPoster(null)}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        {poster.link ? (
          <a href={poster.link} aria-label={poster.title || "View promotion"}>
            <Image
              alt={poster.title || "Store promotion"}
              className="h-auto max-h-[85vh] w-full object-contain"
              height={900}
              src={poster.image}
              unoptimized
              width={1400}
            />
          </a>
        ) : (
          <Image
            alt={poster.title || "Store promotion"}
            className="h-auto max-h-[85vh] w-full object-contain"
            height={900}
            src={poster.image}
            unoptimized
            width={1400}
          />
        )}
      </section>
    </div>
  );
}
