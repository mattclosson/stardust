/**
 * Aggregate definitions for efficient counting and stats
 * Uses @convex-dev/aggregate for O(log n) counts instead of O(n)
 */

import { components, internal } from "./_generated/api";
import { DataModel, Doc, Id } from "./_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { Triggers } from "convex-helpers/server/triggers";
import { 
  mutation as rawMutation, 
  internalMutation as rawInternalMutation,
  MutationCtx,
  QueryCtx
} from "./_generated/server";
import { customMutation, customCtx } from "convex-helpers/server/customFunctions";
import { Migrations } from "@convex-dev/migrations";

// ============================================
// AGGREGATE DEFINITIONS
// ============================================

/**
 * Claims aggregate - counts claims by organization
 * Uses organizationId as the namespace for efficient per-org queries
 * Key is _creationTime for date range filtering
 */
export const claimsByOrg = new TableAggregate<{
  Namespace: string; // organizationId
  Key: number; // _creationTime for ordering/date filtering
  DataModel: DataModel;
  TableName: "claims";
}>(components.claimsByOrg, {
  namespace: (doc) => doc.organizationId,
  sortKey: (doc) => doc._creationTime,
  sumValue: (doc) => doc.totalCharges,
});

/**
 * Claims by status aggregate - for status breakdowns
 * Key is [status, _creationTime] tuple for filtering by status + date
 */
export const claimsByStatus = new TableAggregate<{
  Namespace: string; // organizationId
  Key: [string, number]; // [status, _creationTime]
  DataModel: DataModel;
  TableName: "claims";
}>(components.claimsByStatus, {
  namespace: (doc) => doc.organizationId,
  sortKey: (doc) => [doc.status, doc._creationTime],
  sumValue: (doc) => doc.totalCharges,
});

/**
 * Denials aggregate - counts denials by claim
 */
export const denialsByOrg = new TableAggregate<{
  Namespace: string; // claimId
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "denials";
}>(components.denialsByOrg, {
  namespace: (doc) => doc.claimId,
  sortKey: (doc) => doc._creationTime,
});

// ============================================
// TRIGGERS SETUP
// ============================================

/**
 * Triggers to automatically update aggregates when data changes
 */
export const triggers = new Triggers<DataModel>();

// Register claims aggregate triggers (both aggregates)
triggers.register("claims", claimsByOrg.trigger());
triggers.register("claims", claimsByStatus.trigger());

// Register denials aggregate trigger
triggers.register("denials", denialsByOrg.trigger());

// ============================================
// CUSTOM FUNCTIONS WITH TRIGGERS
// ============================================

/**
 * Use these instead of raw mutation to ensure aggregates stay in sync
 * Triggers only apply to mutations (data changes), not queries
 */
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));

// ============================================
// EXPLICIT WRAPPER FUNCTIONS (Recommended Pattern)
// ============================================
// These provide more explicit control and are easier to trace/debug
// than triggers. Use these in new code.

type ClaimInsert = Omit<Doc<"claims">, "_id" | "_creationTime">;
type ClaimUpdate = Partial<Omit<Doc<"claims">, "_id" | "_creationTime" | "organizationId">>;

/**
 * Insert a claim and update all aggregates
 */
export async function insertClaim(
  ctx: MutationCtx,
  claim: ClaimInsert
): Promise<Id<"claims">> {
  const id = await ctx.db.insert("claims", claim);
  const doc = await ctx.db.get(id);
  if (doc) {
    await claimsByOrg.insert(ctx, doc);
    await claimsByStatus.insert(ctx, doc);
  }
  return id;
}

/**
 * Update a claim and update all aggregates
 */
export async function updateClaim(
  ctx: MutationCtx,
  id: Id<"claims">,
  update: ClaimUpdate
): Promise<void> {
  const oldDoc = await ctx.db.get(id);
  if (!oldDoc) throw new Error(`Claim ${id} not found`);
  
  await ctx.db.patch(id, update);
  const newDoc = await ctx.db.get(id);
  
  if (newDoc) {
    await claimsByOrg.replace(ctx, oldDoc, newDoc);
    await claimsByStatus.replace(ctx, oldDoc, newDoc);
  }
}

/**
 * Delete a claim and update all aggregates
 */
export async function deleteClaim(
  ctx: MutationCtx,
  id: Id<"claims">
): Promise<void> {
  const doc = await ctx.db.get(id);
  if (!doc) return;
  
  await ctx.db.delete(id);
  await claimsByOrg.delete(ctx, doc);
  await claimsByStatus.delete(ctx, doc);
}

// ============================================
// AGGREGATE QUERY HELPERS
// ============================================

/**
 * Get claim stats using batch operations for efficiency
 */
export async function getClaimStatsBatch(
  ctx: QueryCtx,
  organizationId: string,
  options?: {
    startTime?: number;
    endTime?: number;
  }
): Promise<{
  total: number;
  totalCharges: number;
  byStatus: Record<string, { count: number; charges: number }>;
}> {
  const bounds = options?.startTime || options?.endTime ? {
    lower: options.startTime ? { key: options.startTime, inclusive: true } : undefined,
    upper: options.endTime ? { key: options.endTime, inclusive: true } : undefined,
  } : undefined;

  // Get total count and charges
  const [total, totalCharges] = await Promise.all([
    claimsByOrg.count(ctx, { namespace: organizationId, bounds }),
    claimsByOrg.sum(ctx, { namespace: organizationId, bounds }),
  ]);

  // Define all statuses to query
  const statuses = [
    "draft", "ready_to_submit", "submitted", "acknowledged", 
    "pending", "paid", "partial_paid", "denied", 
    "rejected", "appealed", "written_off", "closed"
  ];

  // Build batch queries for all statuses
  const statusBounds = statuses.map(status => ({
    namespace: organizationId,
    bounds: { prefix: [status] as [string] },
  }));

  // Execute batch queries
  const [statusCounts, statusCharges] = await Promise.all([
    claimsByStatus.countBatch(ctx, statusBounds),
    claimsByStatus.sumBatch(ctx, statusBounds),
  ]);

  // Build byStatus result
  const byStatus: Record<string, { count: number; charges: number }> = {};
  statuses.forEach((status, i) => {
    if (statusCounts[i] > 0) {
      byStatus[status] = {
        count: statusCounts[i],
        charges: statusCharges[i],
      };
    }
  });

  return { total, totalCharges, byStatus };
}

/**
 * Get claim count for a specific date range
 */
export async function getClaimCountByDateRange(
  ctx: QueryCtx,
  organizationId: string,
  startTime: number,
  endTime?: number
): Promise<number> {
  return await claimsByOrg.count(ctx, {
    namespace: organizationId,
    bounds: {
      lower: { key: startTime, inclusive: true },
      upper: endTime ? { key: endTime, inclusive: true } : undefined,
    },
  });
}

/**
 * Get total charges for a specific date range
 */
export async function getTotalChargesByDateRange(
  ctx: QueryCtx,
  organizationId: string,
  startTime: number,
  endTime?: number
): Promise<number> {
  return await claimsByOrg.sum(ctx, {
    namespace: organizationId,
    bounds: {
      lower: { key: startTime, inclusive: true },
      upper: endTime ? { key: endTime, inclusive: true } : undefined,
    },
  });
}

// ============================================
// MIGRATIONS FOR BACKFILLING
// ============================================

export const migrations = new Migrations<DataModel>(components.migrations);

/**
 * Migration to backfill claims aggregate (by org)
 * Run this once after setting up aggregates to populate existing data
 */
export const backfillClaimsAggregate = migrations.define({
  table: "claims",
  migrateOne: async (ctx, doc) => {
    await claimsByOrg.insertIfDoesNotExist(ctx, doc);
  },
});

/**
 * Migration to backfill claims by status aggregate
 */
export const backfillClaimsByStatus = migrations.define({
  table: "claims",
  migrateOne: async (ctx, doc) => {
    await claimsByStatus.insertIfDoesNotExist(ctx, doc);
  },
});

/**
 * Migration to backfill denials aggregate
 */
export const backfillDenialsAggregate = migrations.define({
  table: "denials",
  migrateOne: async (ctx, doc) => {
    await denialsByOrg.insertIfDoesNotExist(ctx, doc);
  },
});

// Specific runners for each migration - call these from the dashboard
export const runBackfillClaims = migrations.runner(internal.aggregates.backfillClaimsAggregate);
export const runBackfillClaimsByStatus = migrations.runner(internal.aggregates.backfillClaimsByStatus);
export const runBackfillDenials = migrations.runner(internal.aggregates.backfillDenialsAggregate);

