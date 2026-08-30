// Shared group-standings / bracket-advancement / match-outcome logic for the
// 2026 World Cup simulation, used by both TournamentSimulator and
// TournamentPage so there is exactly one implementation of "who advances."
import { drawMatchOutcome, drawKnockoutOutcome } from './simulation';
import type { TournamentGroup, TournamentMatch, TournamentTeam } from '@/types/tournament';

// Recomputes points / goal difference / goals for from a group's completed
// matches (using each match's realized teamAScore/teamBScore) and returns
// each group's standings sorted by points, then goal difference, then goals
// scored - the standard World Cup tiebreak order (head-to-head and fair-play
// points are intentionally out of scope for this demo).
export function computeGroupStandings(
  groups: TournamentGroup[],
  completedMatches: TournamentMatch[]
): Record<string, TournamentTeam[]> {
  const standingsByGroup: Record<string, TournamentTeam[]> = {};

  for (const group of groups) {
    const groupTeams = group.teams.map((t) => ({ ...t, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }));
    const byId = new Map(groupTeams.map((t) => [t.id, t]));

    const groupMatches = completedMatches.filter(
      (m) => m.stage === 'group' && byId.has(m.teamA.id) && byId.has(m.teamB.id)
    );

    for (const match of groupMatches) {
      const teamA = byId.get(match.teamA.id)!;
      const teamB = byId.get(match.teamB.id)!;
      const scoreA = match.teamAScore ?? 0;
      const scoreB = match.teamBScore ?? 0;

      teamA.goalsFor! += scoreA;
      teamA.goalsAgainst! += scoreB;
      teamB.goalsFor! += scoreB;
      teamB.goalsAgainst! += scoreA;

      if (scoreA > scoreB) {
        teamA.points! += 3;
        teamA.wins! += 1;
        teamB.losses! += 1;
      } else if (scoreB > scoreA) {
        teamB.points! += 3;
        teamB.wins! += 1;
        teamA.losses! += 1;
      } else {
        teamA.points! += 1;
        teamB.points! += 1;
        teamA.draws! += 1;
        teamB.draws! += 1;
      }
    }

    groupTeams.sort(
      (a, b) =>
        (b.points! - a.points!) ||
        (b.goalsFor! - b.goalsAgainst! - (a.goalsFor! - a.goalsAgainst!)) ||
        (b.goalsFor! - a.goalsFor!)
    );
    standingsByGroup[group.name] = groupTeams;
  }

  return standingsByGroup;
}

// Real 2026 format: top 2 of each of the 12 groups (24 teams) plus the best
// 8 third-place teams across all groups (8 teams) advance to a 32-team
// knockout bracket.
export function advanceFromGroupStage(standingsByGroup: Record<string, TournamentTeam[]>): TournamentTeam[] {
  const winners: TournamentTeam[] = [];
  const runnersUp: TournamentTeam[] = [];
  const thirds: TournamentTeam[] = [];

  for (const standings of Object.values(standingsByGroup)) {
    if (standings[0]) winners.push(standings[0]);
    if (standings[1]) runnersUp.push(standings[1]);
    if (standings[2]) thirds.push(standings[2]);
  }

  const bestThirds = [...thirds]
    .sort(
      (a, b) =>
        (b.points! - a.points!) ||
        (b.goalsFor! - b.goalsAgainst! - (a.goalsFor! - a.goalsAgainst!)) ||
        (b.goalsFor! - a.goalsFor!)
    )
    .slice(0, 8);

  return [...winners, ...runnersUp, ...bestThirds];
}

// Seeds a set of qualifiers into bracket order by Elo (snake seeding:
// strongest vs weakest, 2nd-strongest vs 2nd-weakest, ...) so that
// consecutive pairing in generateKnockoutMatches produces a standard
// single-elimination seeded bracket rather than pairing group-mates or
// stacking top teams together. A simplification of FIFA's official
// pot-based draw, which also keeps group-mates apart in the first round.
export function seedKnockoutTeams(teams: TournamentTeam[]): TournamentTeam[] {
  const byElo = [...teams].sort((a, b) => b.elo - a.elo);
  const seeded: TournamentTeam[] = [];
  for (let i = 0; i < Math.floor(byElo.length / 2); i++) {
    seeded.push(byElo[i], byElo[byElo.length - 1 - i]);
  }
  return seeded;
}

export interface DecidedOutcome {
  teamAScore: number;
  teamBScore: number;
  wentToPenalties: boolean;
  winner: TournamentTeam | null; // null only possible for group-stage draws
}

// Draws ONE realized result for a match: a plain scoreline (draws allowed)
// for the group stage, or a decisive knockout result (extra time, then a
// near-coin-flip shootout) for every other stage.
export function decideMatchOutcome(match: TournamentMatch): DecidedOutcome {
  const config = { eloA: match.teamA.elo, eloB: match.teamB.elo, homeAdvantage: 0, baselineGoals: 1.3, c: 200, numTrials: 0 };

  if (match.stage === 'group') {
    const { goalsA, goalsB } = drawMatchOutcome(config);
    const winner = goalsA > goalsB ? match.teamA : goalsB > goalsA ? match.teamB : null;
    return { teamAScore: goalsA, teamBScore: goalsB, wentToPenalties: false, winner };
  }

  const outcome = drawKnockoutOutcome(config);
  return {
    teamAScore: outcome.goalsA,
    teamBScore: outcome.goalsB,
    wentToPenalties: outcome.wentToPenalties,
    winner: outcome.winner === 'A' ? match.teamA : match.teamB,
  };
}
