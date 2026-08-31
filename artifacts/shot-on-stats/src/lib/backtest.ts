// Backtesting harness: runs the same Monte Carlo simulation engine used for
// live predictions against real, completed 2026 World Cup matches, so the
// model's accuracy can be measured the way PRD Section 9 describes.
import { runSimulation } from './simulation';
import { getHomeAdvantage } from './tournamentAdvancement';
import {
  WORLD_CUP_2026_RESULTS,
  outcomeOf,
  type RealMatchResult,
  type MatchOutcome,
} from '@/data/worldCup2026Results';

export interface BacktestMatchComparison {
  match: RealMatchResult;
  actualOutcome: MatchOutcome;
  actualScoreline: string;
  predictedOutcome: MatchOutcome;
  predictedScoreline: string;
  winProbability: number;
  drawProbability: number;
  lossProbability: number;
  correct: boolean;
  brierScore: number;
}

export interface BacktestSummary {
  matches: number;
  correct: number;
  accuracy: number;
  brierScore: number;
}

// Runs the real simulation engine (10,000 Poisson trials per match by
// default) against every recorded 2026 World Cup match, using only the
// pre-tournament Elo ratings that would have been available before kickoff.
export function runBacktest(numTrials = 10000): BacktestMatchComparison[] {
  return WORLD_CUP_2026_RESULTS.map((match) => {
    const result = runSimulation({
      eloA: match.teamA.elo,
      eloB: match.teamB.elo,
      // Real host nations (USA, Mexico, Canada) play every group match on
      // home soil; every other stage is neutral-venue, matching the design
      // used elsewhere in this demo.
      homeAdvantage: getHomeAdvantage(match.stage, match.teamA.name, match.teamB.name),
      baselineGoals: 1.3,
      c: 200,
      numTrials,
    });

    const predictedOutcome: MatchOutcome =
      result.winProbability > result.drawProbability && result.winProbability > result.lossProbability
        ? 'teamA'
        : result.lossProbability > result.drawProbability
          ? 'teamB'
          : 'draw';

    const actualOutcome = outcomeOf(match);
    const actualIsA = actualOutcome === 'teamA' ? 1 : 0;
    const actualIsDraw = actualOutcome === 'draw' ? 1 : 0;
    const actualIsB = actualOutcome === 'teamB' ? 1 : 0;

    // Multi-class Brier score: sum of squared errors across all three
    // outcome probabilities (PRD Section 3.3), lower is better calibrated.
    const brierScore =
      (result.winProbability - actualIsA) ** 2 +
      (result.drawProbability - actualIsDraw) ** 2 +
      (result.lossProbability - actualIsB) ** 2;

    return {
      match,
      actualOutcome,
      actualScoreline: `${match.scoreA}-${match.scoreB}`,
      predictedOutcome,
      predictedScoreline: `${(Math.round(result.teamA.avgGoals * 10) / 10).toFixed(1)}-${(Math.round(result.teamB.avgGoals * 10) / 10).toFixed(1)}`,
      winProbability: result.winProbability,
      drawProbability: result.drawProbability,
      lossProbability: result.lossProbability,
      correct: predictedOutcome === actualOutcome,
      brierScore,
    };
  });
}

export function summarizeBacktest(comparisons: BacktestMatchComparison[]): BacktestSummary {
  const matches = comparisons.length;
  const correct = comparisons.filter((c) => c.correct).length;
  const brierScore = comparisons.reduce((sum, c) => sum + c.brierScore, 0) / matches;
  return {
    matches,
    correct,
    accuracy: matches > 0 ? correct / matches : 0,
    brierScore,
  };
}
