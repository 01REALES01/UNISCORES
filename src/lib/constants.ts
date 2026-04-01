export const DEPORTES_INDIVIDUALES = [
    'Tenis',
    'Tenis de Mesa',
    'Ajedrez',
    'Natación'
];

// Sports that split into categories: principiante / intermedio / avanzado
export const DEPORTES_CON_CATEGORIA = ['Tenis', 'Tenis de Mesa', 'Natación'];

// Sports with a bracket (can auto-derive 1st–4th from match results)
export const DEPORTES_CON_BRACKET = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa'];

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
    'Ingeniería Electrónica',
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

// ── Team name → carrera names mapping (from Excel fixture file) ──────────────
// Some teams are combined (multiple programs playing together).
// Each member carrera receives full Olympic points independently.
export const EQUIPO_NOMBRE_TO_CARRERAS: Record<string, string[]> = {
    'DCPRI':                               ['Derecho', 'Ciencia Política y Gobierno', 'Relaciones Internacionales'],
    'INGENIERÍA MECÁNICA':                 ['Ingeniería Mecánica'],
    'MEDICINA':                            ['Medicina'],
    'INGENIERÍA INDUSTRIAL':               ['Ingeniería Industrial'],
    'INGENIERÍA CIVIL':                    ['Ingeniería Civil'],
    'INGENIERÍA DE SISTEMAS':              ['Ingeniería de Sistemas'],
    'ING. ELÉCTRICA/CIENCIA DATOS':        ['Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ciencia de Datos'],
    'INGENIERÍA ELÉCTRICA/CIENCIA DATOS':  ['Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ciencia de Datos'],
    'ING.A ELÉCTRICA/CIENCIA DATOS':       ['Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ciencia de Datos'],
    'ING. ELÉCTRICA':                      ['Ingeniería Eléctrica', 'Ingeniería Electrónica'],
    'INGENIERÍA ELÉCTRICA':                ['Ingeniería Eléctrica', 'Ingeniería Electrónica'],
    'COM. SOCIAL/PSICOLOGÍA':              ['Comunicación Social y Periodismo', 'Psicología'],
    'ESCUELA DE NEGOCIOS':                 ['Negocios Internacionales'],
    'ARQUITECTURA':                        ['Arquitectura'],
};

export const SPORT_EMOJI: Record<string, string> = {
    'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
    'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
};

// Olimpiadas 2026 - Clean Sport Styles (each sport has a unique color)
export const SPORT_COLORS: Record<string, string> = {
    'Fútbol': '#10B981',
    'Baloncesto': '#F59E0B',
    'Voleibol': '#F97316',
    'Tenis': '#22D3EE',
    'Tenis de Mesa': '#EC4899',
    'Ajedrez': '#F5F5DC',
    'Natación': '#3B82F6',
};

export const SPORT_SOFT_BG: Record<string, string> = {
    'Fútbol': 'bg-emerald-500/10',
    'Baloncesto': 'bg-amber-500/10',
    'Voleibol': 'bg-orange-500/10',
    'Tenis': 'bg-cyan-500/10',
    'Tenis de Mesa': 'bg-pink-500/10',
    'Ajedrez': 'bg-white/10',
    'Natación': 'bg-blue-500/10',
};

export const SPORT_ACCENT: Record<string, string> = {
    'Fútbol': 'text-emerald-400',
    'Baloncesto': 'text-amber-400',
    'Voleibol': 'text-orange-400',
    'Tenis': 'text-cyan-400',
    'Tenis de Mesa': 'text-pink-400',
    'Ajedrez': 'text-[#F5F5DC]',
    'Natación': 'text-blue-400',
};

export const SPORT_BORDER: Record<string, string> = {
    'Fútbol': 'border-emerald-500/20',
    'Baloncesto': 'border-amber-500/20',
    'Voleibol': 'border-orange-500/20',
    'Tenis': 'border-cyan-500/20',
    'Tenis de Mesa': 'border-pink-500/20',
    'Ajedrez': 'border-white/20',
    'Natación': 'border-blue-500/20',
};

export const SPORT_LIVE_TEXT: Record<string, string> = {
    'Fútbol': 'text-emerald-400',
    'Baloncesto': 'text-amber-400',
    'Voleibol': 'text-orange-400',
    'Tenis': 'text-cyan-400',
    'Tenis de Mesa': 'text-pink-400',
    'Ajedrez': 'text-white',
    'Natación': 'text-blue-400',
    'default': 'text-violet-300'
};

export const SPORT_LIVE_BG_WRAPPER: Record<string, string> = {
    'Fútbol': 'bg-emerald-500/10',
    'Baloncesto': 'bg-amber-500/10',
    'Voleibol': 'bg-orange-500/10',
    'Tenis': 'bg-cyan-500/10',
    'Tenis de Mesa': 'bg-pink-500/10',
    'Ajedrez': 'bg-white/10',
    'Natación': 'bg-blue-500/10',
    'default': 'bg-violet-500/10'
};

export const SPORT_LIVE_BAR: Record<string, string> = {
    'Fútbol': 'bg-emerald-500',
    'Baloncesto': 'bg-amber-500',
    'Voleibol': 'bg-orange-500',
    'Tenis': 'bg-cyan-500',
    'Tenis de Mesa': 'bg-pink-500',
    'Ajedrez': 'bg-white',
    'Natación': 'bg-blue-500',
    'default': 'bg-violet-500'
};

export const SPORT_GLOW: Record<string, string> = {
    'Fútbol': 'hover:shadow-lg hover:shadow-emerald-500/20',
    'Baloncesto': 'hover:shadow-lg hover:shadow-amber-500/20',
    'Voleibol': 'hover:shadow-lg hover:shadow-orange-500/20',
    'Tenis': 'hover:shadow-lg hover:shadow-cyan-500/20',
    'Tenis de Mesa': 'hover:shadow-lg hover:shadow-pink-500/20',
    'Ajedrez': 'hover:shadow-lg hover:shadow-white/20',
    'Natación': 'hover:shadow-lg hover:shadow-blue-500/20',
    'default': 'hover:shadow-lg hover:shadow-primary/20'
};

export const SPORT_GRADIENT: Record<string, string> = {
    'Fútbol': 'from-emerald-500/20 to-transparent',
    'Baloncesto': 'from-amber-500/20 to-transparent',
    'Voleibol': 'from-orange-500/20 to-transparent',
    'Tenis': 'from-cyan-500/20 to-transparent',
    'Tenis de Mesa': 'from-pink-500/20 to-transparent',
    'Ajedrez': 'from-white/20 to-transparent',
    'Natación': 'from-blue-500/20 to-transparent',
    'default': 'from-primary/10 to-transparent'
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
