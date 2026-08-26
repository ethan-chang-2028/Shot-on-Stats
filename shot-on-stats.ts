import {
  mysqlTable,
  int,
  bigint,
  varchar,
  double,
  timestamp,
  json,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ---------------------------------------------------------------------------
// Teams & Elo history
// ---------------------------------------------------------------------------

export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  league: varchar("league", { length: 64 }).notNull(),
  apiFootballId: int("api_football_id"),
  clubEloName: varchar("club_elo_name", { length: 128 }), // for matching "Man City" vs "Manchester City"
});

/**
 * Temporal: every recorded Elo rating for a team, not just the current one.
 * Predictions are generated using the rating that was valid *as of* the
 * fixture's kickoff time, which this table makes possible.
 */
export const teamEloHistory = mysqlTable(
  "team_elo_history",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    teamId: int("team_id").notNull(),
    rating: double("rating").notNull(),
    asOf: timestamp("as_of").notNull(),
    source: varchar("source", { length: 32 }).notNull().default("clubelo"),
  },
  (t) => ({
    teamAsOfIdx: index("team_elo_team_as_of_idx").on(t.teamId, t.asOf),
  }),
);

// ---------------------------------------------------------------------------
// Players & per-match stats
// ---------------------------------------------------------------------------

export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("team_id").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  position: varchar("position", { length: 16 }),
  apiFootballId: int("api_football_id"),
});

/**
 * Temporal: one row per player per completed match, not a season aggregate.
 * Season totals and "last 5 matches" recent form are both *derived* from
 * this table by querying over a date window, rather than stored as
 * separately-maintained snapshots that could drift out of sync.
 */
export const playerMatchStats = mysqlTable(
  "player_match_stats",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    playerId: int("player_id").notNull(),
    fixtureId: int("fixture_id").notNull(),
    playedAt: timestamp("played_at").notNull(),
    minutesPlayed: int("minutes_played").notNull(),
    goals: int("goals").notNull().default(0),
    assists: int("assists").notNull().default(0),
    shots: int("shots").notNull().default(0),
    shotsOnTarget: int("shots_on_target").notNull().default(0),
    passes: int("passes").notNull().default(0),
    passAccuracy: double("pass_accuracy"), // percent, 0-100
    tackles: int("tackles").notNull().default(0),
    fouls: int("fouls").notNull().default(0),
    yellowCards: int("yellow_cards").notNull().default(0),
    redCards: int("red_cards").notNull().default(0),
  },
  (t) => ({
    playerPlayedAtIdx: index("player_match_stats_player_played_idx").on(
      t.playerId,
      t.playedAt,
    ),
    fixtureIdx: index("player_match_stats_fixture_idx").on(t.fixtureId),
  }),
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const fixtures = mysqlTable(
  "fixtures",
  {
    id: int("id").autoincrement().primaryKey(),
    league: varchar("league", { length: 64 }).notNull(),
    homeTeamId: int("home_team_id").notNull(),
    awayTeamId: int("away_team_id").notNull(),
    kickoffAt: timestamp("kickoff_at").notNull(),
    status: mysqlEnum("status", [
      "scheduled",
      "in_progress",
      "finished",
      "postponed",
    ])
      .notNull()
      .default("scheduled"),
    homeScore: int("home_score"),
    awayScore: int("away_score"),
    apiFootballId: int("api_football_id"),
  },
  (t) => ({
    kickoffIdx: index("fixtures_kickoff_idx").on(t.kickoffAt),
  }),
);

// ---------------------------------------------------------------------------
// Stored predictions (team-level and player-level)
// ---------------------------------------------------------------------------

export const predictions = mysqlTable(
  "predictions",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    fixtureId: int("fixture_id").notNull(),
    predictedAt: timestamp("predicted_at").notNull().defaultNow(),
    homeEloAtPrediction: double("home_elo_at_prediction").notNull(),
    awayEloAtPrediction: double("away_elo_at_prediction").notNull(),
    homeWinProb: double("home_win_prob").notNull(),
    drawProb: double("draw_prob").notNull(),
    awayWinProb: double("away_win_prob").notNull(),
    predictedHomeGoals: double("predicted_home_goals").notNull(), // mean of the Monte Carlo simulation
    predictedAwayGoals: double("predicted_away_goals").notNull(),
    homeGoalDistribution: json("home_goal_distribution"), // {"0": 0.247, "1": 0.345, ..., "5+": 0.014}
    awayGoalDistribution: json("away_goal_distribution"),
    aiExplanation: varchar("ai_explanation", { length: 4000 }),
    aiReviewPassed: mysqlEnum("ai_review_passed", [
      "pending",
      "passed",
      "flagged",
    ])
      .notNull()
      .default("pending"),
  },
  (t) => ({
    fixturePredictedAtIdx: index("predictions_fixture_predicted_at_idx").on(
      t.fixtureId,
      t.predictedAt,
    ),
  }),
);

export const playerPredictions = mysqlTable(
  "player_predictions",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    fixtureId: int("fixture_id").notNull(),
    playerId: int("player_id").notNull(),
    predictedAt: timestamp("predicted_at").notNull().defaultNow(),
    statCategory: mysqlEnum("stat_category", [
      "goals",
      "assists",
      "shots",
      "shots_on_target",
      "passes",
      "tackles",
      "fouls",
      "cards",
    ]).notNull(),
    hasEnoughData: mysqlEnum("has_enough_data", ["yes", "no"])
      .notNull()
      .default("yes"),
    projectedValue: double("projected_value"), // mean across Monte Carlo trials
    distribution: json("distribution"),
  },
  (t) => ({
    fixturePlayerStatIdx: uniqueIndex(
      "player_predictions_fixture_player_stat_idx",
    ).on(t.fixtureId, t.playerId, t.predictedAt, t.statCategory),
  }),
);

// ---------------------------------------------------------------------------
// Calibration log (Section 10 — auditable history of tuned constants)
// ---------------------------------------------------------------------------

export const calibrationLog = mysqlTable("calibration_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  runAt: timestamp("run_at").notNull().defaultNow(),
  paramName: varchar("param_name", { length: 32 }).notNull(), // 'homeAdv' | 'eloPointsPerGoal' | 'recentFormWeight'
  oldValue: double("old_value").notNull(),
  newValue: double("new_value").notNull(),
  brierScoreBefore: double("brier_score_before").notNull(),
  brierScoreAfter: double("brier_score_after").notNull(),
});
