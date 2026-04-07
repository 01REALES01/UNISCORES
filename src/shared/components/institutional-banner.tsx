"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface InstitutionalBannerProps {
  variant?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  className?: string;
}

export function InstitutionalBanner({ variant, className }: InstitutionalBannerProps) {
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  useEffect(() => {
    if (variant) {
      setSelectedVariant(variant);
    } else {
      // Sorteamos entre los 8 banners disponibles
      setSelectedVariant(Math.floor(Math.random() * 8) + 1);
    }
  }, [variant]);

  const BANNER_NAMES = [
    "manilla_Alegria.png",
    "manilla_Amistad.png",
    "manilla_Cortesia.png",
    "manilla_Perseverancia.png",
    "manilla_Respeto.png",
    "manilla_Solidaridad.png",
    "manilla_Tolerancia.png",
    "manilla_Trabajo_en_Equipo.png",
  ];

  if (!selectedVariant) return null;

  const bannerFile = BANNER_NAMES[selectedVariant - 1] || BANNER_NAMES[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("w-full flex justify-center", className)}
    >
      <div className="relative w-full rounded-2xl overflow-hidden group">
        <img 
          src={`/banners/${bannerFile}`} 
          alt="Institutional Banner"
          className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.01]"
        />
        {/* Sutil brillo al pasar el mouse */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-violet-500/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </motion.div>
  );
}
