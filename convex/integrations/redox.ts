import { mutation, query, internalMutation } from "../_generated/server"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"

// ============================================
// REDOX DATA MODEL TYPES
// ============================================

// Redox Financial Transaction payload structure
interface RedoxFinancialTransaction {
  Meta: {
    DataModel: string
    EventType: string
    Source?: { ID: string; Name: string }
    Destination?: { ID: string; Name: string }
  }
  Patient: {
    Identifiers: Array<{ ID: string; IDType: string }>
    Demographics: {
      FirstName: string
      LastName: string
      DOB?: string
      Sex?: string
      Address?: {
        StreetAddress?: string
        City?: string
        State?: string
        ZIP?: string
      }
      PhoneNumber?: {
        Home?: string
        Mobile?: string
      }
      EmailAddresses?: string[]
    }
  }
  Visit?: {
    VisitNumber?: string
    VisitDateTime?: string
    Location?: {
      Facility?: string
    }
  }
  Transactions?: Array<{
    ID: string
    Type: string
    DateTimeOfTransaction?: string
    Procedure?: {
      Code: string
      CodeSystem?: string
      Description?: string
      Modifiers?: string[]
    }
    Amount?: number
    Quantity?: number
    Department?: {
      ID?: string
      Name?: string
    }
    DiagnosisRelatedCodes?: Array<{
      Code: string
      CodeSystem?: string
      Description?: string
    }>
    Provider?: {
      NPI?: string
      FirstName?: string
      LastName?: string
    }
  }>
}

// Redox PatientAdmin payload structure
interface RedoxPatientAdmin {
  Meta: {
    DataModel: string
    EventType: string
    Source?: { ID: string; Name: string }
  }
  Patient: {
    Identifiers: Array<{ ID: string; IDType: string }>
    Demographics: {
      FirstName: string
      LastName: string
      DOB?: string
      Sex?: string
      Address?: {
        StreetAddress?: string
        City?: string
        State?: string
        ZIP?: string
      }
      PhoneNumber?: {
        Home?: string
        Mobile?: string
      }
      EmailAddresses?: string[]
    }
  }
}

// ============================================
// INTEGRATION MANAGEMENT
// ============================================

// Create a new Redox integration for an organization
export const createIntegration = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    sourceId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    
    // Check if integration already exists
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_type", (q) => 
        q.eq("organizationId", args.organizationId).eq("integrationType", "redox")
      )
      .first()
    
    if (existing) {
      throw new Error("Redox integration already exists for this organization")
    }
    
    const integrationId = await ctx.db.insert("integrations", {
      organizationId: args.organizationId,
      integrationType: "redox",
      name: args.name,
      config: {
        sourceId: args.sourceId,
        destinationId: args.destinationId,
      },
      webhookSecret: args.webhookSecret,
      isActive: true,
      totalSynced: 0,
      createdAt: now,
      updatedAt: now,
    })
    
    return integrationId
  },
})

// Get integration for an organization
export const getIntegration = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_type", (q) => 
        q.eq("organizationId", args.organizationId).eq("integrationType", "redox")
      )
      .first()
  },
})

// Update integration settings
export const updateIntegration = mutation({
  args: {
    integrationId: v.id("integrations"),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sourceId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (!integration) throw new Error("Integration not found")
    
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    }
    
    if (args.name !== undefined) updates.name = args.name
    if (args.isActive !== undefined) updates.isActive = args.isActive
    if (args.webhookSecret !== undefined) updates.webhookSecret = args.webhookSecret
    
    if (args.sourceId !== undefined || args.destinationId !== undefined) {
      updates.config = {
        ...integration.config,
        ...(args.sourceId !== undefined && { sourceId: args.sourceId }),
        ...(args.destinationId !== undefined && { destinationId: args.destinationId }),
      }
    }
    
    await ctx.db.patch(args.integrationId, updates)
    return { success: true }
  },
})

// Get recent sync logs
export const getSyncLogs = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    
    const logs = await ctx.db
      .query("integrationSyncLogs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(limit)
    
    if (args.status) {
      return logs.filter(log => log.status === args.status)
    }
    
    return logs
  },
})

// ============================================
// WEBHOOK PROCESSING
// ============================================

// Process incoming Redox webhook payload
export const processWebhook = mutation({
  args: {
    organizationId: v.id("organizations"),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const payload = args.payload as RedoxFinancialTransaction | RedoxPatientAdmin
    
    // Get integration for this organization
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_type", (q) => 
        q.eq("organizationId", args.organizationId).eq("integrationType", "redox")
      )
      .first()
    
    if (!integration || !integration.isActive) {
      throw new Error("No active Redox integration found for this organization")
    }
    
    const eventType = `${payload.Meta.DataModel}.${payload.Meta.EventType}`
    
    try {
      let result: { entityType: string; entityId: string } | null = null
      
      // Route to appropriate handler based on data model
      switch (payload.Meta.DataModel) {
        case "Financial":
          if (payload.Meta.EventType === "Transaction") {
            result = await processFinancialTransaction(
              ctx, 
              args.organizationId, 
              payload as RedoxFinancialTransaction
            )
          }
          break
          
        case "PatientAdmin":
          if (["NewPatient", "PatientUpdate", "Arrival"].includes(payload.Meta.EventType)) {
            result = await processPatientAdmin(
              ctx, 
              args.organizationId, 
              payload as RedoxPatientAdmin
            )
          }
          break
          
        default:
          // Log unsupported event type
          await ctx.db.insert("integrationSyncLogs", {
            integrationId: integration._id,
            organizationId: args.organizationId,
            eventType,
            status: "skipped",
            errorMessage: `Unsupported data model: ${payload.Meta.DataModel}`,
            payloadPreview: JSON.stringify(payload).slice(0, 500),
            createdAt: now,
          })
          return { success: false, reason: "unsupported_event" }
      }
      
      // Log successful sync
      await ctx.db.insert("integrationSyncLogs", {
        integrationId: integration._id,
        organizationId: args.organizationId,
        eventType,
        status: "success",
        entityType: result?.entityType as "patient" | "claim" | "coverage" | "provider" | undefined,
        entityId: result?.entityId,
        createdAt: now,
      })
      
      // Update integration stats
      await ctx.db.patch(integration._id, {
        lastSyncAt: now,
        lastSyncStatus: "success",
        totalSynced: (integration.totalSynced || 0) + 1,
        updatedAt: now,
      })
      
      return { success: true, ...result }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // Log failed sync
      await ctx.db.insert("integrationSyncLogs", {
        integrationId: integration._id,
        organizationId: args.organizationId,
        eventType,
        status: "error",
        errorMessage,
        payloadPreview: JSON.stringify(payload).slice(0, 500),
        createdAt: now,
      })
      
      // Update integration with error
      await ctx.db.patch(integration._id, {
        lastSyncAt: now,
        lastSyncStatus: "error",
        lastSyncError: errorMessage,
        updatedAt: now,
      })
      
      throw error
    }
  },
})

// ============================================
// DATA PROCESSORS
// ============================================

// Process Financial.Transaction - creates draft claims from charges
async function processFinancialTransaction(
  ctx: { db: any },
  organizationId: Id<"organizations">,
  payload: RedoxFinancialTransaction
): Promise<{ entityType: string; entityId: string }> {
  const now = Date.now()
  
  // 1. Upsert patient
  const patientId = await upsertPatientFromRedox(ctx, organizationId, payload.Patient)
  
  // 2. Get or create a default coverage (we may not have full coverage info from Financial)
  // In a real implementation, you'd match this to existing coverage
  const coverage = await ctx.db
    .query("coverages")
    .withIndex("by_patient", (q: any) => q.eq("patientId", patientId))
    .first()
  
  if (!coverage) {
    throw new Error("No coverage found for patient - please add coverage first")
  }
  
  // 3. Get billing/rendering providers
  const providers = await ctx.db
    .query("providers")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect()
  
  const billingProvider = providers.find((p: any) => p.isBilling) || providers[0]
  const renderingProvider = providers.find((p: any) => p.isRendering) || providers[0]
  
  if (!billingProvider || !renderingProvider) {
    throw new Error("No providers configured for organization")
  }
  
  // 4. Generate claim number
  const claimNumber = generateClaimNumber()
  
  // 5. Extract date of service
  const dateOfService = payload.Visit?.VisitDateTime 
    ? new Date(payload.Visit.VisitDateTime).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]
  
  // 6. Calculate total charges
  const totalCharges = payload.Transactions?.reduce(
    (sum, txn) => sum + (txn.Amount || 0) * (txn.Quantity || 1),
    0
  ) || 0
  
  // 7. Check if claim already exists for this encounter
  const existingClaim = payload.Visit?.VisitNumber
    ? await ctx.db
        .query("claims")
        .withIndex("by_externalEncounterId", (q: any) => 
          q.eq("organizationId", organizationId)
           .eq("externalSource", "redox")
           .eq("externalEncounterId", payload.Visit!.VisitNumber!)
        )
        .first()
    : null
  
  if (existingClaim) {
    // Update existing claim
    await ctx.db.patch(existingClaim._id, {
      totalCharges,
      lastSyncedAt: now,
      updatedAt: now,
    })
    
    // Update line items
    // For now, we'll replace line items - a more sophisticated approach would merge
    const existingLineItems = await ctx.db
      .query("lineItems")
      .withIndex("by_claim", (q: any) => q.eq("claimId", existingClaim._id))
      .collect()
    
    for (const li of existingLineItems) {
      await ctx.db.delete(li._id)
    }
    
    // Insert new line items
    if (payload.Transactions) {
      for (let i = 0; i < payload.Transactions.length; i++) {
        const txn = payload.Transactions[i]
        await ctx.db.insert("lineItems", {
          claimId: existingClaim._id,
          lineNumber: i + 1,
          procedureCode: txn.Procedure?.Code || "99999",
          procedureType: mapCodeSystem(txn.Procedure?.CodeSystem),
          modifiers: txn.Procedure?.Modifiers || [],
          description: txn.Procedure?.Description,
          diagnosisPointers: txn.DiagnosisRelatedCodes?.map((_, idx) => idx + 1) || [1],
          units: txn.Quantity || 1,
          chargeAmount: txn.Amount || 0,
          status: "pending",
          createdAt: now,
        })
      }
    }
    
    return { entityType: "claim", entityId: existingClaim._id }
  }
  
  // 8. Create new claim
  const claimId = await ctx.db.insert("claims", {
    organizationId,
    patientId,
    coverageId: coverage._id,
    claimNumber,
    dateOfService,
    statementFromDate: dateOfService,
    statementToDate: dateOfService,
    placeOfService: "11", // Office - default
    billingProviderId: billingProvider._id,
    renderingProviderId: renderingProvider._id,
    priorAuthRequired: false,
    totalCharges,
    status: "draft",
    externalEncounterId: payload.Visit?.VisitNumber,
    externalSource: "redox",
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  })
  
  // 9. Create line items
  if (payload.Transactions) {
    for (let i = 0; i < payload.Transactions.length; i++) {
      const txn = payload.Transactions[i]
      await ctx.db.insert("lineItems", {
        claimId,
        lineNumber: i + 1,
        procedureCode: txn.Procedure?.Code || "99999",
        procedureType: mapCodeSystem(txn.Procedure?.CodeSystem),
        modifiers: txn.Procedure?.Modifiers || [],
        description: txn.Procedure?.Description,
        diagnosisPointers: txn.DiagnosisRelatedCodes?.map((_, idx) => idx + 1) || [1],
        units: txn.Quantity || 1,
        chargeAmount: txn.Amount || 0,
        status: "pending",
        createdAt: now,
      })
    }
  }
  
  // 10. Create diagnoses
  const allDiagnoses = payload.Transactions?.flatMap(txn => txn.DiagnosisRelatedCodes || []) || []
  const uniqueDiagnoses = [...new Map(allDiagnoses.map(d => [d.Code, d])).values()]
  
  for (let i = 0; i < uniqueDiagnoses.length; i++) {
    const dx = uniqueDiagnoses[i]
    await ctx.db.insert("claimDiagnoses", {
      claimId,
      sequence: i + 1,
      code: dx.Code,
      description: dx.Description,
      isPrimary: i === 0,
    })
  }
  
  // 11. Create status event
  await ctx.db.insert("claimStatusEvents", {
    claimId,
    toStatus: "draft",
    reason: "Imported from Redox",
    notes: `Financial transaction received from ${payload.Meta.Source?.Name || "EHR"}`,
    actorType: "system",
    createdAt: now,
  })
  
  return { entityType: "claim", entityId: claimId }
}

// Process PatientAdmin events - creates/updates patients
async function processPatientAdmin(
  ctx: { db: any },
  organizationId: Id<"organizations">,
  payload: RedoxPatientAdmin
): Promise<{ entityType: string; entityId: string }> {
  const patientId = await upsertPatientFromRedox(ctx, organizationId, payload.Patient)
  return { entityType: "patient", entityId: patientId }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Upsert patient from Redox payload
async function upsertPatientFromRedox(
  ctx: { db: any },
  organizationId: Id<"organizations">,
  patientData: RedoxFinancialTransaction["Patient"] | RedoxPatientAdmin["Patient"]
): Promise<Id<"patients">> {
  const now = Date.now()
  
  // Find MRN identifier
  const mrnId = patientData.Identifiers.find(id => id.IDType === "MR" || id.IDType === "MRN")
  const mrn = mrnId?.ID || patientData.Identifiers[0]?.ID || `REDOX-${Date.now()}`
  
  // Find external ID (could be different from MRN)
  const externalId = patientData.Identifiers[0]?.ID
  
  // Check for existing patient by external ID
  let existingPatient = await ctx.db
    .query("patients")
    .withIndex("by_externalId", (q: any) => 
      q.eq("organizationId", organizationId)
       .eq("externalSource", "redox")
       .eq("externalId", externalId)
    )
    .first()
  
  // If not found by external ID, try by MRN
  if (!existingPatient) {
    existingPatient = await ctx.db
      .query("patients")
      .withIndex("by_mrn", (q: any) => 
        q.eq("organizationId", organizationId).eq("mrn", mrn)
      )
      .first()
  }
  
  const demographics = patientData.Demographics
  
  const patientFields = {
    organizationId,
    mrn,
    firstName: demographics.FirstName || "Unknown",
    lastName: demographics.LastName || "Unknown",
    dateOfBirth: demographics.DOB || "1900-01-01",
    gender: mapGender(demographics.Sex),
    address: {
      line1: demographics.Address?.StreetAddress || "",
      city: demographics.Address?.City || "",
      state: demographics.Address?.State || "",
      zip: demographics.Address?.ZIP || "",
    },
    phone: demographics.PhoneNumber?.Mobile || demographics.PhoneNumber?.Home,
    email: demographics.EmailAddresses?.[0],
    externalId,
    externalSource: "redox" as const,
    lastSyncedAt: now,
  }
  
  if (existingPatient) {
    // Update existing patient
    await ctx.db.patch(existingPatient._id, {
      ...patientFields,
      // Don't overwrite these if they exist
      mrn: existingPatient.mrn,
      createdAt: existingPatient.createdAt,
    })
    return existingPatient._id
  }
  
  // Create new patient
  return await ctx.db.insert("patients", {
    ...patientFields,
    createdAt: now,
  })
}

// Map Redox gender to schema gender
function mapGender(sex?: string): "M" | "F" | "U" {
  switch (sex?.toUpperCase()) {
    case "M":
    case "MALE":
      return "M"
    case "F":
    case "FEMALE":
      return "F"
    default:
      return "U"
  }
}

// Map code system to procedure type
function mapCodeSystem(codeSystem?: string): "CPT" | "HCPCS" | "Custom" {
  switch (codeSystem?.toUpperCase()) {
    case "CPT":
    case "CPT-4":
      return "CPT"
    case "HCPCS":
      return "HCPCS"
    default:
      return "CPT" // Default to CPT
  }
}

// Generate a claim number
function generateClaimNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CLM-${timestamp}-${random}`
}
