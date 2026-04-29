"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui-primitives";

export function ClausuraPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already closed the popup in this session
    const hasClosed = sessionStorage.getItem("clausuraPopupClosed");
    if (!hasClosed) {
      // Small delay to allow the page to load before showing the popup
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("clausuraPopupClosed", "true");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm sm:max-w-md bg-transparent animate-in zoom-in-95 duration-300 flex flex-col items-center">
        {/* Close button outside the image to make it clearly visible */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center hover:bg-black/80 hover:scale-110 transition-all z-10 backdrop-blur-md"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <Image
            src="/images/clausura-popup.jpeg"
            alt="Clausura Olimpiadas Deportivas"
            fill
            className="object-contain sm:object-cover"
            priority
          />
        </div>

        <Button
          onClick={handleClose}
          className="mt-6 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black uppercase tracking-widest rounded-xl px-8 w-full backdrop-blur-md"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
