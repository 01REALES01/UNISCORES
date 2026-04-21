export type TeamStanding = {
    team: string;
    teamId?: string;
    athleteId?: string; // For individual sports
    avatar_url?: string; // Icon/Logo URL
    played: number;
    won: number;
    lost: number;
    drawn: number;
    pointsFor: number;
    pointsAgainst: number;
    diff: number;
    points: number;
    fairPlayPoints: number;
    // Voley specific
    setsWon: number;
    setsLost: number;
    gamePointsFor: number;
    gamePointsAgainst: number;
    grupo?: string;
};

export function compareStandings(a: TeamStanding, b: TeamStanding, sportName: string): number {
    if (sportName === 'Voleibol') {
        // PT (4/3/2/1) primero, luego PG; coincide con tabla de grupos habitual.
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        const ratioA = a.setsLost === 0 ? a.setsWon + 1 : a.setsWon / a.setsLost;
        const ratioB = b.setsLost === 0 ? b.setsWon + 1 : b.setsWon / b.setsLost;
        if (ratioB !== ratioA) return ratioB - ratioA;
        const pRatioA = a.gamePointsAgainst === 0 ? a.gamePointsFor + 1 : a.gamePointsFor / a.gamePointsAgainst;
        const pRatioB = b.gamePointsAgainst === 0 ? b.gamePointsFor + 1 : b.gamePointsFor / b.gamePointsAgainst;
        if (pRatioB !== pRatioA) return pRatioB - pRatioA;
        return b.fairPlayPoints - a.fairPlayPoints;
    }
    if (sportName === 'Baloncesto') {
        // 1. Puntos totales (tabla), 2. Fair Play, 3. Diferencia de cestas
        if (b.points !== a.points) return b.points - a.points;
        if (b.fairPlayPoints !== a.fairPlayPoints) return b.fairPlayPoints - a.fairPlayPoints;
        return b.diff - a.diff;
    }
    if (sportName === 'Fútbol') {
        // 1. Puntos totales (tabla), 2. Fair Play, 3. Diferencia de gol
        if (b.points !== a.points) return b.points - a.points;
        if (b.fairPlayPoints !== a.fairPlayPoints) return b.fairPlayPoints - a.fairPlayPoints;
        return b.diff - a.diff;
    }
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return b.fairPlayPoints - a.fairPlayPoints;
}

const INDIVIDUAL_SPORTS = ['Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'];

export function calculateStandings(
    matches: any[],
    sportName: string,
    fairPlayData: Record<string, number> = {},
    nameToIdMap: Record<string, { teamId?: string; athleteId?: string; avatarUrl?: string; escudoUrl?: string }> = {}
): TeamStanding[] {
    const teams: Record<string, TeamStanding> = {};
    const isIndividualSport = INDIVIDUAL_SPORTS.includes(sportName);

    matches.forEach((m) => {
        const teamA = isIndividualSport ? (m.equipo_a || m.delegacion_a) : (m.delegacion_a || m.equipo_a);
        const teamB = isIndividualSport ? (m.equipo_b || m.delegacion_b) : (m.delegacion_b || m.equipo_b);
        const teamAId = m.carrera_a_id || m.athlete_a_id;
        const teamBId = m.carrera_b_id || m.athlete_b_id;
        const isIndividual = !!m.athlete_a_id;

        if (!teams[teamA]) {
            teams[teamA] = {
                team: teamA, 
                played: 0, won: 0, lost: 0, drawn: 0,
                pointsFor: 0, pointsAgainst: 0, diff: 0, points: 0,
                fairPlayPoints: fairPlayData[teamA] ?? 2000,
                setsWon: 0, setsLost: 0, gamePointsFor: 0, gamePointsAgainst: 0,
                grupo: m.grupo,
                avatar_url: isIndividual 
                    ? (m.atleta_a?.avatar_url || m.athlete_a?.avatar_url) 
                    : (m.carrera_a?.escudo_url || m.delegacion_a?.escudo_url || m.delegacion_a_info?.escudo_url)
            };
        }
        if (!teams[teamB]) {
            teams[teamB] = {
                team: teamB, 
                played: 0, won: 0, lost: 0, drawn: 0,
                pointsFor: 0, pointsAgainst: 0, diff: 0, points: 0,
                fairPlayPoints: fairPlayData[teamB] ?? 2000,
                setsWon: 0, setsLost: 0, gamePointsFor: 0, gamePointsAgainst: 0,
                grupo: m.grupo,
                avatar_url: isIndividual 
                    ? (m.atleta_b?.avatar_url || m.athlete_b?.avatar_url) 
                    : (m.carrera_b?.escudo_url || m.delegacion_b?.escudo_url || m.delegacion_b_info?.escudo_url)
            };
        }

        const subNormalize = (n: string) => n.toLowerCase().trim().replace(/^ing\.?\s*/, 'ingeniería ').replace(/^lic\.?\s*/, 'licenciatura ').replace(/^odont\.?\s*/, 'odontología ').replace(/\s+/g, ' ');
        const subClean = (n: string) => subNormalize(n).replace(/^(ingeniería|licenciatura|odontología)\s+/, '').trim();
        const subStrip = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const normA = teamA.trim().toLowerCase();
        const normB = teamB.trim().toLowerCase();
        const cleanA = subClean(teamA);
        const cleanB = subClean(teamB);
        const extraA = subNormalize(teamA);
        const extraB = subNormalize(teamB);
        const stripA = subStrip(teamA);
        const stripB = subStrip(teamB);

        // Ensure IDs are captured even if missing in previous matches
        if (teamAId) {
            if (isIndividual) teams[teamA].athleteId = String(teamAId);
            else teams[teamA].teamId = String(teamAId);
        } else {
            const data = nameToIdMap[normA] || nameToIdMap[cleanA] || nameToIdMap[extraA] || nameToIdMap[stripA];
            if (data) {
                if (data.athleteId) teams[teamA].athleteId = data.athleteId;
                else teams[teamA].teamId = data.teamId;
                if (data.avatarUrl || data.escudoUrl) teams[teamA].avatar_url = data.avatarUrl || data.escudoUrl;
            }
        }

        if (teamBId) {
            if (isIndividual) teams[teamB].athleteId = String(teamBId);
            else teams[teamB].teamId = String(teamBId);
        } else {
            const data = nameToIdMap[normB] || nameToIdMap[cleanB] || nameToIdMap[extraB] || nameToIdMap[stripB];
            if (data) {
                if (data.athleteId) teams[teamB].athleteId = data.athleteId;
                else teams[teamB].teamId = data.teamId;
                if (data.avatarUrl || data.escudoUrl) teams[teamB].avatar_url = data.avatarUrl || data.escudoUrl;
            }
        }

        if (m.estado === 'finalizado') {
            const md = m.marcador_detalle || {};
            let scoreA = 0;
            let scoreB = 0;

            if (sportName === 'Fútbol') {
                scoreA = md.goles_a ?? 0;
                scoreB = md.goles_b ?? 0;
            } else if (sportName === 'Voleibol' || sportName === 'Tenis' || sportName === 'Tenis de Mesa') {
                scoreA = md.sets_a ?? 0;
                scoreB = md.sets_b ?? 0;
            } else {
                scoreA = md.total_a ?? md.puntos_a ?? md.goles_a ?? 0;
                scoreB = md.total_b ?? md.puntos_b ?? md.goles_b ?? 0;
            }

            teams[teamA].played++;
            teams[teamB].played++;
            teams[teamA].pointsFor += scoreA;
            teams[teamA].pointsAgainst += scoreB;
            teams[teamB].pointsFor += scoreB;
            teams[teamB].pointsAgainst += scoreA;

            if (sportName === 'Voleibol') {
                teams[teamA].setsWon += scoreA;
                teams[teamA].setsLost += scoreB;
                teams[teamB].setsWon += scoreB;
                teams[teamB].setsLost += scoreA;

                if (md.sets) {
                    Object.values(md.sets).forEach((s: any) => {
                        teams[teamA].gamePointsFor += s.puntos_a || 0;
                        teams[teamA].gamePointsAgainst += s.puntos_b || 0;
                        teams[teamB].gamePointsFor += s.puntos_b || 0;
                        teams[teamB].gamePointsAgainst += s.puntos_a || 0;
                    });
                }
            }

            if (scoreA > scoreB) {
                teams[teamA].won++;
                teams[teamB].lost++;

                if (sportName === 'Voleibol') {
                    if (scoreA === 2 && scoreB === 0) {
                        teams[teamA].points += 4;
                        teams[teamB].points += 1;
                    } else if (scoreA === 2 && scoreB === 1) {
                        teams[teamA].points += 3;
                        teams[teamB].points += 2;
                    }
                } else if (sportName === 'Baloncesto') {
                    teams[teamA].points += 2;
                    teams[teamB].points += 1;
                } else {
                    teams[teamA].points += 3;
                }
            } else if (scoreB > scoreA) {
                teams[teamB].won++;
                teams[teamA].lost++;

                if (sportName === 'Voleibol') {
                    if (scoreB === 2 && scoreA === 0) {
                        teams[teamB].points += 4;
                        teams[teamA].points += 1;
                    } else if (scoreB === 2 && scoreA === 1) {
                        teams[teamB].points += 3;
                        teams[teamA].points += 2;
                    }
                } else if (sportName === 'Baloncesto') {
                    teams[teamB].points += 2;
                    teams[teamA].points += 1;
                } else {
                    teams[teamB].points += 3;
                }
            } else {
                if (sportName !== 'Baloncesto') {
                    teams[teamA].drawn++;
                    teams[teamB].drawn++;
                    teams[teamA].points += 1;
                    teams[teamB].points += 1;
                }
            }
        }
    });

    return Object.values(teams)
        .map(t => ({ ...t, diff: t.pointsFor - t.pointsAgainst }))
        .sort((a, b) => compareStandings(a, b, sportName));
}
