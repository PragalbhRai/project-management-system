import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  apiClient,
  type Task,
  type TaskStatus,
  type CreateTaskDto,
  type UpdateTaskDto,
  ApiError,
} from '../lib/api';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const taskFormSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(100, 'Max 100 characters'),
  description: z.string().max(1000, 'Max 1000 characters').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search and filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modal and action states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Fetch project details
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => apiClient.projects.get(id!),
    enabled: !!id,
  });

  // Fetch tasks belonging to this project
  const {
    data: tasks,
    isLoading: tasksLoading,
  } = useQuery({
    queryKey: ['tasks', { projectId: id }],
    queryFn: () => apiClient.projects.getTasks(id!),
    enabled: !!id,
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskDto) => apiClient.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
      resetCreate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create task');
    },
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskDto }) =>
      apiClient.tasks.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingTask(null);
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update task');
    },
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.tasks.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingTask(null);
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete task');
    },
  });

  // Toggle Complete Quick Mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ task, nextStatus }: { task: Task; nextStatus: TaskStatus }) => {
      setCompletingTaskId(task.id);
      return apiClient.tasks.update(task.id, { status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onSettled: () => {
      setCompletingTaskId(null);
    },
  });

  // Forms
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      priority: 'MEDIUM',
      status: 'PENDING',
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
  });

  const openEditModal = (task: Task) => {
    setActionError(null);
    setEditingTask(task);
    resetEdit({
      name: task.name,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    });
  };

  const onCreateTask = async (data: TaskFormData) => {
    if (!id) return;
    setActionError(null);
    await createTaskMutation.mutateAsync({
      projectId: id,
      name: data.name,
      description: data.description || undefined,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    });
  };

  const onEditTask = async (data: TaskFormData) => {
    if (!editingTask) return;
    setActionError(null);
    await updateTaskMutation.mutateAsync({
      taskId: editingTask.id,
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      },
    });
  };

  // Filter tasks locally
  const filteredTasks = (tasks || []).filter((task) => {
    if (search.trim() && !task.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'ALL' && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  if (projectError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
        </Button>
        <div className="p-8 rounded-2xl bg-rose-950/30 border border-rose-900/60 text-rose-300 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-rose-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-lg text-rose-200">Project Not Found</h3>
            <p className="text-sm mt-1">
              {projectError instanceof Error ? projectError.message : 'The requested project could not be found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button and breadcrumb */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </Link>
      </div>

      {/* Project Overview Banner */}
      {projectLoading ? (
        <Skeleton className="h-44 w-full rounded-2xl" />
      ) : (
        project && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={project.status} />
                  <span className="text-xs text-slate-400">
                    Created {formatDate(project.createdAt)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {project.name}
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {project.description || 'No description provided for this project.'}
                </p>
              </div>

              {/* Schedule Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 min-w-[200px] shrink-0 text-xs space-y-2">
                <span className="font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Project Schedule
                </span>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Start: {formatDate(project.startDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>End: {formatDate(project.endDate)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Tasks Section Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Project Tasks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage work items, assign priority levels, and complete milestones.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setActionError(null);
            resetCreate();
            setIsCreateOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Task
        </Button>
      </div>

      {/* Task Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="HIGH">High Priority</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {tasksLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredTasks.map((task) => {
              const isDone = task.status === 'COMPLETED';
              const isToggling = completingTaskId === task.id;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                    isDone
                      ? 'bg-slate-950/40 border-slate-800/40 opacity-75'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Left: Complete Checkbox and Task Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() =>
                        toggleCompleteMutation.mutate({
                          task,
                          nextStatus: isDone ? 'PENDING' : 'COMPLETED',
                        })
                      }
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isDone
                          ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                          : 'border border-slate-600 hover:border-indigo-500 text-transparent hover:text-indigo-400'
                      }`}
                      title={isDone ? 'Mark as Pending' : 'Mark as Completed'}
                    >
                      <motion.div
                        initial={false}
                        animate={{ scale: isDone ? 1 : 0.8 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </motion.div>
                    </button>

                    <div className="min-w-0">
                      <h4
                        className={`text-base font-semibold transition-all truncate ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {task.name}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant={task.status} />
                        <Badge variant={task.priority} />
                        {task.dueDate && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 sm:self-center shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActionError(null);
                        setDeletingTask(task);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center">
          <div className="p-4 rounded-2xl bg-indigo-600/10 text-indigo-400 mb-3 border border-indigo-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200">No tasks found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
            {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'No tasks matched your current filter criteria.'
              : 'Add actionable items and track milestones for this project.'}
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setActionError(null);
              resetCreate();
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Task
          </Button>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Task"
        description="Create a new task within this project workspace."
      >
        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <form onSubmit={handleCreateSubmit(onCreateTask)} className="space-y-4">
          <Input
            label="Task Name *"
            placeholder="e.g. Design authentication mockup"
            {...registerCreate('name')}
            error={createErrors.name?.message}
          />

          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Add details, criteria or checklist items..."
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              {...registerCreate('description')}
            />
            {createErrors.description && (
              <p className="text-xs text-rose-400 font-medium">{createErrors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Priority"
              {...registerCreate('priority')}
              options={[
                { value: 'LOW', label: 'Low Priority' },
                { value: 'MEDIUM', label: 'Medium Priority' },
                { value: 'HIGH', label: 'High Priority' },
              ]}
            />

            <Select
              label="Status"
              {...registerCreate('status')}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
            />
          </div>

          <Input
            type="date"
            label="Due Date"
            {...registerCreate('dueDate')}
            error={createErrors.dueDate?.message}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        description="Update task details, priority or status."
      >
        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <form onSubmit={handleEditSubmit(onEditTask)} className="space-y-4">
          <Input
            label="Task Name *"
            {...registerEdit('name')}
            error={editErrors.name?.message}
          />

          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              {...registerEdit('description')}
            />
            {editErrors.description && (
              <p className="text-xs text-rose-400 font-medium">{editErrors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Priority"
              {...registerEdit('priority')}
              options={[
                { value: 'LOW', label: 'Low Priority' },
                { value: 'MEDIUM', label: 'Medium Priority' },
                { value: 'HIGH', label: 'High Priority' },
              ]}
            />

            <Select
              label="Status"
              {...registerEdit('status')}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
            />
          </div>

          <Input
            type="date"
            label="Due Date"
            {...registerEdit('dueDate')}
            error={editErrors.dueDate?.message}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingTask(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Task Modal */}
      <Modal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        title="Delete Task"
        description="Are you sure you want to permanently delete this task?"
      >
        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300">
          Task to delete: <span className="font-semibold text-rose-100">{deletingTask?.name}</span>
        </div>
        <div className="flex items-center justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeletingTask(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={deleteTaskMutation.isPending}
            onClick={() => deletingTask && deleteTaskMutation.mutate(deletingTask.id)}
          >
            Delete Task
          </Button>
        </div>
      </Modal>
    </div>
  );
};
