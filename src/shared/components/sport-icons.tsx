/**
 * Custom Sport Icons using React-Icons + custom PNGs
 * Used in cards, watermarks, filters, and throughout the app
 */
import React from 'react';

type IconProps = {
    size?: number;
    className?: string;
};

function PngIcon({ src, alt, size = 24, scale = 2, className = '' }: IconProps & { src: string; alt: string; scale?: number }) {
    const scaledSize = Math.round(size * scale);
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            width={scaledSize}
            height={scaledSize}
            className={className}
            style={{ width: scaledSize, height: scaledSize, objectFit: 'contain' }}
        />
    );
}

/**
 * Get the sport icon component for a given sport name.
 * Returns a default circle if no match found.
 */
const PNG_SPORTS: Record<string, { src: string; scale?: number }> = {
    'Ajedrez': { src: '/AjedrezIcono.png' },
    'Fútbol': { src: '/FutbolIcono.png' },
    'Baloncesto': { src: '/BasketIcono.png', scale: 2.3 },
    'Voleibol': { src: '/VolleyIcono.png', scale: 2.3 },
    'Natación': { src: '/NatacionIcono.png', scale: 2.3 },
    'Tenis': { src: '/TenisIcono.png', scale: 2 },
    'Tenis de Mesa': { src: '/TenisDMIcono.png', scale: 2 },
};

export function SportIcon({ sport, size = 24, className = '' }: { sport: string } & IconProps) {
    const pngConfig = PNG_SPORTS[sport];
    if (pngConfig) {
        return <PngIcon src={pngConfig.src} alt={sport} size={size} scale={pngConfig.scale} className={className} />;
    }

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" />
        </svg>
    );
}
