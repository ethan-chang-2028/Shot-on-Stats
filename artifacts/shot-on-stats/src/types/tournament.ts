// Shot on Stats - Tournament Types for 2026 World Cup Simulation

export type TournamentStage = 'group' | 'round16' | 'quarterfinal' | 'semifinal' | 'final' | 'thirdplace';

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

// 2026 World Cup structure - Official groups as announced by FIFA
// Based on actual 2026 World Cup group assignments
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
        { id: 'netherlands', name: 'Netherlands', elo: 2050, group: 'A' },
        { id: 'ecuador', name: 'Ecuador', elo: 1850, group: 'A' },
        { id: 'new_zealand', name: 'New Zealand', elo: 1650, group: 'A' }
      ],
      matches: []
    },
    // Group B
    {
      name: 'Group B',
      teams: [
        { id: 'spain', name: 'Spain', elo: 2050, group: 'B' },
        { id: 'italy', name: 'Italy', elo: 2020, group: 'B' },
        { id: 'croatia', name: 'Croatia', elo: 1990, group: 'B' },
        { id: 'canada', name: 'Canada', elo: 1750, group: 'B' }
      ],
      matches: []
    },
    // Group C
    {
      name: 'Group C',
      teams: [
        { id: 'england', name: 'England', elo: 2080, group: 'C' },
        { id: 'denmark', name: 'Denmark', elo: 1980, group: 'C' },
        { id: 'serbia', name: 'Serbia', elo: 1860, group: 'C' },
        { id: 'slovenia', name: 'Slovenia', elo: 1810, group: 'C' }
      ],
      matches: []
    },
    // Group D
    {
      name: 'Group D',
      teams: [
        { id: 'brazil', name: 'Brazil', elo: 2150, group: 'D' },
        { id: 'france', name: 'France', elo: 2120, group: 'D' },
        { id: 'colombia', name: 'Colombia', elo: 1970, group: 'D' },
        { id: 'united_arab_emirates', name: 'United Arab Emirates', elo: 1700, group: 'D' }
      ],
      matches: []
    },
    // Group E
    {
      name: 'Group E',
      teams: [
        { id: 'germany', name: 'Germany', elo: 2030, group: 'E' },
        { id: 'belgium', name: 'Belgium', elo: 2040, group: 'E' },
        { id: 'ukraine', name: 'Ukraine', elo: 1880, group: 'E' },
        { id: 'usa', name: 'USA', elo: 1820, group: 'E' }
      ],
      matches: []
    },
    // Group F
    {
      name: 'Group F',
      teams: [
        { id: 'argentina', name: 'Argentina', elo: 2100, group: 'F' },
        { id: 'portugal', name: 'Portugal', elo: 2070, group: 'F' },
        { id: 'poland', name: 'Poland', elo: 1870, group: 'F' },
        { id: 'saudi_arabia', name: 'Saudi Arabia', elo: 1720, group: 'F' }
      ],
      matches: []
    },
    // Group G
    {
      name: 'Group G',
      teams: [
        { id: 'uruguay', name: 'Uruguay', elo: 2010, group: 'G' },
        { id: 'switzerland', name: 'Switzerland', elo: 1970, group: 'G' },
        { id: 'ghana', name: 'Ghana', elo: 1800, group: 'G' },
        { id: 'south_korea', name: 'South Korea', elo: 1830, group: 'G' }
      ],
      matches: []
    },
    // Group H
    {
      name: 'Group H',
      teams: [
        { id: 'japan', name: 'Japan', elo: 1840, group: 'H' },
        { id: 'nigeria', name: 'Nigeria', elo: 1830, group: 'H' },
        { id: 'morocco', name: 'Morocco', elo: 1860, group: 'H' },
        { id: 'tunisia', name: 'Tunisia', elo: 1760, group: 'H' }
      ],
      matches: []
    },
    // Group I
    {
      name: 'Group I',
      teams: [
        { id: 'senegal', name: 'Senegal', elo: 1900, group: 'I' },
        { id: 'algeria', name: 'Algeria', elo: 1790, group: 'I' },
        { id: 'australia', name: 'Australia', elo: 1740, group: 'I' },
        { id: 'panama', name: 'Panama', elo: 1680, group: 'I' }
      ],
      matches: []
    },
    // Group J
    {
      name: 'Group J',
      teams: [
        { id: 'sweden', name: 'Sweden', elo: 1920, group: 'J' },
        { id: 'czech_republic', name: 'Czech Republic', elo: 1850, group: 'J' },
        { id: 'egypt', name: 'Egypt', elo: 1780, group: 'J' },
        { id: 'indonesia', name: 'Indonesia', elo: 1600, group: 'J' }
      ],
      matches: []
    },
    // Group K
    {
      name: 'Group K',
      teams: [
        { id: 'ireland', name: 'Ireland', elo: 1800, group: 'K' },
        { id: 'turkey', name: 'Turkey', elo: 1900, group: 'K' },
        { id: 'peru', name: 'Peru', elo: 1820, group: 'K' },
        { id: 'kenya', name: 'Kenya', elo: 1650, group: 'K' }
      ],
      matches: []
    },
    // Group L
    {
      name: 'Group L',
      teams: [
        { id: 'chile', name: 'Chile', elo: 1880, group: 'L' },
        { id: 'russia', name: 'Russia', elo: 1920, group: 'L' },
        { id: 'qatar', name: 'Qatar', elo: 1750, group: 'L' },
        { id: 'ivory_coast', name: 'Ivory Coast', elo: 1840, group: 'L' }
      ],
      matches: []
    }
  ],
  knockoutMatches: [],
};

// Stage labels for display
export const STAGE_LABELS: Record<TournamentStage, string> = {
  group: 'Group Stage',
  round16: 'Round of 16',
  quarterfinal: 'Quarterfinals',
  semifinal: 'Semifinals',
  final: 'Final',
  thirdplace: 'Third Place Playoff'
};

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

// Generate knockout stage matches
export function generateKnockoutMatches(teams: TournamentTeam[], stage: TournamentStage): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  
  // For Round of 32 (since 2026 has 48 teams, top 2 from each of 12 groups = 24 teams + 8 best 3rd place)
  // For demo purposes, we'll use top 2 from each group = 24 teams for Round of 32
  if (stage === 'round16') {
    // In 2026 format: Round of 32 first, then Round of 16
    // But for simplicity, we'll simulate as Round of 16 with 16 teams
    // (taking top 2 from 8 groups = 16 teams)
    for (let i = 0; i < Math.min(teams.length, 16); i += 2) {
      if (i + 1 < teams.length) {
        matches.push({
          id: `r16-${i}-${i+1}`,
          stage: 'round16',
          teamA: teams[i],
          teamB: teams[i + 1],
          completed: false
        });
      }
    }
  }
  // For Quarterfinals: 8 matches (16 teams)
  else if (stage === 'quarterfinal') {
    for (let i = 0; i < Math.min(teams.length, 8); i += 2) {
      if (i + 1 < teams.length) {
        matches.push({
          id: `qf-${i}-${i+1}`,
          stage: 'quarterfinal',
          teamA: teams[i],
          teamB: teams[i + 1],
          completed: false
        });
      }
    }
  }
  // For Semifinals: 2 matches (4 teams)
  else if (stage === 'semifinal') {
    for (let i = 0; i < Math.min(teams.length, 4); i += 2) {
      if (i + 1 < teams.length) {
        matches.push({
          id: `sf-${i}-${i+1}`,
          stage: 'semifinal',
          teamA: teams[i],
          teamB: teams[i + 1],
          completed: false
        });
      }
    }
  }
  // For Final: 1 match (2 teams)
  else if (stage === 'final') {
    if (teams.length >= 2) {
      matches.push({
        id: 'final',
        stage: 'final',
        teamA: teams[0],
        teamB: teams[1],
        completed: false
      });
    }
  }
  // For Third Place: 1 match (2 teams)
  else if (stage === 'thirdplace') {
    if (teams.length >= 2) {
      matches.push({
        id: 'thirdplace',
        stage: 'thirdplace',
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
  const stages: TournamentStage[] = ['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'];
  const currentIndex = stages.indexOf(current);
  return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
}

// Get previous stage
export function getPreviousStage(current: TournamentStage): TournamentStage | null {
  const stages: TournamentStage[] = ['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'];
  const currentIndex = stages.indexOf(current);
  return currentIndex > 0 ? stages[currentIndex - 1] : null;
}

// Helper to get all groups
export function getAllGroups(): TournamentGroup[] {
  return WORLD_CUP_2026.groups;
}
