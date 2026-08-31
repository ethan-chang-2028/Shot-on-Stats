import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Trophy, Users, Target, Lightbulb, DollarSign, Globe, Database, Shield, TrendingUp, ClipboardCheck, Scale, Check, X, Minus } from 'lucide-react';
import { Link } from 'wouter';
import { runSimulation, getMostLikelyScoreline } from '@/lib/simulation';

// Import the user's uploaded images
import architectureFlow from '@/assets/architecture-flow.png';

// World Cup 2026 start date
const WORLD_CUP_2026_START = new Date('2026-06-11');

// A concrete worked example for the WDL bar below - same engine, same
// formula, just run once on load instead of animated trial-by-trial.
const EXAMPLE_MATCH = { eloA: 2050, eloB: 1950, homeAdvantage: 65, baselineGoals: 1.3, c: 200, numTrials: 10000 };

export default function HomePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const exampleResult = useMemo(() => runSimulation(EXAMPLE_MATCH), []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formattedDate = WORLD_CUP_2026_START.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <main className="min-h-[100dvh] w-full bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-foreground">
              <span className="absolute h-6 w-6 rounded-full border-4 border-primary" />
              <span className="absolute h-12 w-1 rotate-45 bg-primary/70" />
              <span className="absolute h-12 w-1 -rotate-45 bg-primary/70" />
            </div>
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[-0.02em] mb-4">
            Shot on Stats
          </h1>
          
          <p className="text-xl text-muted-foreground mb-4">
            Data-Driven Football Predictions
          </p>
          
          <p className="max-w-2xl mx-auto text-sm leading-6 text-muted-foreground">
            <strong className="text-foreground">Working prototype:</strong>{' '}
            A real Elo → Poisson → Monte Carlo simulation engine, running on the actual 48 teams
            and 12 groups from the {formattedDate} World Cup — and graded directly against what
            really happened, match by match.
          </p>
          
          <div className="flex justify-center gap-4 mt-8">
            <Button asChild size="lg">
              <Link href="/tournament">
                <Trophy className="h-4 w-4 mr-2" />
                Start Tournament Simulation
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/backtest">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Backtest vs. Real 2026 Results
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="#how-it-works">
                <Lightbulb className="h-4 w-4 mr-2" />
                How It Works
              </Link>
            </Button>
          </div>
        </header>

        {/* GOAL DISTRIBUTION - real output of the engine, not a mockup */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                What 10,000 Trials Actually Looks Like
              </CardTitle>
              <CardDescription>
                The goal-count distribution from the same worked example above — real output, not a mockup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                {([
                  { label: `Team A (Elo ${EXAMPLE_MATCH.eloA})`, dist: exampleResult.teamA.goalDistribution },
                  { label: `Team B (Elo ${EXAMPLE_MATCH.eloB})`, dist: exampleResult.teamB.goalDistribution },
                ] as const).map(({ label, dist }) => {
                  const buckets = [0, 1, 2, 3, 4].map((g) => dist.get(g) ?? 0);
                  const fivePlus = Array.from(dist.entries())
                    .filter(([g]) => g >= 5)
                    .reduce((sum, [, count]) => sum + count, 0);
                  buckets.push(fivePlus);
                  const max = Math.max(1, ...buckets);
                  return (
                    <div key={label}>
                      <h4 className="font-semibold text-sm mb-3">{label}</h4>
                      <div className="flex items-end gap-2 h-28 border-b border-border">
                        {buckets.map((count, g) => (
                          <div key={g} className="flex-1 flex flex-col items-center justify-end h-full">
                            <div
                              className="w-full bg-primary rounded-t-sm min-h-[2px]"
                              style={{ height: `${(count / max) * 100}%` }}
                              title={`${g === 5 ? '5+' : g} goals: ${count.toLocaleString()} trials`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {buckets.map((_, g) => (
                          <div key={g} className="flex-1 text-center text-xs text-muted-foreground font-mono">
                            {g === 5 ? '5+' : g}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Goals scored per trial, out of {EXAMPLE_MATCH.numTrials.toLocaleString()} simulated matches
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Demo Overview Card */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Demo Overview
              </CardTitle>
              <CardDescription>
                Four things you can actually click on and try right now
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">The Core Simulation</h3>
                    <p className="text-sm text-muted-foreground">
                      Watch 10,000 Monte Carlo trials run live using Poisson distribution,
                      converting Elo ratings to expected goals.
                    </p>
                  </div>

                  <div className="text-center p-4">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
                        <Trophy className="h-6 w-6 text-foreground" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">The Real 2026 World Cup</h3>
                    <p className="text-sm text-muted-foreground">
                      Full tournament simulation with the actual 48 teams and 12 groups from the
                      real tournament, group stage to final.
                    </p>
                  </div>

                  <div className="text-center p-4">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
                        <ClipboardCheck className="h-6 w-6 text-foreground" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">Graded Against Reality</h3>
                    <p className="text-sm text-muted-foreground">
                      Every simulated team's finish is compared live to what actually happened
                      in July 2026 — champion included.
                    </p>
                  </div>

                  <div className="text-center p-4">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
                        <Users className="h-6 w-6 text-foreground" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">Interactive Controls</h3>
                    <p className="text-sm text-muted-foreground">
                      Simulate individual matches, entire stages, or the full tournament.
                      Pause, resume, or adjust speed.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Key Formula
                  </h4>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <code className="text-sm font-mono block">
                      expected_goal_diff = (eloA - eloB + homeAdv) / C
                      <br />
                      where C ≈ 200, baseline ≈ 1.3 goals/team
                      <br />
                      <br />
                      For each of 10,000 trials:
                      <br />
                      &nbsp;&nbsp;goalsA = Poisson(1.3 + goal_diff/2)
                      <br />
                      &nbsp;&nbsp;goalsB = Poisson(1.3 - goal_diff/2)
                    </code>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    A Live Worked Example
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Team A (Elo {EXAMPLE_MATCH.eloA}, home) vs. Team B (Elo {EXAMPLE_MATCH.eloB}) — the
                    actual result of running the real engine's 10,000 trials, computed when this page loaded.
                  </p>
                  <div className="flex h-9 rounded-lg overflow-hidden border border-border text-xs font-bold text-white">
                    <div
                      className="flex items-center justify-center bg-green-600"
                      style={{ width: `${exampleResult.winProbability * 100}%` }}
                    >
                      {(exampleResult.winProbability * 100).toFixed(0)}%
                    </div>
                    <div
                      className="flex items-center justify-center bg-muted-foreground/50"
                      style={{ width: `${exampleResult.drawProbability * 100}%` }}
                    >
                      {(exampleResult.drawProbability * 100).toFixed(0)}%
                    </div>
                    <div
                      className="flex items-center justify-center bg-red-600"
                      style={{ width: `${exampleResult.lossProbability * 100}%` }}
                    >
                      {(exampleResult.lossProbability * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Team A win</span>
                    <span>Draw</span>
                    <span>Team B win</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Most likely scoreline: <strong className="text-foreground font-mono">{getMostLikelyScoreline(exampleResult)}</strong>
                    {' '}· Avg goals: <strong className="text-foreground font-mono">{exampleResult.teamA.avgGoals.toFixed(2)} – {exampleResult.teamB.avgGoals.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Problem Statement */}
        <section className="mb-8" id="problem">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Problem Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-6">
                  <strong className="text-foreground">Casual and moderately engaged soccer fans</strong> 
                  want a data-driven read on upcoming matches, but the options available today are a bad fit for them.
                </p>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 rounded-lg border border-border bg-secondary/50">
                    <h4 className="font-semibold mb-2 text-sm">Pundit "Expert Picks"</h4>
                    <p className="text-sm text-muted-foreground">
                      TV, YouTube, blogs give confident-sounding opinions with 
                      <strong>no visible methodology</strong> - there's no way to check 
                      <em>why</em> the pick was made.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-secondary/50">
                    <h4 className="font-semibold mb-2 text-sm">Raw Statistical Tools</h4>
                    <p className="text-sm text-muted-foreground">
                      Opta feeds, advanced analytics sites require 
                      <strong>stats literacy</strong> most casual fans don't have and don't want to build.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg border border-border bg-secondary/50">
                    <h4 className="font-semibold mb-2 text-sm">Sports Betting Odds</h4>
                    <p className="text-sm text-muted-foreground">
                      Function as an implicit prediction market, but odds reflect 
                      <strong>bookmaker margin and risk management</strong>, not a transparent, 
                      betting-independent statistical model.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-3">Evidence the Problem Exists:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        <strong>Fantasy Premier League</strong> has over 11 million active users worldwide, 
                        showing large-scale appetite for stats-informed engagement with matches — 
                        but FPL itself gives raw stats, not predictions or explanations.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        Outlets like the BBC's "<strong>Opta Supercomputer</strong>" predictions and pre-match 
                        "expert predicts" segments are recurring, popular content formats — 
                        demonstrating demand for match predictions specifically — 
                        but they publish a conclusion without showing the underlying calculation.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        <strong>Sports betting odds</strong> function as an implicit prediction market, 
                        but odds reflect a bookmaker's margin and incentives, not a transparent, 
                        bettor-independent statistical model.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-2">Target User:</h4>
                  <p className="text-muted-foreground">
                    A <strong>Premier League fan</strong> who follows a team casually — watches most weeks, 
                    has opinions, but doesn't have the time or background to build their own 
                    statistical model or interpret raw Expected Goals (xG) tables.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Solution Description */}
        <section className="mb-8" id="solution">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Solution Description
              </CardTitle>
              <CardDescription>
                The full product vision for a public site — this prototype proves out steps 2–3 (the
                simulation engine itself) via the World Cup demo; the Premier League fixture list, AI
                explanations, player projections, sandbox and paid tier below are the roadmap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="pl-1">
                    <strong>User visits the site</strong> and sees a list of the week's upcoming 
                    Premier League fixtures.
                  </li>
                  <li className="pl-1">
                    <strong>User selects a match</strong> and sees: each team's Elo rating, a 
                    win/draw/loss probability bar, and a predicted scoreline.
                  </li>
                  <li className="pl-1">
                    <strong>User watches the simulation happen</strong> — a live view showing the 
                    Monte Carlo trials running (not just the final number), so the process, 
                    not just the output, is visible.
                  </li>
                  <li className="pl-1">
                    <strong>User reads a plain-language AI explanation</strong> of why the model 
                    favors one side, generated from the computed stats (not from the AI's own opinion).
                  </li>
                  <li className="pl-1">
                    <strong>User views player-level projections</strong> for both squads (goals, 
                    shots, cards, etc.), each with the same "here's how many simulated trials 
                    produced this number" transparency.
                  </li>
                  <li className="pl-1">
                    <strong>User opens the sandbox</strong> and types in their own hypothetical 
                    team ratings to run a custom "what-if" simulation instantly, with an 
                    optional AI explanation on demand.
                  </li>
                  <li className="pl-1">
                    <strong>Free users</strong> get 3 matches/week of full detail (ads shown) —
                    a business-model decision for the eventual public site, not something this
                    prototype needs to enforce yet.
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                What Makes Shot on Stats Different
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-4">The Problem with Current Solutions</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="text-red-500 font-bold">✗</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Black Box Predictions</h5>
                        <p className="text-sm text-muted-foreground">
                          Other services show you a prediction but won't show you HOW they got it
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="text-red-500 font-bold">✗</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Requires Stats Expertise</h5>
                        <p className="text-sm text-muted-foreground">
                          Raw data tools expect you to interpret xG tables and build your own models
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="text-red-500 font-bold">✗</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Bookmaker Bias</h5>
                        <p className="text-sm text-muted-foreground">
                          Betting odds include bookmaker margins and risk management, not pure stats
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Our Solution</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-500 font-bold">✓</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Transparent Methodology</h5>
                        <p className="text-sm text-muted-foreground">
                          Watch the Monte Carlo simulation run live - see the process, not just results
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-500 font-bold">✓</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">No Expertise Required</h5>
                        <p className="text-sm text-muted-foreground">
                          Plain-language explanations generated from the computed stats
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-500 font-bold">✓</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Statistically Sound</h5>
                        <p className="text-sm text-muted-foreground">
                          Elo ratings → expected goals → Poisson-based Monte Carlo simulation
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-500 font-bold">✓</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">Interactive Sandbox</h5>
                        <p className="text-sm text-muted-foreground">
                          Test "what-if" scenarios with custom team ratings
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Competitive Comparison */}
        <section className="mb-8" id="competition">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                How Soccer Predictors Compare
              </CardTitle>
              <CardDescription>
                Every option a fan actually has today, side by side
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 pr-4 font-medium">What it takes to trust a prediction</th>
                      <th className="py-3 px-3 font-medium text-center whitespace-nowrap">
                        Pundit "supercomputer"<br />
                        <span className="text-xs font-normal text-muted-foreground">e.g. BBC Opta</span>
                      </th>
                      <th className="py-3 px-3 font-medium text-center whitespace-nowrap">
                        Betting odds<br />
                        <span className="text-xs font-normal text-muted-foreground">DraftKings, FanDuel</span>
                      </th>
                      <th className="py-3 px-3 font-medium text-center whitespace-nowrap">
                        Match-app AI %<br />
                        <span className="text-xs font-normal text-muted-foreground">FotMob, Sofascore</span>
                      </th>
                      <th className="py-3 pl-3 font-medium text-center whitespace-nowrap text-primary">
                        Shot on Stats
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: 'Shows the actual calculation, not just a verdict',
                        values: ['no', 'no', 'no', 'yes'],
                      },
                      {
                        label: 'Free, no account required to see it',
                        values: ['yes', 'yes', 'yes', 'yes'],
                      },
                      {
                        label: 'Independent of gambling / bookmaker incentives',
                        values: ['yes', 'no', 'yes', 'yes'],
                      },
                      {
                        label: 'Publishes a public predicted-vs-actual track record',
                        values: ['no', 'partial', 'no', 'yes'],
                      },
                      {
                        label: 'Lets you test your own "what-if" ratings',
                        values: ['no', 'no', 'no', 'yes'],
                      },
                      {
                        label: 'Plain-language explanation included',
                        values: ['partial', 'no', 'partial', 'yes'],
                      },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-border/60">
                        <td className="py-3 pr-4 text-muted-foreground">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className="py-3 px-3 text-center">
                            {v === 'yes' && <Check className="h-4 w-4 text-green-500 inline-block" />}
                            {v === 'no' && <X className="h-4 w-4 text-red-500 inline-block" />}
                            {v === 'partial' && <Minus className="h-4 w-4 text-muted-foreground inline-block" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                "Betting odds" reflect a bookmaker's implied probability, which can look like a
                track record in hindsight — but it's a risk-management price, not a published,
                graded accuracy claim, which is why that cell reads partial rather than yes.
                "Match-app AI %" refers to the single win-probability number shown on live match
                pages in apps like FotMob or Sofascore before kickoff — useful, but it's a number
                without the model, the reasoning, or a way to change the inputs yourself.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* ARCHITECTURE FLOW SECTION - User's second image */}
        <section className="mb-8" id="how-it-works">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Architecture
              </CardTitle>
              <CardDescription>
                How data flows through Shot on Stats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl overflow-hidden shadow-lg mb-6">
                <img
                  src={architectureFlow}
                  alt="Shot on Stats - Complete system architecture and data flow diagram"
                  className="w-full h-auto"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Seasons & Leagues</li>
                    <li>• Countries & Teams</li>
                    <li>• Players & Statistics</li>
                    <li>• Fixtures & Live Data</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Processing Pipeline</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Data Collection</li>
                    <li>• Elo Rating Calculation</li>
                    <li>• Monte Carlo Simulation</li>
                    <li>• Result Aggregation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* How It Works - Technical Details */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Technical Implementation
              </CardTitle>
              <CardDescription>
                The prediction engine details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-4">The Prediction Engine</h4>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-secondary/50">
                        <h5 className="font-medium text-sm mb-2">Step 1: Data Collection</h5>
                        <p className="text-sm text-muted-foreground">
                          We collect <strong>public sports data</strong> only: team names, Elo ratings, 
                          fixture schedules, season stats, and player statistics from 
                          API-Football and ClubElo.
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-border bg-secondary/50">
                        <h5 className="font-medium text-sm mb-2">Step 2: Elo to Expected Goals</h5>
                        <p className="text-sm text-muted-foreground">
                          We convert Elo ratings to expected goals using the formula:
                        </p>
                        <code className="block text-xs font-mono bg-background p-2 rounded mt-2">
                          expected_goal_diff = (eloA - eloB + homeAdv) / C
                          <br />
                          where C ≈ 200, baseline ≈ 1.3 goals/team
                        </code>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-border bg-secondary/50">
                        <h5 className="font-medium text-sm mb-2">Step 3: Monte Carlo Simulation</h5>
                        <p className="text-sm text-muted-foreground">
                          We run <strong>10,000 trials</strong> using Poisson distribution to simulate 
                          each match. For each trial:
                        </p>
                        <code className="block text-xs font-mono bg-background p-2 rounded mt-2">
                          goalsA = Poisson(1.3 + goal_diff/2)
                          <br />
                          goalsB = Poisson(1.3 - goal_diff/2)
                        </code>
                        <p className="text-xs text-muted-foreground mt-2">
                          Using Knuth's algorithm: multiply uniform random draws until 
                          the running product falls below e^(-λ)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4">The Results</h4>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-secondary/50">
                        <h5 className="font-medium text-sm mb-2">Step 4: Result Aggregation</h5>
                        <p className="text-sm text-muted-foreground">
                          After 10,000 trials, we calculate:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Win/Draw/Loss probabilities</li>
                          <li>• Predicted scoreline (average goals)</li>
                          <li>• Most likely scoreline</li>
                          <li>• Goal distribution for each team</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-border bg-secondary/50">
                        <h5 className="font-medium text-sm mb-2">Step 5: AI Explanation (Optional)</h5>
                        <p className="text-sm text-muted-foreground">
                          The AI <strong>never generates the prediction</strong>. It only reads the 
                          computed stats and writes a plain-language explanation.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Example: "Team A is favored because of a higher Elo rating (2050 vs 1950) 
                          and home advantage, resulting in 62% win probability."
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-border bg-secondary/50">
                        <h5 className="font-medium text-sm mb-2">Step 6: Display to User</h5>
                        <p className="text-sm text-muted-foreground">
                          Live charts and statistics show the simulation process and final results 
                          with complete transparency.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Plan
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h5 className="font-medium text-sm mb-2">What's Collected:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Public sports data only</li>
                        <li>• Team names, Elo ratings</li>
                        <li>• Fixture schedules</li>
                        <li>• Season stats</li>
                        <li>• Player statistics</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-2">What's Stored (MySQL):</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• teams, players</li>
                        <li>• player_season_stats</li>
                        <li>• fixtures, predictions</li>
                        <li>• player_predictions</li>
                        <li>• calibration_log</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-2">How It's Used:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Solely to compute predictions</li>
                        <li>• Not sold or shared</li>
                        <li>• Not used for targeted ads</li>
                        <li>• Past predictions retained for accuracy tracking</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* AI Feature */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Feature
              </CardTitle>
              <CardDescription>
                How artificial intelligence enhances the product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Specific Role
                  </h4>
                  <p className="text-muted-foreground leading-6">
                    The AI <strong>never generates the prediction</strong>. A statistical model 
                    (Elo ratings converted to expected goals, then simulated via a Poisson-based 
                    Monte Carlo process — 10,000 trials) produces every number shown. 
                    The AI's only job is to <strong>read that finished output and write a 
                    plain-language explanation of it</strong>.
                  </p>
                  <p className="text-muted-foreground mt-4 leading-6">
                    Example: "Team A is favored because of a higher Elo rating and stronger 
                    recent form."
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border border-border bg-secondary/50">
                    <h5 className="font-medium text-sm mb-2">Implementation:</h5>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>
                        AI calls via <strong>OpenRouter API</strong> (one key, model-agnostic)
                      </li>
                      <li>
                        Example: request <code className="bg-background px-1 rounded">anthropic/claude-3.5-haiku</code>
                      </li>
                      <li>
                        Small/cheap model for cost efficiency
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-border bg-secondary/50">
                    <h5 className="font-medium text-sm mb-2">Review Process:</h5>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>
                        Second, independent AI call reviews each explanation
                      </li>
                      <li>
                        Checks for factual consistency against underlying stats
                      </li>
                      <li>
                        Uses different model for review to reduce blind spots
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h5 className="font-medium text-sm mb-2">Sandbox Integration:</h5>
                  <p className="text-sm text-muted-foreground">
                    The same explanation pipeline is reused for the sandbox's custom 
                    "what-if" matches, but gated behind an explicit user click (not 
                    automatic) to control API usage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Monetization */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Monetization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <h4 className="font-semibold mb-4">Primary Model: Freemium Subscription</h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 font-medium">Tier</th>
                        <th className="text-left py-3 font-medium">Price</th>
                        <th className="text-left py-3 font-medium">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-3">Free</td>
                        <td className="py-3">$0</td>
                        <td className="py-3">3 matches/week, full detail, ad-supported</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 font-medium">Premium</td>
                        <td className="py-3 font-medium">$4.99/month</td>
                        <td className="py-3">Every match, every covered league, ad-free</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground">
                  *Pricing is a placeholder for the pitch — final pricing would be validated 
                  with real users before launch.
                </p>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-3">Secondary Model:</h4>
                  <p className="text-muted-foreground">
                    Contextual display advertising on the free tier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </main>
  );
}
