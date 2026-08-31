// The group-stage standings grid (all 12 groups, top 2 highlighted as
// qualifying) - shared between the Tournament page's live simulation and
// the Backtest page's Cascade Bracket mode, both of which compute
// standings the same way (computeGroupStandings) from a group-stage match
// list, just a real one vs. the model's own simulated one.
import type { ReactNode } from 'react';
import type { TournamentGroup, TournamentTeam } from '@/types/tournament';

export interface GroupStandingsProps {
  groups: TournamentGroup[];
  standings: Record<string, TournamentTeam[]>;
  // Optional per-team real-world badge (e.g. "Real: Qualified" / "Real:
  // Eliminated") rendered under the simulated standing - lets a caller
  // overlay ground truth without this component needing to know where
  // that data comes from.
  renderRealBadge?: (team: TournamentTeam) => ReactNode;
}

export function GroupStandings({ groups, standings, renderRealBadge }: GroupStandingsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {groups.map((group) => {
        const groupStandings = standings[group.name] || group.teams;
        return (
          <div key={group.name} className="space-y-2">
            <h3 className="font-semibold text-center border-b pb-2">{group.name}</h3>
            <div className="space-y-2">
              {groupStandings.map((team, index) => (
                <div key={team.id} className={`p-2 rounded-lg text-sm ${
                  index < 2 ? 'bg-green-500/20 border border-green-500/30' : 'bg-secondary/50 border border-border'
                }`}>
                  <div className="flex items-center justify-between">
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
                  {renderRealBadge && (
                    <div className="mt-1 pl-5 text-xs text-muted-foreground">{renderRealBadge(team)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
