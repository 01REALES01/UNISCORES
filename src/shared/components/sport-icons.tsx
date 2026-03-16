/**
 * Custom Sport Icons using React-Icons
 * Used in cards, watermarks, filters, and throughout the app
 */
import React from 'react';
import {
    FaFutbol,
    FaBasketballBall,
    FaVolleyballBall,
    FaTableTennis,
    FaChessKnight,
    FaSwimmer
} from 'react-icons/fa';
import { MdSportsTennis } from 'react-icons/md';

type IconProps = {
    size?: number;
    className?: string;
};

// ===== MAP: Sport Name → Icon Component =====

export const SPORT_ICONS: Record<string, React.ComponentType<IconProps>> = {
    'Fútbol': FaFutbol,
    'Baloncesto': FaBasketballBall,
    'Voleibol': FaVolleyballBall,
    'Tenis': MdSportsTennis,
    'Tenis de Mesa': FaTableTennis,
    'Ajedrez': FaChessKnight,
    'Natación': FaSwimmer,
};

/**
 * Get the sport icon component for a given sport name.
 * Returns a default circle if no match found.
 */
export function SportIcon({ sport, size = 24, className = '' }: { sport: string } & IconProps) {
    const Icon = SPORT_ICONS[sport];
    if (!Icon) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" />
            </svg>
        );
    }
    return <Icon size={size} className={className} />;
}
