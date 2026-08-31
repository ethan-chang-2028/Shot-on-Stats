import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  HelpCircle,
  Play,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { runBacktest, summarizeBacktest, type BacktestMatchComparison } from '@/lib/backtest';
import { runCascadeBracket, type CascadeResult } from '@/lib/cascadeBacktest';
import { WORLD_CUP_2026_RESULTS } from '@/data/worldCup2026Results';

const TOTAL_MATCHES = WORLD_CUP_2026_RESULTS.length;
const REAL_FINAL = WORLD_CUP_2026_RESULTS.find((m) => m.stage === 'Final');
const REAL_CHAMPION = REAL_FINAL ? (REAL_FINAL.scoreA > REAL_FINAL.scoreB ? REAL_FINAL.teamA.name : REAL_FINAL.teamB.name) : null;

const OUTCOME_LABEL: Record<'teamA' | 'teamB' | 'draw', (a: string, b: string) => string> = {
  teamA: (a) => `${a} win`,
  teamB: (b) => `${b} win`,
  draw: () => 'Draw',
};

function outcomeText(outcome: 'teamA' | 'teamB' | 'draw', teamA: string, teamB: string) {
  return OUTCOME_LABEL[outcome](teamA, teamB);
}

export default function BacktestPage() {
  const [mode, setMode] = useState<'real' | 'cascade'>('real');

  const [results, setResults] = useState<BacktestMatchComparison[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const [cascade, setCascade] = useState<CascadeResult | null>(null);
  const [isCascadeRunning, setIsCascadeRunning] = useState(false);

  const summary = useMemo(() => (results ? summarizeBacktest(results) : null), [results]);

  const finalMatch = useMemo(
    () => results?.find((r) => r.match.id === 'final-esp-arg') ?? null,
    [results],
  );

  const runTest = () => {
    setIsRunning(true);
    // Let the "Running..." state paint before the (fast, synchronous) 10,000-trial
    // simulations run for every match.
    setTimeout(() => {
      setResults(runBacktest(10000));
      setIsRunning(false);
    }, 50);
  };

  const runCascade = () => {
    setIsCascadeRunning(true);
    // Same "let the UI paint first" reasoning as runTest above - this cascades
    // a full 104-match bracket (each match still a real 10,000-trial run
    // under the hood), so it isn't instant either.
    setTimeout(() => {
      runCascadeBracket().then((result) => {
        setCascade(result);
        setIsCascadeRunning(false);
      });
    }, 50);
  };

  return (
    <main className="min-h-[100dvh] w-full bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>PRD Section 9 — Testing &amp; Validation</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em] mb-3">
            Backtest vs. the Real 2026 World Cup
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            This runs the exact same Elo → expected-goals → Poisson Monte Carlo engine used
            elsewhere in this demo against every real match from the completed 2026 FIFA World
            Cup — group stage through the Final — using only the pre-tournament Elo ratings the
            model would have had before each match kicked off. Nothing here is precomputed.
          </p>
        </header>

        <section className="mb-8">
          <div className="inline-flex rounded-lg border border-border p-1 gap-1">
            <button
              onClick={() => setMode('real')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'real' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Target className="h-4 w-4" />
              Real Matchups
            </button>
            <button
              onClick={() => setMode('cascade')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'cascade' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GitBranch className="h-4 w-4" />
              Cascade Bracket
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 max-w-3xl leading-5">
            {mode === 'real' ? (
              <>
                <strong className="text-foreground">Real Matchups</strong> grades the model against
                what actually happened: every match, its real opponent, and its real result — this
                is the formal PRD Section 9 backtest.
              </>
            ) : (
              <>
                <strong className="text-foreground">Cascade Bracket</strong> lets the model call
                every match itself: it draws one simulated result per group match, uses the
                model's own simulated standings (not the real ones) to decide who advances, and
                keeps cascading that forward through Round of 32, Round of 16, and onward to a
                simulated champion. Once the model's calls diverge from history, later rounds can
                pair two teams that never actually played each other — so this isn't an accuracy
                grade, it's what the model's own bracket looks like when nothing is corrected back
                to reality along the way.
              </>
            )}
          </p>
        </section>

        {mode === 'real' && (
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Run the Backtest
              </CardTitle>
              <CardDescription>
                {TOTAL_MATCHES} real matches, from the Group Stage through the Final
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={runTest} disabled={isRunning} size="lg" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  {isRunning ? `Running 10,000 trials × ${TOTAL_MATCHES} matches…` : results ? 'Re-run Backtest' : 'Run Backtest'}
                </Button>
                {results && (
                  <Button onClick={() => setResults(null)} variant="ghost" size="lg" className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
        )}

        {mode === 'real' && summary && (
          <section className="mb-8">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {summary.correct} / {summary.matches}
                  </div>
                  <div className="text-sm text-muted-foreground">Outcomes called correctly (W/D/L)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold mb-1">{(summary.accuracy * 100).toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Outcome accuracy</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold mb-1">{summary.brierScore.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">
                    Brier score (0 = perfect, 0.667 = no-skill baseline for 3 outcomes)
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              A high-variance sample by design — {TOTAL_MATCHES} matches, not a full season —
              so treat this as a demonstration of the validation method (PRD Section 9), not a
              claim of production-grade accuracy. Deep knockout runs are exactly where a
              no-home-advantage, independent-Poisson model is expected to miss some upsets
              (e.g. Spain beating higher-rated France in the semifinal).
            </p>
          </section>
        )}

        {mode === 'real' && results && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Match-by-Match Comparison
                </CardTitle>
                <CardDescription>Predicted (pre-match, simulated) vs. actual result</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Stage</th>
                        <th className="py-2 pr-4 font-medium">Match</th>
                        <th className="py-2 pr-4 font-medium">Elo</th>
                        <th className="py-2 pr-4 font-medium">Model W/D/L</th>
                        <th className="py-2 pr-4 font-medium">Predicted score</th>
                        <th className="py-2 pr-4 font-medium">Actual score</th>
                        <th className="py-2 font-medium">Called it?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.match.id} className="border-b border-border/60">
                          <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{r.match.stage}</td>
                          <td className="py-3 pr-4 font-medium whitespace-nowrap">
                            {r.match.teamA.name} vs {r.match.teamB.name}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {r.match.teamA.elo} – {r.match.teamB.elo}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">
                            {(r.winProbability * 100).toFixed(0)}/{(r.drawProbability * 100).toFixed(0)}/
                            {(r.lossProbability * 100).toFixed(0)}%
                          </td>
                          <td className="py-3 pr-4 font-mono">{r.predictedScoreline}</td>
                          <td className="py-3 pr-4 font-mono">{r.actualScoreline}</td>
                          <td className="py-3">
                            {r.correct ? (
                              <span className="inline-flex items-center gap-1 text-green-500 text-xs font-bold">
                                <CheckCircle2 className="h-4 w-4" />
                                {outcomeText(r.predictedOutcome, r.match.teamA.name, r.match.teamB.name)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500 text-xs font-bold">
                                <XCircle className="h-4 w-4" />
                                predicted {outcomeText(r.predictedOutcome, r.match.teamA.name, r.match.teamB.name)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {mode === 'real' && finalMatch && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Worked Example — The Final (PRD Section 9.1 style)</CardTitle>
                <CardDescription>Spain vs. Argentina, July 19, 2026</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Field</th>
                        <th className="py-2 pr-4 font-medium">Model prediction (pre-match)</th>
                        <th className="py-2 font-medium">Actual result</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/60">
                        <td className="py-2 pr-4 text-muted-foreground">Win / Draw / Loss</td>
                        <td className="py-2 pr-4 font-mono">
                          Spain {(finalMatch.winProbability * 100).toFixed(0)}% / Draw{' '}
                          {(finalMatch.drawProbability * 100).toFixed(0)}% / Argentina{' '}
                          {(finalMatch.lossProbability * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 font-medium">Spain won (after extra time)</td>
                      </tr>
                      <tr className="border-b border-border/60">
                        <td className="py-2 pr-4 text-muted-foreground">Predicted score</td>
                        <td className="py-2 pr-4 font-mono">{finalMatch.predictedScoreline}</td>
                        <td className="py-2 font-medium">1–0 (Ferran Torres, 106')</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {finalMatch.match.note} Both finalists carried a near-identical pre-tournament
                  Elo (Argentina 2100 vs. Spain 2050), so the model correctly treated the final as
                  close to a coin flip rather than confidently backing either side — exactly the
                  honest, low-confidence call PRD Section 3.1 says a well-calibrated model should
                  make when the underlying ratings are this close.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {mode === 'cascade' && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Run the Cascade
                </CardTitle>
                <CardDescription>
                  Same {TOTAL_MATCHES} real group-stage fixtures as the schedule, but the model's own
                  simulated results decide who advances at every later stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={runCascade} disabled={isCascadeRunning} size="lg" className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    {isCascadeRunning ? `Simulating ${TOTAL_MATCHES} matches…` : cascade ? 'Re-run Cascade' : 'Run Cascade'}
                  </Button>
                  {cascade && (
                    <Button onClick={() => setCascade(null)} variant="ghost" size="lg" className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {mode === 'cascade' && cascade && (
          <section className="mb-8">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-primary mb-1 flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5" />
                    {cascade.simulatedChampion ?? '—'}
                  </div>
                  <div className="text-sm text-muted-foreground">This cascade's simulated champion</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold mb-1">{REAL_CHAMPION ?? '—'}</div>
                  <div className="text-sm text-muted-foreground">Real 2026 champion</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold mb-1">
                    {cascade.comparableCorrect} / {cascade.comparableCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Called correctly, of the {cascade.comparableCount} matchups that also happened in reality
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground mt-3 max-w-3xl leading-5">
              {TOTAL_MATCHES - cascade.comparableCount} of {TOTAL_MATCHES} matches in this cascade paired two
              teams that never actually met — a direct result of the model's own calls compounding round over
              round, which is exactly the point of this mode. Re-run it and this number, and the bracket itself,
              will likely change: every match is still an independent random draw.
            </p>
          </section>
        )}

        {mode === 'cascade' && cascade && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Match-by-Match Cascade
                </CardTitle>
                <CardDescription>The model's own simulated bracket, compared to reality where that exact matchup happened</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Stage</th>
                        <th className="py-2 pr-4 font-medium">Match</th>
                        <th className="py-2 pr-4 font-medium">Elo</th>
                        <th className="py-2 pr-4 font-medium">Simulated score</th>
                        <th className="py-2 pr-4 font-medium">Real result</th>
                        <th className="py-2 font-medium">Called it?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cascade.matches.map((m) => (
                        <tr key={m.match.id} className="border-b border-border/60">
                          <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{m.stageLabel}</td>
                          <td className="py-3 pr-4 font-medium whitespace-nowrap">
                            {m.match.teamA.name} vs {m.match.teamB.name}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {m.match.teamA.elo} – {m.match.teamB.elo}
                          </td>
                          <td className="py-3 pr-4 font-mono">{m.simulatedScoreline}</td>
                          <td className="py-3 pr-4 font-mono">{m.actualScoreline ?? '—'}</td>
                          <td className="py-3">
                            {m.correct === null ? (
                              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                                <HelpCircle className="h-4 w-4" />
                                Never happened in reality
                              </span>
                            ) : m.correct ? (
                              <span className="inline-flex items-center gap-1 text-green-500 text-xs font-bold">
                                <CheckCircle2 className="h-4 w-4" />
                                Called it
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500 text-xs font-bold">
                                <XCircle className="h-4 w-4" />
                                Missed it
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t border-border/70 flex flex-col sm:flex-row gap-2 items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span>Shot on Stats — Backtest vs. 2026 World Cup Results</span>
          <span>Sources: FIFA match centre, ESPN, CBS News, NPR, tournament reporting</span>
        </footer>
      </div>
    </main>
  );
}
