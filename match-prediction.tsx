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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamPrediction {
  teamName: string;
  elo: number;
  winProb: number;
  predictedGoals: number;
  goalDistribution: Record<string, number>;
}

interface PlayerProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  projectedGoals: number | null;
  projectedShots: number | null;
  projectedCards: number | null;
  hasEnoughData: boolean;
}

interface MatchPredictionData {
  fixtureId: number;
  kickoffAt: string;
  home: TeamPrediction;
  away: TeamPrediction;
  drawProb: number;
  players: PlayerProjection[];
  aiExplanation: string | null;
}

function toChartData(distribution: Record<string, number>) {
  return Object.entries(distribution).map(([goals, probability]) => ({
    goals,
    probability: Math.round(probability * 1000) / 10, // percent, 1 decimal
  }));
}

function TeamProbabilityCard({
  team,
  side,
}: {
  team: TeamPrediction;
  side: "home" | "away";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{team.teamName}</span>
          <Badge variant="outline">Elo {Math.round(team.elo)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-semibold">
            {Math.round(team.winProb * 100)}%
          </span>
          <span className="text-sm text-muted-foreground">
            chance to win{side === "home" ? " (home)" : " (away)"}
          </span>
        </div>
        <div className="mb-2 text-sm text-muted-foreground">
          Projected goals:{" "}
          <span className="font-medium text-foreground">
            {team.predictedGoals.toFixed(1)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={toChartData(team.goalDistribution)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="goals" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v: number) => [`${v}%`, "Probability"]} />
            <Bar dataKey="probability" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          Based on 10,000 simulated outcomes from the team's projected scoring rate.
        </p>
      </CardContent>
    </Card>
  );
}

function PlayerProjectionsTable({ players }: { players: PlayerProjection[] }) {
  const sorted = [...players].sort(
    (a, b) => (b.projectedGoals ?? -1) - (a.projectedGoals ?? -1),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Player projections</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Goals</TableHead>
              <TableHead className="text-right">Shots</TableHead>
              <TableHead className="text-right">Cards</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.playerId}>
                <TableCell className="font-medium">{p.playerName}</TableCell>
                <TableCell className="text-muted-foreground">{p.teamName}</TableCell>
                {p.hasEnoughData ? (
                  <>
                    <TableCell className="text-right">
                      {p.projectedGoals?.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.projectedShots?.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.projectedCards?.toFixed(1)}
                    </TableCell>
                  </>
                ) : (
                  <TableCell
                    colSpan={3}
                    className="text-right text-xs text-muted-foreground"
                  >
                    Not enough data
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function MatchPredictionPage({
  fixtureId,
}: {
  fixtureId: number;
}) {
  const [data, setData] = useState<MatchPredictionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/api/fixtures/${fixtureId}/prediction`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((json: MatchPredictionData) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  if (error) {
    return (
      <p className="p-6 text-sm text-destructive">
        Couldn't load this prediction: {error}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {data.home.teamName} vs {data.away.teamName}
        </h1>
        <span className="text-sm text-muted-foreground">
          {new Date(data.kickoffAt).toLocaleString()}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TeamProbabilityCard team={data.home} side="home" />
        <TeamProbabilityCard team={data.away} side="away" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draw probability</CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-semibold">
            {Math.round(data.drawProb * 100)}%
          </span>
        </CardContent>
      </Card>

      {data.aiExplanation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Why the model favors this outcome
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {data.aiExplanation}
            </p>
          </CardContent>
        </Card>
      )}

      <PlayerProjectionsTable players={data.players} />
    </div>
  );
}
