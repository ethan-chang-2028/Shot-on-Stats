// Shot on Stats - Tournament Types for 2026 World Cup Simulation

export type TournamentStage = 'group' | 'round32' | 'round16' | 'quarterfinal' | 'semifinal' | 'final' | 'thirdplace';

export interface TournamentTeam {
  id: string;
  name: string;
  elo: number;
  group?: string;
  points?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  wins?: number;
  draws?: number;
  losses?: number;
}

export interface TournamentMatch {
  id: string;
  stage: TournamentStage;
  teamA: TournamentTeam;
  teamB: TournamentTeam;
  teamAScore?: number;
  teamBScore?: number;
  wentToPenalties?: boolean;
  completed?: boolean;
  winner?: TournamentTeam | null;
  simulationResult?: any;
}

export interface TournamentGroup {
  name: string;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
}

export interface TournamentStructure {
  name: string;
  year: number;
  startDate: Date;
  currentStage: TournamentStage;
  groups: TournamentGroup[];
  knockoutMatches: TournamentMatch[];
  finalMatch?: TournamentMatch;
  thirdPlaceMatch?: TournamentMatch;
}

// The real 2026 World Cup group draw (48 teams, 12 groups of 4). Elo ratings
// are approximate pre-tournament estimates (same illustrative approach used
// throughout this demo, not official ClubElo figures) - they're what the
// simulation runs on, but the group assignments and the real results in
// src/data/worldCup2026Results.ts are the actual 2026 draw and outcomes, so
// the "Simulation vs. Real 2026 World Cup" comparison on the tournament page
// is comparing the same 48 teams reality did, not a fictional stand-in.
export const WORLD_CUP_2026: TournamentStructure = {
  name: 'FIFA World Cup 2026',
  year: 2026,
  startDate: new Date('2026-06-11'), // Actual start date
  currentStage: 'group',
  groups: [
    // Group A
    {
      name: 'Group A',
      teams: [
        { id: 'mexico', name: 'Mexico', elo: 1890, group: 'A' },
        { id: 'south_africa', name: 'South Africa', elo: 1650, group: 'A' },
        { id: 'korea_republic', name: 'Korea Republic', elo: 1830, group: 'A' },
        { id: 'czechia', name: 'Czechia', elo: 1850, group: 'A' }
      ],
      matches: []
    },
    // Group B
    {
      name: 'Group B',
      teams: [
        { id: 'canada', name: 'Canada', elo: 1750, group: 'B' },
        { id: 'bosnia_and_herzegovina', name: 'Bosnia and Herzegovina', elo: 1800, group: 'B' },
        { id: 'qatar', name: 'Qatar', elo: 1750, group: 'B' },
        { id: 'switzerland', name: 'Switzerland', elo: 1970, group: 'B' }
      ],
      matches: []
    },
    // Group C
    {
      name: 'Group C',
      teams: [
        { id: 'brazil', name: 'Brazil', elo: 2150, group: 'C' },
        { id: 'morocco', name: 'Morocco', elo: 1860, group: 'C' },
        { id: 'haiti', name: 'Haiti', elo: 1550, group: 'C' },
        { id: 'scotland', name: 'Scotland', elo: 1780, group: 'C' }
      ],
      matches: []
    },
    // Group D
    {
      name: 'Group D',
      teams: [
        { id: 'usa', name: 'USA', elo: 1820, group: 'D' },
        { id: 'paraguay', name: 'Paraguay', elo: 1780, group: 'D' },
        { id: 'australia', name: 'Australia', elo: 1740, group: 'D' },
        { id: 'turkiye', name: 'Turkiye', elo: 1900, group: 'D' }
      ],
      matches: []
    },
    // Group E
    {
      name: 'Group E',
      teams: [
        { id: 'germany', name: 'Germany', elo: 2030, group: 'E' },
        { id: 'curacao', name: 'Curacao', elo: 1550, group: 'E' },
        { id: 'ivory_coast', name: 'Ivory Coast', elo: 1840, group: 'E' },
        { id: 'ecuador', name: 'Ecuador', elo: 1850, group: 'E' }
      ],
      matches: []
    },
    // Group F
    {
      name: 'Group F',
      teams: [
        { id: 'netherlands', name: 'Netherlands', elo: 2050, group: 'F' },
        { id: 'japan', name: 'Japan', elo: 1840, group: 'F' },
        { id: 'sweden', name: 'Sweden', elo: 1920, group: 'F' },
        { id: 'tunisia', name: 'Tunisia', elo: 1760, group: 'F' }
      ],
      matches: []
    },
    // Group G
    {
      name: 'Group G',
      teams: [
        { id: 'belgium', name: 'Belgium', elo: 2040, group: 'G' },
        { id: 'egypt', name: 'Egypt', elo: 1780, group: 'G' },
        { id: 'iran', name: 'Iran', elo: 1800, group: 'G' },
        { id: 'new_zealand', name: 'New Zealand', elo: 1650, group: 'G' }
      ],
      matches: []
    },
    // Group H
    {
      name: 'Group H',
      teams: [
        { id: 'spain', name: 'Spain', elo: 2050, group: 'H' },
        { id: 'cape_verde', name: 'Cape Verde', elo: 1680, group: 'H' },
        { id: 'saudi_arabia', name: 'Saudi Arabia', elo: 1720, group: 'H' },
        { id: 'uruguay', name: 'Uruguay', elo: 2010, group: 'H' }
      ],
      matches: []
    },
    // Group I
    {
      name: 'Group I',
      teams: [
        { id: 'france', name: 'France', elo: 2120, group: 'I' },
        { id: 'senegal', name: 'Senegal', elo: 1900, group: 'I' },
        { id: 'iraq', name: 'Iraq', elo: 1650, group: 'I' },
        { id: 'norway', name: 'Norway', elo: 1900, group: 'I' }
      ],
      matches: []
    },
    // Group J
    {
      name: 'Group J',
      teams: [
        { id: 'argentina', name: 'Argentina', elo: 2100, group: 'J' },
        { id: 'algeria', name: 'Algeria', elo: 1790, group: 'J' },
        { id: 'austria', name: 'Austria', elo: 1870, group: 'J' },
        { id: 'jordan', name: 'Jordan', elo: 1650, group: 'J' }
      ],
      matches: []
    },
    // Group K
    {
      name: 'Group K',
      teams: [
        { id: 'portugal', name: 'Portugal', elo: 2070, group: 'K' },
        { id: 'congo_dr', name: 'Congo DR', elo: 1700, group: 'K' },
        { id: 'uzbekistan', name: 'Uzbekistan', elo: 1700, group: 'K' },
        { id: 'colombia', name: 'Colombia', elo: 1970, group: 'K' }
      ],
      matches: []
    },
    // Group L
    {
      name: 'Group L',
      teams: [
        { id: 'england', name: 'England', elo: 2080, group: 'L' },
        { id: 'croatia', name: 'Croatia', elo: 1990, group: 'L' },
        { id: 'ghana', name: 'Ghana', elo: 1800, group: 'L' },
        { id: 'panama', name: 'Panama', elo: 1680, group: 'L' }
      ],
      matches: []
    }
  ],
  knockoutMatches: [],
};

// Stage labels for display
export const STAGE_LABELS: Record<TournamentStage, string> = {
  group: 'Group Stage',
  round32: 'Round of 32',
  round16: 'Round of 16',
  quarterfinal: 'Quarterfinals',
  semifinal: 'Semifinals',
  final: 'Final',
  thirdplace: 'Third Place Playoff'
};

// Full 2026 format order: group stage, then a 32-team knockout bracket
// (top 2 of each of the 12 groups plus the best 8 third-place teams).
export const TOURNAMENT_STAGE_ORDER: TournamentStage[] = [
  'group', 'round32', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'
];

// Generate group stage matches for each group
export function generateGroupMatches(group: TournamentGroup): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const teams = group.teams;
  
  // Round robin: each team plays every other team once
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: `${group.name}-${teams[i].id}-${teams[j].id}`,
        stage: 'group',
        teamA: teams[i],
        teamB: teams[j],
        completed: false
      });
    }
  }
  
  return matches;
}

// Generate knockout stage matches by pairing consecutive teams
// (teams[0] vs teams[1], teams[2] vs teams[3], ...) - callers that need a
// seeded bracket (e.g. round32) should order `teams` accordingly first,
// such as via seedKnockoutTeams in lib/tournamentAdvancement.ts.
export function generateKnockoutMatches(teams: TournamentTeam[], stage: TournamentStage): TournamentMatch[] {
  const matches: TournamentMatch[] = [];

  if (stage === 'round32' || stage === 'round16' || stage === 'quarterfinal' || stage === 'semifinal') {
    const prefix = stage === 'round32' ? 'r32' : stage === 'round16' ? 'r16' : stage === 'quarterfinal' ? 'qf' : 'sf';
    for (let i = 0; i + 1 < teams.length; i += 2) {
      matches.push({
        id: `${prefix}-${i}-${i + 1}`,
        stage,
        teamA: teams[i],
        teamB: teams[i + 1],
        completed: false
      });
    }
  } else if (stage === 'final' || stage === 'thirdplace') {
    if (teams.length >= 2) {
      matches.push({
        id: stage,
        stage,
        teamA: teams[0],
        teamB: teams[1],
        completed: false
      });
    }
  }

  return matches;
}

// Get next stage after current
export function getNextStage(current: TournamentStage): TournamentStage | null {
  const currentIndex = TOURNAMENT_STAGE_ORDER.indexOf(current);
  return currentIndex >= 0 && currentIndex < TOURNAMENT_STAGE_ORDER.length - 1 ? TOURNAMENT_STAGE_ORDER[currentIndex + 1] : null;
}

// Get previous stage
export function getPreviousStage(current: TournamentStage): TournamentStage | null {
  const currentIndex = TOURNAMENT_STAGE_ORDER.indexOf(current);
  return currentIndex > 0 ? TOURNAMENT_STAGE_ORDER[currentIndex - 1] : null;
}

// Helper to get all groups
export function getAllGroups(): TournamentGroup[] {
  return WORLD_CUP_2026.groups;
}
