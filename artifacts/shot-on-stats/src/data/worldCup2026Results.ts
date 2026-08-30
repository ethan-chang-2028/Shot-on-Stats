// Real 2026 FIFA World Cup knockout-stage results (Round of 32 through the
// Final - the real group stage isn't reconstructed here), used to backtest
// the Elo -> Poisson -> Monte Carlo engine against actual outcomes (PRD
// Section 9, "Testing & Validation"). Elo ratings are the same pre-tournament
// estimates used to seed the bracket simulation in src/types/tournament.ts,
// so the backtest only uses information the model would have had before
// kickoff.

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
  wentToPenalties?: boolean;
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
  // --- Round of 32 (16 matches, June 28 - July 3, 2026) ---
  {
    id: 'r32-can-rsa',
    stage: 'Round of 32',
    date: '2026-06-28',
    teamA: { name: 'Canada', elo: 1750 },
    teamB: { name: 'South Africa', elo: 1650 },
    scoreA: 1,
    scoreB: 0,
    source: 'Tournament reporting',
  },
  {
    id: 'r32-col-gha',
    stage: 'Round of 32',
    date: '2026-06-29',
    teamA: { name: 'Colombia', elo: 1970 },
    teamB: { name: 'Ghana', elo: 1800 },
    scoreA: 1,
    scoreB: 0,
    note: "Jhon Arias's 14th-minute goal was enough.",
    source: 'Yahoo Sports',
  },
  {
    id: 'r32-usa-bih',
    stage: 'Round of 32',
    date: '2026-06-29',
    teamA: { name: 'USA', elo: 1820 },
    teamB: { name: 'Bosnia and Herzegovina', elo: 1800 },
    scoreA: 2,
    scoreB: 0,
    source: 'Tournament reporting',
  },
  {
    id: 'r32-bel-sen',
    stage: 'Round of 32',
    date: '2026-06-29',
    teamA: { name: 'Belgium', elo: 2040 },
    teamB: { name: 'Senegal', elo: 1900 },
    scoreA: 3,
    scoreB: 2,
    wentToExtraTime: true,
    note: '1-1 after 90 minutes.',
    source: 'Tournament reporting',
  },
  {
    id: 'r32-arg-cpv',
    stage: 'Round of 32',
    date: '2026-07-03',
    teamA: { name: 'Argentina', elo: 2100 },
    teamB: { name: 'Cape Verde', elo: 1680 },
    scoreA: 3,
    scoreB: 2,
    wentToExtraTime: true,
    note: 'Messi, L. Martinez and an own goal saw off a Cabo Verde side that took Argentina to the wire.',
    source: 'ESPN / FIFA match centre',
  },
  {
    id: 'r32-egy-aus',
    stage: 'Round of 32',
    date: '2026-06-30',
    teamA: { name: 'Egypt', elo: 1780 },
    teamB: { name: 'Australia', elo: 1740 },
    scoreA: 0,
    scoreB: 0,
    wentToExtraTime: true,
    wentToPenalties: true,
    note: 'Egypt won 4-2 on penalties.',
    source: 'Tournament reporting',
  },
  {
    id: 'r32-ned-mar',
    stage: 'Round of 32',
    date: '2026-06-29',
    teamA: { name: 'Netherlands', elo: 2050 },
    teamB: { name: 'Morocco', elo: 1860 },
    scoreA: 1,
    scoreB: 1,
    wentToExtraTime: true,
    wentToPenalties: true,
    note: 'Morocco won 3-2 on penalties in a dramatic shootout.',
    source: 'Al Jazeera / FIFA match centre',
  },
  {
    id: 'r32-esp-aut',
    stage: 'Round of 32',
    date: '2026-06-30',
    teamA: { name: 'Spain', elo: 2050 },
    teamB: { name: 'Austria', elo: 1870 },
    scoreA: 3,
    scoreB: 0,
    note: 'Mikel Oyarzabal scored twice.',
    source: 'Olympics.com',
  },
  {
    id: 'r32-sui-alg',
    stage: 'Round of 32',
    date: '2026-06-30',
    teamA: { name: 'Switzerland', elo: 1970 },
    teamB: { name: 'Algeria', elo: 1790 },
    scoreA: 2,
    scoreB: 0,
    source: 'Tournament reporting',
  },
  {
    id: 'r32-eng-cod',
    stage: 'Round of 32',
    date: '2026-06-30',
    teamA: { name: 'England', elo: 2080 },
    teamB: { name: 'Congo DR', elo: 1700 },
    scoreA: 2,
    scoreB: 1,
    note: 'England came from behind; two second-half Harry Kane goals won it.',
    source: 'Olympics.com',
  },
  {
    id: 'r32-fra-swe',
    stage: 'Round of 32',
    date: '2026-07-01',
    teamA: { name: 'France', elo: 2120 },
    teamB: { name: 'Sweden', elo: 1920 },
    scoreA: 3,
    scoreB: 0,
    source: 'Tournament reporting',
  },
  {
    id: 'r32-bra-jpn',
    stage: 'Round of 32',
    date: '2026-07-01',
    teamA: { name: 'Brazil', elo: 2150 },
    teamB: { name: 'Japan', elo: 1840 },
    scoreA: 2,
    scoreB: 1,
    source: 'Tournament reporting',
  },
  {
    id: 'r32-nor-civ',
    stage: 'Round of 32',
    date: '2026-07-01',
    teamA: { name: 'Norway', elo: 1900 },
    teamB: { name: 'Ivory Coast', elo: 1840 },
    scoreA: 2,
    scoreB: 1,
    source: 'Tournament reporting',
  },
  {
    id: 'r32-ger-par',
    stage: 'Round of 32',
    date: '2026-07-02',
    teamA: { name: 'Germany', elo: 2030 },
    teamB: { name: 'Paraguay', elo: 1780 },
    scoreA: 1,
    scoreB: 1,
    wentToExtraTime: true,
    wentToPenalties: true,
    note: 'Paraguay won 4-3 on penalties, eliminating Germany.',
    source: 'FIFA match centre',
  },
  {
    id: 'r32-mex-ecu',
    stage: 'Round of 32',
    date: '2026-07-02',
    teamA: { name: 'Mexico', elo: 1890 },
    teamB: { name: 'Ecuador', elo: 1850 },
    scoreA: 2,
    scoreB: 0,
    source: 'Tournament reporting',
  },
  {
    id: 'r32-por-cro',
    stage: 'Round of 32',
    date: '2026-07-03',
    teamA: { name: 'Portugal', elo: 2070 },
    teamB: { name: 'Croatia', elo: 1990 },
    scoreA: 2,
    scoreB: 1,
    source: 'Tournament reporting',
  },

  // --- Round of 16 (8 matches, July 4-7, 2026) ---
  {
    id: 'r16-mar-can',
    stage: 'Round of 16',
    date: '2026-07-04',
    teamA: { name: 'Morocco', elo: 1860 },
    teamB: { name: 'Canada', elo: 1750 },
    scoreA: 3,
    scoreB: 0,
    source: 'ESPN',
  },
  {
    id: 'r16-fra-par',
    stage: 'Round of 16',
    date: '2026-07-04',
    teamA: { name: 'France', elo: 2120 },
    teamB: { name: 'Paraguay', elo: 1780 },
    scoreA: 1,
    scoreB: 0,
    source: 'Tournament reporting',
  },
  {
    id: 'r16-bra-nor',
    stage: 'Round of 16',
    date: '2026-07-05',
    teamA: { name: 'Brazil', elo: 2150 },
    teamB: { name: 'Norway', elo: 1900 },
    scoreA: 1,
    scoreB: 2,
    note: 'One of the tournament\'s biggest shocks.',
    source: 'ESPN / FIFA match centre',
  },
  {
    id: 'r16-eng-mex',
    stage: 'Round of 16',
    date: '2026-07-05',
    teamA: { name: 'England', elo: 2080 },
    teamB: { name: 'Mexico', elo: 1890 },
    scoreA: 3,
    scoreB: 2,
    source: 'Tournament reporting',
  },
  {
    id: 'r16-esp-por',
    stage: 'Round of 16',
    date: '2026-07-06',
    teamA: { name: 'Spain', elo: 2050 },
    teamB: { name: 'Portugal', elo: 2070 },
    scoreA: 1,
    scoreB: 0,
    note: "Mikel Merino's injury-time winner eliminated Ronaldo's Portugal.",
    source: 'ESPN',
  },
  {
    id: 'r16-bel-usa',
    stage: 'Round of 16',
    date: '2026-07-06',
    teamA: { name: 'Belgium', elo: 2040 },
    teamB: { name: 'USA', elo: 1820 },
    scoreA: 4,
    scoreB: 1,
    note: "Ended the USA's home-soil run.",
    source: 'Tournament reporting',
  },
  {
    id: 'r16-arg-egy',
    stage: 'Round of 16',
    date: '2026-07-07',
    teamA: { name: 'Argentina', elo: 2100 },
    teamB: { name: 'Egypt', elo: 1780 },
    scoreA: 3,
    scoreB: 2,
    source: 'Tournament reporting',
  },
  {
    id: 'r16-sui-col',
    stage: 'Round of 16',
    date: '2026-07-07',
    teamA: { name: 'Switzerland', elo: 1970 },
    teamB: { name: 'Colombia', elo: 1970 },
    scoreA: 0,
    scoreB: 0,
    wentToExtraTime: true,
    wentToPenalties: true,
    note: 'Switzerland won 4-3 on penalties after a scoreless 120 minutes.',
    source: 'CBS Sports',
  },

  // --- Quarterfinals (4 matches) ---
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

  // --- Semifinals (2 matches) ---
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

  // --- Third Place & Final ---
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

// Every team this dataset has a real, tracked result for - derived from the
// match list itself so it always matches what's actually recorded above
// (currently every Round of 32 participant, 32 of the tournament's 48 teams;
// the real group stage isn't reconstructed here, so the other 16 teams -
// eliminated in the group stage - aren't tracked).
export const REAL_2026_TRACKED_TEAMS: string[] = Array.from(
  new Set(WORLD_CUP_2026_RESULTS.flatMap((m) => [m.teamA.name, m.teamB.name]))
).sort();

export type TeamOutcomeLabel =
  | 'Champion'
  | 'Runner-up'
  | 'Third Place'
  | 'Fourth Place'
  | 'Lost in Semifinal'
  | 'Quarterfinal exit'
  | 'Round of 16 exit'
  | 'Round of 32 exit'
  | 'Not tracked';

const STAGE_RANK: Record<string, number> = {
  'Round of 32': 1,
  'Round of 16': 2,
  'Quarterfinal': 3,
  'Semifinal': 4,
  'Third Place': 5,
  'Final': 5,
};

// Furthest real stage a team reached, derived from the match list itself
// (rather than hardcoded per team) so it stays correct if results are added.
export function getRealOutcome(teamName: string): TeamOutcomeLabel {
  const matches = WORLD_CUP_2026_RESULTS.filter((m) => m.teamA.name === teamName || m.teamB.name === teamName);
  if (matches.length === 0) return 'Not tracked';

  const furthest = matches.reduce((best, m) => (STAGE_RANK[m.stage] > STAGE_RANK[best.stage] ? m : best));
  const isTeamA = furthest.teamA.name === teamName;
  const won = isTeamA ? furthest.scoreA > furthest.scoreB : furthest.scoreB > furthest.scoreA;

  if (furthest.stage === 'Final') return won ? 'Champion' : 'Runner-up';
  if (furthest.stage === 'Third Place') return won ? 'Third Place' : 'Fourth Place';
  if (furthest.stage === 'Semifinal') return 'Lost in Semifinal';
  if (furthest.stage === 'Quarterfinal') return 'Quarterfinal exit';
  if (furthest.stage === 'Round of 16') return 'Round of 16 exit';
  return 'Round of 32 exit';
}
