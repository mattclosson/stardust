// Centralized type definitions for the Stardust RCM application
// These types mirror the Convex schema definitions for frontend use

// ============================================
// CLAIM TYPES
// ============================================

export type ClaimStatus =
  | "draft"
  | "ready_to_submit"
  | "submitted"
  | "acknowledged"
  | "pending"
  | "paid"
  | "partial_paid"
  | "denied"
  | "rejected"
  | "appealed"
  | "written_off"
  | "closed"

// ============================================
// DENIAL TYPES
// ============================================

export type DenialStatus =
  | "new"
  | "in_review"
  | "appealing"
  | "appeal_submitted"
  | "overturned"
  | "upheld"
  | "written_off"

export type DenialCategory =
  | "eligibility"
  | "authorization"
  | "medical_necessity"
  | "coding"
  | "duplicate"
  | "timely_filing"
  | "bundling"
  | "coordination_of_benefits"
  | "missing_information"
  | "provider_enrollment"
  | "other"

// ============================================
// TASK TYPES
// ============================================

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled"

export type TaskCategory =
  | "follow_up"
  | "appeal"
  | "eligibility"
  | "coding_review"
  | "patient_contact"
  | "auth_request"
  | "other"

export type TaskSource = "manual" | "system" | "ai"

// ============================================
// SHARED TYPES
// ============================================

export type Priority = "low" | "medium" | "high" | "critical"

export type PayerType =
  | "commercial"
  | "medicare"
  | "medicaid"
  | "tricare"
  | "workers_comp"
  | "self_pay"

export type FacilityType =
  | "physician_office"
  | "hospital_outpatient"
  | "asc"
  | "clinic"

// ============================================
// HOLD CALL TYPES
// ============================================

export type CallPurpose =
  | "claims_status"
  | "eligibility"
  | "prior_auth"
  | "appeal"
  | "general"

export type HoldCallStatus =
  | "initiating"
  | "dialing"
  | "ivr_navigation"
  | "on_hold"
  | "operator_detected"
  | "user_connected"
  | "completed"
  | "failed"
  | "cancelled"

// ============================================
// APPEAL TYPES
// ============================================

export type AppealType = "reconsideration" | "formal_appeal" | "external_review"

export type AppealStatus = "draft" | "submitted" | "in_review" | "decided"

export type AppealOutcome = "overturned" | "partially_overturned" | "upheld"

export type SubmissionMethod = "electronic" | "fax" | "mail" | "portal"

// ============================================
// USER TYPES
// ============================================

export type RcmUserRole =
  | "admin"
  | "supervisor"
  | "billing_specialist"
  | "coder"
  | "appeals_specialist"
  | "viewer"

export type OrgUserRole =
  | "admin"
  | "office_manager"
  | "provider"
  | "front_desk"
  | "viewer"

export type UserStatus = "active" | "invited" | "disabled"
