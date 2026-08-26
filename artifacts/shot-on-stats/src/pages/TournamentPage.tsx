import { useState, useCallback, useMemo, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Cell,
  Pie,
  PieChart,
  LabelList
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

// Tournament flow data
const TOURNAMENT_FLOW_DATA = [
  { stage: 'group', label: 'Group Stage', teams: '48 teams', matches: '72 matches', next: 'Round of 32' },
  { stage: 'round16', label: 'Round of 32', teams: '32 teams', matches: '16 matches', next: 'Round of 16' },
  { stage: 'quarterfinal', label: 'Quarterfinals', teams: '8 teams', matches: '4 matches', next: 'Semifinals' },
  { stage: 'semifinal', label: 'Semifinals', teams: '4 teams', matches: '2 matches', next: 'Final & 3rd Place' },
  { stage: 'final', label: 'Final', teams: '2 teams', matches: '1 match', next: 'Champion' },
  { stage: 'thirdplace', label: '3rd Place Playoff', teams: '2 teams', matches: '1 match', next: 'Complete' }
];

export default function TournamentPage() {
  const [simulator] = useState(() => new TournamentSimulator(WORLD_CUP_2026));
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [showFlowChart, setShowFlowChart] = useState(false);
  const [showTournamentFlow, setShowTournamentFlow] = useState(false);
  const [selectedStage, setSelectedStage] = useState<TournamentStage>('group');

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

  // Simulate current stage
  const simulateCurrentStage = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setIsPaused(false);
    setCurrentMatchIndex(0);

    try {
      await simulator.simulateStage(selectedStage, (match, result) => {
        setCurrentMatchIndex(prev => prev + 1);
      });
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsRunning(false);
      setIsPaused(false);
    }
  }, [selectedStage, isRunning, simulator]);

  // Simulate entire tournament
  const simulateTournament = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setIsPaused(false);
    setCurrentMatchIndex(0);

    try {
      await simulator.simulateTournament((match, result) => {
        setCurrentMatchIndex(prev => prev + 1);
      }, (stage) => {
        setSelectedStage(stage);
      });
    } catch (error) {
      console.error('Tournament simulation error:', error);
    } finally {
      setIsRunning(false);
      setIsPaused(false);
    }
  }, [isRunning, simulator]);

  // Reset tournament
  const resetTournament = useCallback(() => {
    simulator.reset();
    setSelectedStage('group');
    setCurrentMatchIndex(0);
    setIsRunning(false);
    setIsPaused(false);
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

  // Get current stage matches count
  const currentStageInfo = useMemo(() => {
    return TOURNAMENT_FLOW_DATA.find(d => d.stage === selectedStage);
  }, [selectedStage]);

  // Format date for display
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
              <span>2026 World Cup Tournament Simulation</span>
            </div>
          </div>
          
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            <strong className="text-foreground">FIFA World Cup 2026 Simulation:</strong> 
            Starting from the group stage on {formattedStartDate}, simulate the entire tournament
            from group stage through to the final. Watch as teams progress through each stage
            based on Elo ratings and Monte Carlo simulations.
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
            {TOURNAMENT_FLOW_DATA.map((stage, index) => (
              <div key={stage.stage} className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${selectedStage === stage.stage ? 'bg-primary' : stage.stage === 'group' && selectedStage !== 'group' ? 'bg-green-500' : 'bg-muted'}`} />
                <span className={selectedStage === stage.stage ? 'text-foreground' : 'text-muted-foreground'}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Charts Section */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Website Workflow Cycle
              </CardTitle>
              <CardDescription>
                Understanding how Shot on Stats generates predictions
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

              {/* Prediction Flow Chart */}
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
                        
                        {/* Connecting arrows */}
                        {index < WEBSITE_FLOW_DATA.length - 1 && (
                          <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ChevronRight className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFlowChart(false)}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Hide Flow Chart
                  </Button>
                </div>
              )}

              {/* Tournament Flow Chart */}
              {showTournamentFlow && (
                <div className="space-y-6">
                  <div className="relative">
                    {/* Tournament bracket visualization */}
                    <div className="grid gap-6">
                      {TOURNAMENT_FLOW_DATA.map((stage, index) => (
                        <div 
                          key={stage.stage}
                          className={`flex items-center gap-4 p-4 rounded-lg border ${selectedStage === stage.stage ? 'border-primary bg-primary/10' : 'border-border bg-secondary/50'}`}
                        >
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
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTournamentFlow(false)}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Hide Tournament Flow
                  </Button>
                </div>
              )}

              {!showFlowChart && !showTournamentFlow && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">Select a flow chart to visualize the process</p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => setShowFlowChart(true)}>
                      Show Prediction Flow
                    </Button>
                    <Button variant="outline" onClick={() => setShowTournamentFlow(true)}>
                      Show Tournament Flow
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Stage Navigation and Controls */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-8">
          {/* Stage Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament Stages
              </CardTitle>
              <CardDescription>
                Navigate through the 2026 World Cup stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={goToPreviousStage}
                    disabled={selectedStage === 'group'}
                    size="icon"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as TournamentStage)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOURNAMENT_FLOW_DATA.map((stage) => (
                        <SelectItem key={stage.stage} value={stage.stage}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    onClick={goToNextStage}
                    disabled={selectedStage === 'thirdplace'}
                    size="icon"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-border bg-secondary/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-2">
                      {STAGE_LABELS[selectedStage]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentStageInfo?.teams} - {currentStageInfo?.matches}
                    </div>
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

                {/* Simulation Controls */}
                <div className="space-y-4 pt-4 border-t border-border">
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

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={simulateCurrentStage}
                      disabled={isRunning || currentStageMatches.length === 0}
                      className="flex-1 flex items-center justify-center gap-2"
                      size="lg"
                    >
                      <Play className="h-4 w-4" />
                      Simulate {STAGE_LABELS[selectedStage]}
                    </Button>
                    
                    <Button
                      onClick={simulateTournament}
                      disabled={isRunning}
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                      size="lg"
                    >
                      <Play className="h-4 w-4" />
                      Simulate Entire Tournament
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
              </div>
            </CardContent>
          </Card>

          {/* Current Stage Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {STAGE_LABELS[selectedStage]} Matches
              </CardTitle>
              <CardDescription>
                {currentStageMatches.length > 0 
                  ? `${currentStageMatches.length} matches to simulate`
                  : `All matches completed - ${completedMatches.length} total`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStageMatches.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {currentStageMatches.slice(0, 10).map((match, index) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      isSimulating={isRunning && index === currentMatchIndex % currentStageMatches.length}
                    />
                  ))}
                  {currentStageMatches.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      +{currentStageMatches.length - 10} more matches
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All {STAGE_LABELS[selectedStage]} matches completed</p>
                  <p className="text-sm mt-2">
                    {completedMatches.length} matches simulated
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Group Standings (for group stage) */}
        {selectedStage === 'group' && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Group Standings
                </CardTitle>
                <CardDescription>
                  Current standings after simulated matches
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
                            <div 
                              key={team.id}
                              className={`flex items-center justify-between p-2 rounded-lg text-sm ${index < 2 ? 'bg-green-500/20 border border-green-500/30' : 'bg-secondary/50 border border-border'}`}
                            >
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

        {/* Knockout Bracket Preview */}
        {selectedStage !== 'group' && knockoutTeams.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Knockout Bracket ({knockoutTeams.length} teams)
                </CardTitle>
                <CardDescription>
                  Teams that advanced from group stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Round of 16 Qualifiers</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {knockoutTeams.slice(0, 8).map((team, index) => (
                        <div key={team.id} className="p-2 border rounded-lg text-center">
                          <div className="font-medium text-sm">{team.name}</div>
                          <div className="text-xs text-muted-foreground">Elo: {team.elo}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Potential Path</h4>
                    <p className="text-sm text-muted-foreground">
                      Simulate matches to see which teams advance to the next rounds
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/70 flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span>Shot on Stats - 2026 World Cup Tournament Simulation</span>
          <span>Based on PRD: {formattedStartDate}</span>
        </footer>
      </div>
    </main>
  );
}

// Match Card Component
function MatchCard({ match, isSimulating }: { match: TournamentMatch; isSimulating: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${isSimulating ? 'border-primary bg-primary/10 animate-pulse' : 'border-border bg-secondary/50'}`}>
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
            <>
              {match.winner ? (
                <span className="text-xs bg-green-500 text-green-900 px-2 py-0.5 rounded-full font-bold">
                  {match.winner.name} Won
                </span>
              ) : (
                <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
                  Draw
                </span>
              )}
            </>
          ) : isSimulating ? (
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
    </div>
  );
}
