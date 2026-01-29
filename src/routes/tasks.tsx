import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Sparkles,
  MoreHorizontal,
  Calendar,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { AssignDialog } from "@/components/dialogs/AssignDialog"
import { EditTaskDialog } from "@/components/dialogs/EditTaskDialog"
import { formatDate } from "@/lib/utils"
import { useOrganization } from "@/contexts/OrganizationContext"

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
})

interface Task {
  _id: Id<"tasks">
  title: string
  description?: string
  priority: string
  status: string
  category: string
  source: string
  assignedTo?: string
  dueDate?: string
  aiConfidence?: number
  aiReasoning?: string
  createdAt: number
  claim?: {
    _id: Id<"claims">
    claimNumber: string
    status: string
  } | null
}

function TasksPage() {
  const { selectedOrganization } = useOrganization()
  const orgId = selectedOrganization?._id

  // Fetch real data from Convex, filtered by selected organization
  const tasks = useQuery(
    api.tasks.list,
    orgId ? { organizationId: orgId, limit: 100 } : "skip"
  )
  const taskStats = useQuery(
    api.tasks.getStats,
    orgId ? { organizationId: orgId } : "skip"
  )
  const updateTask = useMutation(api.tasks.update)
  const isLoading = !orgId || tasks === undefined || taskStats === undefined

  // Dialog states
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const sortedTasks = tasks
    ? [...tasks].sort((a, b) => {
        // Sort by priority (critical > high > medium > low)
        const priorityOrder: Record<string, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        }
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        // Then by created date
        return b.createdAt - a.createdAt
      })
    : []

  // Action handlers
  const handleMarkComplete = (task: Task) => {
    setSelectedTask(task)
    setCompleteDialogOpen(true)
  }

  const handleReassign = (task: Task) => {
    setSelectedTask(task)
    setReassignDialogOpen(true)
  }

  const handleEdit = (task: Task) => {
    setSelectedTask(task)
    setEditDialogOpen(true)
  }

  const confirmComplete = async () => {
    if (!selectedTask) return
    await updateTask({
      taskId: selectedTask._id,
      status: "completed",
    })
  }

  const confirmReassign = async (assignee: string) => {
    if (!selectedTask) return
    await updateTask({
      taskId: selectedTask._id,
      assignedTo: assignee,
    })
  }

  const confirmEdit = async (updates: {
    priority?: string
    status?: string
    assignedTo?: string
  }) => {
    if (!selectedTask) return
    await updateTask({
      taskId: selectedTask._id,
      ...updates,
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Tasks" />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">{taskStats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">
                        {taskStats.byStatus.pending || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Critical</p>
                      <p className="text-2xl font-bold">
                        {taskStats.byPriority.critical || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">AI Generated</p>
                      <p className="text-2xl font-bold">{taskStats.aiGenerated}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : sortedTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tasks found
              </p>
            ) : (
              <div className="space-y-3">
                {sortedTasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`mt-1 w-3 h-3 rounded-full shrink-0 ${
                        task.priority === "critical"
                          ? "bg-destructive"
                          : task.priority === "high"
                            ? "bg-warning"
                            : task.priority === "medium"
                              ? "bg-info"
                              : "bg-muted-foreground"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleMarkComplete(task as Task)}
                              disabled={task.status === "completed"}
                            >
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleReassign(task as Task)}
                            >
                              Reassign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(task as Task)}
                            >
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <StatusBadge status={task.status} type="task" />
                        <StatusBadge status={task.priority} type="priority" />
                        <Badge variant="outline" className="capitalize">
                          {task.category.replace(/_/g, " ")}
                        </Badge>

                        {task.source === "ai" && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI
                            {task.aiConfidence && (
                              <span className="ml-1">
                                {(task.aiConfidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </Badge>
                        )}

                        {task.claim && (
                          <Link
                            to="/claims/$claimId"
                            params={{ claimId: task.claim._id }}
                            className="text-xs text-primary hover:underline"
                          >
                            {task.claim.claimNumber}
                          </Link>
                        )}

                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>

                      {task.aiReasoning && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          {task.aiReasoning}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        title="Mark Task Complete"
        description={`Are you sure you want to mark "${selectedTask?.title}" as complete?`}
        confirmText="Mark Complete"
        onConfirm={confirmComplete}
      />

      <AssignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        title="Reassign Task"
        description={`Reassign "${selectedTask?.title}" to another team member.`}
        currentAssignee={selectedTask?.assignedTo}
        organizationId={orgId}
        onAssign={confirmReassign}
      />

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask}
        organizationId={orgId}
        onSave={confirmEdit}
      />
    </div>
  )
}
