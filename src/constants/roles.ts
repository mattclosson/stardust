// User role definitions and display labels

export type UserRole = 
  | "admin"
  | "supervisor"
  | "billing_specialist"
  | "coder"
  | "appeals_specialist"
  | "viewer"

/**
 * Short display labels for user roles
 * Used in compact UI contexts like dropdowns and badges
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  billing_specialist: "Billing",
  coder: "Coder",
  appeals_specialist: "Appeals",
  viewer: "Viewer",
}

/**
 * Get display label for a role, with fallback to the role string itself
 */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role
}

/**
 * Role options for select dropdowns
 */
export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "billing_specialist", label: "Billing Specialist" },
  { value: "coder", label: "Coder" },
  { value: "appeals_specialist", label: "Appeals Specialist" },
  { value: "viewer", label: "Viewer" },
]
