// Shot on Stats - Tournament Simulation Engine for 2026 World Cup
import { runSimulation, type SimulationConfig, type SimulationResult } from './simulation';
import { 
  TournamentTeam, 
  TournamentMatch, 
  TournamentStructure, 
  TournamentStage,
  WORLD_CUP_2026,
  generateGroupMatches,
  generateKnockoutMatches,
  getNextStage,
  STAGE_LABELS
} from '@/types/tournament';

interface TournamentSimulationResult {
  match: TournamentMatch;
  result: SimulationResult;
  winner: TournamentTeam | null;
}

interface TournamentProgress {
  currentStage: TournamentStage;
  completedMatches: TournamentMatch[];
  remainingMatches: TournamentMatch[];
  groupStandings: Record<string, TournamentTeam[]>;
  knockoutBracket: TournamentTeam[];
}

class TournamentSimulator {
  private tournament: TournamentStructure;
  private results: TournamentSimulationResult[];
  private progress: TournamentProgress;

  constructor(tournament: TournamentStructure = WORLD_CUP_2026) {
    this.tournament = tournament;
    this.results = [];
    this.progress = this.initializeProgress();
  }

  private initializeProgress(): TournamentProgress {
    const groupsWithMatches = this.tournament.groups.map(group => ({
      ...group,
      matches: generateGroupMatches(group)
    }));

    this.tournament.groups = groupsWithMatches;
    const allGroupMatches = groupsWithMatches.flatMap(g => g.matches);

    return {
      currentStage: 'group',
      completedMatches: [],
      remainingMatches: [...allGroupMatches],
      groupStandings: {},
      knockoutBracket: []
    };
  }

  async simulateMatch(
    match: TournamentMatch,
    onProgress?: (progress: { match: TournamentMatch; trial: number; totalTrials: number }) => void
  ): Promise<TournamentSimulationResult> {
    const config: SimulationConfig = {
      eloA: match.teamA.elo,
      eloB: match.teamB.elo,
      homeAdvantage: 0,
      baselineGoals: 1.3,
      c: 200,
      numTrials: 10000
    };

    const result = runSimulation(config, (update) => {
      if (onProgress) {
        onProgress({
          match,
          trial: update.trial,
          totalTrials: 10000
        });
      }
    });

    let winner: TournamentTeam | null = null;
    if (result.winProbability > result.drawProbability && result.winProbability > result.lossProbability) {
      winner = match.teamA;
    } else if (result.lossProbability > result.drawProbability) {
      winner = match.teamB;
    }

    match.completed = true;
    match.winner = winner;
    match.simulationResult = result;

    return {
      match,
      result,
      winner
    };
  }

  async simulateCurrentStage(
    onMatchProgress?: (match: TournamentMatch, result: SimulationResult) => void,
    onStageComplete?: (stage: TournamentStage) => void
  ): Promise<TournamentSimulationResult[]> {
    const stageResults: TournamentSimulationResult[] = [];
    const currentStage = this.progress.currentStage;
    const matchesToSimulate = [...this.progress.remainingMatches];

    for (const match of matchesToSimulate) {
      const result = await this.simulateMatch(match);
      stageResults.push(result);
      this.progress.completedMatches.push(match);
      this.progress.remainingMatches = this.progress.remainingMatches.filter(m => m.id !== match.id);

      if (onMatchProgress) {
        onMatchProgress(match, result.result);
      }
    }

    if (currentStage === 'group') {
      this.updateGroupStandings();
      const knockoutTeams = this.advanceFromGroupStage();
      this.progress.knockoutBracket = knockoutTeams;
      const round16Matches = generateKnockoutMatches(knockoutTeams, 'round16');
      this.progress.remainingMatches = round16Matches;
      this.progress.currentStage = 'round16';
    } else if (currentStage === 'round16') {
      const winners = stageResults.map(r => r.winner).filter(Boolean) as TournamentTeam[];
      const quarterfinalMatches = generateKnockoutMatches(winners, 'quarterfinal');
      this.progress.remainingMatches = quarterfinalMatches;
      this.progress.currentStage = 'quarterfinal';
    } else if (currentStage === 'quarterfinal') {
      const winners = stageResults.map(r => r.winner).filter(Boolean) as TournamentTeam[];
      const semifinalMatches = generateKnockoutMatches(winners, 'semifinal');
      this.progress.remainingMatches = semifinalMatches;
      this.progress.currentStage = 'semifinal';
    } else if (currentStage === 'semifinal') {
      const winners = stageResults.map(r => r.winner).filter(Boolean) as TournamentTeam[];
      const finalMatch: TournamentMatch = {
        id: 'final',
        stage: 'final',
        teamA: winners[0],
        teamB: winners[1],
        completed: false
      };

      const thirdPlaceTeams = [
        stageResults[0].winner === winners[0] ? stageResults[0].match.teamB : stageResults[0].match.teamA,
        stageResults[1].winner === winners[1] ? stageResults[1].match.teamB : stageResults[1].match.teamA
      ];

      const thirdPlaceMatch: TournamentMatch = {
        id: 'thirdplace',
        stage: 'thirdplace',
        teamA: thirdPlaceTeams[0],
        teamB: thirdPlaceTeams[1],
        completed: false
      };

      this.progress.remainingMatches = [finalMatch, thirdPlaceMatch];
      this.progress.currentStage = 'final';
    } else if (currentStage === 'final') {
      this.progress.currentStage = 'thirdplace';
    }

    if (onStageComplete) {
      onStageComplete(currentStage);
    }

    return stageResults;
  }

  private updateGroupStandings(): void {
    const standings: Record<string, TournamentTeam[]> = {};

    for (const group of this.tournament.groups) {
      const groupTeams = [...group.teams];
      const groupMatches = this.progress.completedMatches.filter(m =>
        group.teams.some(t => t.id === m.teamA.id || t.id === m.teamB.id)
      );

      for (const team of groupTeams) {
        team.points = 0;
        team.wins = 0;
        team.draws = 0;
        team.losses = 0;
        team.goalsFor = 0;
        team.goalsAgainst = 0;
      }

      for (const match of groupMatches) {
        if (match.winner) {
          const winningTeam = groupTeams.find(t => t.id === match.winner!.id);
          const losingTeam = groupTeams.find(t =>
            t.id === (match.winner!.id === match.teamA.id ? match.teamB.id : match.teamA.id)
          );

          if (winningTeam) {
            winningTeam.points = (winningTeam.points || 0) + 3;
            winningTeam.wins = (winningTeam.wins || 0) + 1;
          }
          if (losingTeam) {
            losingTeam.losses = (losingTeam.losses || 0) + 1;
          }
        } else {
          const teamA = groupTeams.find(t => t.id === match.teamA.id);
          const teamB = groupTeams.find(t => t.id === match.teamB.id);

          if (teamA) {
            teamA.points = (teamA.points || 0) + 1;
            teamA.draws = (teamA.draws || 0) + 1;
          }
          if (teamB) {
            teamB.points = (teamB.points || 0) + 1;
            teamB.draws = (teamB.draws || 0) + 1;
          }
        }
      }

      groupTeams.sort((a, b) => (b.points || 0) - (a.points || 0));
      standings[group.name] = groupTeams;
    }

    this.progress.groupStandings = standings;
  }

  private advanceFromGroupStage(): TournamentTeam[] {
    const advancedTeams: TournamentTeam[] = [];

    for (const group of this.tournament.groups) {
      const groupStandings = this.progress.groupStandings[group.name] || [];
      const topTwo = groupStandings.slice(0, 2);
      advancedTeams.push(...topTwo);
    }

    return advancedTeams;
  }

  async simulateTournament(
    onMatchProgress?: (match: TournamentMatch, result: SimulationResult) => void,
    onStageComplete?: (stage: TournamentStage) => void
  ): Promise<TournamentSimulationResult[]> {
    const allResults: TournamentSimulationResult[] = [];

    while (this.progress.remainingMatches.length > 0) {
      const stageResults = await this.simulateCurrentStage(onMatchProgress, onStageComplete);
      allResults.push(...stageResults);
    }

    return allResults;
  }

  async simulateStage(
    stage: TournamentStage,
    onMatchProgress?: (match: TournamentMatch, result: SimulationResult) => void
  ): Promise<TournamentSimulationResult[]> {
    this.progress.currentStage = stage;

    if (stage !== 'group') {
      const teamsForStage = stage === 'round16' ? this.progress.knockoutBracket :
                           stage === 'quarterfinal' ? this.progress.knockoutBracket.slice(0, 8) :
                           stage === 'semifinal' ? this.progress.knockoutBracket.slice(0, 4) :
                           this.progress.knockoutBracket.slice(0, 2);

      if (teamsForStage && teamsForStage.length > 0) {
        this.progress.remainingMatches = generateKnockoutMatches(teamsForStage, stage);
      }
    }

    return this.simulateCurrentStage(onMatchProgress);
  }

  getTournament(): TournamentStructure {
    return this.tournament;
  }

  getProgress(): TournamentProgress {
    return this.progress;
  }

  getCurrentStageLabel(): string {
    return STAGE_LABELS[this.progress.currentStage];
  }

  getAllStages(): TournamentStage[] {
    return ['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'];
  }

  reset(): void {
    this.tournament = JSON.parse(JSON.stringify(WORLD_CUP_2026));
    this.results = [];
    this.progress = this.initializeProgress();
  }
}

export { TournamentSimulator };
export type { TournamentSimulationResult, TournamentProgress };
