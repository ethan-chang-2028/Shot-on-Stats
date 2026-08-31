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

export interface TrialProbabilities {
  winProbability: number;
  drawProbability: number;
  lossProbability: number;
}

// How strongly a decided result should favor whichever side actually won
// more of the 10,000 trials, versus a raw-probability-weighted coin flip.
// 1 = exactly the raw trial probabilities (fully "luck of one random
// draw"); higher values push the more common trial outcome to happen more
// often too, without making it a certainty - a team that wins 70% of
// trials should win more than 70% of the time it actually gets decided,
// but a true toss-up (close to 33/33/33 or 50/50) still plays out close to
// a coin flip. This is what "decide it from the 10,000 trials, not one
// lucky draw" means in practice.
const OUTCOME_SHARPNESS = 3;

function sharpenTrialProbabilities(probabilities: TrialProbabilities, allowDraw: boolean): { win: number; draw: number; loss: number } {
  let { winProbability: win, drawProbability: draw, lossProbability: loss } = probabilities;
  if (!allowDraw) {
    // A knockout match's final winner is never literally "a draw" - fold
    // that trial share into win/loss proportionally to how those trials
    // would have gone had a draw not been an option.
    const decisive = win + loss || 1;
    win += draw * (win / decisive);
    loss += draw * (loss / decisive);
    draw = 0;
  }
  const w = win ** OUTCOME_SHARPNESS;
  const d = draw ** OUTCOME_SHARPNESS;
  const l = loss ** OUTCOME_SHARPNESS;
  const total = w + d + l || 1;
  return { win: w / total, draw: d / total, loss: l / total };
}

function pickSharpenedOutcome(probabilities: TrialProbabilities, allowDraw: boolean): 'teamA' | 'draw' | 'teamB' {
  const { win, draw } = sharpenTrialProbabilities(probabilities, allowDraw);
  const r = Math.random();
  if (r < win) return 'teamA';
  if (allowDraw && r < win + draw) return 'draw';
  return 'teamB';
}

// Draw ONE realized scoreline from the same Elo -> expected-goals model used
// by the 10,000-trial engine above. The functions above report a *trial*
// average / distribution; this is what's needed to actually build a
// tournament bracket, where every match needs one concrete result.
//
// Pass the match's own 10,000-trial probabilities (from runSimulation) to
// make the decided outcome track them - drawn from a sharpened version of
// those exact shares, then a real scoreline sampled until it matches that
// outcome - rather than one independent Poisson roll that could land
// anywhere its raw (unsharpened) odds allow. Omit them to fall back to a
// single unbiased draw (used internally for realistic regulation-time
// scorelines even when the sharpened pick decides the actual winner).
export function drawMatchOutcome(
  config: SimulationConfig,
  probabilities?: TrialProbabilities
): { goalsA: number; goalsB: number } {
  const { eloA, eloB, homeAdvantage, baselineGoals = 1.3, c = 200 } = config;
  const eloDiff = eloA - eloB + homeAdvantage;
  const { home, away } = calculateExpectedGoals(eloDiff, baselineGoals, c);

  if (!probabilities) {
    return { goalsA: poissonRandom(home), goalsB: poissonRandom(away) };
  }

  const target = pickSharpenedOutcome(probabilities, true);
  const MAX_ATTEMPTS = 50;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const goalsA = poissonRandom(home);
    const goalsB = poissonRandom(away);
    const outcome = goalsA > goalsB ? 'teamA' : goalsB > goalsA ? 'teamB' : 'draw';
    if (outcome === target) return { goalsA, goalsB };
  }
  // Astronomically unlikely fallback (e.g. a ~0% trial share still getting
  // picked by the sharpened draw): nudge one more unbiased draw to match.
  const goalsA = poissonRandom(home);
  const goalsB = poissonRandom(away);
  if (target === 'teamA') return { goalsA: Math.max(goalsA, goalsB + 1), goalsB };
  if (target === 'teamB') return { goalsA, goalsB: Math.max(goalsB, goalsA + 1) };
  return { goalsA, goalsB: goalsA };
}

export interface KnockoutOutcome {
  goalsA: number;
  goalsB: number;
  wentToPenalties: boolean;
  winner: 'A' | 'B';
}

// A knockout match must produce a winner: extra time (roughly a third of a
// full match's worth of extra chances), then penalties if still level.
//
// The regulation/extra-time scoreline is still an honest, unbiased draw
// from the model (a big favorite can absolutely go behind for 90 minutes -
// that's real soccer), but the *ultimate* winner is the sharpened pick from
// the match's own 10,000-trial probabilities: if regulation/extra time
// already agrees with that pick, it stands; if it doesn't (the underdog
// pulled ahead, or it's level), it goes to penalties, which the sharpened
// pick wins - rather than a near-coin-flip shootout. A true pick-'em match
// still gets decided close to a coin flip, since its sharpened win/loss
// shares are close to even; it's the lopsided matchups that stop being
// upset by a single unlucky draw.
export function drawKnockoutOutcome(config: SimulationConfig, probabilities?: TrialProbabilities): KnockoutOutcome {
  if (!probabilities) {
    let { goalsA, goalsB } = drawMatchOutcome(config);
    if (goalsA === goalsB) {
      const extraTime = drawMatchOutcome({ ...config, baselineGoals: (config.baselineGoals ?? 1.3) / 3 });
      goalsA += extraTime.goalsA;
      goalsB += extraTime.goalsB;
    }
    if (goalsA === goalsB) {
      const shootoutEdge = 0.5 + Math.max(-0.1, Math.min(0.1, (config.eloA - config.eloB) / 4000));
      return { goalsA, goalsB, wentToPenalties: true, winner: Math.random() < shootoutEdge ? 'A' : 'B' };
    }
    return { goalsA, goalsB, wentToPenalties: false, winner: goalsA > goalsB ? 'A' : 'B' };
  }

  // Draw and decide independently would make penalties absurdly common:
  // two near-coin-flip picks (a sharpened winner, a natural scoreline)
  // disagree something like half the time for an even matchup, and real
  // shootouts are nowhere near that frequent. Instead, first ask the
  // sharpened shares whether this one is a genuine toss-up at all - allowing
  // a draw target here (unlike the true winner pick above) lets an even
  // matchup's real draw share come through as "played to a stalemate,"
  // rather than manufacturing a shootout out of ordinary disagreement.
  const target = pickSharpenedOutcome(probabilities, true);

  if (target !== 'draw') {
    const winner = target === 'teamB' ? 'B' : 'A';
    const decisive: TrialProbabilities = winner === 'A'
      ? { winProbability: 1, drawProbability: 0, lossProbability: 0 }
      : { winProbability: 0, drawProbability: 0, lossProbability: 1 };
    let { goalsA, goalsB } = drawMatchOutcome(config, decisive);
    if (goalsA === goalsB) {
      const extraTime = drawMatchOutcome({ ...config, baselineGoals: (config.baselineGoals ?? 1.3) / 3 }, decisive);
      goalsA += extraTime.goalsA;
      goalsB += extraTime.goalsB;
    }
    if (goalsA === goalsB) {
      // The rejection sampling in drawMatchOutcome makes this vanishingly
      // rare, but stay correct: hand the shootout to the intended winner.
      return { goalsA, goalsB, wentToPenalties: true, winner };
    }
    return { goalsA, goalsB, wentToPenalties: false, winner: goalsA > goalsB ? 'A' : 'B' };
  }

  // A genuine toss-up: play out an unbiased regulation + extra time and
  // only go to penalties if it's actually still level, same as the
  // no-probabilities path above.
  let { goalsA, goalsB } = drawMatchOutcome(config);
  if (goalsA === goalsB) {
    const extraTime = drawMatchOutcome({ ...config, baselineGoals: (config.baselineGoals ?? 1.3) / 3 });
    goalsA += extraTime.goalsA;
    goalsB += extraTime.goalsB;
  }
  if (goalsA === goalsB) {
    const shootoutEdge = 0.5 + Math.max(-0.1, Math.min(0.1, (config.eloA - config.eloB) / 4000));
    return { goalsA, goalsB, wentToPenalties: true, winner: Math.random() < shootoutEdge ? 'A' : 'B' };
  }
  return { goalsA, goalsB, wentToPenalties: false, winner: goalsA > goalsB ? 'A' : 'B' };
}

export type { SimulationConfig, SimulationResult, ProgressUpdate };
