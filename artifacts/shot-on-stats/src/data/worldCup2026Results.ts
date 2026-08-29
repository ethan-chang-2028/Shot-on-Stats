// Real 2026 FIFA World Cup knockout-stage results, used to backtest the
// Elo -> Poisson -> Monte Carlo engine against actual outcomes (PRD Section 9,
// "Testing & Validation"). Elo ratings are the same pre-tournament estimates
// used to seed the bracket simulation in src/types/tournament.ts, so the
// backtest only uses information the model would have had before kickoff.

export type MatchOutcome = 'teamA' | 'teamB' | 'draw';

export interface RealMatchResult {
  id: string;
  stage: string;
  date: string;
  teamA: { name: string; elo: number };
  teamB: { name: string; elo: number };
  scoreA: number;
  scoreB: number;
  wentToExtraTime?: boolean;
  note?: string;
  source: string;
}

// A 90/120-minute draw that was settled on penalties is still a "draw" for
// simulation purposes: the model predicts regulation goal difference, not
// shootout outcomes, so the shootout winner isn't the outcome being scored.
export function outcomeOf(m: RealMatchResult): MatchOutcome {
  if (m.scoreA > m.scoreB) return 'teamA';
  if (m.scoreB > m.scoreA) return 'teamB';
  return 'draw';
}

export const WORLD_CUP_2026_RESULTS: RealMatchResult[] = [
  {
    id: 'r16-por-esp',
    stage: 'Round of 16',
    date: '2026-07-06',
    teamA: { name: 'Portugal', elo: 2070 },
    teamB: { name: 'Spain', elo: 2050 },
    scoreA: 0,
    scoreB: 1,
    note: "Mikel Merino's injury-time winner eliminated Ronaldo's Portugal.",
    source: 'FIFA match centre',
  },
  {
    id: 'r16-mar-can',
    stage: 'Round of 16',
    date: '2026-07-05',
    teamA: { name: 'Morocco', elo: 1860 },
    teamB: { name: 'Canada', elo: 1750 },
    scoreA: 3,
    scoreB: 0,
    source: 'Tournament reporting',
  },
  {
    id: 'qf-fra-mar',
    stage: 'Quarterfinal',
    date: '2026-07-11',
    teamA: { name: 'France', elo: 2120 },
    teamB: { name: 'Morocco', elo: 1860 },
    scoreA: 2,
    scoreB: 0,
    source: 'FIFA match centre',
  },
  {
    id: 'qf-esp-bel',
    stage: 'Quarterfinal',
    date: '2026-07-10',
    teamA: { name: 'Spain', elo: 2050 },
    teamB: { name: 'Belgium', elo: 2040 },
    scoreA: 2,
    scoreB: 1,
    note: "Merino's late substitute goal sent Spain through.",
    source: 'ESPN / FIFA match centre',
  },
  {
    id: 'qf-eng-nor',
    stage: 'Quarterfinal',
    date: '2026-07-11',
    teamA: { name: 'England', elo: 2080 },
    teamB: { name: 'Norway', elo: 1900 },
    scoreA: 2,
    scoreB: 1,
    wentToExtraTime: true,
    note: "Jude Bellingham's extra-time goal broke the deadlock.",
    source: 'FIFA match centre',
  },
  {
    id: 'qf-arg-sui',
    stage: 'Quarterfinal',
    date: '2026-07-11',
    teamA: { name: 'Argentina', elo: 2100 },
    teamB: { name: 'Switzerland', elo: 1970 },
    scoreA: 3,
    scoreB: 1,
    wentToExtraTime: true,
    source: 'FIFA match centre',
  },
  {
    id: 'sf-esp-fra',
    stage: 'Semifinal',
    date: '2026-07-14',
    teamA: { name: 'Spain', elo: 2050 },
    teamB: { name: 'France', elo: 2120 },
    scoreA: 2,
    scoreB: 0,
    note: 'The lower-Elo side won outright — the kind of upset the model should flag as a real possibility, not a certainty either way.',
    source: 'ESPN / FIFA match centre',
  },
  {
    id: 'sf-arg-eng',
    stage: 'Semifinal',
    date: '2026-07-15',
    teamA: { name: 'Argentina', elo: 2100 },
    teamB: { name: 'England', elo: 2080 },
    scoreA: 2,
    scoreB: 1,
    wentToExtraTime: true,
    source: 'Tournament reporting',
  },
  {
    id: 'third-eng-fra',
    stage: 'Third Place',
    date: '2026-07-18',
    teamA: { name: 'England', elo: 2080 },
    teamB: { name: 'France', elo: 2120 },
    scoreA: 6,
    scoreB: 4,
    note: "Saka's hat-trick held off a Mbappé-inspired France comeback — most goals in a World Cup match since 1982.",
    source: 'FIFA match centre / ESPN',
  },
  {
    id: 'final-esp-arg',
    stage: 'Final',
    date: '2026-07-19',
    teamA: { name: 'Spain', elo: 2050 },
    teamB: { name: 'Argentina', elo: 2100 },
    scoreA: 1,
    scoreB: 0,
    wentToExtraTime: true,
    note: "Ferran Torres's 106th-minute goal won Spain a second World Cup title.",
    source: 'FIFA match centre / CBS News / NPR',
  },
];
