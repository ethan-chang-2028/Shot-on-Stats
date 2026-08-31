// Runs one full "what if the model called every match itself" bracket:
// starting from the real group-stage schedule, the model's own simulated
// result at each stage determines who advances to the next one, cascading
// all the way to a simulated champion - unlike runBacktest() in backtest.ts,
// which always grades the model against the real historical bracket.
//
// This is deliberately NOT a formal accuracy backtest (PRD Section 9 still
// means runBacktest()): once the model's own results diverge from history,
// later rounds can pair two teams that never actually played each other, so
// there's no real result to grade those matches against. Only matches where
// this cascade happens to reproduce a real-world pairing (guaranteed for the
// 72 group matches, incidental for knockout matches) get a "correct" verdict.
import { TournamentSimulator } from './tournamentSimulation';
import { STAGE_LABELS, type TournamentMatch } from '@/types/tournament';
import { WORLD_CUP_2026_RESULTS, outcomeOf, type RealMatchResult, type MatchOutcome } from '@/data/worldCup2026Results';

export interface CascadeMatchResult {
  match: TournamentMatch;
  stageLabel: string;
  simulatedScoreline: string;
  simulatedOutcome: MatchOutcome;
  realMatch: RealMatchResult | null;
  actualScoreline: string | null;
  correct: boolean | null; // null when this pairing never happened in reality
}

export interface CascadeResult {
  matches: CascadeMatchResult[];
  simulatedChampion: string | null;
  comparableCount: number;
  comparableCorrect: number;
}

function findRealMatch(teamAName: string, teamBName: string): RealMatchResult | null {
  return (
    WORLD_CUP_2026_RESULTS.find(
      (m) =>
        (m.teamA.name === teamAName && m.teamB.name === teamBName) ||
        (m.teamA.name === teamBName && m.teamB.name === teamAName)
    ) ?? null
  );
}

// simulateTournament() is async only so its (unused here) progress callbacks
// could support incremental UI updates elsewhere - every step resolves
// synchronously under the hood, so this runs to completion in one go.
export async function runCascadeBracket(): Promise<CascadeResult> {
  const simulator = new TournamentSimulator();
  await simulator.simulateTournament();
  const allMatches = simulator.getProgress().completedMatches;

  const matches: CascadeMatchResult[] = allMatches.map((match) => {
    const scoreA = match.teamAScore ?? 0;
    const scoreB = match.teamBScore ?? 0;
    const simulatedOutcome: MatchOutcome = scoreA > scoreB ? 'teamA' : scoreB > scoreA ? 'teamB' : 'draw';
    const realMatch = findRealMatch(match.teamA.name, match.teamB.name);

    let actualScoreline: string | null = null;
    let correct: boolean | null = null;
    if (realMatch) {
      const realMatchIsSameOrientation = realMatch.teamA.name === match.teamA.name;
      actualScoreline = realMatchIsSameOrientation
        ? `${realMatch.scoreA}-${realMatch.scoreB}`
        : `${realMatch.scoreB}-${realMatch.scoreA}`;

      const realOutcome = outcomeOf(realMatch);
      const realOutcomeForThisOrientation: MatchOutcome = realMatchIsSameOrientation
        ? realOutcome
        : realOutcome === 'teamA' ? 'teamB' : realOutcome === 'teamB' ? 'teamA' : 'draw';
      correct = simulatedOutcome === realOutcomeForThisOrientation;
    }

    return {
      match,
      stageLabel: STAGE_LABELS[match.stage],
      simulatedScoreline: `${scoreA}-${scoreB}`,
      simulatedOutcome,
      realMatch,
      actualScoreline,
      correct,
    };
  });

  const comparable = matches.filter((m) => m.correct !== null);
  const finalMatch = matches.find((m) => m.match.stage === 'final');

  return {
    matches,
    simulatedChampion: finalMatch?.match.winner?.name ?? null,
    comparableCount: comparable.length,
    comparableCorrect: comparable.filter((m) => m.correct).length,
  };
}
