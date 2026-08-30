// Runs the full 2026 FIFA World Cup through the same Elo -> Poisson ->
// Monte Carlo engine used by the live prototype (artifacts/shot-on-stats),
// but for the real 48-team / 12-group / 32-team-knockout format, rather
// than the UI's current 16-team shortcut.
//
// Usage:
//   pnpm --filter @workspace/scripts run simulate-world-cup            # one narrated run + 5,000-trial title odds
//   pnpm --filter @workspace/scripts run simulate-world-cup -- 20000   # custom trial count

interface Team {
  name: string;
  elo: number;
  group: string;
}

interface Standing extends Team {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface MatchResult {
  a: Team;
  b: Team;
  goalsA: number;
  goalsB: number;
  wentToPenalties?: boolean;
}

// Same 12 groups / 48 teams / Elo ratings as
// artifacts/shot-on-stats/src/types/tournament.ts (WORLD_CUP_2026), kept in
// sync by hand since this script intentionally has no cross-package import.
const GROUPS: Record<string, Team[]> = {
  A: [
    { name: 'Netherlands', elo: 2050, group: 'A' },
    { name: 'Mexico', elo: 1890, group: 'A' },
    { name: 'Ecuador', elo: 1850, group: 'A' },
    { name: 'New Zealand', elo: 1650, group: 'A' },
  ],
  B: [
    { name: 'Spain', elo: 2050, group: 'B' },
    { name: 'Italy', elo: 2020, group: 'B' },
    { name: 'Croatia', elo: 1990, group: 'B' },
    { name: 'Canada', elo: 1750, group: 'B' },
  ],
  C: [
    { name: 'England', elo: 2080, group: 'C' },
    { name: 'Denmark', elo: 1980, group: 'C' },
    { name: 'Serbia', elo: 1860, group: 'C' },
    { name: 'Slovenia', elo: 1810, group: 'C' },
  ],
  D: [
    { name: 'Brazil', elo: 2150, group: 'D' },
    { name: 'France', elo: 2120, group: 'D' },
    { name: 'Colombia', elo: 1970, group: 'D' },
    { name: 'United Arab Emirates', elo: 1700, group: 'D' },
  ],
  E: [
    { name: 'Belgium', elo: 2040, group: 'E' },
    { name: 'Germany', elo: 2030, group: 'E' },
    { name: 'Ukraine', elo: 1880, group: 'E' },
    { name: 'USA', elo: 1820, group: 'E' },
  ],
  F: [
    { name: 'Argentina', elo: 2100, group: 'F' },
    { name: 'Portugal', elo: 2070, group: 'F' },
    { name: 'Poland', elo: 1870, group: 'F' },
    { name: 'Saudi Arabia', elo: 1720, group: 'F' },
  ],
  G: [
    { name: 'Uruguay', elo: 2010, group: 'G' },
    { name: 'Switzerland', elo: 1970, group: 'G' },
    { name: 'South Korea', elo: 1830, group: 'G' },
    { name: 'Ghana', elo: 1800, group: 'G' },
  ],
  H: [
    { name: 'Morocco', elo: 1860, group: 'H' },
    { name: 'Japan', elo: 1840, group: 'H' },
    { name: 'Nigeria', elo: 1830, group: 'H' },
    { name: 'Tunisia', elo: 1760, group: 'H' },
  ],
  I: [
    { name: 'Senegal', elo: 1900, group: 'I' },
    { name: 'Algeria', elo: 1790, group: 'I' },
    { name: 'Australia', elo: 1740, group: 'I' },
    { name: 'Panama', elo: 1680, group: 'I' },
  ],
  J: [
    { name: 'Sweden', elo: 1920, group: 'J' },
    { name: 'Turkey', elo: 1900, group: 'J' },
    { name: 'Czech Republic', elo: 1850, group: 'J' },
    { name: 'Egypt', elo: 1780, group: 'J' },
  ],
  K: [
    { name: 'Russia', elo: 1920, group: 'K' },
    { name: 'Peru', elo: 1820, group: 'K' },
    { name: 'Ireland', elo: 1800, group: 'K' },
    { name: 'Kenya', elo: 1650, group: 'K' },
  ],
  L: [
    { name: 'Chile', elo: 1880, group: 'L' },
    { name: 'Ivory Coast', elo: 1840, group: 'L' },
    { name: 'Qatar', elo: 1750, group: 'L' },
    { name: 'Indonesia', elo: 1600, group: 'L' },
  ],
};

const BASELINE_GOALS = 1.3;
const ELO_TO_GOALS_C = 200;

function poissonRandom(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function expectedGoals(eloA: number, eloB: number): { a: number; b: number } {
  const goalDiff = (eloA - eloB) / ELO_TO_GOALS_C; // neutral venues, no home advantage
  return {
    a: Math.max(0, BASELINE_GOALS + goalDiff / 2),
    b: Math.max(0, BASELINE_GOALS - goalDiff / 2),
  };
}

// One realized scoreline for a group match (draws are a valid result).
function playGroupMatch(a: Team, b: Team): MatchResult {
  const { a: lamA, b: lamB } = expectedGoals(a.elo, b.elo);
  return { a, b, goalsA: poissonRandom(lamA), goalsB: poissonRandom(lamB) };
}

// A knockout match must produce a winner: extra time, then a penalty
// shootout modeled as a near coin-flip (a small Elo tilt, since shootouts
// are famously close to random regardless of run of play).
function playKnockoutMatch(a: Team, b: Team): { winner: Team; result: MatchResult } {
  const { a: lamA, b: lamB } = expectedGoals(a.elo, b.elo);
  let goalsA = poissonRandom(lamA);
  let goalsB = poissonRandom(lamB);
  if (goalsA === goalsB) {
    // extra time: ~1/3 of a match's worth of extra chances
    goalsA += poissonRandom(lamA / 3);
    goalsB += poissonRandom(lamB / 3);
  }
  if (goalsA === goalsB) {
    const shootoutEdge = 0.5 + Math.max(-0.1, Math.min(0.1, (a.elo - b.elo) / 4000));
    const winner = Math.random() < shootoutEdge ? a : b;
    return { winner, result: { a, b, goalsA, goalsB, wentToPenalties: true } };
  }
  return { winner: goalsA > goalsB ? a : b, result: { a, b, goalsA, goalsB } };
}

function runGroupStage(): { standingsByGroup: Record<string, Standing[]>; matches: MatchResult[] } {
  const standingsByGroup: Record<string, Standing[]> = {};
  const allMatches: MatchResult[] = [];

  for (const [groupName, teams] of Object.entries(GROUPS)) {
    const standings = new Map<string, Standing>(
      teams.map((t) => [t.name, { ...t, points: 0, goalsFor: 0, goalsAgainst: 0 }]),
    );

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const m = playGroupMatch(teams[i], teams[j]);
        allMatches.push(m);
        const sa = standings.get(m.a.name)!;
        const sb = standings.get(m.b.name)!;
        sa.goalsFor += m.goalsA;
        sa.goalsAgainst += m.goalsB;
        sb.goalsFor += m.goalsB;
        sb.goalsAgainst += m.goalsA;
        if (m.goalsA > m.goalsB) sa.points += 3;
        else if (m.goalsB > m.goalsA) sb.points += 3;
        else {
          sa.points += 1;
          sb.points += 1;
        }
      }
    }

    standingsByGroup[groupName] = [...standings.values()].sort(
      (x, y) => y.points - x.points || y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) || y.goalsFor - x.goalsFor,
    );
  }

  return { standingsByGroup, matches: allMatches };
}

// Real 2026 format: top 2 of each of the 12 groups (24) plus the best 8
// third-place teams across all groups (8) advance to a 32-team Round of 32.
function qualifyRound32(standingsByGroup: Record<string, Standing[]>): Standing[] {
  const groupWinners: Standing[] = [];
  const runnersUp: Standing[] = [];
  const thirds: Standing[] = [];

  for (const standings of Object.values(standingsByGroup)) {
    groupWinners.push(standings[0]);
    runnersUp.push(standings[1]);
    thirds.push(standings[2]);
  }

  const bestThirds = [...thirds]
    .sort((x, y) => y.points - x.points || y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) || y.goalsFor - x.goalsFor)
    .slice(0, 8);

  return [...groupWinners, ...runnersUp, ...bestThirds];
}

// Seeded (snake) pairing by Elo so the bracket doesn't collapse into
// strongest-vs-strongest in round one — a simplification of FIFA's official
// pot-based knockout draw, which also avoids group-mates meeting immediately.
function seedRound32(qualifiers: Standing[]): [Team, Team][] {
  const seeded = [...qualifiers].sort((a, b) => b.elo - a.elo);
  const pairs: [Team, Team][] = [];
  for (let i = 0; i < 16; i++) {
    pairs.push([seeded[i], seeded[31 - i]]);
  }
  return pairs;
}

interface KnockoutRoundResult {
  round: string;
  matches: { a: Team; b: Team; winner: Team; result: MatchResult }[];
}

function playKnockoutRound(pairs: [Team, Team][], round: string): KnockoutRoundResult {
  return {
    round,
    matches: pairs.map(([a, b]) => {
      const { winner, result } = playKnockoutMatch(a, b);
      return { a, b, winner, result };
    }),
  };
}

function nextRoundPairs(prev: KnockoutRoundResult): [Team, Team][] {
  const winners = prev.matches.map((m) => m.winner);
  const pairs: [Team, Team][] = [];
  for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]);
  return pairs;
}

interface TournamentRun {
  standingsByGroup: Record<string, Standing[]>;
  rounds: KnockoutRoundResult[]; // round32, round16, quarterfinal, semifinal
  final: { a: Team; b: Team; winner: Team; result: MatchResult };
  thirdPlace: { a: Team; b: Team; winner: Team; result: MatchResult };
}

function runFullTournament(): TournamentRun {
  const { standingsByGroup } = runGroupStage();
  const qualifiers = qualifyRound32(standingsByGroup);

  const round32 = playKnockoutRound(seedRound32(qualifiers), 'Round of 32');
  const round16 = playKnockoutRound(nextRoundPairs(round32), 'Round of 16');
  const quarterfinal = playKnockoutRound(nextRoundPairs(round16), 'Quarterfinal');
  const semifinal = playKnockoutRound(nextRoundPairs(quarterfinal), 'Semifinal');

  const finalPairs = nextRoundPairs(semifinal);
  const semiLosers: [Team, Team] = [
    semifinal.matches[0].a === semifinal.matches[0].winner ? semifinal.matches[0].b : semifinal.matches[0].a,
    semifinal.matches[1].a === semifinal.matches[1].winner ? semifinal.matches[1].b : semifinal.matches[1].a,
  ];

  const { winner: finalWinner, result: finalResult } = playKnockoutMatch(finalPairs[0][0], finalPairs[0][1]);
  const { winner: thirdWinner, result: thirdResult } = playKnockoutMatch(semiLosers[0], semiLosers[1]);

  return {
    standingsByGroup,
    rounds: [round32, round16, quarterfinal, semifinal],
    final: { a: finalPairs[0][0], b: finalPairs[0][1], winner: finalWinner, result: finalResult },
    thirdPlace: { a: semiLosers[0], b: semiLosers[1], winner: thirdWinner, result: thirdResult },
  };
}

function scoreline(m: MatchResult): string {
  return `${m.goalsA}-${m.goalsB}${m.wentToPenalties ? ' (pens)' : ''}`;
}

function printNarratedRun(run: TournamentRun) {
  console.log('='.repeat(72));
  console.log('2026 FIFA WORLD CUP — FULL SIMULATION (one realized run)');
  console.log('='.repeat(72));

  console.log('\n--- Group Stage Final Standings ---');
  for (const [group, standings] of Object.entries(run.standingsByGroup)) {
    const line = standings
      .map((s, i) => `${i < 2 ? '✓' : i === 2 ? '·' : ' '}${s.name} (${s.points}pts, GD ${(s.goalsFor - s.goalsAgainst) >= 0 ? '+' : ''}${(s.goalsFor - s.goalsAgainst).toFixed(0)})`)
      .join('  ');
    console.log(`Group ${group}: ${line}`);
  }

  for (const round of run.rounds) {
    console.log(`\n--- ${round.round} ---`);
    for (const m of round.matches) {
      const upset = m.winner.elo < Math.max(m.a.elo, m.b.elo) - 1 ? '  [upset]' : '';
      console.log(`  ${m.a.name} (${m.a.elo}) vs ${m.b.name} (${m.b.elo})  ->  ${scoreline(m.result)}  —  ${m.winner.name} advance${upset}`);
    }
  }

  console.log('\n--- Third Place Playoff ---');
  console.log(`  ${run.thirdPlace.a.name} vs ${run.thirdPlace.b.name}  ->  ${scoreline(run.thirdPlace.result)}  —  ${run.thirdPlace.winner.name} finish 3rd`);

  console.log('\n--- FINAL ---');
  console.log(`  ${run.final.a.name} (${run.final.a.elo}) vs ${run.final.b.name} (${run.final.b.elo})  ->  ${scoreline(run.final.result)}`);
  console.log(`\n🏆 CHAMPION: ${run.final.winner.name}`);

  const runnerUp = run.final.a === run.final.winner ? run.final.b : run.final.a;
  console.log(`   Runner-up: ${runnerUp.name}`);
  console.log(`   Third place: ${run.thirdPlace.winner.name}`);

  let biggest: { m: MatchResult; gap: number; loser: string } | null = null;
  for (const round of run.rounds) {
    for (const m of round.matches) {
      const favorite = m.a.elo > m.b.elo ? m.a : m.b;
      const dog = favorite === m.a ? m.b : m.a;
      if (m.winner === dog) {
        const gap = favorite.elo - dog.elo;
        if (!biggest || gap > biggest.gap) biggest = { m: m.result, gap, loser: favorite.name };
      }
    }
  }
  if (biggest) {
    console.log(`\n   Biggest upset: a ${biggest.gap}-point underdog knocked out ${biggest.loser} ${scoreline(biggest.m)}`);
  }

  console.log(
    '\nReal 2026 result (for comparison, per the backtest data already in this repo): Spain beat Argentina 1-0 (AET) in the final.',
  );
}

function runMonteCarloTitleOdds(trials: number) {
  console.log('\n' + '='.repeat(72));
  console.log(`MONTE CARLO TITLE ODDS — ${trials.toLocaleString()} full-tournament simulations`);
  console.log('='.repeat(72));

  const titles = new Map<string, number>();
  const finalsAppearances = new Map<string, number>();
  const semisAppearances = new Map<string, number>();

  const start = Date.now();
  for (let i = 0; i < trials; i++) {
    const run = runFullTournament();
    titles.set(run.final.winner.name, (titles.get(run.final.winner.name) || 0) + 1);
    finalsAppearances.set(run.final.a.name, (finalsAppearances.get(run.final.a.name) || 0) + 1);
    finalsAppearances.set(run.final.b.name, (finalsAppearances.get(run.final.b.name) || 0) + 1);
    for (const m of run.rounds[3].matches) {
      semisAppearances.set(m.a.name, (semisAppearances.get(m.a.name) || 0) + 1);
      semisAppearances.set(m.b.name, (semisAppearances.get(m.b.name) || 0) + 1);
    }
  }
  const elapsedMs = Date.now() - start;

  const ranked = [...titles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(`\nTop 15 favorites to win the whole tournament (${elapsedMs}ms for ${trials.toLocaleString()} runs):\n`);
  console.log('  Team'.padEnd(24) + 'Elo'.padStart(6) + '  Title %'.padStart(10) + '  Final %'.padStart(10) + '  Semis %'.padStart(10));
  for (const [name, count] of ranked) {
    const elo = Object.values(GROUPS).flat().find((t) => t.name === name)!.elo;
    const titlePct = ((count / trials) * 100).toFixed(1);
    const finalPct = (((finalsAppearances.get(name) || 0) / trials) * 100).toFixed(1);
    const semiPct = (((semisAppearances.get(name) || 0) / trials) * 100).toFixed(1);
    console.log(
      '  ' + name.padEnd(22) + String(elo).padStart(6) + `${titlePct}%`.padStart(10) + `${finalPct}%`.padStart(10) + `${semiPct}%`.padStart(10),
    );
  }

  const spainTitles = titles.get('Spain') || 0;
  const argFinals = finalsAppearances.get('Argentina') || 0;
  console.log(
    `\nSpain (real 2026 champion) won the title in ${((spainTitles / trials) * 100).toFixed(1)}% of simulations; ` +
      `Argentina (real runner-up) reached the final in ${((argFinals / trials) * 100).toFixed(1)}% of simulations.`,
  );
}

const trialsArg = Number(process.argv[2]);
const trials = Number.isFinite(trialsArg) && trialsArg > 0 ? Math.floor(trialsArg) : 5000;

printNarratedRun(runFullTournament());
runMonteCarloTitleOdds(trials);
