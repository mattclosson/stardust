import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// Note: Auth tables are managed by the @convex-dev/better-auth component
// See convex/convex.config.ts for the component registration

export default defineSchema({
  // ============================================
  // RCM COMPANY & USER MANAGEMENT
  // ============================================

  // The RCM (Revenue Cycle Management) company - billers who work across multiple orgs
  rcmCompanies: defineTable({
    name: v.string(),
    npi: v.optional(v.string()),
    taxId: v.optional(v.string()),
    address: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),
    createdAt: v.number(),
  }),

  // RCM staff who can work across multiple healthcare organizations
  rcmUsers: defineTable({
    rcmCompanyId: v.id("rcmCompanies"),
    userId: v.string(), // Better Auth user ID
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("supervisor"),
      v.literal("billing_specialist"),
      v.literal("coder"),
      v.literal("appeals_specialist"),
      v.literal("viewer")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("disabled")
    ),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    // Notification preferences
    notificationPreferences: v.optional(v.object({
      emailNotifications: v.boolean(),
      taskAssignments: v.boolean(),
      taskDueDates: v.boolean(),
      claimStatusChanges: v.boolean(),
      denialAlerts: v.boolean(),
      appealDeadlines: v.boolean(),
      teamUpdates: v.boolean(),
    })),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_rcmCompany", ["rcmCompanyId"])
    .index("by_email", ["email"]),

  // Which organizations an RCM user is assigned to work on
  rcmUserAssignments: defineTable({
    rcmUserId: v.id("rcmUsers"),
    organizationId: v.id("organizations"),
    assignedAt: v.number(),
    assignedBy: v.optional(v.string()),
    isPrimary: v.boolean(), // Their main/default organization
    canView: v.boolean(),
    canEdit: v.boolean(),
    canManage: v.boolean(), // Can assign tasks, manage workflows
  })
    .index("by_rcmUser", ["rcmUserId"])
    .index("by_organization", ["organizationId"]),

  // Invite links for adding team members
  invites: defineTable({
    rcmCompanyId: v.id("rcmCompanies"),
    email: v.optional(v.string()), // Optional: pre-fill for specific invitee
    role: v.union(
      v.literal("admin"),
      v.literal("supervisor"),
      v.literal("billing_specialist"),
      v.literal("coder"),
      v.literal("appeals_specialist"),
      v.literal("viewer")
    ),
    token: v.string(), // Unique invite token
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked")
    ),
    createdBy: v.string(), // userId of the person who created the invite
    expiresAt: v.number(),
    acceptedBy: v.optional(v.string()), // userId of who accepted
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_rcmCompany", ["rcmCompanyId"])
    .index("by_status", ["rcmCompanyId", "status"]),

  // ============================================
  // HEALTHCARE ORGANIZATIONS
  // ============================================

  organizations: defineTable({
    name: v.string(),
    npi: v.string(),
    taxId: v.string(),
    specialty: v.string(),
    facilityType: v.union(
      v.literal("physician_office"),
      v.literal("hospital_outpatient"),
      v.literal("asc"),
      v.literal("clinic")
    ),
    address: v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    // Link to RCM company managing this org's billing
    rcmCompanyId: v.optional(v.id("rcmCompanies")),
    // Denormalized counters for efficient queries
    claimCount: v.optional(v.number()),
    denialCount: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_rcmCompany", ["rcmCompanyId"]),

  // Organization staff (healthcare org employees who may view their data)
  organizationUsers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(), // Better Auth user ID
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("office_manager"),
      v.literal("provider"),
      v.literal("front_desk"),
      v.literal("viewer")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("disabled")
    ),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"]),

  providers: defineTable({
    organizationId: v.id("organizations"),
    firstName: v.string(),
    lastName: v.string(),
    npi: v.string(),
    taxonomy: v.string(),
    isRendering: v.boolean(),
    isBilling: v.boolean(),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  patients: defineTable({
    organizationId: v.id("organizations"),
    mrn: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.union(v.literal("M"), v.literal("F"), v.literal("U")),
    address: v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    // External system tracking (for Redox, direct EHR integrations)
    externalId: v.optional(v.string()),
    externalSource: v.optional(v.union(
      v.literal("redox"),
      v.literal("nextgen"),
      v.literal("epic"),
      v.literal("cerner"),
      v.literal("athena"),
      v.literal("eclinicalworks"),
      v.literal("manual")
    )),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_mrn", ["organizationId", "mrn"])
    .index("by_externalId", ["organizationId", "externalSource", "externalId"])
    // Search index for patient name lookups
    .searchIndex("search_name", {
      searchField: "lastName",
      filterFields: ["organizationId"],
    }),

  payers: defineTable({
    name: v.string(),
    payerId: v.string(),
    payerType: v.union(
      v.literal("commercial"),
      v.literal("medicare"),
      v.literal("medicaid"),
      v.literal("tricare"),
      v.literal("workers_comp"),
      v.literal("self_pay")
    ),
    address: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),
    submissionMethod: v.union(v.literal("electronic"), v.literal("paper")),
    timelyFilingDays: v.number(),
    appealDeadlineDays: v.optional(v.number()),
    authRequirements: v.optional(v.string()),
    // Phone contact fields for hold-for-me feature
    providerServicesPhone: v.optional(v.string()),
    claimsPhone: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_payerId", ["payerId"]),

  coverages: defineTable({
    patientId: v.id("patients"),
    payerId: v.id("payers"),
    priority: v.union(v.literal("primary"), v.literal("secondary"), v.literal("tertiary")),
    memberId: v.string(),
    groupNumber: v.optional(v.string()),
    planName: v.optional(v.string()),
    effectiveDate: v.string(),
    terminationDate: v.optional(v.string()),
    copay: v.optional(v.number()),
    deductible: v.optional(v.number()),
    deductibleMet: v.optional(v.number()),
    outOfPocketMax: v.optional(v.number()),
    outOfPocketMet: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("verified"),
      v.literal("failed")
    ),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_payer", ["payerId"]),

  eligibilityChecks: defineTable({
    organizationId: v.id("organizations"),
    patientId: v.id("patients"),
    coverageId: v.id("coverages"),
    serviceType: v.string(),
    requestedAt: v.number(),
    requestedBy: v.optional(v.string()),
    eligibility: v.union(v.literal("active"), v.literal("inactive"), v.literal("unknown")),
    effectiveDate: v.optional(v.string()),
    terminationDate: v.optional(v.string()),
    copay: v.optional(v.number()),
    coinsurance: v.optional(v.number()),
    deductible: v.optional(v.number()),
    deductibleMet: v.optional(v.number()),
    outOfPocket: v.optional(v.number()),
    outOfPocketMet: v.optional(v.number()),
    rawResponse: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_coverage", ["coverageId"]),

  claims: defineTable({
    organizationId: v.id("organizations"),
    patientId: v.id("patients"),
    coverageId: v.id("coverages"),
    claimNumber: v.string(),
    payerClaimNumber: v.optional(v.string()),
    dateOfService: v.string(),
    dateOfServiceEnd: v.optional(v.string()),
    statementFromDate: v.string(),
    statementToDate: v.string(),
    submittedAt: v.optional(v.number()),
    placeOfService: v.string(),
    billingProviderId: v.id("providers"),
    renderingProviderId: v.id("providers"),
    referringProviderId: v.optional(v.id("providers")),
    priorAuthNumber: v.optional(v.string()),
    priorAuthRequired: v.boolean(),
    totalCharges: v.number(),
    totalAllowed: v.optional(v.number()),
    totalPaid: v.optional(v.number()),
    totalAdjustments: v.optional(v.number()),
    totalPatientResponsibility: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("ready_to_submit"),
      v.literal("submitted"),
      v.literal("acknowledged"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("partial_paid"),
      v.literal("denied"),
      v.literal("rejected"),
      v.literal("appealed"),
      v.literal("written_off"),
      v.literal("closed")
    ),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    )),
    assignedTo: v.optional(v.string()),
    // AI-powered denial risk prediction
    denialRisk: v.optional(v.number()),
    denialRiskFactors: v.optional(v.array(v.string())),
    // External system tracking (for Redox, direct EHR integrations)
    externalEncounterId: v.optional(v.string()),
    externalSource: v.optional(v.union(
      v.literal("redox"),
      v.literal("nextgen"),
      v.literal("epic"),
      v.literal("cerner"),
      v.literal("athena"),
      v.literal("eclinicalworks"),
      v.literal("import"),
      v.literal("manual")
    )),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_patient", ["patientId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_dateOfService", ["organizationId", "dateOfService"])
    .index("by_claimNumber", ["claimNumber"])
    .index("by_externalEncounterId", ["organizationId", "externalSource", "externalEncounterId"])
    // Search index for claim number lookups
    .searchIndex("search_claimNumber", {
      searchField: "claimNumber",
      filterFields: ["organizationId", "status"],
    }),

  lineItems: defineTable({
    claimId: v.id("claims"),
    lineNumber: v.number(),
    procedureCode: v.string(),
    procedureType: v.union(v.literal("CPT"), v.literal("HCPCS"), v.literal("Custom")),
    modifiers: v.array(v.string()),
    description: v.optional(v.string()),
    diagnosisPointers: v.array(v.number()),
    units: v.number(),
    chargeAmount: v.number(),
    allowedAmount: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    patientResponsibility: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("denied"),
      v.literal("adjusted")
    ),
    revenueCode: v.optional(v.string()),
    serviceDate: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_claim", ["claimId"]),

  claimDiagnoses: defineTable({
    claimId: v.id("claims"),
    sequence: v.number(),
    code: v.string(),
    description: v.optional(v.string()),
    isPrimary: v.boolean(),
  }).index("by_claim", ["claimId"]),

  adjustments: defineTable({
    lineItemId: v.id("lineItems"),
    claimId: v.id("claims"),
    groupCode: v.union(
      v.literal("CO"),
      v.literal("PR"),
      v.literal("OA"),
      v.literal("PI"),
      v.literal("CR")
    ),
    reasonCode: v.string(),
    remarkCodes: v.optional(v.array(v.string())),
    amount: v.number(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_claim", ["claimId"])
    .index("by_lineItem", ["lineItemId"]),

  payments: defineTable({
    claimId: v.id("claims"),
    organizationId: v.id("organizations"),
    paymentType: v.union(v.literal("insurance"), v.literal("patient")),
    paymentMethod: v.union(
      v.literal("check"),
      v.literal("eft"),
      v.literal("virtual_card"),
      v.literal("cash"),
      v.literal("credit_card")
    ),
    checkNumber: v.optional(v.string()),
    traceNumber: v.optional(v.string()),
    amount: v.number(),
    paymentDate: v.string(),
    postedAt: v.number(),
    eraId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_claim", ["claimId"])
    .index("by_organization", ["organizationId"]),

  claimStatusEvents: defineTable({
    claimId: v.id("claims"),
    fromStatus: v.optional(v.string()),
    toStatus: v.string(),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    actorType: v.union(v.literal("system"), v.literal("user"), v.literal("payer")),
    actorId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_claim", ["claimId"]),

  denials: defineTable({
    claimId: v.id("claims"),
    lineItemId: v.optional(v.id("lineItems")),
    denialCode: v.string(),
    denialReason: v.string(),
    denialCategory: v.union(
      v.literal("eligibility"),
      v.literal("authorization"),
      v.literal("medical_necessity"),
      v.literal("coding"),
      v.literal("duplicate"),
      v.literal("timely_filing"),
      v.literal("bundling"),
      v.literal("coordination_of_benefits"),
      v.literal("missing_information"),
      v.literal("provider_enrollment"),
      v.literal("other")
    ),
    receivedAt: v.number(),
    appealDeadline: v.optional(v.string()),
    status: v.union(
      v.literal("new"),
      v.literal("in_review"),
      v.literal("appealing"),
      v.literal("appeal_submitted"),
      v.literal("overturned"),
      v.literal("upheld"),
      v.literal("written_off")
    ),
    // AI-powered fields
    suggestedAction: v.optional(v.string()),
    similarDenialCount: v.optional(v.number()),
    overturnLikelihood: v.optional(v.number()),
    aiAnalysis: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_claim", ["claimId"])
    .index("by_status", ["status"])
    .index("by_category", ["denialCategory"]),

  appeals: defineTable({
    denialId: v.id("denials"),
    claimId: v.id("claims"),
    appealLevel: v.number(),
    appealType: v.union(
      v.literal("reconsideration"),
      v.literal("formal_appeal"),
      v.literal("external_review")
    ),
    submittedAt: v.optional(v.number()),
    submissionMethod: v.union(
      v.literal("electronic"),
      v.literal("fax"),
      v.literal("mail"),
      v.literal("portal")
    ),
    supportingDocumentIds: v.optional(v.array(v.id("documents"))),
    appealLetterDocumentId: v.optional(v.id("documents")),
    // AI-generated appeal letter
    generatedAppealLetter: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("in_review"),
      v.literal("decided")
    ),
    outcome: v.optional(v.union(
      v.literal("overturned"),
      v.literal("partially_overturned"),
      v.literal("upheld")
    )),
    responseReceivedAt: v.optional(v.number()),
    responseNotes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_denial", ["denialId"])
    .index("by_claim", ["claimId"]),

  authorizations: defineTable({
    organizationId: v.id("organizations"),
    patientId: v.id("patients"),
    payerId: v.id("payers"),
    authNumber: v.string(),
    requestedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    deniedAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    effectiveDate: v.optional(v.string()),
    expirationDate: v.optional(v.string()),
    approvedUnits: v.optional(v.number()),
    usedUnits: v.optional(v.number()),
    procedureCodes: v.optional(v.array(v.string())),
    diagnosisCodes: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"]),

  tasks: defineTable({
    organizationId: v.id("organizations"),
    claimId: v.optional(v.id("claims")),
    denialId: v.optional(v.id("denials")),
    appealId: v.optional(v.id("appeals")),
    patientId: v.optional(v.id("patients")),
    authorizationId: v.optional(v.id("authorizations")),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("follow_up"),
      v.literal("appeal"),
      v.literal("eligibility"),
      v.literal("coding_review"),
      v.literal("patient_contact"),
      v.literal("auth_request"),
      v.literal("other")
    ),
    assignedTo: v.optional(v.string()),
    assignedAt: v.optional(v.number()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    dueDate: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.string()),
    source: v.union(v.literal("manual"), v.literal("system"), v.literal("ai")),
    aiConfidence: v.optional(v.number()),
    aiReasoning: v.optional(v.string()),
    aiPriorityScore: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_assignedTo", ["assignedTo", "status"])
    .index("by_claim", ["claimId"])
    .index("by_denial", ["denialId"])
    .index("by_priority", ["organizationId", "priority"]),

  taskNotes: defineTable({
    taskId: v.id("tasks"),
    note: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  documents: defineTable({
    organizationId: v.id("organizations"),
    claimId: v.optional(v.id("claims")),
    appealId: v.optional(v.id("appeals")),
    patientId: v.optional(v.id("patients")),
    authorizationId: v.optional(v.id("authorizations")),
    type: v.union(
      v.literal("eob"),
      v.literal("era"),
      v.literal("appeal_letter"),
      v.literal("medical_record"),
      v.literal("auth_letter"),
      v.literal("denial_letter"),
      v.literal("correspondence"),
      v.literal("other")
    ),
    filename: v.string(),
    mimeType: v.string(),
    storageUrl: v.string(),
    description: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_claim", ["claimId"])
    .index("by_patient", ["patientId"]),

  correspondence: defineTable({
    organizationId: v.id("organizations"),
    claimId: v.optional(v.id("claims")),
    denialId: v.optional(v.id("denials")),
    appealId: v.optional(v.id("appeals")),
    patientId: v.optional(v.id("patients")),
    payerId: v.optional(v.id("payers")),
    type: v.union(
      v.literal("phone"),
      v.literal("fax"),
      v.literal("portal"),
      v.literal("email"),
      v.literal("mail")
    ),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    subject: v.optional(v.string()),
    notes: v.string(),
    contactName: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    duration: v.optional(v.number()),
    documentIds: v.optional(v.array(v.id("documents"))),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_claim", ["claimId"])
    .index("by_patient", ["patientId"]),

  // External system integrations (Redox, direct EHR APIs)
  integrations: defineTable({
    organizationId: v.id("organizations"),
    integrationType: v.union(
      v.literal("redox"),
      v.literal("nextgen"),
      v.literal("epic"),
      v.literal("cerner"),
      v.literal("athena"),
      v.literal("eclinicalworks")
    ),
    // Display name for this integration
    name: v.string(),
    // Integration-specific configuration
    config: v.object({
      // Redox-specific
      sourceId: v.optional(v.string()),
      destinationId: v.optional(v.string()),
      // Direct EHR-specific
      practiceId: v.optional(v.string()),
      apiUrl: v.optional(v.string()),
    }),
    // Webhook verification
    webhookSecret: v.optional(v.string()),
    // Status tracking
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    lastSyncStatus: v.optional(v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("partial")
    )),
    lastSyncError: v.optional(v.string()),
    // Counters
    totalSynced: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_type", ["organizationId", "integrationType"]),

  // Sync logs for debugging and auditing
  integrationSyncLogs: defineTable({
    integrationId: v.id("integrations"),
    organizationId: v.id("organizations"),
    eventType: v.string(), // e.g., "Financial.Transaction", "PatientAdmin.NewPatient"
    externalId: v.optional(v.string()),
    status: v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("skipped")
    ),
    // What was created/updated
    entityType: v.optional(v.union(
      v.literal("patient"),
      v.literal("claim"),
      v.literal("coverage"),
      v.literal("provider")
    )),
    entityId: v.optional(v.string()),
    // Error details if failed
    errorMessage: v.optional(v.string()),
    // Raw payload for debugging (truncated)
    payloadPreview: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_integration", ["integrationId"])
    .index("by_organization", ["organizationId"])
    .index("by_status", ["integrationId", "status"]),

  // Hold-for-me calling feature
  holdCalls: defineTable({
    organizationId: v.id("organizations"),
    // What this call is about
    claimId: v.optional(v.id("claims")),
    denialId: v.optional(v.id("denials")),
    payerId: v.id("payers"),
    // Call purpose for IVR navigation
    callPurpose: v.optional(v.union(
      v.literal("claims_status"),
      v.literal("eligibility"),
      v.literal("prior_auth"),
      v.literal("appeal"),
      v.literal("general")
    )),
    // Call details
    phoneNumber: v.string(),
    twilioCallSid: v.optional(v.string()),
    // Status state machine
    status: v.union(
      v.literal("initiating"),
      v.literal("dialing"),
      v.literal("ivr_navigation"),
      v.literal("on_hold"),
      v.literal("operator_detected"),
      v.literal("user_connected"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    // Timing
    startedAt: v.number(),
    holdStartedAt: v.optional(v.number()),
    operatorDetectedAt: v.optional(v.number()),
    connectedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    totalHoldTimeSeconds: v.optional(v.number()),
    // User connection
    userPhoneNumber: v.string(),
    initiatedBy: v.string(),
    // Transcription/notes
    operatorName: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_claim", ["claimId"])
    .index("by_denial", ["denialId"]),
})
