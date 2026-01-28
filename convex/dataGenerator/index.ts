/**
 * Data Generator Module
 * 
 * Generates realistic healthcare claims data for 8 fictional organizations
 * 
 * Usage:
 * 1. Run `seedHistorical` to create 500,000+ historical claims
 * 2. Use `generateDailyClaimsManual` to add new claims for a specific date
 * 3. Use `progressClaimStatusesManual` to advance claims through their lifecycle
 * 4. Crons automatically handle daily generation and status progression
 * 
 * Organizations:
 * - Summit Orthopedic Institute (Large, Denver CO)
 * - Lakeside Family Medicine (Small, Minneapolis MN)
 * - Pacific Cardiology Associates (Large, San Francisco CA)
 * - Sunshine Pediatrics Group (Medium, Miami FL)
 * - Metro Gastroenterology (Medium, Chicago IL)
 * - Valley Women's Health (Small, Phoenix AZ)
 * - Northeast Pain Management (Medium, Boston MA)
 * - Coastal Dermatology Center (Large, Los Angeles CA)
 */

export * from "./config"
export * from "./generators"
export * from "./utils"

// Re-export main entry points
export { 
  seedHistorical, 
  getSeedingProgress, 
  resetAndReseed 
} from "./seedHistorical"

export { 
  generateDailyClaimsManual, 
  progressClaimStatusesManual,
  submitReadyClaims 
} from "./dailyGenerator"
