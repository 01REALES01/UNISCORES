/**
 * bracket-config.ts
 * Hardcoded bracket rules per sport+gender for the Uninorte Olympics.
 *
 * Three bracket resolution types:
 *   - unified_table:       All qualified teams ranked in one table → seeded cuartos (1v8, 2v7, …)
 *   - direct_cross:        1A vs 2B, 1B vs 2A → semis
 *   - single_group_final:  Top 2 from single group → final
 */

export type BracketType = 'unified_table' | 'direct_cross' | 'single_group_final';

export type BracketConfig = {
    type: BracketType;
    /** Expected group letters (e.g. ['A','B','C','D']) */
    groups: string[];
    /** How many advance from each group */
    qualifyPerGroup: number;
    /** Extra spots filled by best third-place teams (only for unified_table) */
    bestThirds?: number;
    /** Total teams entering elimination phase */
    totalQualified: number;
    /** First elimination phase: 'cuartos' | 'semifinal' | 'final' */
    eliminatoryPhase: 'cuartos' | 'semifinal' | 'final';
};

export const BRACKET_CONFIGS: Record<string, BracketConfig> = {
    // Fútbol Masc: 4 grupos, top 2 each = 8 → unified table → cuartos
    'Fútbol|masculino': {
        type: 'unified_table',
        groups: ['A', 'B', 'C', 'D'],
        qualifyPerGroup: 2,
        totalQualified: 8,
        eliminatoryPhase: 'cuartos',
    },
    // Mismo criterio que masc hasta confirmar fixture; validar placeholders del Excel
    'Fútbol|femenino': {
        type: 'unified_table',
        groups: ['A', 'B', 'C', 'D'],
        qualifyPerGroup: 2,
        totalQualified: 8,
        eliminatoryPhase: 'cuartos',
    },

    // Baloncesto Masc: 3 grupos, top 2 + 2 best thirds = 8 → unified table → cuartos
    'Baloncesto|masculino': {
        type: 'unified_table',
        groups: ['A', 'B', 'C'],
        qualifyPerGroup: 2,
        bestThirds: 2,
        totalQualified: 8,
        eliminatoryPhase: 'cuartos',
    },

    // Voleibol Masc: 2 grupos, top 2 each = 4 → direct cross → semis
    'Voleibol|masculino': {
        type: 'direct_cross',
        groups: ['A', 'B'],
        qualifyPerGroup: 2,
        totalQualified: 4,
        eliminatoryPhase: 'semifinal',
    },

    // Voleibol Fem: 2 grupos, top 2 each = 4 → direct cross → semis
    'Voleibol|femenino': {
        type: 'direct_cross',
        groups: ['A', 'B'],
        qualifyPerGroup: 2,
        totalQualified: 4,
        eliminatoryPhase: 'semifinal',
    },

    // Baloncesto Fem: 6 teams in 1 group, top 2 → final
    'Baloncesto|femenino': {
        type: 'single_group_final',
        groups: ['A'],
        qualifyPerGroup: 2,
        totalQualified: 2,
        eliminatoryPhase: 'final',
    },
};

/** Returns the bracket config for a sport+gender, or null if not configured. */
export function getBracketConfig(sportName: string, genero: string): BracketConfig | null {
    return BRACKET_CONFIGS[`${sportName}|${genero}`] ?? null;
}

/** Sports that have bracket configurations */
export const SORTEO_SPORTS = ['Fútbol', 'Baloncesto', 'Voleibol'] as const;
