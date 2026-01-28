import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id, Doc } from "../../convex/_generated/dataModel"
import { useSession } from "@/lib/auth-client"

// Organization with isPrimary flag from assignments
export type OrganizationWithPrimary = Doc<"organizations"> & {
  isPrimary: boolean
}

interface OrganizationContextType {
  organizations: OrganizationWithPrimary[]
  selectedOrganization: OrganizationWithPrimary | null
  setOrganization: (orgId: Id<"organizations">) => void
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

const STORAGE_KEY = "selectedOrganizationId"

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionPending } = useSession()
  
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | null>(
    () => {
      // Try to restore from localStorage on mount
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? (stored as Id<"organizations">) : null
      }
      return null
    }
  )

  // Only fetch organizations if user is authenticated (session exists)
  const shouldFetchOrgs = !!session?.user && !isSessionPending

  // Fetch organizations the user has access to - skip if not authenticated
  const organizations = useQuery(
    api.organizations.getMyOrganizations,
    shouldFetchOrgs ? {} : "skip"
  ) ?? []
  const isLoading = isSessionPending || (shouldFetchOrgs && organizations === undefined)

  // Find the selected organization from the list
  const selectedOrganization =
    organizations.find((org) => org._id === selectedOrgId) ?? null

  // Set initial organization when orgs load
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganization) {
      // If we have a stored ID but it's not in the list, clear it
      // Otherwise, select the primary org or the first one
      const primaryOrg = organizations.find((org) => org.isPrimary)
      const defaultOrg = primaryOrg ?? organizations[0]
      if (defaultOrg) {
        setSelectedOrgId(defaultOrg._id)
        localStorage.setItem(STORAGE_KEY, defaultOrg._id)
      }
    }
  }, [organizations, selectedOrganization])

  // Handler to change selected organization
  const setOrganization = useCallback((orgId: Id<"organizations">) => {
    setSelectedOrgId(orgId)
    localStorage.setItem(STORAGE_KEY, orgId)
  }, [])

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrganization,
        setOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider")
  }
  return context
}
