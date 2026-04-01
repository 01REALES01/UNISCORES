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
      // El banner 1 fue eliminado, por lo que sorteamos entre 2 y 8
      setSelectedVariant(Math.floor(Math.random() * 7) + 2);
    }
  }, [variant]);

  if (!selectedVariant) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("w-full flex justify-center", className)}
    >
      <div className="relative w-full aspect-[16/1.4] overflow-hidden group">
        <img 
          src={`/banners/b_${selectedVariant}.png`} 
          alt="Institutional Banner"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
        />
        {/* Sutil brillo al pasar el mouse */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </motion.div>
  );
}
