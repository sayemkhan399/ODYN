"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import useCatalogLooks from "@/hooks/useCatalogLooks";

export default function TryTheLook() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragStart = useRef(null);
  const suppressClick = useRef(false);
  const { activeCategory } = useCart();
  const { looks, loading, error } = useCatalogLooks();
  const department = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
  const visibleLooks = looks.filter(
    (look) => activeCategory === "all" || look.gender === department,
  );
  const safeCurrentIndex = Math.min(currentIndex, Math.max(visibleLooks.length - 1, 0));
  const currentLook = visibleLooks[safeCurrentIndex];

  const getCardStyle = (index) => {
    const diff = index - safeCurrentIndex;
    if (diff === 0) {
      return { transform: "translateX(0%) scale(1.18)", zIndex: 30, opacity: 1 };
    }
    if (diff === -1 || (safeCurrentIndex === 0 && index === visibleLooks.length - 1)) {
      return { transform: "translateX(-120%) scale(.85)", zIndex: 20, opacity: 0.85 };
    }
    if (diff === 1 || (safeCurrentIndex === visibleLooks.length - 1 && index === 0)) {
      return { transform: "translateX(120%) scale(.85)", zIndex: 20, opacity: 0.85 };
    }
    return {
      transform: `translateX(${diff * 140}%) scale(.6)`,
      zIndex: 10,
      opacity: 0,
      pointerEvents: "none",
    };
  };

  function moveSelection(direction) {
    if (visibleLooks.length < 2) return;
    setCurrentIndex(
      (safeCurrentIndex + direction + visibleLooks.length) % visibleLooks.length,
    );
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event) {
    if (!dragStart.current) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    dragStart.current = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    moveSelection(deltaX < 0 ? 1 : -1);
  }

  function handleClickCapture(event) {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }

  return (
    <section id="try-the-look" className="relative flex min-h-[70vh] w-full flex-col overflow-hidden bg-slate-50 py-10 sm:py-14">
      <header className="z-20 mx-auto w-full max-w-7xl px-6 sm:px-8">
        <h2 className="mb-1 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Try the Look.
        </h2>
        <p className="text-sm font-medium tracking-wide text-slate-500">
          {loading
            ? "Loading styled looks…"
            : activeCategory === "all"
              ? `${visibleLooks.length} styled ${visibleLooks.length === 1 ? "look" : "looks"} across all collections.`
              : `${visibleLooks.length} styled ${visibleLooks.length === 1 ? "look" : "looks"} for the ${activeCategory} collection.`}
        </p>
        {error && <p className="mt-2 text-sm text-rose-700" role="alert">{error}</p>}
      </header>

      {loading ? (
        <div className="flex min-h-[460px] flex-1 items-center justify-center text-sm text-slate-500">
          Loading avatars…
        </div>
      ) : visibleLooks.length === 0 ? (
        <div className="flex min-h-[460px] flex-1 flex-col items-center justify-center px-5 text-center">
          <p className="font-serif text-2xl text-slate-900">
            {activeCategory === "all"
              ? "No styled looks available yet."
              : `No ${activeCategory} looks available yet.`}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Avatars added from the admin Try the Look page will appear here.
          </p>
        </div>
      ) : (
        <>
          <div
            aria-label="Styled looks carousel. Drag or use the left and right arrow keys to change avatars."
            className="relative my-4 flex min-h-[500px] flex-1 cursor-grab items-center justify-center active:cursor-grabbing"
            onClickCapture={handleClickCapture}
            onDragStart={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                moveSelection(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
            onPointerCancel={() => {
              dragStart.current = null;
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            role="region"
            style={{ touchAction: "pan-y" }}
            tabIndex={0}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage: "linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)",
                backgroundSize: "40px 30px",
                transform: "perspective(600px) rotateX(65deg) translateY(40px)",
                transformOrigin: "bottom center",
              }}
            />
            <div className="relative flex h-[460px] w-full max-w-5xl items-center justify-center">
              {visibleLooks.map((look, index) => (
                <Link
                  href={`/looks/${look.id}`}
                  key={look.id}
                  aria-label={`View ${look.name} styled look and products`}
                  style={getCardStyle(index)}
                  className="absolute flex h-[400px] w-[240px] select-none flex-col items-center justify-center transition-all duration-700 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700 sm:w-[280px]"
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={look.image}
                      alt={look.name}
                      fill
                      unoptimized
                      sizes="280px"
                      className="object-contain drop-shadow-2xl"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mx-auto mb-5 w-full max-w-2xl px-6 text-center">
            <h3 className="text-lg font-semibold text-slate-900">{currentLook.name}</h3>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {currentLook.products.map((product) => (
                <span
                  key={product.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] text-slate-700"
                >
                  <Image
                    src={product.image}
                    alt=""
                    width={24}
                    height={28}
                    unoptimized
                    className="h-7 w-6 rounded object-cover"
                  />
                  {product.name}
                </span>
              ))}
            </div>
          </div>

        </>
      )}
    </section>
  );
}
