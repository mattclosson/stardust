// Centralized status options for dropdowns and filters
import type {
  ClaimStatus,
  DenialStatus,
  DenialCategory,
  TaskStatus,
  Priority,
} from "@/types"

// ============================================
// CLAIM STATUS OPTIONS
// ============================================

export const CLAIM_STATUS_OPTIONS: { value: ClaimStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "ready_to_submit", label: "Ready to Submit" },
  { value: "submitted", label: "Submitted" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "partial_paid", label: "Partial Paid" },
  { value: "denied", label: "Denied" },
  { value: "rejected", label: "Rejected" },
  { value: "appealed", label: "Appealed" },
  { value: "written_off", label: "Written Off" },
  { value: "closed", label: "Closed" },
]

export const CLAIM_FILTER_OPTIONS: { value: ClaimStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  ...CLAIM_STATUS_OPTIONS.filter(opt => opt.value !== "written_off" && opt.value !== "closed"),
]

// ============================================
// DENIAL STATUS OPTIONS
// ============================================

export const DENIAL_STATUS_OPTIONS: { value: DenialStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "in_review", label: "In Review" },
  { value: "appealing", label: "Appealing" },
  { value: "appeal_submitted", label: "Appeal Submitted" },
  { value: "overturned", label: "Overturned" },
  { value: "upheld", label: "Upheld" },
  { value: "written_off", label: "Written Off" },
]

export const DENIAL_FILTER_OPTIONS: { value: DenialStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  ...DENIAL_STATUS_OPTIONS,
]

// ============================================
// DENIAL CATEGORY OPTIONS
// ============================================

export const DENIAL_CATEGORY_OPTIONS: { value: DenialCategory; label: string }[] = [
  { value: "eligibility", label: "Eligibility" },
  { value: "authorization", label: "Authorization" },
  { value: "medical_necessity", label: "Medical Necessity" },
  { value: "coding", label: "Coding" },
  { value: "duplicate", label: "Duplicate" },
  { value: "timely_filing", label: "Timely Filing" },
  { value: "bundling", label: "Bundling" },
  { value: "coordination_of_benefits", label: "Coordination of Benefits" },
  { value: "missing_information", label: "Missing Information" },
  { value: "provider_enrollment", label: "Provider Enrollment" },
  { value: "other", label: "Other" },
]

export const DENIAL_CATEGORY_FILTER_OPTIONS: { value: DenialCategory | "all"; label: string }[] = [
  { value: "all", label: "All Categories" },
  ...DENIAL_CATEGORY_OPTIONS,
]

// ============================================
// TASK STATUS OPTIONS
// ============================================

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

// ============================================
// PRIORITY OPTIONS
// ============================================

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getStatusLabel(
  status: string,
  options: { value: string; label: string }[]
): string {
  return options.find((opt) => opt.value === status)?.label ?? status
}
