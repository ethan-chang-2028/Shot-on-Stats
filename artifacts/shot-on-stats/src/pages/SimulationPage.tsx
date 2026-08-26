import { useState, useCallback, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RefreshCw, TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react';
import { runSimulation, getPredictedScoreline, getMostLikelyScoreline, type SimulationConfig, type SimulationResult, type ProgressUpdate } from '@/lib/simulation';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';

// World Cup 2022 started on November 20, 2022
const WORLD_CUP_2022_START = new Date('2022-11-20');

// Sample Elo ratings for demonstration (realistic values)
const SAMPLE_TEAMS = {
  england: { name: 'England', elo: 1980 },
  france: { name: 'France', elo: 2080 },
  brazil: { name: 'Brazil', elo: 2050 },
  argentina: { name: 'Argentina', elo: 2020 },
  germany: { name: 'Germany', elo: 1950 },
  spain: { name: 'Spain', elo: 1970 },
} as const;

interface TeamInfo {
  name: string;
  elo: number;
}

interface TeamSelection {
  home: TeamInfo;
  away: TeamInfo;
}

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

export default function SimulationPage() {
  const [teamSelection, setTeamSelection] = useState<TeamSelection>({
    home: { name: 'France', elo: 2080 },
    away: { name: 'Argentina', elo: 2020 }
  });
  
  const [homeAdvantage, setHomeAdvantage] = useState<number>(60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState<number>(50);

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

  const animateSimulation = useCallback(async (config: SimulationConfig) => {
    setIsRunning(true);
    setIsPaused(false);
    setProgress(null);
    setResult(null);

    const totalTrials = 10000;
    const batchSize = 100;
    const batches = Math.ceil(totalTrials / batchSize);
    
    let completedTrials = 0;
    let teamAWins = 0, teamADraws = 0, teamALosses = 0;
    let teamBWins = 0, teamBDraws = 0, teamBLosses = 0;
    const teamAGoalDistribution = new Map<number, number>();
    const teamBGoalDistribution = new Map<number, number>();
    const teamAGoals: number[] = [];
    const teamBGoals: number[] = [];

    // Calculate expected goals
    const eloDiff = config.eloA - config.eloB + config.homeAdvantage;
    const expectedGoalsA = Math.max(0, 1.3 + (eloDiff / config.c) / 2);
    const expectedGoalsB = Math.max(0, 1.3 - (eloDiff / config.c) / 2);

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
          teamBLosses++;
        } else if (goalsA < goalsB) {
          teamALosses++;
          teamBWins++;
        } else {
          teamADraws++;
          teamBDraws++;
        }
      }

      completedTrials += batchTrials;
      
      const currentAvgA = teamAGoals.reduce((sum, g) => sum + g, 0) / completedTrials;
      const currentAvgB = teamBGoals.reduce((sum, g) => sum + g, 0) / completedTrials;

      setProgress({
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
          wins: teamBWins,
          draws: teamBDraws,
          losses: teamBLosses
        }
      });

      if (completedTrials < totalTrials) {
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
      }
    }

    const finalResult: SimulationResult = {
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
        wins: teamBWins,
        draws: teamBDraws,
        losses: teamBLosses
      },
      winProbability: teamAWins / totalTrials,
      drawProbability: teamADraws / totalTrials,
      lossProbability: teamALosses / totalTrials
    };

    setResult(finalResult);
    setIsRunning(false);
    setIsPaused(false);
  }, [isPaused, animationSpeed]);

  const runFullSimulation = useCallback(() => {
    if (isRunning && !isPaused) return;
    
    const config: SimulationConfig = {
      eloA: teamSelection.home.elo,
      eloB: teamSelection.away.elo,
      homeAdvantage,
      baselineGoals: 1.3,
      c: 200,
      numTrials: 10000
    };

    animateSimulation(config);
  }, [teamSelection, homeAdvantage, isRunning, isPaused, animateSimulation]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setProgress(null);
    setResult(null);
  }, []);

  const handleTeamSelection = useCallback((teamName: string, position: 'home' | 'away') => {
    const teamKeys = Object.keys(SAMPLE_TEAMS) as Array<keyof typeof SAMPLE_TEAMS>;
    const selectedTeam = teamKeys.find(key => SAMPLE_TEAMS[key].name === teamName);
    if (selectedTeam) {
      setTeamSelection(prev => ({
        ...prev,
        [position]: SAMPLE_TEAMS[selectedTeam]
      }));
    }
  }, []);

  const homeDistributionData = useMemo(() => {
    if (!progress && !result) return [];
    const dist = progress ? progress.teamA.currentGoalDistribution : result!.teamA.goalDistribution;
    const trials = progress ? progress.trial : result!.trials;
    return formatDistributionForChart(dist, trials);
  }, [progress, result, formatDistributionForChart]);

  const awayDistributionData = useMemo(() => {
    if (!progress && !result) return [];
    const dist = progress ? progress.teamB.currentGoalDistribution : result!.teamB.goalDistribution;
    const trials = progress ? progress.trial : result!.trials;
    return formatDistributionForChart(dist, trials);
  }, [progress, result, formatDistributionForChart]);

  const winDrawLossData = useMemo(() => {
    if (!progress && !result) return [];
    
    const wins = progress ? progress.teamA.wins : result!.teamA.wins;
    const draws = progress ? progress.teamA.draws : result!.teamA.draws;
    const losses = progress ? progress.teamA.losses : result!.teamA.losses;
    const trials = progress ? progress.trial : result!.trials;
    
    return [
      { outcome: 'Win', count: wins, percentage: (wins / trials) * 100, color: '#10b981' },
      { outcome: 'Draw', count: draws, percentage: (draws / trials) * 100, color: '#f59e0b' },
      { outcome: 'Loss', count: losses, percentage: (losses / trials) * 100, color: '#ef4444' }
    ];
  }, [progress, result]);

  const progressPercentage = useMemo(() => {
    if (!progress) return 0;
    return (progress.trial / 10000) * 100;
  }, [progress]);

  const predictedScore = useMemo(() => {
    if (!result) return '';
    return getPredictedScoreline(result);
  }, [result]);

  const mostLikelyScore = useMemo(() => {
    if (!result) return '';
    return getMostLikelyScoreline(result);
  }, [result]);

  const eloDiff = useMemo(() => {
    return teamSelection.home.elo - teamSelection.away.elo + homeAdvantage;
  }, [teamSelection, homeAdvantage]);

  const expectedGoals = useMemo(() => {
    const diff = eloDiff / 200;
    const homeGoals = Math.max(0, 1.3 + diff / 2);
    const awayGoals = Math.max(0, 1.3 - diff / 2);
    return { home: homeGoals, away: awayGoals };
  }, [eloDiff]);

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
              <Target className="h-3.5 w-3.5" />
              <span>Live Simulation Demo</span>
            </div>
          </div>
          
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            <strong className="text-foreground">Project Outline:</strong> This is a classroom demonstration of the Shot on Stats prediction engine.
            The simulation uses Elo ratings converted to expected goals, then runs a Poisson-based Monte Carlo
            process with 10,000 trials. Starting from the {WORLD_CUP_2022_START.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            (when the most recent World Cup began), this shows how match predictions are calculated.
          </p>
        </header>

        {/* Team Selection and Controls */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Match Setup
              </CardTitle>
              <CardDescription>
                Select teams and adjust Elo ratings to run custom simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Team Selection */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Home Team
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={teamSelection.home.name}
                        onChange={(e) => handleTeamSelection(e.target.value, 'home')}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={isRunning}
                      >
                        {Object.entries(SAMPLE_TEAMS).map(([key, team]) => (
                          <option key={key} value={team.name}>
                            {team.name} ({team.elo})
                          </option>
                        ))}
                      </select>
                      <span className="font-mono text-xs text-muted-foreground">
                        Elo: {teamSelection.home.elo}
                      </span>
                    </div>
                    <Slider
                      value={[teamSelection.home.elo]}
                      onValueChange={(v) => setTeamSelection(prev => ({
                        ...prev,
                        home: { ...prev.home, elo: v[0] }
                      }))}
                      min={1500}
                      max={2200}
                      step={10}
                      disabled={isRunning}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Away Team
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={teamSelection.away.name}
                        onChange={(e) => handleTeamSelection(e.target.value, 'away')}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={isRunning}
                      >
                        {Object.entries(SAMPLE_TEAMS).map(([key, team]) => (
                          <option key={key} value={team.name}>
                            {team.name} ({team.elo})
                          </option>
                        ))}
                      </select>
                      <span className="font-mono text-xs text-muted-foreground">
                        Elo: {teamSelection.away.elo}
                      </span>
                    </div>
                    <Slider
                      value={[teamSelection.away.elo]}
                      onValueChange={(v) => setTeamSelection(prev => ({
                        ...prev,
                        away: { ...prev.away, elo: v[0] }
                      }))}
                      min={1500}
                      max={2200}
                      step={10}
                      disabled={isRunning}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Home Advantage */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Home Advantage
                  </label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[homeAdvantage]}
                      onValueChange={(v) => setHomeAdvantage(v[0])}
                      min={0}
                      max={120}
                      step={10}
                      disabled={isRunning}
                    />
                    <span className="w-12 text-center font-mono text-sm">
                      +{homeAdvantage}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Additional Elo points for the home team
                  </p>
                </div>

                {/* Expected Goals Preview */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{teamSelection.home.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {expectedGoals.home.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expected Goals
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{teamSelection.away.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {expectedGoals.away.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expected Goals
                    </div>
                  </div>
                </div>

                {/* Simulation Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={runFullSimulation}
                    disabled={isRunning}
                    className="flex-1 flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Play className="h-4 w-4" />
                    {isRunning ? 'Running...' : 'Run Simulation'}
                  </Button>
                  
                  <Button
                    onClick={togglePause}
                    disabled={!isRunning}
                    variant="outline"
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  
                  <Button
                    onClick={resetSimulation}
                    disabled={!isRunning && !progress && !result}
                    variant="ghost"
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                {/* Animation Speed */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Animation Speed
                  </label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[animationSpeed]}
                      onValueChange={(v) => setAnimationSpeed(v[0])}
                      min={0}
                      max={100}
                      step={10}
                      disabled={isRunning}
                    />
                    <span className="w-16 text-center font-mono text-sm">
                      {animationSpeed}ms
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Outline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Project Outline
              </CardTitle>
              <CardDescription>
                Based on the PRD for classroom presentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-medium">Problem Statement</p>
                    <p className="text-sm text-muted-foreground">
                      Casual soccer fans want data-driven match predictions without needing stats expertise
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-medium">Solution</p>
                    <p className="text-sm text-muted-foreground">
                      Elo ratings &rarr; expected goals &rarr; Monte Carlo simulation &rarr; predictions
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Demo Focus</p>
                    <p className="text-sm text-muted-foreground">
                      Show the simulation running live, not just results
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-xs">
                    4
                  </span>
                  <div>
                    <p className="font-medium">World Cup Context</p>
                    <p className="text-sm text-muted-foreground">
                      Simulation starts from {WORLD_CUP_2022_START.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/50 p-4">
                <p className="text-xs font-medium mb-2">Key Formula:</p>
                <code className="text-xs font-mono bg-background p-2 rounded block whitespace-pre">
                  expected_goal_diff = (eloA - eloB + homeAdv) / C
                  where C &asymp; 200, baseline &asymp; 1.3 goals/team
                </code>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Progress Bar */}
        {isRunning && (
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Simulation Progress</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {progress?.trial || 0} / 10,000 trials
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-150 ease-linear"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono">
                  {progressPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {(progress || result) && (
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Win/Draw/Loss Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Match Outcome Probabilities</CardTitle>
                <CardDescription>
                  Based on {progress ? progress.trial : result!.trials} simulation trials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={winDrawLossData} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="outcome" width={60} />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                        labelFormatter={(label) => `Outcome: ${label}`}
                      />
                      <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                        {winDrawLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {progress ? ((progress.teamA.wins / progress.trial) * 100).toFixed(1) : (result!.winProbability * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Win</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                      {progress ? ((progress.teamA.draws / progress.trial) * 100).toFixed(1) : (result!.drawProbability * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Draw</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {progress ? ((progress.teamA.losses / progress.trial) * 100).toFixed(1) : (result!.lossProbability * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Loss</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Goal Distribution Charts */}
            <Card>
              <CardHeader>
                <CardTitle>Goal Distribution</CardTitle>
                <CardDescription>
                  How many goals each team scores across simulations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{teamSelection.home.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Avg: {progress ? progress.teamA.currentAvgGoals.toFixed(2) : result!.teamA.avgGoals.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={homeDistributionData} layout="vertical">
                          <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} />
                          <YAxis type="category" dataKey="goals" width={40} />
                          <Tooltip 
                            formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                          />
                          <Bar dataKey="percentage" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span className="text-sm font-medium">{teamSelection.away.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Avg: {progress ? progress.teamB.currentAvgGoals.toFixed(2) : result!.teamB.avgGoals.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={awayDistributionData} layout="vertical">
                          <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} />
                          <YAxis type="category" dataKey="goals" width={40} />
                          <Tooltip 
                            formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                          />
                          <Bar dataKey="percentage" fill="var(--color-foreground)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Final Results Summary */}
        {result && !isRunning && (
          <section className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Final Prediction</CardTitle>
                <CardDescription>
                  After 10,000 Monte Carlo trials using Poisson distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Predicted Scoreline</div>
                    <div className="text-5xl font-bold text-foreground">
                      {predictedScore}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      (Expected goals average)
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Most Likely Result</div>
                    <div className="text-5xl font-bold text-primary">
                      {mostLikelyScore}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      (Highest probability scoreline)
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Favorite</div>
                    <div className="text-3xl font-bold">
                      {result.winProbability > 0.5 ? teamSelection.home.name : 
                       result.lossProbability > 0.5 ? teamSelection.away.name : 'Draw'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {result.winProbability > 0.5 ? `${(result.winProbability * 100).toFixed(1)}% win probability` :
                       result.lossProbability > 0.5 ? `${(result.lossProbability * 100).toFixed(1)}% win probability` :
                       `${(result.drawProbability * 100).toFixed(1)}% draw probability`}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Elo Difference</div>
                    <div className="text-xl font-bold text-foreground">
                      {eloDiff > 0 ? '+' : ''}{eloDiff.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {eloDiff > 0 ? `Advantage: ${teamSelection.home.name}` : 
                       eloDiff < 0 ? `Advantage: ${teamSelection.away.name}` : 'Even match'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Total Goals Simulated</div>
                    <div className="text-xl font-bold text-foreground">
                      {result.teamA.totalGoals + result.teamB.totalGoals}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.teamA.totalGoals} by {teamSelection.home.name}, {result.teamB.totalGoals} by {teamSelection.away.name}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Simulation Date Reference</div>
                    <div className="text-xl font-bold text-foreground">
                      {WORLD_CUP_2022_START.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Most recent World Cup start date
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/70 flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span>Shot on Stats - Demo Simulation</span>
          <span>Based on PRD: Classroom Presentation Mode</span>
        </footer>
      </div>
    </main>
  );
}
