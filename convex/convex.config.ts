import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";

const app = defineApp();
app.use(betterAuth);

// Aggregate components for efficient counting/stats
app.use(aggregate, { name: "claimsByOrg" });        // Count/sum by org + date
app.use(aggregate, { name: "claimsByStatus" });     // Count by org + status
app.use(aggregate, { name: "denialsByOrg" });       // Count denials by claim

// Migrations component for backfilling aggregates
app.use(migrations);

export default app;
