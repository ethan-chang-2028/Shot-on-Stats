import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  TrendingDown
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
  getPreviousStage
} from '@/types/tournament';

// World Cup 2026 start date
const WORLD_CUP_2026_START = new Date('2026-06-11');

// Flow chart data for website cycle explanation
const WEBSITE_FLOW_DATA = [
  {
    step: 1,
    title: 'Data Collection',
    description: 'Fetch team Elo ratings and fixture data from API-Football and ClubElo',
    icon: <BarChart3 className="h-6 w-6" />
  },
  {
    step: 2,
    title: 'Elo to Expected Goals',
    description: 'Convert Elo ratings to expected goals using: expected_goal_diff = (eloA - eloB + homeAdv) / C',
    icon: <Target className="h-6 w-6" />
  },
  {
    step: 3,
    title: 'Monte Carlo Simulation',
    description: 'Run 10,000 Poisson-based trials to simulate match outcomes',
    icon: <Play className="h-6 w-6" />
  },
  {
    step: 4,
    title: 'Result Aggregation',
    description: 'Calculate win/draw/loss probabilities and predicted scorelines',
    icon: <Users className="h-6 w-6" />
  },
  {
    step: 5,
    title: 'AI Explanation',
    description: 'Generate plain-language explanations from computed stats (optional)',
    icon: <Trophy className="h-6 w-6" />
  },
  {
    step: 6,
    title: 'Display Results',
    description: 'Show predictions with live charts and statistics to users',
    icon: <LayoutGrid className="h-6 w-6" />
  }
];

// Tournament flow data - Updated for 2026 World Cup (48 teams, 12 groups)
const TOURNAMENT_FLOW_DATA = [
  { stage: 'group', label: 'Group Stage', teams: '48 teams', matches: '72 matches', next: 'Round of 32' },
  { stage: 'round16', label: 'Round of 32', teams: '32 teams', matches: '16 matches', next: 'Round of 16' },
  { stage: 'quarterfinal', label: 'Round of 16', teams: '16 teams', matches: '8 matches', next: 'Quarterfinals' },
  { stage: 'semifinal', label: 'Quarterfinals', teams: '8 teams', matches: '4 matches', next: 'Semifinals' },
  { stage: 'final', label: 'Semifinals', teams: '4 teams', matches: '2 matches', next: 'Final & 3rd Place' },
  { stage: 'thirdplace', label: 'Final', teams: '2 teams', matches: '1 match', next: 'Champion' },
];

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

interface ProgressUpdate {
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

export default function TournamentPage() {
  const [simulator] = useState(() => new TournamentSimulator(WORLD_CUP_2026));
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [showFlowChart, setShowFlowChart] = useState(false);
  const [showTournamentFlow, setShowTournamentFlow] = useState(false);
  const [selectedStage, setSelectedStage] = useState<TournamentStage>('group');
  const [simulationProgress, setSimulationProgress] = useState<ProgressUpdate | null>(null);
  const [currentSimulationMatch, setCurrentSimulationMatch] = useState<TournamentMatch | null>(null);

  const progress = simulator.getProgress();
  const tournament = simulator.getTournament();

  // Stage navigation
  const goToNextStage = useCallback(() => {
    const nextStage = getNextStage(selectedStage);
    if (nextStage) {
      setSelectedStage(nextStage);
    }
  }, [selectedStage]);

  const goToPreviousStage = useCallback(() => {
    const prevStage = getPreviousStage(selectedStage);
    if (prevStage) {
      setSelectedStage(prevStage);
    }
  }, [selectedStage]);

  // Get matches for current stage
  const currentStageMatches = useMemo(() => {
    if (selectedStage === 'group') {
      return tournament.groups.flatMap(g => g.matches).filter(m => !m.completed);
    }
    return progress.remainingMatches.filter(m => m.stage === selectedStage);
  }, [selectedStage, tournament, progress]);

  // Get completed matches for current stage
  const completedMatches = useMemo(() => {
    return progress.completedMatches.filter(m => m.stage === selectedStage);
  }, [progress, selectedStage]);

  // Get group standings
  const groupStandings = useMemo(() => {
    return progress.groupStandings;
  }, [progress]);

  // Get knockout bracket teams
  const knockoutTeams = useMemo(() => {
    return progress.knockoutBracket;
  }, [progress]);

  // Simulate a single match with full Monte Carlo animation
  const simulateSingleMatch = useCallback(async (match: TournamentMatch) => {
    setCurrentSimulationMatch(match);
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
        while (isPaused) {
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
      
      const currentAvgA = teamAGoals.reduce((sum, g) => sum + g, 0) / completedTrials;
      const currentAvgB = teamBGoals.reduce((sum, g) => sum + g, 0) / completedTrials;

      setSimulationProgress({
        trial: completedTrials,
        teamA: {
          currentAvgGoals: currentAvgA,
          currentGoalDistribution: new Map(teamAGoalDistribution),
          wins: teamAWins,
          draws: teamADraws,
          losses: teamALosses
        },
        teamB: {
          currentAvgGoals: currentAvgB,
          currentGoalDistribution: new Map(teamBGoalDistribution),
          wins: teamALosses,
          draws: teamADraws,
          losses: teamAWins
        }
      });

      setCurrentMatchIndex(completedTrials);

      if (completedTrials < totalTrials) {
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
      }
    }

    // Create final result
    const winProbability = teamAWins / totalTrials;
    const drawProbability = teamADraws / totalTrials;
    const lossProbability = teamALosses / totalTrials;

    // Update match with result
    match.completed = true;
    
    // Determine winner
    if (winProbability > lossProbability) {
      match.winner = match.teamA;
    } else if (lossProbability > winProbability) {
      match.winner = match.teamB;
    } else {
      match.winner = null;
    }

    // Store simulation result on match
    match.simulationResult = {
      trials: totalTrials,
      teamA: {
        goals: teamAGoals,
        totalGoals: teamAGoals.reduce((sum, g) => sum + g, 0),
        avgGoals: teamAGoals.reduce((sum, g) => sum + g, 0) / totalTrials,
        goalDistribution: teamAGoalDistribution,
        wins: teamAWins,
        draws: teamADraws,
        losses: teamALosses
      },
      teamB: {
        goals: teamBGoals,
        totalGoals: teamBGoals.reduce((sum, g) => sum + g, 0),
        avgGoals: teamBGoals.reduce((sum, g) => sum + g, 0) / totalTrials,
        goalDistribution: teamBGoalDistribution,
        wins: teamALosses,
        draws: teamADraws,
        losses: teamAWins
      },
      winProbability,
      drawProbability,
      lossProbability
    };

    // Update simulator progress
    progress.completedMatches.push(match);
    progress.remainingMatches = progress.remainingMatches.filter(m => m.id !== match.id);

    setIsRunning(false);
    setCurrentSimulationMatch(null);
  }, [isPaused, animationSpeed, progress]);

  // Simulate all matches in current stage
  const simulateCurrentStage = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setIsPaused(false);
    setCurrentMatchIndex(0);

    try {
      const matchesToSimulate = [...currentStageMatches];
      
      for (let i = 0; i < Math.min(matchesToSimulate.length, 5) && i < matchesToSimulate.length; i++) {
        if (isPaused) {
          while (isPaused) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        await simulateSingleMatch(matchesToSimulate[i]);
        setCurrentMatchIndex(i + 1);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, isPaused, currentStageMatches, simulateSingleMatch]);

  // Reset tournament
  const resetTournament = useCallback(() => {
    simulator.reset();
    setSelectedStage('group');
    setCurrentMatchIndex(0);
    setIsRunning(false);
    setIsPaused(false);
    setSimulationProgress(null);
    setCurrentSimulationMatch(null);
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

  // Format date for display
  const formattedStartDate = WORLD_CUP_2026_START.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format goal distribution for chart
  const formatDistributionForChart = useCallback((distribution: Map<number, number>, trials: number) => {
    const data: { goals: number; count: number; percentage: number }[] = [];
    
    for (let i = 0; i <= 5; i++) {
      const count = distribution.get(i) || 0;
      data.push({
        goals: i,
        count,
        percentage: (count / trials) * 100
      });
    }
    
    let count6Plus = 0;
    for (let i = 6; i <= 10; i++) {
      count6Plus += distribution.get(i) || 0;
    }
    if (count6Plus > 0) {
      data.push({
        goals: 6,
        count: count6Plus,
        percentage: (count6Plus / trials) * 100
      });
    }
    
    return data;
  }, []);

  const homeDistributionData = useMemo(() => {
    if (!simulationProgress || !currentSimulationMatch) return [];
    return formatDistributionForChart(simulationProgress.teamA.currentGoalDistribution, simulationProgress.trial);
  }, [simulationProgress, currentSimulationMatch, formatDistributionForChart]);

  const awayDistributionData = useMemo(() => {
    if (!simulationProgress || !currentSimulationMatch) return [];
    return formatDistributionForChart(simulationProgress.teamB.currentGoalDistribution, simulationProgress.trial);
  }, [simulationProgress, currentSimulationMatch, formatDistributionForChart]);

  const winDrawLossData = useMemo(() => {
    if (!simulationProgress) return [];
    
    const wins = simulationProgress.teamA.wins;
    const draws = simulationProgress.teamA.draws;
    const losses = simulationProgress.teamA.losses;
    const trials = simulationProgress.trial;
    
    return [
      { outcome: 'Win', count: wins, percentage: (wins / trials) * 100, color: '#10b981' },
      { outcome: 'Draw', count: draws, percentage: (draws / trials) * 100, color: '#f59e0b' },
      { outcome: 'Loss', count: losses, percentage: (losses / trials) * 100, color: '#ef4444' }
    ];
  }, [simulationProgress]);

  const progressPercentageForCurrent = useMemo(() => {
    if (!simulationProgress) return 0;
    return (simulationProgress.trial / 10000) * 100;
  }, [simulationProgress]);

  const predictedScore = useMemo(() => {
    if (!simulationProgress || !currentSimulationMatch) return '';
    const avgA = simulationProgress.teamA.currentAvgGoals.toFixed(2);
    const avgB = simulationProgress.teamB.currentAvgGoals.toFixed(2);
    return `${avgA} - ${avgB}`;
  }, [simulationProgress, currentSimulationMatch]);

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
              <span>2026 World Cup Tournament Simulation</span>
            </div>
          </div>
          
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            <strong className="text-foreground">FIFA World Cup 2026 Simulation:</strong> 
            Starting from the group stage on {formattedStartDate}. Each match uses 
            <strong>real Monte Carlo simulation</strong> with 10,000 Poisson-distributed trials based on team Elo ratings.
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
          
          {/* Stage indicators */}
          <div className="flex justify-between mt-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'].map((stage, index) => (
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
        {currentSimulationMatch && simulationProgress && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 animate-pulse" />
                  Live Simulation: {currentSimulationMatch.teamA.name} vs {currentSimulationMatch.teamB.name}
                </CardTitle>
                <CardDescription>
                  Running REAL Monte Carlo simulation with 10,000 trials using Poisson distribution
                  <br />
                  Elo: {currentSimulationMatch.teamA.elo} vs {currentSimulationMatch.teamB.elo}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Simulation Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm font-medium">Simulation Progress</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {simulationProgress.trial} / 10,000 trials
                    </span>
                    <span className="text-sm font-mono">{progressPercentageForCurrent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-150 ease-linear"
                      style={{ width: `${progressPercentageForCurrent}%` }}
                    />
                  </div>
                </div>

                {/* Expected Goals */}
                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{currentSimulationMatch.teamA.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {simulationProgress.teamA.currentAvgGoals.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expected Goals (Avg from {simulationProgress.trial} trials)
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{currentSimulationMatch.teamB.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {simulationProgress.teamB.currentAvgGoals.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expected Goals (Avg from {simulationProgress.trial} trials)
                    </div>
                  </div>
                </div>

                {/* Win/Draw/Loss Probabilities - Live */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-3">Match Outcome Probabilities (Live)</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={winDrawLossData} layout="vertical">
                          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <YAxis type="category" dataKey="outcome" width={60} />
                          <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
                          <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                            {winDrawLossData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-500">
                          {(simulationProgress.teamA.wins / simulationProgress.trial * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Win</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-yellow-500">
                          {(simulationProgress.teamA.draws / simulationProgress.trial * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Draw</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-500">
                          {(simulationProgress.teamA.losses / simulationProgress.trial * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Loss</div>
                      </div>
                    </div>
                  </div>

                  {/* Goal Distribution Charts */}
                  <div>
                    <h3 className="font-semibold mb-3">Goal Distribution (Live)</h3>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span className="text-sm font-medium">{currentSimulationMatch.teamA.name}</span>
                        </div>
                        <div className="h-[150px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={homeDistributionData} layout="vertical">
                              <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} />
                              <YAxis type="category" dataKey="goals" width={40} />
                              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
                              <Bar dataKey="percentage" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                          <span className="text-sm font-medium">{currentSimulationMatch.teamB.name}</span>
                        </div>
                        <div className="h-[150px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={awayDistributionData} layout="vertical">
                              <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} />
                              <YAxis type="category" dataKey="goals" width={40} />
                              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
                              <Bar dataKey="percentage" fill="var(--color-foreground)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center pt-4">
                      <div className="text-sm text-muted-foreground mb-2">Current Predicted Score</div>
                      <div className="text-4xl font-bold text-foreground">
                        {predictedScore}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Flow Charts Section */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                How the Simulation Works
              </CardTitle>
              <CardDescription>
                Understanding the Monte Carlo prediction process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant={showFlowChart ? 'secondary' : 'outline'}
                  onClick={() => setShowFlowChart(true)}
                  size="sm"
                >
                  Prediction Flow
                </Button>
                <Button
                  variant={showTournamentFlow ? 'secondary' : 'outline'}
                  onClick={() => setShowTournamentFlow(true)}
                  size="sm"
                >
                  Tournament Flow
                </Button>
              </div>

              {showFlowChart && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {WEBSITE_FLOW_DATA.map((item, index) => (
                      <div key={index} className="relative">
                        <Card className="h-full">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                                {item.step}
                              </div>
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-start gap-3 mb-3">
                              {item.icon}
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                        {index < WEBSITE_FLOW_DATA.length - 1 && (
                          <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ChevronRight className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowFlowChart(false)} className="w-full">
                    <X className="h-4 w-4 mr-2" /> Hide Flow Chart
                  </Button>
                </div>
              )}

              {showTournamentFlow && (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    {TOURNAMENT_FLOW_DATA.map((stage, index) => (
                      <div key={stage.stage} className={`flex items-center gap-4 p-4 rounded-lg border ${selectedStage === stage.stage ? 'border-primary bg-primary/10' : 'border-border bg-secondary/50'}`}>
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-foreground font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{stage.label}</h3>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{stage.teams}</span>
                            <span>{stage.matches}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-shrink-0 text-sm text-muted-foreground">
                          {stage.next}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowTournamentFlow(false)} className="w-full">
                    <X className="h-4 w-4 mr-2" /> Hide Tournament Flow
                  </Button>
                </div>
              )}

              {!showFlowChart && !showTournamentFlow && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">Select a flow chart to visualize the process</p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => setShowFlowChart(true)}>Show Prediction Flow</Button>
                    <Button variant="outline" onClick={() => setShowTournamentFlow(true)}>Show Tournament Flow</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Stage Navigation and Controls */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Tournament Stages</CardTitle>
              <CardDescription>Navigate through the 2026 World Cup stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={goToPreviousStage} disabled={selectedStage === 'group'} size="icon">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as TournamentStage)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select stage" /></SelectTrigger>
                    <SelectContent>
                      {['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'thirdplace'].map((stage) => (
                        <SelectItem key={stage} value={stage}>{STAGE_LABELS[stage as TournamentStage]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={goToNextStage} disabled={selectedStage === 'thirdplace'} size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-border bg-secondary/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-2">{STAGE_LABELS[selectedStage]}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span className="font-mono">{completedMatches.length} matches</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining:</span>
                    <span className="font-mono">{currentStageMatches.length} matches</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Animation Speed</label>
                    <div className="flex items-center gap-4">
                      <Slider value={[animationSpeed]} onValueChange={(v) => setAnimationSpeed(v[0])} min={0} max={200} step={10} disabled={isRunning} />
                      <span className="w-12 text-center font-mono text-sm">{animationSpeed}ms</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button onClick={simulateCurrentStage} disabled={isRunning || currentStageMatches.length === 0} className="flex-1 flex items-center justify-center gap-2" size="lg">
                      <Play className="h-4 w-4" /> Simulate {STAGE_LABELS[selectedStage]}
                    </Button>
                    <Button onClick={togglePause} disabled={!isRunning} variant="outline" className="flex items-center justify-center gap-2" size="lg">
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button onClick={resetTournament} disabled={isRunning} variant="ghost" className="flex items-center justify-center gap-2" size="lg">
                      <RefreshCw className="h-4 w-4" /> Reset Tournament
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {STAGE_LABELS[selectedStage]} Matches</CardTitle>
              <CardDescription>
                {currentStageMatches.length > 0 ? `${currentStageMatches.length} matches to simulate` : `All matches completed - ${completedMatches.length} total`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStageMatches.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {currentStageMatches.slice(0, 10).map((match, index) => (
                    <MatchCard key={match.id} match={match} isSimulating={isRunning && currentSimulationMatch?.id === match.id} />
                  ))}
                  {currentStageMatches.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">+{currentStageMatches.length - 10} more matches</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All {STAGE_LABELS[selectedStage]} matches completed</p>
                  <p className="text-sm mt-2">{completedMatches.length} matches simulated</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Group Standings */}
        {selectedStage === 'group' && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Group Standings</CardTitle>
                <CardDescription>Current standings (top 2 from each group advance to Round of 32)</CardDescription>
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
                            <div key={team.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${index < 2 ? 'bg-green-500/20 border border-green-500/30' : 'bg-secondary/50 border border-border'}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-muted-foreground">{index + 1}.</span>
                                <span className="font-medium">{team.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{team.points || 0} pts</span>
                                {index < 2 && <span className="text-xs bg-green-500 text-green-900 px-2 py-0.5 rounded-full font-bold">Qualifies</span>}
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
          <span>Real Monte Carlo Simulation with Poisson Distribution</span>
        </footer>
      </div>
    </main>
  );
}

// Match Card Component
function MatchCard({ match, isSimulating }: { match: TournamentMatch; isSimulating: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${isSimulating ? 'border-primary bg-primary/10 animate-pulse' : match.completed ? 'border-green-500/30 bg-green-500/10' : 'border-border bg-secondary/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="font-medium text-sm">{match.teamA.name}</span>
            <span className="text-xs text-muted-foreground">Elo: {match.teamA.elo}</span>
          </div>
          <span className="text-muted-foreground">vs</span>
          <div className="flex flex-col items-center">
            <span className="font-medium text-sm">{match.teamB.name}</span>
            <span className="text-xs text-muted-foreground">Elo: {match.teamB.elo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {match.completed ? (
            match.winner ? (
              <span className="text-xs bg-green-500 text-green-900 px-2 py-0.5 rounded-full font-bold">{match.winner.name} Won</span>
            ) : (
              <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full font-bold">Draw</span>
            )
          ) : isSimulating ? (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">Simulating...</span>
          ) : (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">Pending</span>
          )}
        </div>
      </div>
    </div>
  );
}
