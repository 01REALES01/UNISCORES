
export type TeamStanding = {
    team: string;
    played: number;
    won: number;
    lost: number;
    drawn: number;
    pointsFor: number;
    pointsAgainst: number;
    diff: number;
    points: number;
    fairPlay: number;
    // Voley specific
    setsWon: number;
    setsLost: number;
    gamePointsFor: number;
    gamePointsAgainst: number;
    grupo?: string;
};

export function compareStandings(a: TeamStanding, b: TeamStanding, sportName: string): number {
    if (sportName === 'Voleibol') {
        if (b.won !== a.won) return b.won - a.won;
        if (b.points !== a.points) return b.points - a.points;
        const ratioA = a.setsLost === 0 ? a.setsWon + 1 : a.setsWon / a.setsLost;
        const ratioB = b.setsLost === 0 ? b.setsWon + 1 : b.setsWon / b.setsLost;
        if (ratioB !== ratioA) return ratioB - ratioA;
        const pRatioA = a.gamePointsAgainst === 0 ? a.gamePointsFor + 1 : a.gamePointsFor / a.gamePointsAgainst;
        const pRatioB = b.gamePointsAgainst === 0 ? b.gamePointsFor + 1 : b.gamePointsFor / b.gamePointsAgainst;
        if (pRatioB !== pRatioA) return pRatioB - pRatioA;
        return b.fairPlay - a.fairPlay;
    }
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return b.fairPlay - a.fairPlay;
}

export function calculateStandings(matches: any[], sportName: string, fairPlayData: Record<string, number> = {}): TeamStanding[] {
    const teams: Record<string, TeamStanding> = {};

    matches.forEach((m) => {
        const teamA = m.delegacion_a || m.equipo_a;
        const teamB = m.delegacion_b || m.equipo_b;

        if (!teams[teamA]) {
            teams[teamA] = { 
                team: teamA, played: 0, won: 0, lost: 0, drawn: 0, 
                pointsFor: 0, pointsAgainst: 0, diff: 0, points: 0, 
                fairPlay: fairPlayData[teamA] || 0,
                setsWon: 0, setsLost: 0, gamePointsFor: 0, gamePointsAgainst: 0,
                grupo: m.grupo 
            };
        }
        if (!teams[teamB]) {
            teams[teamB] = { 
                team: teamB, played: 0, won: 0, lost: 0, drawn: 0, 
                pointsFor: 0, pointsAgainst: 0, diff: 0, points: 0, 
                fairPlay: fairPlayData[teamB] || 0,
                setsWon: 0, setsLost: 0, gamePointsFor: 0, gamePointsAgainst: 0,
                grupo: m.grupo
            };
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
                    if (scoreA === 3 && (scoreB === 0 || scoreB === 1)) teams[teamA].points += 3;
                    else if (scoreA === 3 && scoreB === 2) {
                        teams[teamA].points += 2;
                        teams[teamB].points += 1;
                    }
                } else {
                    teams[teamA].points += 3;
                }
            } else if (scoreB > scoreA) {
                teams[teamB].won++;
                teams[teamA].lost++;

                if (sportName === 'Voleibol') {
                    if (scoreB === 3 && (scoreA === 0 || scoreA === 1)) teams[teamB].points += 3;
                    else if (scoreB === 3 && scoreA === 2) {
                        teams[teamB].points += 2;
                        teams[teamA].points += 1;
                    }
                } else {
                    teams[teamB].points += 3;
                }
            } else {
                teams[teamA].drawn++;
                teams[teamB].drawn++;
                teams[teamA].points += 1;
                teams[teamB].points += 1;
            }
        }
    });

    return Object.values(teams)
        .map(t => ({ ...t, diff: t.pointsFor - t.pointsAgainst }))
        .sort((a, b) => compareStandings(a, b, sportName));
}
