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

// 2026 World Cup structure (8 groups of 4 teams each for demo purposes)
export const WORLD_CUP_2026: TournamentStructure = {
  name: 'FIFA World Cup 2026',
  year: 2026,
  startDate: new Date('2026-06-11'), // Actual start date
  currentStage: 'group',
  groups: [
    {
      name: 'Group A',
      teams: [
        { id: 'qatar', name: 'Qatar', elo: 1750 },
        { id: 'ecuador', name: 'Ecuador', elo: 1850 },
        { id: 'senegal', name: 'Senegal', elo: 1900 },
        { id: 'netherlands', name: 'Netherlands', elo: 2050 }
      ],
      matches: []
    },
    {
      name: 'Group B',
      teams: [
        { id: 'england', name: 'England', elo: 2080 },
        { id: 'usa', name: 'USA', elo: 1820 },
        { id: 'iran', name: 'Iran', elo: 1780 },
        { id: 'ukraine', name: 'Ukraine', elo: 1880 }
      ],
      matches: []
    },
    {
      name: 'Group C',
      teams: [
        { id: 'argentina', name: 'Argentina', elo: 2100 },
        { id: 'mexico', name: 'Mexico', elo: 1890 },
        { id: 'poland', name: 'Poland', elo: 1870 },
        { id: 'saudi_arabia', name: 'Saudi Arabia', elo: 1720 }
      ],
      matches: []
    },
    {
      name: 'Group D',
      teams: [
        { id: 'france', name: 'France', elo: 2120 },
        { id: 'denmark', name: 'Denmark', elo: 1980 },
        { id: 'tunisia', name: 'Tunisia', elo: 1760 },
        { id: 'australia', name: 'Australia', elo: 1740 }
      ],
      matches: []
    },
    {
      name: 'Group E',
      teams: [
        { id: 'spain', name: 'Spain', elo: 2050 },
        { id: 'germany', name: 'Germany', elo: 2030 },
        { id: 'japan', name: 'Japan', elo: 1840 },
        { id: 'costarica', name: 'Costa Rica', elo: 1700 }
      ],
      matches: []
    },
    {
      name: 'Group F',
      teams: [
        { id: 'brazil', name: 'Brazil', elo: 2150 },
        { id: 'belgium', name: 'Belgium', elo: 2040 },
        { id: 'croatia', name: 'Croatia', elo: 1990 },
        { id: 'morocco', name: 'Morocco', elo: 1860 }
      ],
      matches: []
    },
    {
      name: 'Group G',
      teams: [
        { id: 'portugal', name: 'Portugal', elo: 2070 },
        { id: 'uruguay', name: 'Uruguay', elo: 2010 },
        { id: 'switzerland', name: 'Switzerland', elo: 1970 },
        { id: 'ghana', name: 'Ghana', elo: 1800 }
      ],
      matches: []
    },
    {
      name: 'Group H',
      teams: [
        { id: 'italy', name: 'Italy', elo: 2020 },
        { id: 'nigeria', name: 'Nigeria', elo: 1830 },
        { id: 'sweden', name: 'Sweden', elo: 1920 },
        { id: 'algeria', name: 'Algeria', elo: 1790 }
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
  
  // For Round of 16: 8 matches (16 teams)
  if (stage === 'round16') {
    for (let i = 0; i < teams.length; i += 2) {
      matches.push({
        id: `r16-${i}-${i+1}`,
        stage: 'round16',
        teamA: teams[i],
        teamB: teams[i + 1],
        completed: false
      });
    }
  }
  // For Quarterfinals: 4 matches (8 teams)
  else if (stage === 'quarterfinal') {
    for (let i = 0; i < teams.length; i += 2) {
      matches.push({
        id: `qf-${i}-${i+1}`,
        stage: 'quarterfinal',
        teamA: teams[i],
        teamB: teams[i + 1],
        completed: false
      });
    }
  }
  // For Semifinals: 2 matches (4 teams)
  else if (stage === 'semifinal') {
    for (let i = 0; i < teams.length; i += 2) {
      matches.push({
        id: `sf-${i}-${i+1}`,
        stage: 'semifinal',
        teamA: teams[i],
        teamB: teams[i + 1],
        completed: false
      });
    }
  }
  // For Final: 1 match (2 teams)
  else if (stage === 'final') {
    matches.push({
      id: 'final',
      stage: 'final',
      teamA: teams[0],
      teamB: teams[1],
      completed: false
    });
  }
  // For Third Place: 1 match (2 teams)
  else if (stage === 'thirdplace') {
    matches.push({
      id: 'thirdplace',
      stage: 'thirdplace',
      teamA: teams[0],
      teamB: teams[1],
      completed: false
    });
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
