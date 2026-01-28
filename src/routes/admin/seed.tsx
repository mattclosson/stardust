import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { logError } from '@/lib/logger'

export const Route = createFileRoute('/admin/seed')({
  component: AdminSeedPage,
})

interface OrgProgress {
  name: string
  claimsCreated: number
  claimsTarget: number
  patientsCreated: number
  patientsTarget: number
  percentComplete: number
}

interface SeedingProgress {
  organizations: OrgProgress[]
  totalClaims: number
  totalTarget: number
  overallPercent: number
}

function AdminSeedPage() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [progress, setProgress] = useState<SeedingProgress | null>(null)
  const [lastAction, setLastAction] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const seedHistorical = useMutation(api.dataGenerator.seedHistorical.seedHistorical)
  const getSeedingProgress = useMutation(api.dataGenerator.seedHistorical.getSeedingProgress)
  const resetAndReseed = useMutation(api.dataGenerator.seedHistorical.resetAndReseed)
  const generateDailyClaims = useMutation(api.dataGenerator.dailyGenerator.generateDailyClaimsManual)
  const progressStatuses = useMutation(api.dataGenerator.dailyGenerator.progressClaimStatusesManual)
  const submitReadyClaims = useMutation(api.dataGenerator.dailyGenerator.submitReadyClaims)

  // Auto-refresh progress every 5 seconds when seeding
  useEffect(() => {
    if (isSeeding) {
      const interval = setInterval(async () => {
        try {
          const result = await getSeedingProgress({})
          setProgress(result as SeedingProgress)
          
          // Stop auto-refresh if complete
          if (result.overallPercent >= 100) {
            setIsSeeding(false)
          }
        } catch (e) {
          logError('Error fetching seeding progress', e)
        }
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isSeeding, getSeedingProgress])

  const handleSeedHistorical = async () => {
    setError(null)
    setLastAction('Starting historical seed...')
    try {
      const result = await seedHistorical({ rcmCompanyName: 'Stardust RCM Solutions' })
      if (result.success) {
        setIsSeeding(true)
        setLastAction(`Seeding started! ${result.organizationCount} organizations, ${result.payerCount} payers created.`)
      } else {
        setLastAction(result.message)
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setError(errorMessage)
      setLastAction('Failed to start seeding')
    }
  }

  const handleCheckProgress = async () => {
    setError(null)
    setLastAction('Checking progress...')
    try {
      const result = await getSeedingProgress({})
      setProgress(result as SeedingProgress)
      setLastAction(`Progress: ${result.totalClaims.toLocaleString()} / ${result.totalTarget.toLocaleString()} claims (${result.overallPercent}%)`)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setError(errorMessage)
    }
  }

  const handleGenerateDailyClaims = async () => {
    setError(null)
    setLastAction('Generating daily claims...')
    try {
      const result = await generateDailyClaims({})
      setLastAction(`Generated ${result.claimsCreated} claims for ${result.date} (${result.isWeekend ? 'weekend' : 'weekday'})`)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setError(errorMessage)
    }
  }

  const handleProgressStatuses = async () => {
    setError(null)
    setLastAction('Progressing claim statuses...')
    try {
      const result = await progressStatuses({})
      setLastAction(`Transitioned ${result.totalTransitions} claims: ${JSON.stringify(result.transitions)}`)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setError(errorMessage)
    }
  }

  const handleSubmitReady = async () => {
    setError(null)
    setLastAction('Submitting ready claims...')
    try {
      const result = await submitReadyClaims({})
      setLastAction(`Submitted ${result.submitted} claims`)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setError(errorMessage)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to DELETE ALL DATA and start fresh? This cannot be undone!')) {
      return
    }
    setError(null)
    setLastAction('Resetting database...')
    try {
      const result = await resetAndReseed({ confirmReset: true })
      setProgress(null)
      setLastAction(result.message)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setError(errorMessage)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Generator Admin</h1>
        <p className="text-muted-foreground">
          Seed and manage test data for 8 healthcare organizations with 500,000+ claims
        </p>
      </div>

      {/* Status Banner */}
      {(lastAction || error) && (
        <Card className={`mb-6 ${error ? 'border-red-500' : 'border-green-500'}`}>
          <CardContent className="py-4">
            {error ? (
              <p className="text-red-600 font-medium">Error: {error}</p>
            ) : (
              <p className="text-green-700">{lastAction}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Section */}
      {progress && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seeding Progress</CardTitle>
            <CardDescription>
              {progress.totalClaims.toLocaleString()} / {progress.totalTarget.toLocaleString()} total claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Progress value={progress.overallPercent} className="h-4" />
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {progress.overallPercent}% complete
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {progress.organizations.map((org) => (
                <div key={org.name} className="border rounded-lg p-3">
                  <p className="font-medium text-sm truncate" title={org.name}>
                    {org.name}
                  </p>
                  <Progress value={org.percentComplete} className="h-2 my-2" />
                  <p className="text-xs text-muted-foreground">
                    {org.claimsCreated.toLocaleString()} / {org.claimsTarget.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Seed Historical */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seed Historical Data</CardTitle>
            <CardDescription>
              Create 500,000+ claims across 8 organizations with 3 years of history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleSeedHistorical} 
              className="w-full"
              disabled={isSeeding}
            >
              {isSeeding ? 'Seeding in Progress...' : 'Start Seeding'}
            </Button>
            <Button 
              onClick={handleCheckProgress} 
              variant="outline" 
              className="w-full"
            >
              Check Progress
            </Button>
          </CardContent>
        </Card>

        {/* Daily Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Generation</CardTitle>
            <CardDescription>
              Generate new claims for today and progress existing claims
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleGenerateDailyClaims} 
              variant="secondary"
              className="w-full"
            >
              Generate Daily Claims
            </Button>
            <Button 
              onClick={handleSubmitReady} 
              variant="secondary"
              className="w-full"
            >
              Submit Ready Claims
            </Button>
            <Button 
              onClick={handleProgressStatuses} 
              variant="secondary"
              className="w-full"
            >
              Progress Statuses
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions - use with caution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleReset} 
              variant="destructive"
              className="w-full"
            >
              Reset & Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Organizations Being Seeded</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Summit Orthopedic</p>
              <p className="text-muted-foreground">100K claims, Denver CO</p>
            </div>
            <div>
              <p className="font-medium">Lakeside Family Medicine</p>
              <p className="text-muted-foreground">10K claims, Minneapolis MN</p>
            </div>
            <div>
              <p className="font-medium">Pacific Cardiology</p>
              <p className="text-muted-foreground">100K claims, San Francisco CA</p>
            </div>
            <div>
              <p className="font-medium">Sunshine Pediatrics</p>
              <p className="text-muted-foreground">60K claims, Miami FL</p>
            </div>
            <div>
              <p className="font-medium">Metro Gastroenterology</p>
              <p className="text-muted-foreground">60K claims, Chicago IL</p>
            </div>
            <div>
              <p className="font-medium">Valley Women's Health</p>
              <p className="text-muted-foreground">10K claims, Phoenix AZ</p>
            </div>
            <div>
              <p className="font-medium">Northeast Pain Mgmt</p>
              <p className="text-muted-foreground">60K claims, Boston MA</p>
            </div>
            <div>
              <p className="font-medium">Coastal Dermatology</p>
              <p className="text-muted-foreground">100K claims, Los Angeles CA</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
