// A real connected tournament bracket (elbow connector lines between
// rounds, every 16-8-4-2-1 slot visible from the start as TBD and filled
// in live) - the style used by ESPN, Google, and most real tournament
// trackers. Shared between the Tournament page's live simulation and the
// Backtest page's Cascade Bracket mode, since both produce the same shape
// of data: a set of TournamentMatch objects, one knockout bracket wide.
import { STAGE_LABELS, type TournamentMatch, type TournamentStage } from '@/types/tournament';
import { Trophy } from 'lucide-react';

export const BRACKET_ROUNDS: TournamentStage[] = ['round32', 'round16', 'quarterfinal', 'semifinal', 'final'];
export const BRACKET_ROUND_SIZES: Record<string, number> = { round32: 16, round16: 8, quarterfinal: 4, semifinal: 2, final: 1 };
export const MATCH_CARD_HEIGHT = 56;
const ROUND32_ROW_HEIGHT = 72;
export const BRACKET_COLUMN_WIDTH = 208;
export const BRACKET_GAP_WIDTH = 32;
export const BRACKET_TOTAL_HEIGHT = BRACKET_ROUND_SIZES.round32 * ROUND32_ROW_HEIGHT;

// Vertical center (in px, within the shared bracket coordinate space) of
// every slot in every round - slot i in a round is always the midpoint of
// slots 2i and 2i+1 in the previous round, which is what makes the elbow
// connectors line up exactly.
function computeBracketSlotCenters(): Record<string, number[]> {
  const centers: Record<string, number[]> = {};
  centers.round32 = Array.from({ length: 16 }, (_, i) => i * ROUND32_ROW_HEIGHT + MATCH_CARD_HEIGHT / 2);
  for (let r = 1; r < BRACKET_ROUNDS.length; r++) {
    const stage = BRACKET_ROUNDS[r];
    const prevStage = BRACKET_ROUNDS[r - 1];
    const prevCenters = centers[prevStage];
    centers[stage] = Array.from(
      { length: BRACKET_ROUND_SIZES[stage] },
      (_, i) => (prevCenters[2 * i] + prevCenters[2 * i + 1]) / 2
    );
  }
  return centers;
}
export const BRACKET_SLOT_CENTERS = computeBracketSlotCenters();

// generateKnockoutMatches (src/types/tournament.ts) IDs every round32-
// through-semifinal match "<prefix>-<i>-<i+1>", where i is twice the
// match's position in that round (0, 2, 4, ...) - parsing it back out is
// what lets the bracket place a match at its real slot regardless of the
// order matches were actually decided or generated in. Final/thirdplace
// are always a single match at slot 0.
export function getBracketSlotIndex(match: TournamentMatch): number {
  if (match.stage === 'final' || match.stage === 'thirdplace') return 0;
  const parts = match.id.split('-');
  const i = parseInt(parts[parts.length - 2], 10);
  return Number.isFinite(i) ? i / 2 : 0;
}

// Groups a flat list of matches into stage -> slot-ordered array, so each
// match lands at its true bracket position regardless of what order it
// appears in the input (completion order scrambles this otherwise).
export function groupMatchesByBracketSlot(matches: TournamentMatch[]): Record<TournamentStage, TournamentMatch[]> {
  const result: Record<TournamentStage, TournamentMatch[]> = {
    group: [], round32: [], round16: [], quarterfinal: [], semifinal: [], final: [], thirdplace: []
  };
  for (const match of matches) {
    result[match.stage][getBracketSlotIndex(match)] = match;
  }
  return result;
}

// One <line>-worth of coordinates for every elbow connector between two
// adjacent rounds, in the gap's own local coordinate space (0 = right edge
// of the earlier round, BRACKET_GAP_WIDTH = left edge of the later round).
function computeBracketConnectors(fromStage: TournamentStage, toStage: TournamentStage) {
  const fromCenters = BRACKET_SLOT_CENTERS[fromStage];
  const toCenters = BRACKET_SLOT_CENTERS[toStage];
  const midX = BRACKET_GAP_WIDTH / 2;
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < toCenters.length; i++) {
    const yTop = fromCenters[2 * i];
    const yBottom = fromCenters[2 * i + 1];
    const yMid = toCenters[i];
    lines.push({ x1: 0, y1: yTop, x2: midX, y2: yTop });
    lines.push({ x1: 0, y1: yBottom, x2: midX, y2: yBottom });
    lines.push({ x1: midX, y1: yTop, x2: midX, y2: yBottom });
    lines.push({ x1: midX, y1: yMid, x2: BRACKET_GAP_WIDTH, y2: yMid });
  }
  return lines;
}

function BracketMatchCard({ match }: { match: TournamentMatch | undefined }) {
  if (!match) {
    return (
      <div className="h-full rounded-md border border-dashed border-border/60 flex items-center justify-center text-[10px] text-muted-foreground/60">
        TBD
      </div>
    );
  }
  const aWon = !!match.completed && match.winner?.id === match.teamA.id;
  const bWon = !!match.completed && match.winner?.id === match.teamB.id;
  return (
    <div
      className={`h-full px-2 py-1 rounded-md border text-xs flex flex-col justify-center gap-0.5 ${
        match.completed ? 'border-border bg-secondary/50' : 'border-dashed border-border'
      }`}
    >
      <div className={`flex items-center justify-between ${aWon ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
        <span className="truncate pr-1">{match.teamA.name}</span>
        {match.completed && <span className="font-mono">{match.teamAScore}</span>}
      </div>
      <div className={`flex items-center justify-between ${bWon ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
        <span className="truncate pr-1">{match.teamB.name}</span>
        {match.completed && <span className="font-mono">{match.teamBScore}</span>}
      </div>
    </div>
  );
}

export interface ConnectedBracketProps {
  matchesByStage: Record<TournamentStage, TournamentMatch[]>;
  champion: string | null;
}

export function ConnectedBracket({ matchesByStage, champion }: ConnectedBracketProps) {
  return (
    <>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start pt-8" style={{ width: 'max-content' }}>
          {BRACKET_ROUNDS.map((stage, roundIdx) => (
            <div key={stage} className="flex items-start flex-shrink-0">
              <div className="relative flex-shrink-0" style={{ width: BRACKET_COLUMN_WIDTH, height: BRACKET_TOTAL_HEIGHT }}>
                <h3 className="absolute -top-8 left-0 right-0 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STAGE_LABELS[stage]}
                </h3>
                {Array.from({ length: BRACKET_ROUND_SIZES[stage] }).map((_, slot) => {
                  const stageMatches = matchesByStage[stage];
                  const match = stageMatches.length === BRACKET_ROUND_SIZES[stage] ? stageMatches[slot] : undefined;
                  const center = BRACKET_SLOT_CENTERS[stage][slot];
                  return (
                    <div
                      key={slot}
                      className="absolute left-0 right-0"
                      style={{ top: center - MATCH_CARD_HEIGHT / 2, height: MATCH_CARD_HEIGHT }}
                    >
                      <BracketMatchCard match={match} />
                    </div>
                  );
                })}
              </div>
              {roundIdx < BRACKET_ROUNDS.length - 1 && (
                <svg
                  width={BRACKET_GAP_WIDTH}
                  height={BRACKET_TOTAL_HEIGHT}
                  className="flex-shrink-0 text-border"
                >
                  {computeBracketConnectors(stage, BRACKET_ROUNDS[roundIdx + 1]).map((line, li) => (
                    <line key={li} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="currentColor" strokeWidth={1.5} />
                  ))}
                </svg>
              )}
              {stage === 'final' && (
                <div className="ml-6 flex-shrink-0" style={{ width: BRACKET_COLUMN_WIDTH }}>
                  <h3 className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {STAGE_LABELS.thirdplace}
                  </h3>
                  <div style={{ height: MATCH_CARD_HEIGHT }}>
                    <BracketMatchCard match={matchesByStage.thirdplace[0]} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {champion && (
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-center gap-2 text-lg font-bold">
          <Trophy className="h-5 w-5 text-primary" />
          {champion} — Champion
        </div>
      )}
    </>
  );
}
