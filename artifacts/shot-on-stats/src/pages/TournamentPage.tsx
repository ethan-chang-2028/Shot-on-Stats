import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Trophy, 
  Users, 
  BarChart3,
  Target,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  ListChecks
} from 'lucide-react';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Cell
} from 'recharts';
import { TournamentSimulator } from '@/lib/tournamentSimulation';
import { runSimulation, getMostLikelyScoreline } from '@/lib/simulation';
import { computeGroupStandings, advanceFromGroupStage, seedKnockoutTeams, decideMatchOutcome } from '@/lib/tournamentAdvancement';
import {
  WORLD_CUP_2026,
  TournamentStage,
  TournamentMatch,
  TournamentTeam,
  STAGE_LABELS,
  TOURNAMENT_STAGE_ORDER,
  getNextStage,
  getPreviousStage,
  generateGroupMatches,
  generateKnockoutMatches
} from '@/types/tournament';
import { REAL_2026_TRACKED_TEAMS, getRealOutcome, type TeamOutcomeLabel } from '@/data/worldCup2026Results';

// World Cup 2026 start date
const WORLD_CUP_2026_START = new Date('2026-06-11');

// Poisson random draw (Knuth's algorithm), used only for the animated
// single-match trial-by-trial display; the actual decisive bracket result
// comes from decideMatchOutcome (see lib/tournamentAdvancement).
function poissonRandom(lambda: number): number {
  if (lambda <= 0) return 0;
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Same ranking idea as getRealOutcome (src/data/worldCup2026Results.ts),
// but over this simulation's own stage set, which goes one round deeper
// (Round of 32) than the real dataset tracks.
const SIM_STAGE_RANK: Record<TournamentStage, number> = {
  group: 0, round32: 1, round16: 2, quarterfinal: 3, semifinal: 4, final: 5, thirdplace: 5
};

// Furthest stage a team reached in *this* simulated run - same label set as
// getRealOutcome (including 'Eliminated in Group Stage') so the two can be
// compared directly, plus 'Not simulated' for a team not reached yet.
function getSimulatedOutcome(teamName: string, matches: TournamentMatch[]): TeamOutcomeLabel | 'Not simulated' {
  const teamMatches = matches.filter(m => m.teamA.name === teamName || m.teamB.name === teamName);
  if (teamMatches.length === 0) return 'Not simulated';

  const furthest = teamMatches.reduce((best, m) => (SIM_STAGE_RANK[m.stage] > SIM_STAGE_RANK[best.stage] ? m : best));
  const isTeamA = furthest.teamA.name === teamName;
  const won = isTeamA ? furthest.winner?.id === furthest.teamA.id : furthest.winner?.id === furthest.teamB.id;

  if (furthest.stage === 'final') return won ? 'Champion' : 'Runner-up';
  if (furthest.stage === 'thirdplace') return won ? 'Third Place' : 'Fourth Place';
  if (furthest.stage === 'semifinal') return 'Lost in Semifinal';
  if (furthest.stage === 'quarterfinal') return 'Quarterfinal exit';
  if (furthest.stage === 'round16') return 'Round of 16 exit';
  if (furthest.stage === 'round32') return 'Round of 32 exit';
  return 'Eliminated in Group Stage';
}

interface SimulationProgress {
  trial: number;
  teamA: {
    currentAvgGoals: number;
    currentGoalDistribution: Map<number, number>;
    wins: number;
    draws: number;
    losses: number;
  };
  teamB: {
    currentAvgGoals: number;
    currentGoalDistribution: Map<number, number>;
    wins: number;
    draws: number;
    losses: number;
  };
}

interface MatchStats {
  winProbability: number;
  drawProbability: number;
  lossProbability: number;
  avgGoalsA: number;
  avgGoalsB: number;
  mostLikelyScore: string;
  simulationResult: unknown;
}

interface MatchResult {
  match: TournamentMatch;
  result: {
    winProbability: number;
    drawProbability: number;
    lossProbability: number;
    avgGoalsA: number;
    avgGoalsB: number;
    mostLikelyScore: string;
  };
}

export default function TournamentPage() {
  const [simulator] = useState(() => new TournamentSimulator(WORLD_CUP_2026));
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedStage, setSelectedStage] = useState<TournamentStage>('group');
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [showFlowChart, setShowFlowChart] = useState(false);
  const [showTournamentFlow, setShowTournamentFlow] = useState(false);
  
  // Simulation mode: 'single' (one at a time with animation) or 'batch' (all at once, fast)
  const [simulationMode, setSimulationMode] = useState<'single' | 'batch'>('batch');
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // For tracking active simulation
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult>>({});

  // "Full Tournament" always starts from a clean slate: resetTournament()
  // triggers React state updates (new progress/tournament references), and
  // this flag defers the actual run to the effect below so it runs against
  // the *post-reset* state instead of the stale closure captured before the
  // reset (state updates aren't visible synchronously in the same handler).
  const [pendingFullRun, setPendingFullRun] = useState(false);

  // simulator/progress/tournament are plain mutable objects (not React
  // state), so mutating them - a completed match, updated standings, a
  // freshly-generated next stage - doesn't itself trigger a re-render or
  // change any object's *reference*. Every useMemo below that derives from
  // them takes this counter as a dependency and gets bumped once per
  // decided match, so those memos actually recompute instead of returning
  // a cached value from before the mutation.
  const [updateTick, setUpdateTick] = useState(0);

  const progress = simulator.getProgress();
  const tournament = simulator.getTournament();

  // Get all matches for current stage that still need to be simulated.
  // Knockout-stage matches stay in progress.remainingMatches (completed or
  // not) until the whole stage is done and the next stage is generated, so
  // this filters out the ones already decided - mirroring how the group
  // stage's persistent tournament.groups matches are filtered below.
  const allStageMatches = useMemo(() => {
    if (selectedStage === 'group') {
      return tournament.groups.flatMap(g => g.matches).filter(m => !m.completed);
    }
    return progress.remainingMatches.filter(m => m.stage === selectedStage && !m.completed);
  }, [selectedStage, tournament, progress, updateTick]);

  // Get completed matches
  const completedMatches = useMemo(() => {
    return progress.completedMatches.filter(m => m.stage === selectedStage);
  }, [progress, selectedStage, updateTick]);

  // Group standings
  const groupStandings = useMemo(() => {
    return progress.groupStandings;
  }, [progress, updateTick]);

  // Knockout teams
  const knockoutTeams = useMemo(() => {
    return progress.knockoutBracket;
  }, [progress, updateTick]);

  // For every team this demo has a real 2026 result for, compare how far
  // they actually went to how far they've gone (so far) in this simulated
  // run. Updates live as matches are decided.
  const realVsSimulated = useMemo(() => {
    return REAL_2026_TRACKED_TEAMS.map(name => ({
      name,
      real: getRealOutcome(name),
      simulated: getSimulatedOutcome(name, progress.completedMatches)
    }));
  }, [progress, updateTick]);

  const simulatedChampion = useMemo(() => {
    const finalMatch = progress.completedMatches.find(m => m.stage === 'final');
    return finalMatch?.winner?.name ?? null;
  }, [progress, updateTick]);

  // The "Simulating: A vs B" lookup must resolve regardless of completion
  // state - allStageMatches filters out completed matches, so once
  // applyDecidedOutcome marks the active match complete (during its brief
  // post-decision pause) that lookup would return undefined and render
  // blank team names.
  const activeMatch = useMemo(() => {
    if (!activeMatchId) return null;
    const allMatches = [
      ...tournament.groups.flatMap(g => g.matches),
      ...progress.completedMatches,
      ...progress.remainingMatches,
    ];
    return allMatches.find(m => m.id === activeMatchId) ?? null;
  }, [activeMatchId, tournament, progress, updateTick]);

  // Select/deselect all matches
  useEffect(() => {
    if (selectAll) {
      setSelectedMatches(allStageMatches.map(m => m.id));
    } else {
      setSelectedMatches([]);
    }
  }, [selectAll, allStageMatches]);

  // Toggle individual match selection
  const toggleMatchSelection = useCallback((matchId: string) => {
    setSelectedMatches(prev => {
      if (prev.includes(matchId)) {
        return prev.filter(id => id !== matchId);
      }
      return [...prev, matchId];
    });
  }, []);

  // Stage navigation
  const goToNextStage = useCallback(() => {
    const nextStage = getNextStage(selectedStage);
    if (nextStage) {
      setSelectedStage(nextStage);
      setSelectedMatches([]);
      setSelectAll(false);
    }
  }, [selectedStage]);

  const goToPreviousStage = useCallback(() => {
    const prevStage = getPreviousStage(selectedStage);
    if (prevStage) {
      setSelectedStage(prevStage);
      setSelectedMatches([]);
      setSelectAll(false);
    }
  }, [selectedStage]);

  // Runs the real 10,000-trial engine to get display stats (win/draw/loss %,
  // average goals) for a match - the same engine used everywhere else in
  // this app.
  const computeMatchStats = useCallback((match: TournamentMatch): MatchStats => {
    const result = runSimulation({
      eloA: match.teamA.elo,
      eloB: match.teamB.elo,
      homeAdvantage: 0,
      baselineGoals: 1.3,
      c: 200,
      numTrials: 10000
    });
    return {
      winProbability: result.winProbability,
      drawProbability: result.drawProbability,
      lossProbability: result.lossProbability,
      avgGoalsA: result.teamA.avgGoals,
      avgGoalsB: result.teamB.avgGoals,
      mostLikelyScore: getMostLikelyScoreline(result),
      simulationResult: result
    };
  }, []);

  // Once every match in a stage is decided, generate the next stage's
  // matches (real 2026 format: group -> Round of 32 -> Round of 16 ->
  // Quarterfinal -> Semifinal -> Final + Third Place) and advance the UI to
  // it. `stageMatches` must be the complete set of matches for `stage`, not
  // just whichever subset was just simulated.
  const advanceToNextStage = useCallback((stage: TournamentStage, stageMatches: TournamentMatch[]) => {
    if (stage === 'group') {
      const standings = computeGroupStandings(tournament.groups, progress.completedMatches);
      progress.groupStandings = standings;
      const qualifiers = advanceFromGroupStage(standings);
      const seeded = seedKnockoutTeams(qualifiers);
      progress.knockoutBracket = seeded;
      progress.remainingMatches = generateKnockoutMatches(seeded, 'round32');
      progress.currentStage = 'round32';
      setSelectedStage('round32');
      return;
    }

    if (stage === 'semifinal') {
      const winners = stageMatches.map(m => m.winner).filter((t): t is TournamentTeam => Boolean(t));
      const losers = stageMatches.map(m => (m.winner === m.teamA ? m.teamB : m.teamA));
      const finalMatch = generateKnockoutMatches(winners, 'final')[0];
      const thirdMatch = generateKnockoutMatches(losers, 'thirdplace')[0];
      progress.remainingMatches = [finalMatch, thirdMatch].filter(Boolean);
      progress.currentStage = 'final';
      setSelectedStage('final');
      return;
    }

    if (stage === 'final') {
      progress.currentStage = 'thirdplace';
      setSelectedStage('thirdplace');
      return;
    }

    if (stage === 'thirdplace') {
      return; // tournament complete
    }

    // round32 -> round16, round16 -> quarterfinal, quarterfinal -> semifinal
    const nextStage = getNextStage(stage);
    if (!nextStage) return;
    const winners = stageMatches.map(m => m.winner).filter((t): t is TournamentTeam => Boolean(t));
    progress.remainingMatches = generateKnockoutMatches(winners, nextStage);
    progress.currentStage = nextStage;
    setSelectedStage(nextStage);
  }, [tournament, progress]);

  // Draws the real, decisive outcome for a match (a plain scoreline for
  // group matches; extra time + a penalty-shootout coin flip for knockout
  // matches), records it, and advances the bracket once its whole stage
  // is done.
  const applyDecidedOutcome = useCallback((match: TournamentMatch, stats: MatchStats) => {
    const outcome = decideMatchOutcome(match);

    match.completed = true;
    match.teamAScore = outcome.teamAScore;
    match.teamBScore = outcome.teamBScore;
    match.wentToPenalties = outcome.wentToPenalties;
    match.winner = outcome.winner;
    match.simulationResult = stats.simulationResult;

    setMatchResults(prev => ({
      ...prev,
      [match.id]: {
        match,
        result: {
          winProbability: stats.winProbability,
          drawProbability: stats.drawProbability,
          lossProbability: stats.lossProbability,
          avgGoalsA: stats.avgGoalsA,
          avgGoalsB: stats.avgGoalsB,
          // The realized scoreline is the actual bracket result, which is
          // more relevant here than the trial-averaged "most likely" score.
          mostLikelyScore: `${outcome.teamAScore}-${outcome.teamBScore}${outcome.wentToPenalties ? ' (pens)' : ''}`
        }
      }
    }));

    progress.completedMatches.push(match);

    const stageMatches = match.stage === 'group'
      ? tournament.groups.flatMap(g => g.matches)
      : progress.remainingMatches.filter(m => m.stage === match.stage);

    if (stageMatches.length > 0 && stageMatches.every(m => m.completed)) {
      advanceToNextStage(match.stage, stageMatches);
    }

    // progress/tournament were mutated in place above; bump the tick so
    // every useMemo derived from them (standings, remaining counts, the
    // stage's match list, ...) recomputes on this render.
    setUpdateTick(t => t + 1);
  }, [progress, tournament, advanceToNextStage]);

  // Simulate a single match with full trial-by-trial animation
  const simulateSingleMatch = useCallback(async (match: TournamentMatch) => {
    setActiveMatchId(match.id);
    setIsRunning(true);

    const eloA = match.teamA.elo;
    const eloB = match.teamB.elo;
    const baselineGoals = 1.3;
    const c = 200;
    const eloDiff = eloA - eloB;
    const expectedGoalsA = Math.max(0, baselineGoals + (eloDiff / c) / 2);
    const expectedGoalsB = Math.max(0, baselineGoals - (eloDiff / c) / 2);

    const totalTrials = 10000;
    const batchSize = 100;
    const batches = Math.ceil(totalTrials / batchSize);

    let completedTrials = 0;
    let teamAWins = 0, teamADraws = 0, teamALosses = 0;
    let totalGoalsA = 0, totalGoalsB = 0;

    for (let batch = 0; batch < batches; batch++) {
      if (isPaused) {
        while (isPaused && isRunning) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const batchTrials = Math.min(batchSize, totalTrials - completedTrials);

      for (let i = 0; i < batchTrials; i++) {
        const goalsA = poissonRandom(expectedGoalsA);
        const goalsB = poissonRandom(expectedGoalsB);
        totalGoalsA += goalsA;
        totalGoalsB += goalsB;

        if (goalsA > goalsB) teamAWins++;
        else if (goalsA < goalsB) teamALosses++;
        else teamADraws++;
      }

      completedTrials += batchTrials;

      if (completedTrials < totalTrials && animationSpeed > 0) {
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
      }
    }

    applyDecidedOutcome(match, {
      winProbability: teamAWins / totalTrials,
      drawProbability: teamADraws / totalTrials,
      lossProbability: teamALosses / totalTrials,
      avgGoalsA: totalGoalsA / totalTrials,
      avgGoalsB: totalGoalsB / totalTrials,
      mostLikelyScore: '',
      simulationResult: { trials: totalTrials, winProbability: teamAWins / totalTrials, drawProbability: teamADraws / totalTrials, lossProbability: teamALosses / totalTrials }
    });

    setActiveMatchId(null);
    setIsRunning(false);
  }, [isPaused, isRunning, animationSpeed, applyDecidedOutcome]);

  // Simulate a list of matches with no per-trial animation (fast batch)
  const runMatchesBatch = useCallback(async (matches: TournamentMatch[]) => {
    if (matches.length === 0) return;
    setIsRunning(true);
    setIsPaused(false);

    try {
      for (const match of matches) {
        if (isPaused) {
          while (isPaused && isRunning) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        setActiveMatchId(match.id);
        const stats = computeMatchStats(match);
        applyDecidedOutcome(match, stats);
      }
    } catch (error) {
      console.error('Batch simulation error:', error);
    } finally {
      setIsRunning(false);
      setActiveMatchId(null);
      setSelectedMatches([]);
      setSelectAll(false);
    }
  }, [isPaused, isRunning, computeMatchStats, applyDecidedOutcome]);

  // "Simulate Selected": animated one-at-a-time in single mode, fast batch otherwise
  const simulateSelectedMatches = useCallback(async () => {
    if (isRunning) return;
    const matchesToSimulate = selectedMatches.length > 0
      ? allStageMatches.filter(m => selectedMatches.includes(m.id))
      : allStageMatches;
    if (matchesToSimulate.length === 0) return;

    if (simulationMode === 'single') {
      setIsRunning(true);
      setIsPaused(false);
      try {
        for (const match of matchesToSimulate) {
          if (isPaused) {
            while (isPaused && isRunning) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          await simulateSingleMatch(match);
        }
      } finally {
        setIsRunning(false);
        setActiveMatchId(null);
        setSelectedMatches([]);
        setSelectAll(false);
      }
    } else {
      await runMatchesBatch(matchesToSimulate);
    }
  }, [isRunning, isPaused, simulationMode, selectedMatches, allStageMatches, simulateSingleMatch, runMatchesBatch]);

  // Simulate ALL matches in current stage (fast batch)
  const simulateAllStageMatches = useCallback(async () => {
    if (isRunning) return;
    await runMatchesBatch([...allStageMatches]);
  }, [isRunning, allStageMatches, runMatchesBatch]);

  // Simulate the entire tournament, stage by stage, from the group stage
  // through the final and third-place playoff.
  const simulateFullTournament = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsPaused(false);
    setSelectedMatches([]);
    setSelectAll(false);

    try {
      // A full 2026 World Cup is 72 group + 31 knockout matches; the guard
      // just prevents a runaway loop if something upstream misbehaves.
      for (let guard = 0; guard < 200; guard++) {
        const stage = progress.currentStage;
        const stageMatches = stage === 'group'
          ? tournament.groups.flatMap(g => g.matches).filter(m => !m.completed)
          : progress.remainingMatches.filter(m => !m.completed);

        if (stageMatches.length === 0) break; // nothing left anywhere - tournament finished

        setSelectedStage(stage);

        for (const match of stageMatches) {
          if (isPaused) {
            while (isPaused && isRunning) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          setActiveMatchId(match.id);
          // Yield to the browser before deciding the match, so it actually
          // paints "Simulating: A vs B" instead of jumping straight to the
          // result - otherwise 104 matches resolve in one synchronous burst
          // and a class watching this never sees the group stage play out.
          await new Promise(resolve => setTimeout(resolve, 0));
          const stats = computeMatchStats(match);
          applyDecidedOutcome(match, stats);
          await new Promise(resolve => setTimeout(resolve, 60));
        }

        await new Promise(resolve => setTimeout(resolve, 250)); // longer pause between stages for UI feedback
      }
    } catch (error) {
      console.error('Full tournament simulation error:', error);
    } finally {
      setIsRunning(false);
      setActiveMatchId(null);
    }
  }, [isRunning, isPaused, progress, tournament, computeMatchStats, applyDecidedOutcome]);

  // Reset tournament
  const resetTournament = useCallback(() => {
    simulator.reset();
    setSelectedStage('group');
    setIsRunning(false);
    setIsPaused(false);
    setActiveMatchId(null);
    setSelectedMatches([]);
    setSelectAll(false);
    setMatchResults({});
  }, [simulator]);

  // Always start a completely fresh tournament, even if a previous run (or
  // any partial simulation) already happened in this session - a second
  // click on "Full Tournament" should never be a silent no-op.
  const startFullTournament = useCallback(() => {
    if (isRunning) return;
    resetTournament();
    setPendingFullRun(true);
  }, [isRunning, resetTournament]);

  useEffect(() => {
    if (pendingFullRun) {
      setPendingFullRun(false);
      simulateFullTournament();
    }
  }, [pendingFullRun, simulateFullTournament]);

  // Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Calculate progress percentage. remainingMatches holds the *current*
  // stage's matches (completed or not) until the next stage replaces it, so
  // only its not-yet-completed matches count as "remaining" here - otherwise
  // the active stage's matches would be double-counted once they finish.
  const pendingMatchCount = useMemo(
    () => progress.remainingMatches.filter(m => !m.completed).length,
    [progress, updateTick]
  );
  const progressPercentage = useMemo(() => {
    const totalMatches = progress.completedMatches.length + pendingMatchCount;
    return totalMatches > 0 ? (progress.completedMatches.length / totalMatches) * 100 : 0;
  }, [progress, pendingMatchCount]);

  // Format date
  const formattedStartDate = WORLD_CUP_2026_START.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <main className="min-h-[100dvh] w-full bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-foreground">
                <span className="absolute h-3.5 w-3.5 rounded-full border-2 border-primary" />
                <span className="absolute h-8 w-px rotate-45 bg-primary/70" />
                <span className="absolute h-8 w-px -rotate-45 bg-primary/70" />
              </span>
              <span className="font-display text-xl font-semibold tracking-[-0.02em]">
                Shot on Stats
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              <span>2026 World Cup Simulation</span>
            </div>
          </div>
          
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            <strong className="text-foreground">FIFA World Cup 2026:</strong> 
            Starting from the group stage on {formattedStartDate}. 
            Simulate individual matches or the entire tournament with REAL Monte Carlo simulations.
          </p>
        </header>

        {/* Tournament Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm font-medium">Tournament Progress</span>
            <span className="text-sm font-mono text-muted-foreground">
              Stage: {STAGE_LABELS[selectedStage]}
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              {progress.completedMatches.length} / {progress.completedMatches.length + pendingMatchCount} matches
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-300 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {TOURNAMENT_STAGE_ORDER.map((stage) => (
              <div key={stage} className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${selectedStage === stage ? 'bg-primary' : TOURNAMENT_STAGE_ORDER.indexOf(stage) < TOURNAMENT_STAGE_ORDER.indexOf(selectedStage) ? 'bg-green-500' : 'bg-muted'}`} />
                <span className={selectedStage === stage ? 'text-foreground' : 'text-muted-foreground'}>
                  {STAGE_LABELS[stage as TournamentStage]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Simulation Display */}
        {activeMatchId && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 animate-pulse" />
                  Simulating: {activeMatch?.teamA.name} vs {activeMatch?.teamB.name}
                </CardTitle>
                <CardDescription>
                  {simulationMode === 'single' 
                    ? 'Running animated Monte Carlo simulation with 10,000 trials'
                    : 'Running fast batch simulation'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-lg">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="font-mono">Processing...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Simulation Controls */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Simulation Controls
              </CardTitle>
              <CardDescription>
                Choose how to run simulations and select matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Simulation Mode Toggle */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border border-border bg-secondary/50">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        id="mode-batch"
                        checked={simulationMode === 'batch'}
                        onChange={() => setSimulationMode('batch')}
                        className="h-4 w-4"
                        disabled={isRunning}
                      />
                      <label htmlFor="mode-batch" className="font-medium cursor-pointer">
                        Fast Batch Mode
                      </label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Simulate all selected matches quickly without animation
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-border bg-secondary/50">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        id="mode-single"
                        checked={simulationMode === 'single'}
                        onChange={() => setSimulationMode('single')}
                        className="h-4 w-4"
                        disabled={isRunning}
                      />
                      <label htmlFor="mode-single" className="font-medium cursor-pointer">
                        Animated Single Match
                      </label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Full animation with live charts and progress
                    </p>
                  </div>
                </div>

                {/* Animation Speed (only for single mode) */}
                {simulationMode === 'single' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Animation Speed</label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[animationSpeed]}
                        onValueChange={(v) => setAnimationSpeed(v[0])}
                        min={0}
                        max={200}
                        step={10}
                        disabled={isRunning}
                      />
                      <span className="w-12 text-center font-mono text-sm">
                        {animationSpeed}ms
                      </span>
                    </div>
                  </div>
                )}

                {/* Match Selection */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Select Matches to Simulate</h4>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={(checked) => setSelectAll(checked === true)}
                          disabled={allStageMatches.length === 0 || isRunning}
                        />
                        <span>Select All ({allStageMatches.length})</span>
                      </label>
                    </div>
                  </div>
                  
                  {allStageMatches.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {allStageMatches.map((match) => (
                        <div
                          key={match.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedMatches.includes(match.id) 
                              ? 'border-primary bg-primary/10' 
                              : match.completed 
                                ? 'border-green-500/30 bg-green-500/10' 
                                : 'border-border bg-secondary/50 hover:bg-secondary/80'
                          }`}
                          onClick={() => toggleMatchSelection(match.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedMatches.includes(match.id)}
                                onCheckedChange={(checked: boolean) => {
                                  if (checked) {
                                    setSelectedMatches(prev => [...prev, match.id]);
                                  } else {
                                    setSelectedMatches(prev => prev.filter(id => id !== match.id));
                                  }
                                }}
                                disabled={match.completed || isRunning}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{match.teamA.name} vs {match.teamB.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Elo: {match.teamA.elo} vs {match.teamB.elo}
                                </span>
                              </div>
                            </div>
                            
                            {match.completed ? (
                              <span className="text-xs bg-green-500 text-green-900 px-2 py-0.5 rounded-full font-bold">
                                {match.winner ? `${match.winner.name} Won` : 'Draw'}
                              </span>
                            ) : activeMatchId === match.id ? (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                                Simulating...
                              </span>
                            ) : (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No matches available for this stage</p>
                      <p className="text-sm mt-1">All matches may have been completed</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                  <Button
                    onClick={simulateSelectedMatches}
                    disabled={isRunning || (selectedMatches.length === 0 && allStageMatches.length === 0)}
                    className="flex-1 flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Play className="h-4 w-4" />
                    Simulate Selected ({selectedMatches.length || allStageMatches.length} matches)
                  </Button>
                  
                  <Button
                    onClick={simulateAllStageMatches}
                    disabled={isRunning || allStageMatches.length === 0}
                    variant="outline"
                    className="flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Play className="h-4 w-4" />
                    Simulate ALL in {STAGE_LABELS[selectedStage]}
                  </Button>
                  
                  <Button
                    onClick={startFullTournament}
                    disabled={isRunning}
                    variant="secondary"
                    className="flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Trophy className="h-4 w-4" />
                    Full Tournament (Restart)
                  </Button>
                </div>

                {/* Pause/Resume and Reset */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={togglePause}
                    disabled={!isRunning}
                    variant="outline"
                    className="flex items-center justify-center gap-2"
                    size="lg"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  
                  <Button
                    onClick={resetTournament}
                    disabled={isRunning}
                    variant="ghost"
                    className="flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Tournament
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Stage Navigation */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament Stages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={goToPreviousStage} disabled={selectedStage === 'group'} size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select value={selectedStage} onValueChange={(v) => {
                  setSelectedStage(v as TournamentStage);
                  setSelectedMatches([]);
                  setSelectAll(false);
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_STAGE_ORDER.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {STAGE_LABELS[stage as TournamentStage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={goToNextStage} disabled={selectedStage === 'thirdplace'} size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border border-border bg-secondary/50 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{STAGE_LABELS[selectedStage]}</div>
                  <div className="text-sm text-muted-foreground">Current Stage</div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-secondary/50 text-center">
                  <div className="text-3xl font-bold mb-2">{completedMatches.length}</div>
                  <div className="text-sm text-muted-foreground">Completed Matches</div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-secondary/50 text-center">
                  <div className="text-3xl font-bold mb-2">{allStageMatches.length}</div>
                  <div className="text-sm text-muted-foreground">Remaining Matches</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Match Results Summary */}
        {Object.keys(matchResults).length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Object key order = insertion order, so the *last* 5 entries
                      are the most recently decided matches, not the first. */}
                  {Object.entries(matchResults).slice(-5).reverse().map(([matchId, result]) => {
                    const r = result.result;
                    return (
                      <div key={matchId} className="p-3 rounded-lg border border-border bg-secondary/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{result.match.teamA.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{result.match.teamB.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary">{r.mostLikelyScore}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.winProbability > r.lossProbability ? result.match.teamA.name : result.match.teamB.name} favored
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>{(r.winProbability * 100).toFixed(1)}% Win</span>
                          <span>{(r.drawProbability * 100).toFixed(1)}% Draw</span>
                          <span>{(r.lossProbability * 100).toFixed(1)}% Loss</span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(matchResults).length > 5 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      +{Object.keys(matchResults).length - 5} more results
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Simulation vs. Real 2026 World Cup */}
        {progress.completedMatches.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Simulation vs. the Real 2026 World Cup
                </CardTitle>
                <CardDescription>
                  Same 48 teams, same real 2026 groups — how far each team actually went in July 2026, vs. how
                  far they've gone in this independently-simulated run
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="p-4 rounded-lg border border-border bg-secondary/50 text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Your Simulated Champion</div>
                    <div className="text-2xl font-bold text-primary">{simulatedChampion ?? 'Not decided yet'}</div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-secondary/50 text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Real 2026 Champion</div>
                    <div className="text-2xl font-bold">Spain</div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-secondary/50 text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Same Finish As Reality</div>
                    <div className="text-2xl font-bold">
                      {realVsSimulated.filter(r => r.simulated === r.real).length} / {realVsSimulated.length}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Team</th>
                        <th className="py-2 pr-4 font-medium">This Simulation</th>
                        <th className="py-2 pr-4 font-medium">Real 2026 Result</th>
                        <th className="py-2 font-medium">Match?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realVsSimulated.map((row) => {
                        const matches = row.simulated === row.real;
                        return (
                          <tr key={row.name} className="border-b border-border/60">
                            <td className="py-2 pr-4 font-medium whitespace-nowrap">{row.name}</td>
                            <td className="py-2 pr-4 whitespace-nowrap">{row.simulated}</td>
                            <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{row.real}</td>
                            <td className="py-2">
                              {matches ? (
                                <span className="text-green-500 font-bold text-xs">✓ Same</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  These are the real 2026 groups and the real result every one of the 48 teams reached, group
                  stage through the Final. Each match in this simulation is still an independent random draw,
                  so the exact path a team takes to its finish won't match reality even in a run where the
                  finish itself does.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Group Standings */}
        {selectedStage === 'group' && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Group Standings
                </CardTitle>
                <CardDescription>
                  Top 2 from each group advance to Round of 32
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {tournament.groups.map((group) => {
                    const standings = groupStandings[group.name] || group.teams;
                    return (
                      <div key={group.name} className="space-y-2">
                        <h3 className="font-semibold text-center border-b pb-2">{group.name}</h3>
                        <div className="space-y-2">
                          {standings.map((team, index) => (
                            <div key={team.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                              index < 2 ? 'bg-green-500/20 border border-green-500/30' : 'bg-secondary/50 border border-border'
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-muted-foreground">{index + 1}.</span>
                                <span className="font-medium">{team.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{team.points || 0} pts</span>
                                {index < 2 && (
                                  <span className="text-xs bg-green-500 text-green-900 px-2 py-0.5 rounded-full font-bold">
                                    Qualifies
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/70 flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span>Shot on Stats - 2026 World Cup Tournament Simulation</span>
          <span>Real Monte Carlo with Poisson Distribution</span>
        </footer>
      </div>
    </main>
  );
}
