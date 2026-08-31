// Shot on Stats - Tournament Simulation Engine for 2026 World Cup
import { runSimulation, type SimulationConfig, type SimulationResult } from './simulation';
import { computeGroupStandings, advanceFromGroupStage, seedKnockoutTeams, decideMatchOutcome, getHomeAdvantage } from './tournamentAdvancement';
import {
  TournamentTeam,
  TournamentMatch,
  TournamentStructure,
  TournamentStage,
  WORLD_CUP_2026,
  TOURNAMENT_STAGE_ORDER,
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
      homeAdvantage: getHomeAdvantage(match.stage, match.teamA.name, match.teamB.name),
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

    // The 10,000-trial result above reports probabilities and a
    // distribution; the bracket itself needs one concrete result, drawn
    // from the same model, so the tournament actually has upsets rather
    // than always advancing whichever team is favored.
    const outcome = decideMatchOutcome(match);

    match.completed = true;
    match.teamAScore = outcome.teamAScore;
    match.teamBScore = outcome.teamBScore;
    match.wentToPenalties = outcome.wentToPenalties;
    match.winner = outcome.winner;
    match.simulationResult = result;

    return {
      match,
      result,
      winner: outcome.winner
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
      const qualifiers = advanceFromGroupStage(this.progress.groupStandings);
      const seeded = seedKnockoutTeams(qualifiers);
      this.progress.knockoutBracket = seeded;
      this.progress.remainingMatches = generateKnockoutMatches(seeded, 'round32');
      this.progress.currentStage = 'round32';
    } else if (currentStage === 'round32') {
      const winners = stageResults.map(r => r.winner).filter(Boolean) as TournamentTeam[];
      const round16Matches = generateKnockoutMatches(winners, 'round16');
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

      // Third place is contested by the two semifinal *losers*. Comparing
      // against `winners[i]` here is a no-op - winners[i] literally is
      // stageResults[i].winner - so it always picked teamB, which is only
      // the loser half the time; comparing against the match's own teamA
      // is the actual "did teamA win" check.
      const thirdPlaceTeams = [
        stageResults[0].winner === stageResults[0].match.teamA ? stageResults[0].match.teamB : stageResults[0].match.teamA,
        stageResults[1].winner === stageResults[1].match.teamA ? stageResults[1].match.teamB : stageResults[1].match.teamA
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
    this.progress.groupStandings = computeGroupStandings(this.tournament.groups, this.progress.completedMatches);
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
      const teamsForStage = stage === 'round32' ? this.progress.knockoutBracket :
                           stage === 'round16' ? this.progress.knockoutBracket.slice(0, 16) :
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
    return TOURNAMENT_STAGE_ORDER;
  }

  reset(): void {
    this.tournament = JSON.parse(JSON.stringify(WORLD_CUP_2026));
    this.results = [];
    this.progress = this.initializeProgress();
  }
}

export { TournamentSimulator };
export type { TournamentSimulationResult, TournamentProgress };
