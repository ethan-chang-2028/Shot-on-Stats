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
import { 
  WORLD_CUP_2026, 
  TournamentStage, 
  TournamentMatch,
  TournamentTeam,
  STAGE_LABELS,
  getNextStage,
  getPreviousStage,
  generateGroupMatches
} from '@/types/tournament';

// World Cup 2026 start date
const WORLD_CUP_2026_START = new Date('2026-06-11');

// Poisson random function (Knuth's algorithm)
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

  const progress = simulator.getProgress();
  const tournament = simulator.getTournament();

  // Get all matches for current stage
  const allStageMatches = useMemo(() => {
    if (selectedStage === 'group') {
      return tournament.groups.flatMap(g => g.matches).filter(m => !m.completed);
    }
    return progress.remainingMatches.filter(m => m.stage === selectedStage);
  }, [selectedStage, tournament, progress]);

  // Get completed matches
  const completedMatches = useMemo(() => {
    return progress.completedMatches.filter(m => m.stage === selectedStage);
  }, [progress, selectedStage]);

  // Group standings
  const groupStandings = useMemo(() => {
    return progress.groupStandings;
  }, [progress]);

  // Knockout teams
  const knockoutTeams = useMemo(() => {
    return progress.knockoutBracket;
  }, [progress]);

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

  // Simulate a single match with full animation
  const simulateSingleMatch = useCallback(async (match: TournamentMatch) => {
    setActiveMatchId(match.id);
    setIsRunning(true);
    
    const eloA = match.teamA.elo;
    const eloB = match.teamB.elo;
    const homeAdvantage = 0;
    const baselineGoals = 1.3;
    const c = 200;

    const eloDiff = eloA - eloB + homeAdvantage;
    const expectedGoalsA = Math.max(0, baselineGoals + (eloDiff / c) / 2);
    const expectedGoalsB = Math.max(0, baselineGoals - (eloDiff / c) / 2);

    const totalTrials = 10000;
    const batchSize = 100;
    const batches = Math.ceil(totalTrials / batchSize);
    
    let completedTrials = 0;
    let teamAWins = 0, teamADraws = 0, teamALosses = 0;
    const teamAGoalDistribution = new Map<number, number>();
    const teamBGoalDistribution = new Map<number, number>();
    const teamAGoals: number[] = [];
    const teamBGoals: number[] = [];

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
        
        teamAGoals.push(goalsA);
        teamBGoals.push(goalsB);
        
        teamAGoalDistribution.set(goalsA, (teamAGoalDistribution.get(goalsA) || 0) + 1);
        teamBGoalDistribution.set(goalsB, (teamBGoalDistribution.get(goalsB) || 0) + 1);
        
        if (goalsA > goalsB) {
          teamAWins++;
        } else if (goalsA < goalsB) {
          teamALosses++;
        } else {
          teamADraws++;
        }
      }

      completedTrials += batchTrials;
      
      if (completedTrials < totalTrials && animationSpeed > 0) {
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
      }
    }

    // Calculate final results
    const winProbability = teamAWins / totalTrials;
    const drawProbability = teamADraws / totalTrials;
    const lossProbability = teamALosses / totalTrials;
    const avgGoalsA = teamAGoals.reduce((sum, g) => sum + g, 0) / totalTrials;
    const avgGoalsB = teamBGoals.reduce((sum, g) => sum + g, 0) / totalTrials;
    
    // Find most likely scoreline
    let maxProb = 0;
    let mostLikelyScore = '0-0';
    for (const [goalsA, countA] of teamAGoalDistribution) {
      for (const [goalsB, countB] of teamBGoalDistribution) {
        const jointProb = (countA / totalTrials) * (countB / totalTrials);
        if (jointProb > maxProb) {
          maxProb = jointProb;
          mostLikelyScore = `${goalsA}-${goalsB}`;
        }
      }
    }

    // Update match
    match.completed = true;
    match.winner = winProbability > lossProbability ? match.teamA : 
                   lossProbability > winProbability ? match.teamB : null;
    
    match.simulationResult = {
      trials: totalTrials,
      teamA: {
        goals: teamAGoals,
        totalGoals: teamAGoals.reduce((sum, g) => sum + g, 0),
        avgGoals: avgGoalsA,
        goalDistribution: teamAGoalDistribution,
        wins: teamAWins,
        draws: teamADraws,
        losses: teamALosses
      },
      teamB: {
        goals: teamBGoals,
        totalGoals: teamBGoals.reduce((sum, g) => sum + g, 0),
        avgGoals: avgGoalsB,
        goalDistribution: teamBGoalDistribution,
        wins: teamALosses,
        draws: teamADraws,
        losses: teamAWins
      },
      winProbability,
      drawProbability,
      lossProbability
    };

    // Store result
    setMatchResults(prev => ({
      ...prev,
      [match.id]: {
        match,
        result: {
          winProbability,
          drawProbability,
          lossProbability,
          avgGoalsA,
          avgGoalsB,
          mostLikelyScore
        }
      }
    }));

    // Update progress
    progress.completedMatches.push(match);
    progress.remainingMatches = progress.remainingMatches.filter(m => m.id !== match.id);

    setActiveMatchId(null);
    setIsRunning(false);
    
    return { match, winProbability, drawProbability, lossProbability, avgGoalsA, avgGoalsB, mostLikelyScore };
  }, [isPaused, isRunning, animationSpeed, progress]);

  // Simulate selected matches quickly (batch mode)
  const simulateSelectedMatches = useCallback(async () => {
    if (isRunning) return;
    
    const matchesToSimulate = selectedMatches.length > 0 
      ? allStageMatches.filter(m => selectedMatches.includes(m.id))
      : allStageMatches;
    
    if (matchesToSimulate.length === 0) return;

    setIsRunning(true);
    setIsPaused(false);

    try {
      // Simulate all matches concurrently (or in quick succession)
      for (const match of matchesToSimulate) {
        if (isPaused) {
          while (isPaused && isRunning) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        setActiveMatchId(match.id);
        await simulateSingleMatch(match);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsRunning(false);
      setActiveMatchId(null);
      setSelectedMatches([]);
      setSelectAll(false);
    }
  }, [isRunning, isPaused, selectedMatches, allStageMatches, simulateSingleMatch]);

  // Simulate ALL matches in current stage (fast batch)
  const simulateAllStageMatches = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setIsPaused(false);

    try {
      // For batch mode, simulate all matches without animation
      const matchesToSimulate = [...allStageMatches];
      
      for (const match of matchesToSimulate) {
        if (isPaused) {
          while (isPaused && isRunning) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        setActiveMatchId(match.id);
        
        // Fast simulation without animation
        const eloA = match.teamA.elo;
        const eloB = match.teamB.elo;
        const eloDiff = eloA - eloB;
        const expectedGoalsA = Math.max(0, 1.3 + (eloDiff / 200) / 2);
        const expectedGoalsB = Math.max(0, 1.3 - (eloDiff / 200) / 2);

        let teamAWins = 0, teamADraws = 0, teamALosses = 0;
        let totalGoalsA = 0, totalGoalsB = 0;
        
        for (let i = 0; i < 10000; i++) {
          const goalsA = poissonRandom(expectedGoalsA);
          const goalsB = poissonRandom(expectedGoalsB);
          totalGoalsA += goalsA;
          totalGoalsB += goalsB;
          
          if (goalsA > goalsB) teamAWins++;
          else if (goalsA < goalsB) teamALosses++;
          else teamADraws++;
        }

        const winProbability = teamAWins / 10000;
        const drawProbability = teamADraws / 10000;
        const lossProbability = teamALosses / 10000;
        const avgGoalsA = totalGoalsA / 10000;
        const avgGoalsB = totalGoalsB / 10000;
        
        // Find most likely scoreline (simplified)
        const mostLikelyScore = `${Math.round(avgGoalsA)}-${Math.round(avgGoalsB)}`;

        match.completed = true;
        match.winner = winProbability > lossProbability ? match.teamA : 
                       lossProbability > winProbability ? match.teamB : null;
        
        match.simulationResult = {
          trials: 10000,
          teamA: { goals: [], totalGoals: totalGoalsA, avgGoals: avgGoalsA, goalDistribution: new Map(), wins: teamAWins, draws: teamADraws, losses: teamALosses },
          teamB: { goals: [], totalGoals: totalGoalsB, avgGoals: avgGoalsB, goalDistribution: new Map(), wins: teamALosses, draws: teamADraws, losses: teamAWins },
          winProbability,
          drawProbability,
          lossProbability
        };

        setMatchResults(prev => ({
          ...prev,
          [match.id]: {
            match,
            result: { winProbability, drawProbability, lossProbability, avgGoalsA, avgGoalsB, mostLikelyScore }
          }
        }));

        progress.completedMatches.push(match);
        progress.remainingMatches = progress.remainingMatches.filter(m => m.id !== match.id);
      }
    } catch (error) {
      console.error('Batch simulation error:', error);
    } finally {
      setIsRunning(false);
      setActiveMatchId(null);
    }
  }, [isRunning, isPaused, allStageMatches, progress]);

  // Simulate entire tournament from group stage to final
  const simulateFullTournament = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setIsPaused(false);
    setSelectedMatches([]);
    setSelectAll(false);

    try {
      // Get all matches across all stages
      const allMatches = [...progress.remainingMatches, ...progress.completedMatches.filter(m => !m.completed)];
      
      // Group by stage
      const matchesByStage: Record<TournamentStage, TournamentMatch[]> = {
        group: [],
        round16: [],
        quarterfinal: [],
        semifinal: [],
        final: [],
        thirdplace: []
      };
      
      allMatches.forEach(m => {
        if (matchesByStage[m.stage]) {
          matchesByStage[m.stage].push(m);
        }
      });

      // Simulate each stage in order
      for (const stage of ['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'] as TournamentStage[]) {
        if (matchesByStage[stage].length === 0) continue;
        
        setSelectedStage(stage);
        
        for (const match of matchesByStage[stage]) {
          if (isPaused) {
            while (isPaused && isRunning) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          
          setActiveMatchId(match.id);
          
          // Fast batch simulation
          const eloA = match.teamA.elo;
          const eloB = match.teamB.elo;
          const eloDiff = eloA - eloB;
          const expectedGoalsA = Math.max(0, 1.3 + (eloDiff / 200) / 2);
          const expectedGoalsB = Math.max(0, 1.3 - (eloDiff / 200) / 2);

          let teamAWins = 0, teamADraws = 0, teamALosses = 0;
          
          for (let i = 0; i < 10000; i++) {
            const goalsA = poissonRandom(expectedGoalsA);
            const goalsB = poissonRandom(expectedGoalsB);
            
            if (goalsA > goalsB) teamAWins++;
            else if (goalsA < goalsB) teamALosses++;
            else teamADraws++;
          }

          const winProbability = teamAWins / 10000;
          const drawProbability = teamADraws / 10000;
          const lossProbability = teamALosses / 10000;

          match.completed = true;
          match.winner = winProbability > lossProbability ? match.teamA : 
                         lossProbability > winProbability ? match.teamB : null;
          
          match.simulationResult = {
            trials: 10000,
            teamA: { goals: [], totalGoals: 0, avgGoals: 0, goalDistribution: new Map(), wins: teamAWins, draws: teamADraws, losses: teamALosses },
            teamB: { goals: [], totalGoals: 0, avgGoals: 0, goalDistribution: new Map(), wins: teamALosses, draws: teamADraws, losses: teamAWins },
            winProbability,
            drawProbability,
            lossProbability
          };

          progress.completedMatches.push(match);
          progress.remainingMatches = progress.remainingMatches.filter(m => m.id !== match.id);
        }
        
        // Small delay between stages for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Full tournament simulation error:', error);
    } finally {
      setIsRunning(false);
      setActiveMatchId(null);
    }
  }, [isRunning, isPaused, progress]);

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

  // Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const totalMatches = progress.completedMatches.length + progress.remainingMatches.length;
    return totalMatches > 0 ? (progress.completedMatches.length / totalMatches) * 100 : 0;
  }, [progress]);

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
              {progress.completedMatches.length} / {progress.completedMatches.length + progress.remainingMatches.length} matches
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-300 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'].map((stage) => (
              <div key={stage} className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${selectedStage === stage ? 'bg-primary' : stage === 'group' && selectedStage !== 'group' ? 'bg-green-500' : 'bg-muted'}`} />
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
                  Simulating: {allStageMatches.find(m => m.id === activeMatchId)?.teamA.name} vs {allStageMatches.find(m => m.id === activeMatchId)?.teamB.name}
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
                    onClick={simulateFullTournament}
                    disabled={isRunning || progress.completedMatches.length > 0}
                    variant="secondary"
                    className="flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Trophy className="h-4 w-4" />
                    Full Tournament
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
                    {['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'].map((stage) => (
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
                  {Object.entries(matchResults).slice(0, 5).map(([matchId, result]) => {
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
