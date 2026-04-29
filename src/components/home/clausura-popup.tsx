"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Medal } from "lucide-react";
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

        <div className="relative w-full aspect-[9/16] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group">
          <Image
            src="/images/clausura-popup.jpeg"
            alt="Clausura Olimpiadas Deportivas"
            fill
            className="object-contain sm:object-cover"
            priority
          />
          
          {/* Elegant integrated overlay at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-24">
            <div className="relative overflow-hidden rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[40px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/20 rounded-full blur-[30px] pointer-events-none" />
              
              <div className="relative z-10 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-amber-400/20 border border-amber-400/30 shrink-0 shadow-inner">
                  <Medal className="text-amber-400" size={24} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-wide">Importante</h4>
                  <p className="text-[11px] sm:text-xs font-semibold text-white/80 leading-relaxed">
                    Los ganadores de medalla de <span className="text-amber-400 font-bold">Oro</span> y <span className="text-slate-300 font-bold">Plata</span> deberán asistir con las camisetas de su programa para recibir la medalla.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
