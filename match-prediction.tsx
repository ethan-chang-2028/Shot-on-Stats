import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

// --- Simulation Logic ---
function runMonteCarloSimulation(
  eloA: number,
  eloB: number,
  homeAdv: number = 60,
  trials: number = 10000
) {
  const C = 200; // Elo constant
  const baselineGoals = 1.3; // League average goals per team
  
  // Calculate expected goals for each team
  const goalDiff = (eloA - eloB + homeAdv) / C;
  const lambdaA = baselineGoals * Math.exp(goalDiff / 2);
  const lambdaB = baselineGoals * Math.exp(-goalDiff / 2);

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let goalsA: number[] = [];
  let goalsB: number[] = [];
  const goalDistA: Record<string, number> = {};
  const goalDistB: Record<string, number> = {};

  // Initialize goal distributions
  for (let i = 0; i <= 10; i++) {
    goalDistA[i.toString()] = 0;
    goalDistB[i.toString()] = 0;
  }

  // Run trials
  for (let i = 0; i < trials; i++) {
    // Poisson distribution sampling (Knuth's algorithm)
    const goalsTeamA = poissonSample(lambdaA);
    const goalsTeamB = poissonSample(lambdaB);
    
    goalsA.push(goalsTeamA);
    goalsB.push(goalsTeamB);
    
    // Update distributions
    goalDistA[(goalsTeamA).toString()] = (goalDistA[(goalsTeamA).toString()] || 0) + 1;
    goalDistB[(goalsTeamB).toString()] = (goalDistB[(goalsTeamB).toString()] || 0) + 1;

    // Determine result
    if (goalsTeamA > goalsTeamB) winsA++;
    else if (goalsTeamA < goalsTeamB) winsB++;
    else draws++;
  }

  // Calculate probabilities
  const winProbA = winsA / trials;
  const winProbB = winsB / trials;
  const drawProb = draws / trials;

  // Calculate average goals
  const avgGoalsA = goalsA.reduce((a, b) => a + b, 0) / trials;
  const avgGoalsB = goalsB.reduce((a, b) => a + b, 0) / trials;

  return {
    winProbA,
    winProbB,
    drawProb,
    avgGoalsA,
    avgGoalsB,
    goalDistA,
    goalDistB,
    lambdaA,
    lambdaB,
  };
}

// Poisson distribution sampling (Knuth's algorithm)
function poissonSample(lambda: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// --- Types ---
interface SimulationResult {
  winProbA: number;
  winProbB: number;
  drawProb: number;
  avgGoalsA: number;
  avgGoalsB: number;
  goalDistA: Record<string, number>;
  goalDistB: Record<string, number>;
}

interface WorldCupMatch {
  teamA: string;
  teamB: string;
  actualScore: string;
  actualWinner: string | null;
  eloA: number;
  eloB: number;
}

// Mock 2026 World Cup results (replace with real data)
const worldCupFixtures: WorldCupMatch[] = [
  {
    teamA: "Argentina",
    teamB: "France",
    actualScore: "2-1",
    actualWinner: "Argentina",
    eloA: 2100,
    eloB: 2080,
  },
  {
    teamA: "Brazil",
    teamB: "England",
    actualScore: "3-0",
    actualWinner: "Brazil",
    eloA: 2090,
    eloB: 2010,
  },
  {
    teamA: "Spain",
    teamB: "Germany",
    actualScore: "1-1",
    actualWinner: null,
    eloA: 2050,
    eloB: 2040,
  },
  {
    teamA: "Portugal",
    teamB: "Netherlands",
    actualScore: "2-0",
    actualWinner: "Portugal",
    eloA: 2030,
    eloB: 2000,
  },
];

// --- Helper Functions ---
function toChartData(distribution: Record<string, number>, totalTrials: number) {
  return Object.entries(distribution).map(([goals, count]) => ({
    goals,
    probability: Math.round((count / totalTrials) * 1000) / 10, // percent, 1 decimal
  }));
}

function getSimulationResultForWorldCup(match: WorldCupMatch): SimulationResult {
  return runMonteCarloSimulation(match.eloA, match.eloB, 60);
}

// --- Components ---
function TeamCard({
  teamName,
  elo,
  winProb,
  avgGoals,
  goalDist,
  totalTrials,
  isHome = false,
}: {
  teamName: string;
  elo: number;
  winProb: number;
  avgGoals: number;
  goalDist: Record<string, number>;
  totalTrials: number;
  isHome?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{teamName}</span>
          <Badge variant="outline">Elo {Math.round(elo)}</Badge>
        </CardTitle>
        <CardDescription>
          {isHome ? "Home team" : "Away team"} Elo rating
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-semibold">
            {Math.round(winProb * 100)}%
          </span>
          <span className="text-sm text-muted-foreground">
            chance to win{isHome ? " (home)" : " (away)"}
          </span>
        </div>
        <div className="mb-2 text-sm text-muted-foreground">
          Projected goals: <span className="font-medium text-foreground">{avgGoals.toFixed(2)}</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={toChartData(goalDist, totalTrials)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="goals" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v: number) => [`${v}%`, "Probability"]} />
            <Bar dataKey="probability" radius={[4, 4, 0, 0]} fill={isHome ? "hsl(var(--primary))" : "hsl(var(--secondary))"} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          Based on {totalTrials.toLocaleString()} simulated outcomes
        </p>
      </CardContent>
    </Card>
  );
}

function SimulationControls({
  eloA,
  eloB,
  homeAdv,
  onEloAChange,
  onEloBChange,
  onHomeAdvChange,
  onRunSimulation,
  isRunning,
}: {
  eloA: number;
  eloB: number;
  homeAdv: number;
  onEloAChange: (value: number[]) => void;
  onEloBChange: (value: number[]) => void;
  onHomeAdvChange: (value: number[]) => void;
  onRunSimulation: () => void;
  isRunning: boolean;
}) {
  return (
    <Card className="space-y-4 p-6">
      <CardHeader>
        <CardTitle className="text-lg">Run Your Own Simulation</CardTitle>
        <CardDescription>
          Adjust the Elo ratings and home advantage, then run the Monte Carlo simulation.
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="elo-a">Team A Elo Rating</Label>
          <Slider
            id="elo-a"
            min={1000}
            max={2500}
            step={10}
            value={[eloA]}
            onValueChange={onEloAChange}
            className="w-full"
          />
          <span className="text-sm text-muted-foreground">{eloA}</span>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="elo-b">Team B Elo Rating</Label>
          <Slider
            id="elo-b"
            min={1000}
            max={2500}
            step={10}
            value={[eloB]}
            onValueChange={onEloBChange}
            className="w-full"
          />
          <span className="text-sm text-muted-foreground">{eloB}</span>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="home-adv">Home Advantage</Label>
          <Slider
            id="home-adv"
            min={0}
            max={120}
            step={10}
            value={[homeAdv]}
            onValueChange={onHomeAdvChange}
            className="w-full"
          />
          <span className="text-sm text-muted-foreground">{homeAdv} (Default: 60)</span>
        </div>
        
        <Button
          onClick={onRunSimulation}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? "Running Simulation..." : "Run Simulation (10,000 Trials)"}
        </Button>
      </div>
    </Card>
  );
}

function SimulationResults({
  result,
  totalTrials,
}: {
  result: SimulationResult | null;
  totalTrials: number;
}) {
  if (!result) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TeamCard
        teamName="Team A"
        elo={2000}
        winProb={result.winProbA}
        avgGoals={result.avgGoalsA}
        goalDist={result.goalDistA}
        totalTrials={totalTrials}
        isHome
      />
      <TeamCard
        teamName="Team B"
        elo={2000}
        winProb={result.winProbB}
        avgGoals={result.avgGoalsB}
        goalDist={result.goalDistB}
        totalTrials={totalTrials}
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draw Probability</CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-semibold">
            {Math.round(result.drawProb * 100)}%
          </span>
          <p className="mt-1 text-sm text-muted-foreground">
            Probability of a draw based on {totalTrials.toLocaleString()} trials
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Predicted Scoreline</CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-semibold">
            {result.avgGoalsA.toFixed(1)} - {result.avgGoalsB.toFixed(1)}
          </span>
          <p className="mt-1 text-sm text-muted-foreground">
            Average goals per team across all simulations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WorldCupComparison() {
  const [selectedMatch, setSelectedMatch] = useState<WorldCupMatch | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runComparison = (match: WorldCupMatch) => {
    setSelectedMatch(match);
    setIsRunning(true);
    
    // Simulate a delay to show loading state
    setTimeout(() => {
      const result = getSimulationResultForWorldCup(match);
      setSimulationResult(result);
      setIsRunning(false);
    }, 1000);
  };

  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle className="text-lg">2026 World Cup: Simulation vs. Actual Results</CardTitle>
        <CardDescription>
          Compare our simulation predictions against the actual 2026 World Cup match results.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Match Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Select a 2026 World Cup Match:</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {worldCupFixtures.map((match, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all ${selectedMatch?.teamA === match.teamA && selectedMatch?.teamB === match.teamB ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                onClick={() => runComparison(match)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {match.teamA} vs {match.teamB}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Actual: {match.actualScore}
                  </p>
                  <Badge variant={match.actualWinner ? "default" : "outline"} className="mt-2">
                    {match.actualWinner || "Draw"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Simulation Results for Selected Match */}
        {isRunning && (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Running simulation...</p>
          </div>
        )}

        {selectedMatch && simulationResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4 p-4">
              <h3 className="text-lg font-semibold">
                {selectedMatch.teamA} vs {selectedMatch.teamB}
              </h3>
            </div>
            
            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prediction vs. Reality</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Simulation Prediction</TableHead>
                      <TableHead>Actual Result</TableHead>
                      <TableHead>Match?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Winner</TableCell>
                      <TableCell>
                        {simulationResult.winProbA > simulationResult.winProbB ? selectedMatch.teamA : 
                         simulationResult.winProbB > simulationResult.winProbA ? selectedMatch.teamB : "Draw"}
                      </TableCell>
                      <TableCell>{selectedMatch.actualWinner || "Draw"}</TableCell>
                      <TableCell>
                        {simulationResult.winProbA > simulationResult.winProbB ? 
                          (selectedMatch.actualWinner === selectedMatch.teamA ? "✅" : "❌") :
                          simulationResult.winProbB > simulationResult.winProbA ? 
                            (selectedMatch.actualWinner === selectedMatch.teamB ? "✅" : "❌") :
                            (selectedMatch.actualWinner === null ? "✅" : "❌")}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Score</TableCell>
                      <TableCell>
                        {simulationResult.avgGoalsA.toFixed(1)} - {simulationResult.avgGoalsB.toFixed(1)}
                      </TableCell>
                      <TableCell>{selectedMatch.actualScore}</TableCell>
                      <TableCell>
                        {Math.abs(simulationResult.avgGoalsA - parseInt(selectedMatch.actualScore.split('-')[0])) <= 1 &&
                         Math.abs(simulationResult.avgGoalsB - parseInt(selectedMatch.actualScore.split('-')[1])) <= 1 ? "✅" : "❌"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{selectedMatch.teamA} Win %</TableCell>
                      <TableCell>{Math.round(simulationResult.winProbA * 100)}%</TableCell>
                      <TableCell>{selectedMatch.actualWinner === selectedMatch.teamA ? "Won" : "Lost/Drew"}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{selectedMatch.teamB} Win %</TableCell>
                      <TableCell>{Math.round(simulationResult.winProbB * 100)}%</TableCell>
                      <TableCell>{selectedMatch.actualWinner === selectedMatch.teamB ? "Won" : "Lost/Drew"}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Simulation Visualization */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedMatch.teamA} Goal Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={toChartData(simulationResult.goalDistA, 10000)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="goals" fontSize={12} />
                      <YAxis />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Probability"]} />
                      <Bar dataKey="probability" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedMatch.teamB} Goal Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={toChartData(simulationResult.goalDistB, 10000)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="goals" fontSize={12} />
                      <YAxis />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Probability"]} />
                      <Bar dataKey="probability" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---
export default function MatchPredictionPage({
  fixtureId,
}: {
  fixtureId: number;
}) {
  // State for custom simulation
  const [eloA, setEloA] = useState(2000);
  const [eloB, setEloB] = useState(2000);
  const [homeAdv, setHomeAdv] = useState(60);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Run custom simulation
  const runSimulation = () => {
    setIsRunning(true);
    setSimulationResult(null);
    
    // Simulate a delay to show loading state
    setTimeout(() => {
      const result = runMonteCarloSimulation(eloA, eloB, homeAdv);
      setSimulationResult(result);
      setIsRunning(false);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-center">Shot on Stats</h1>
        <p className="text-lg text-center text-muted-foreground">
          Data-Driven Soccer Predictions with Live Simulation
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">The Problem</h3>
                <p className="text-sm text-muted-foreground">
                  Casual soccer fans want data-driven predictions, but current options are either opaque expert opinions or complex raw stats that require deep knowledge.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Our Solution</h3>
                <p className="text-sm text-muted-foreground">
                  We use Elo ratings and Monte Carlo simulations to provide transparent predictions. Watch the simulation run live and see the underlying data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Simulation Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Run Your Own Simulation</h2>
        <SimulationControls
          eloA={eloA}
          eloB={eloB}
          homeAdv={homeAdv}
          onEloAChange={(val) => setEloA(val[0])}
          onEloBChange={(val) => setEloB(val[0])}
          onHomeAdvChange={(val) => setHomeAdv(val[0])}
          onRunSimulation={runSimulation}
          isRunning={isRunning}
        />
        
        {isRunning && (
          <Card className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Running 10,000 trials...</p>
          </Card>
        )}
        
        {simulationResult && (
          <SimulationResults result={simulationResult} totalTrials={10000} />
        )}
      </section>

      <div className="border-t my-8" />

      {/* World Cup Comparison Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">2026 World Cup Results Comparison</h2>
        <WorldCupComparison />
      </section>

      {/* Demo Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About This Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This is a live demonstration of how Shot on Stats works. The simulation runs 10,000 trials to predict match outcomes based on team Elo ratings and home advantage. 
            The 2026 World Cup comparison section shows how our predictions stack up against real results.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong>Target User:</strong> Soccer fans who want transparent, data-driven predictions without needing a statistics degree.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}