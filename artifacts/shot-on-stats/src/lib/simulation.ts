// Shot on Stats - Monte Carlo Simulation Engine
// Implements the Poisson-based simulation as specified in the Demo PRD

interface SimulationConfig {
  eloA: number;
  eloB: number;
  homeAdvantage: number;
  baselineGoals: number;
  c: number;
  numTrials: number;
}

interface SimulationResult {
  trials: number;
  teamA: {
    goals: number[];
    totalGoals: number;
    avgGoals: number;
    goalDistribution: Map<number, number>;
    wins: number;
    draws: number;
    losses: number;
  };
  teamB: {
    goals: number[];
    totalGoals: number;
    avgGoals: number;
    goalDistribution: Map<number, number>;
    wins: number;
    draws: number;
    losses: number;
  };
  winProbability: number;
  drawProbability: number;
  lossProbability: number;
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

// Knuth's algorithm for Poisson distribution sampling
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

// Calculate expected goals from Elo difference
function calculateExpectedGoals(eloDiff: number, baseline: number, c: number): { home: number; away: number } {
  // Elo difference converted to goal difference
  const goalDiff = eloDiff / c;
  
  // Convert to expected goals for each team
  // Using the formula: expected_goals = baseline + goal_diff / 2
  // and expected_goals_opponent = baseline - goal_diff / 2
  const homeGoals = baseline + goalDiff / 2;
  const awayGoals = baseline - goalDiff / 2;
  
  // Ensure non-negative expected goals
  return {
    home: Math.max(0, homeGoals),
    away: Math.max(0, awayGoals)
  };
}

export function runSimulation(
  config: SimulationConfig,
  onProgress?: (update: ProgressUpdate) => void
): SimulationResult {
  const {
    eloA,
    eloB,
    homeAdvantage,
    baselineGoals = 1.3,
    c = 200,
    numTrials = 10000
  } = config;

  // Calculate expected goals for each team
  // Team A is home team, Team B is away team
  const eloDiff = eloA - eloB + homeAdvantage;
  const { home: expectedGoalsA, away: expectedGoalsB } = calculateExpectedGoals(
    eloDiff,
    baselineGoals,
    c
  );

  // Initialize result tracking
  const teamAGoals: number[] = [];
  const teamBGoals: number[] = [];
  const teamAGoalDistribution = new Map<number, number>();
  const teamBGoalDistribution = new Map<number, number>();
  
  let teamAWins = 0;
  let teamADraws = 0;
  let teamALosses = 0;
  
  let teamBWins = 0;
  let teamBDraws = 0;
  let teamBLosses = 0;

  // Run Monte Carlo trials
  for (let trial = 0; trial < numTrials; trial++) {
    // Sample from Poisson distribution
    const goalsA = poissonRandom(expectedGoalsA);
    const goalsB = poissonRandom(expectedGoalsB);
    
    teamAGoals.push(goalsA);
    teamBGoals.push(goalsB);
    
    // Update distribution maps
    teamAGoalDistribution.set(goalsA, (teamAGoalDistribution.get(goalsA) || 0) + 1);
    teamBGoalDistribution.set(goalsB, (teamBGoalDistribution.get(goalsB) || 0) + 1);
    
    // Update win/draw/loss counts
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
    
    // Send progress update every 100 trials or so for performance
    if (onProgress && (trial % 100 === 0 || trial === numTrials - 1)) {
      const currentTrial = trial + 1;
      const currentAvgA = teamAGoals.reduce((sum, g) => sum + g, 0) / currentTrial;
      const currentAvgB = teamBGoals.reduce((sum, g) => sum + g, 0) / currentTrial;
      
      onProgress({
        trial: currentTrial,
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
    }
  }

  // Calculate final averages
  const totalGoalsA = teamAGoals.reduce((sum, g) => sum + g, 0);
  const totalGoalsB = teamBGoals.reduce((sum, g) => sum + g, 0);
  const avgGoalsA = totalGoalsA / numTrials;
  const avgGoalsB = totalGoalsB / numTrials;

  return {
    trials: numTrials,
    teamA: {
      goals: teamAGoals,
      totalGoals: totalGoalsA,
      avgGoals: avgGoalsA,
      goalDistribution: teamAGoalDistribution,
      wins: teamAWins,
      draws: teamADraws,
      losses: teamALosses
    },
    teamB: {
      goals: teamBGoals,
      totalGoals: totalGoalsB,
      avgGoals: avgGoalsB,
      goalDistribution: teamBGoalDistribution,
      wins: teamBWins,
      draws: teamBDraws,
      losses: teamBLosses
    },
    winProbability: teamAWins / numTrials,
    drawProbability: teamADraws / numTrials,
    lossProbability: teamALosses / numTrials
  };
}

// Async version for animated simulation
export async function runSimulationAsync(
  config: SimulationConfig,
  onProgress: (update: ProgressUpdate) => void,
  delayMs: number = 0
): Promise<SimulationResult> {
  return new Promise((resolve) => {
    // Use setTimeout to allow UI updates between batches
    const result = runSimulation(config, (update) => {
      if (delayMs > 0) {
        setTimeout(() => onProgress(update), delayMs);
      } else {
        onProgress(update);
      }
    });
    resolve(result);
  });
}

// Get predicted scoreline from simulation result
export function getPredictedScoreline(result: SimulationResult): string {
  const avgA = Math.round(result.teamA.avgGoals * 10) / 10;
  const avgB = Math.round(result.teamB.avgGoals * 10) / 10;
  return `${avgA} - ${avgB}`;
}

// Get most likely scoreline from distribution
export function getMostLikelyScoreline(result: SimulationResult): string {
  let maxProb = 0;
  let mostLikelyScore = '0 - 0';
  
  // Check all combinations of goals that have non-zero probability
  for (const [goalsA, countA] of result.teamA.goalDistribution) {
    for (const [goalsB, countB] of result.teamB.goalDistribution) {
      const jointProb = (countA / result.trials) * (countB / result.trials);
      if (jointProb > maxProb) {
        maxProb = jointProb;
        mostLikelyScore = `${goalsA} - ${goalsB}`;
      }
    }
  }
  
  return mostLikelyScore;
}

export type { SimulationConfig, SimulationResult, ProgressUpdate };
