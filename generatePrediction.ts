import { and, desc, eq, gte, lt } from "drizzle-orm";
// Adjust these two imports to wherever the MySQL `db` client and the schema
// from shot-on-stats.ts actually live once wired into the workspace.
import { db } from "@workspace/db";
import {
  teamEloHistory,
  fixtures,
  playerMatchStats,
  players,
  predictions,
  playerPredictions,
} from "@workspace/db/schema/shot-on-stats";
import {
  eloToExpectedGoals,
  matchOutcomeProbabilities,
  simulatePoisson,
  projectPlayerStat,
  DEFAULT_CONSTANTS,
} from "./engine";

const STAT_CATEGORIES = [
  "goals",
  "assists",
  "shots",
  "shots_on_target",
  "passes",
  "tackles",
  "fouls",
  "cards",
] as const;

type PlayerMatchStatsRow = typeof playerMatchStats.$inferSelect;

/**
 * Finds the Elo rating that was in effect just before the given moment,
 * rather than a single "current" value — this is what lets the same
 * fixture be re-predicted honestly at different points in time.
 */
async function latestEloBefore(teamId: number, asOf: Date): Promise<number> {
  const [row] = await db
    .select({ rating: teamEloHistory.rating })
    .from(teamEloHistory)
    .where(
      and(eq(teamEloHistory.teamId, teamId), lt(teamEloHistory.asOf, asOf)),
    )
    .orderBy(desc(teamEloHistory.asOf))
    .limit(1);
  if (!row) {
    throw new Error(
      `No Elo history for team ${teamId} before ${asOf.toISOString()}`,
    );
  }
  return row.rating;
}

/** Generates and persists a team-level + player-level prediction for one upcoming fixture. */
export async function generatePredictionForFixture(
  fixtureId: number,
): Promise<void> {
  const [fixture] = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.id, fixtureId));
  if (!fixture) throw new Error(`Fixture ${fixtureId} not found`);

  const [homeElo, awayElo] = await Promise.all([
    latestEloBefore(fixture.homeTeamId, fixture.kickoffAt),
    latestEloBefore(fixture.awayTeamId, fixture.kickoffAt),
  ]);

  const { lambdaHome, lambdaAway } = eloToExpectedGoals(
    homeElo,
    awayElo,
    DEFAULT_CONSTANTS,
  );
  const outcome = matchOutcomeProbabilities(lambdaHome, lambdaAway);
  const homeSim = simulatePoisson(lambdaHome);
  const awaySim = simulatePoisson(lambdaAway);

  await db.insert(predictions).values({
    fixtureId,
    homeEloAtPrediction: homeElo,
    awayEloAtPrediction: awayElo,
    homeWinProb: outcome.homeWinProb,
    drawProb: outcome.drawProb,
    awayWinProb: outcome.awayWinProb,
    predictedHomeGoals: homeSim.mean,
    predictedAwayGoals: awaySim.mean,
    homeGoalDistribution: homeSim.distribution,
    awayGoalDistribution: awaySim.distribution,
  });

  await generatePlayerProjections(
    fixture.id,
    fixture.homeTeamId,
    fixture.awayTeamId,
    fixture.kickoffAt,
  );
}

async function generatePlayerProjections(
  fixtureId: number,
  homeTeamId: number,
  awayTeamId: number,
  kickoffAt: Date,
): Promise<void> {
  const seasonStart = new Date(kickoffAt);
  seasonStart.setMonth(seasonStart.getMonth() - 10); // rolling ~season window

  // TODO: replace the flat 1.3 below with a real query of each opponent's
  // goals-conceded rate over the same rolling window (Section 3.2, step 2).
  const teamsInFixture = [
    { teamId: homeTeamId, opponentGoalsConceded: 1.3 },
    { teamId: awayTeamId, opponentGoalsConceded: 1.3 },
  ];

  for (const { teamId, opponentGoalsConceded } of teamsInFixture) {
    const squad = await db
      .select()
      .from(players)
      .where(eq(players.teamId, teamId));

    for (const player of squad) {
      const seasonRows = await db
        .select()
        .from(playerMatchStats)
        .where(
          and(
            eq(playerMatchStats.playerId, player.id),
            gte(playerMatchStats.playedAt, seasonStart),
            lt(playerMatchStats.playedAt, kickoffAt),
          ),
        );

      const last5Rows = await db
        .select()
        .from(playerMatchStats)
        .where(
          and(
            eq(playerMatchStats.playerId, player.id),
            lt(playerMatchStats.playedAt, kickoffAt),
          ),
        )
        .orderBy(desc(playerMatchStats.playedAt))
        .limit(5);

      const seasonMinutes = seasonRows.reduce(
        (sum, r) => sum + r.minutesPlayed,
        0,
      );
      const last5Minutes = last5Rows.reduce(
        (sum, r) => sum + r.minutesPlayed,
        0,
      );

      for (const statCategory of STAT_CATEGORIES) {
        const projection = projectPlayerStat({
          seasonStatTotal: sumStat(seasonRows, statCategory),
          seasonMinutesPlayed: seasonMinutes,
          last5StatTotal: sumStat(last5Rows, statCategory),
          last5MinutesPlayed: last5Minutes,
          leagueAvgGoalsConceded: 1.3,
          opponentGoalsConceded,
        });

        await db.insert(playerPredictions).values({
          fixtureId,
          playerId: player.id,
          statCategory,
          hasEnoughData: projection.hasEnoughData ? "yes" : "no",
          projectedValue: projection.hasEnoughData ? projection.mean : null,
          distribution: projection.hasEnoughData
            ? projection.distribution
            : null,
        });
      }
    }
  }
}

function sumStat(
  rows: PlayerMatchStatsRow[],
  category: (typeof STAT_CATEGORIES)[number],
): number {
  switch (category) {
    case "goals":
      return rows.reduce((s, r) => s + r.goals, 0);
    case "assists":
      return rows.reduce((s, r) => s + r.assists, 0);
    case "shots":
      return rows.reduce((s, r) => s + r.shots, 0);
    case "shots_on_target":
      return rows.reduce((s, r) => s + r.shotsOnTarget, 0);
    case "passes":
      return rows.reduce((s, r) => s + r.passes, 0);
    case "tackles":
      return rows.reduce((s, r) => s + r.tackles, 0);
    case "fouls":
      return rows.reduce((s, r) => s + r.fouls, 0);
    case "cards":
      return rows.reduce((s, r) => s + r.yellowCards + r.redCards, 0);
  }
}
