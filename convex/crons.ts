/**
 * Cron jobs for scheduled data generation
 * Runs daily to generate new claims and progress existing ones
 */

import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Daily at 2 AM UTC (9 PM EST) - Submit ready claims and generate new ones
crons.daily(
  "daily-claim-submission",
  { hourUTC: 2, minuteUTC: 0 },
  internal.dataGenerator.dailyGenerator.scheduledDailyGeneration
)

// Every 4 hours - Progress claim statuses through lifecycle
crons.interval(
  "claim-status-progression",
  { hours: 4 },
  internal.dataGenerator.dailyGenerator.scheduledStatusProgression
)

// Every hour - Aggregate organization stats (claim counts, denial counts)
crons.interval(
  "stats-aggregation",
  { hours: 1 },
  internal.organizations.aggregateAllStats
)

export default crons
