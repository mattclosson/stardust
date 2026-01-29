import type { QueryCtx } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"

/**
 * Shared enrichment utilities for Convex queries
 * These functions extract common patterns for fetching related entity data
 */

// Type definitions for enriched data
export interface EnrichedPatient {
  _id: Id<"patients">
  firstName: string
  lastName: string
  mrn: string
}

export interface EnrichedPayer {
  _id: Id<"payers">
  name: string
  payerType: string
}

export interface EnrichedClaim {
  _id: Id<"claims">
  claimNumber: string
  dateOfService?: string
  totalCharges: number
  status: string
  organizationId?: Id<"organizations">
}

export interface EnrichedDenial {
  _id: Id<"denials">
  denialCode: string
  denialReason: string
  denialCategory: string
  status?: string
}

/**
 * Enrich a patient record with display fields
 */
export function toEnrichedPatient(patient: Doc<"patients"> | null): EnrichedPatient | null {
  if (!patient) return null
  return {
    _id: patient._id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    mrn: patient.mrn,
  }
}

/**
 * Enrich a payer record with display fields
 */
export function toEnrichedPayer(payer: Doc<"payers"> | null): EnrichedPayer | null {
  if (!payer) return null
  return {
    _id: payer._id,
    name: payer.name,
    payerType: payer.payerType,
  }
}

/**
 * Enrich a claim record with display fields
 */
export function toEnrichedClaim(claim: Doc<"claims"> | null): EnrichedClaim | null {
  if (!claim) return null
  return {
    _id: claim._id,
    claimNumber: claim.claimNumber,
    dateOfService: claim.dateOfService,
    totalCharges: claim.totalCharges,
    status: claim.status,
    organizationId: claim.organizationId,
  }
}

/**
 * Enrich a denial record with display fields
 */
export function toEnrichedDenial(denial: Doc<"denials"> | null): EnrichedDenial | null {
  if (!denial) return null
  return {
    _id: denial._id,
    denialCode: denial.denialCode,
    denialReason: denial.denialReason,
    denialCategory: denial.denialCategory,
    status: denial.status,
  }
}

/**
 * Fetch patient and payer data for a claim
 * This is the most commonly used enrichment pattern
 */
export async function getPatientAndPayerForClaim(
  ctx: QueryCtx,
  patientId: Id<"patients">,
  coverageId: Id<"coverages">
): Promise<{ patient: EnrichedPatient | null; payer: EnrichedPayer | null }> {
  const [patient, coverage] = await Promise.all([
    ctx.db.get(patientId),
    ctx.db.get(coverageId),
  ])
  const payer = coverage ? await ctx.db.get(coverage.payerId) : null

  return {
    patient: toEnrichedPatient(patient),
    payer: toEnrichedPayer(payer),
  }
}

/**
 * Batch enrich claims with patient and payer data
 * Optimized for list queries that need this common pattern
 */
export async function enrichClaimsWithPatientAndPayer<
  T extends { patientId: Id<"patients">; coverageId: Id<"coverages"> }
>(
  ctx: QueryCtx,
  claims: T[]
): Promise<
  Array<T & { patient: EnrichedPatient | null; payer: EnrichedPayer | null }>
> {
  return Promise.all(
    claims.map(async (claim) => {
      const { patient, payer } = await getPatientAndPayerForClaim(
        ctx,
        claim.patientId,
        claim.coverageId
      )
      return { ...claim, patient, payer }
    })
  )
}

/**
 * Enrich denials with claim and patient data
 * Used in denial list queries
 */
export async function enrichDenialWithClaimAndPatient<
  T extends { claimId: Id<"claims"> }
>(
  ctx: QueryCtx,
  denial: T,
  options?: { includeClaimOrg?: boolean }
): Promise<
  | (T & {
      claim: EnrichedClaim | null
      patient: EnrichedPatient | null
      payer: EnrichedPayer | null
    })
  | null
> {
  const claim = await ctx.db.get(denial.claimId)
  if (!claim) return null

  const { patient, payer } = await getPatientAndPayerForClaim(
    ctx,
    claim.patientId,
    claim.coverageId
  )

  return {
    ...denial,
    claim: {
      _id: claim._id,
      claimNumber: claim.claimNumber,
      dateOfService: claim.dateOfService,
      totalCharges: claim.totalCharges,
      status: claim.status,
      ...(options?.includeClaimOrg ? { organizationId: claim.organizationId } : {}),
    },
    patient,
    payer,
  }
}

/**
 * Enrich tasks with related entity info (claim, denial, patient)
 */
export async function enrichTaskWithRelatedEntities<
  T extends {
    claimId?: Id<"claims"> | null
    denialId?: Id<"denials"> | null
    patientId?: Id<"patients"> | null
  }
>(
  ctx: QueryCtx,
  task: T
): Promise<
  T & {
    claim: { _id: Id<"claims">; claimNumber: string; status: string } | null
    denial: { _id: Id<"denials">; denialCode: string; status: string } | null
    patient: { _id: Id<"patients">; firstName: string; lastName: string } | null
  }
> {
  const [claim, denial, patient] = await Promise.all([
    task.claimId ? ctx.db.get(task.claimId) : null,
    task.denialId ? ctx.db.get(task.denialId) : null,
    task.patientId ? ctx.db.get(task.patientId) : null,
  ])

  return {
    ...task,
    claim: claim
      ? { _id: claim._id, claimNumber: claim.claimNumber, status: claim.status }
      : null,
    denial: denial
      ? { _id: denial._id, denialCode: denial.denialCode, status: denial.status }
      : null,
    patient: patient
      ? { _id: patient._id, firstName: patient.firstName, lastName: patient.lastName }
      : null,
  }
}

/**
 * Enrich appeals with denial and claim info
 */
export async function enrichAppealWithDenialAndClaim<
  T extends { denialId: Id<"denials">; claimId: Id<"claims"> }
>(
  ctx: QueryCtx,
  appeal: T
): Promise<
  T & {
    denial: EnrichedDenial | null
    claim: { _id: Id<"claims">; claimNumber: string; totalCharges: number } | null
  }
> {
  const [denial, claim] = await Promise.all([
    ctx.db.get(appeal.denialId),
    ctx.db.get(appeal.claimId),
  ])

  return {
    ...appeal,
    denial: toEnrichedDenial(denial),
    claim: claim
      ? { _id: claim._id, claimNumber: claim.claimNumber, totalCharges: claim.totalCharges }
      : null,
  }
}
