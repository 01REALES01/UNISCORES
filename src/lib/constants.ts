export const DEPORTES_INDIVIDUALES = [
    'Tenis',
    'Tenis de Mesa',
    'Ajedrez',
    'Natación'
];

// ── Swimming-specific constants ──────────────────────────────────────────────
export const NATACION_ESTILOS = ['Libre', 'Pecho', 'Espalda', 'Mariposa', 'Combinado'];
export const NATACION_DISTANCIAS = ['25m', '50m', '100m', '200m'];
export const NATACION_PUNTOS: Record<number, number> = { 1: 5, 2: 3, 3: 1 };

export const RACE_SPORTS = ['Natación'];

export function isRaceSport(sportName?: string): boolean {
    if (!sportName) return false;
    return RACE_SPORTS.includes(sportName);
}

export const LUGARES_OLIMPICOS = [
    'Coliseo Uninorte',
    'Cancha de Fútbol',
    'Cancha #1',
    'Cancha #2',
    'Piscina Centro Deportivo'
];

export const CARRERAS_UNINORTE = [
    'Administración de Empresas',
    'Arquitectura',
    'Ciencia de Datos',
    'Ciencia Política y Gobierno',
    'Comunicación Social y Periodismo',
    'Contaduría Pública',
    'Derecho',
    'Diseño Gráfico',
    'Diseño Industrial',
    'Economía',
    'Geología',
    'Ingeniería Civil',
    'Ingeniería de Sistemas',
    'Ingeniería Eléctrica',
    'Ingeniería Industrial',
    'Ingeniería Mecánica',
    'Lenguas Modernas y Cultura',
    'Medicina',
    'Música',
    'Negocios Internacionales',
    'Odontología',
    'Psicología',
    'Relaciones Internacionales',
    'Funcionarios',
    'Egresados'
];

export const SPORT_EMOJI: Record<string, string> = {
    'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
    'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
};

// Purple & Clean Design System - Brand Consistent Sport Styles
export const SPORT_GRADIENT: Record<string, string> = {
    'Fútbol': 'from-emerald-500/30 to-emerald-900/10',
    'Baloncesto': 'from-orange-500/30 to-orange-900/10',
    'Voleibol': 'from-indigo-500/30 to-indigo-900/10',
    'Tenis': 'from-lime-500/30 to-lime-900/10',
    'Tenis de Mesa': 'from-rose-500/30 to-rose-900/10',
    'Ajedrez': 'from-violet-500/25 to-violet-900/10',
    'Natación': 'from-cyan-500/30 to-cyan-900/10',
};

export const SPORT_SOFT_BG: Record<string, string> = {
    'Fútbol': 'bg-emerald-500/10',
    'Baloncesto': 'bg-primary/10',
    'Voleibol': 'bg-secondary/10',
    'Tenis': 'bg-primary/5',
    'Tenis de Mesa': 'bg-secondary/5',
    'Ajedrez': 'bg-primary/20',
    'Natación': 'bg-secondary/20',
};

export const SPORT_ACCENT: Record<string, string> = {
    'Fútbol': 'text-emerald-500',
    'Baloncesto': 'text-primary',
    'Voleibol': 'text-secondary',
    'Tenis': 'text-primary/80',
    'Tenis de Mesa': 'text-secondary/80',
    'Ajedrez': 'text-primary',
    'Natación': 'text-secondary',
};

export const SPORT_BORDER: Record<string, string> = {
    'Fútbol': 'border-emerald-500/20',
    'Baloncesto': 'border-primary/20',
    'Voleibol': 'border-secondary/20',
    'Tenis': 'border-primary/10',
    'Tenis de Mesa': 'border-secondary/10',
    'Ajedrez': 'border-primary/30',
    'Natación': 'border-secondary/30',
};

export const SPORT_GLOW: Record<string, string> = {
    'Fútbol': 'hover:shadow-lg hover:shadow-emerald-500/10',
    'Baloncesto': 'hover:shadow-lg hover:shadow-primary-500/10',
    'Voleibol': 'hover:shadow-lg hover:shadow-secondary-500/10',
    'Tenis': 'hover:shadow-lg hover:shadow-primary-500/5',
    'Tenis de Mesa': 'hover:shadow-lg hover:shadow-secondary-500/5',
    'Ajedrez': 'hover:shadow-lg hover:shadow-primary-500/15',
    'Natación': 'hover:shadow-lg hover:shadow-secondary-500/15',
};

export const SPORT_LIVE_TEXT: Record<string, string> = {
    'Fútbol': 'text-emerald-500',
    'Baloncesto': 'text-primary',
    'Voleibol': 'text-secondary',
    'Tenis': 'text-primary',
    'Tenis de Mesa': 'text-secondary',
    'Ajedrez': 'text-primary',
    'Natación': 'text-secondary',
    'default': 'text-primary'
};

export const SPORT_LIVE_BG_WRAPPER: Record<string, string> = {
    'Fútbol': 'bg-emerald-500/10',
    'Baloncesto': 'bg-primary/10',
    'Voleibol': 'bg-secondary/10',
    'Tenis': 'bg-primary/5',
    'Tenis de Mesa': 'bg-secondary/5',
    'Ajedrez': 'bg-primary/15',
    'Natación': 'bg-secondary/15',
    'default': 'bg-primary/10'
};

export const SPORT_LIVE_BAR: Record<string, string> = {
    'Fútbol': 'bg-emerald-500',
    'Baloncesto': 'bg-primary',
    'Voleibol': 'bg-secondary',
    'Tenis': 'bg-primary',
    'Tenis de Mesa': 'bg-secondary',
    'Ajedrez': 'bg-primary',
    'Natación': 'bg-secondary',
    'default': 'bg-primary'
};

export const SPORT_COLORS: Record<string, string> = {
    'Fútbol': '#10b981',
    'Baloncesto': '#6D28D9',
    'Voleibol': '#10b981',
    'Tenis': '#6D28D9',
    'Tenis de Mesa': '#10b981',
    'Ajedrez': '#6D28D9',
    'Natación': '#10b981',
};

export const BRAND_VALUES = [
    { name: 'Amistad', color: '#F97316', bg: 'bg-orange-500' },
    { name: 'Alegría', color: '#6D28D9', bg: 'bg-primary' },
    { name: 'Tolerancia', color: '#1E1B4B', bg: 'bg-[#1E1B4B]' },
    { name: 'Cortesía', color: '#F5F5DC', bg: 'bg-[#F5F5DC]', text: 'text-primary' },
    { name: 'Perseverancia', color: '#059669', bg: 'bg-secondary' },
    { name: 'Respeto', color: '#3B82F6', bg: 'bg-blue-500' },
    { name: 'Trabajo en Equipo', color: '#991B1B', bg: 'bg-red-800' },
    { name: 'Solidaridad', color: '#EC4899', bg: 'bg-pink-500' },
];

export const CREATOR_EMAILS = [
    'ldsilva@uninorte.edu.co',
    'donaldp@uninorte.edu.co',
    'delaasuncionp@uninorte.edu.co',
    'oapalma@uninorte.edu.co'
];

export function isCreator(email?: string): boolean {
    if (!email) return false;
    return CREATOR_EMAILS.includes(email.toLowerCase());
}

// Special profile badges
export const AURA_EMAIL = 'mciccarelli@uninorte.edu.co';
export const MVP_EMAIL = 'nzorozco@uninorte.edu.co';

export function hasAuraBadge(email?: string): boolean {
    return !!email && email.toLowerCase() === AURA_EMAIL;
}

export function hasMvpBadge(email?: string): boolean {
    return !!email && email.toLowerCase() === MVP_EMAIL;
}
