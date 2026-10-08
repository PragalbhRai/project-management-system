import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  apiClient,
  type Project,
  type ProjectStatus,
  type CreateProjectDto,
  type UpdateProjectDto,
  ApiError,
} from '../lib/api';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const projectFormSchema = z
  .object({
    name: z.string().min(1, 'Project name is required').max(100, 'Max 100 characters'),
    description: z.string().max(1000, 'Max 1000 characters').optional(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

type ProjectFormData = z.infer<typeof projectFormSchema>;

export const ProjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Query projects
  const {
    data: projects,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projects', { search, status: statusFilter }],
    queryFn: () =>
      apiClient.projects.list({
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as ProjectStatus) : undefined,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectDto) => apiClient.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateOpen(false);
      resetCreate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create project');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectDto }) =>
      apiClient.projects.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingProject(null);
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update project');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingProject(null);
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete project');
    },
  });

  // Form for create
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      status: 'NOT_STARTED',
    },
  });

  // Form for edit
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
  });

  const openEditModal = (proj: Project) => {
    setActionError(null);
    setEditingProject(proj);
    resetEdit({
      name: proj.name,
      description: proj.description || '',
      status: proj.status,
      startDate: proj.startDate ? proj.startDate.slice(0, 10) : '',
      endDate: proj.endDate ? proj.endDate.slice(0, 10) : '',
    });
  };

  const onCreate = async (data: ProjectFormData) => {
    setActionError(null);
    await createMutation.mutateAsync({
      name: data.name,
      description: data.description || undefined,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
    });
  };

  const onEdit = async (data: ProjectFormData) => {
    if (!editingProject) return;
    setActionError(null);
    await updateMutation.mutateAsync({
      id: editingProject.id,
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize roadmaps, timelines, and deliverable milestones.
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
          New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-900/60 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <div>
            <p className="font-semibold text-rose-200">Failed to load projects</p>
            <p className="text-xs text-rose-400 mt-0.5">
              {error instanceof Error ? error.message : 'Please try again later'}
            </p>
          </div>
        </div>
      )}

      {/* Project Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {projects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md hover:border-slate-700/80 transition-all flex flex-col justify-between group shadow-lg shadow-black/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Badge variant={project.status} />
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(project)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Edit Project"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setActionError(null);
                          setDeletingProject(project);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Link to={`/projects/${project.id}`} className="block group-hover:text-indigo-400 transition-colors">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {project.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 h-8 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(project.startDate)}</span>
                    <span>→</span>
                    <span>{formatDate(project.endDate)}</span>
                  </div>

                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium group-hover:translate-x-0.5 transition-transform"
                  >
                    Details <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center">
          <div className="p-4 rounded-2xl bg-indigo-600/10 text-indigo-400 mb-3 border border-indigo-500/20">
            <FolderPlus className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200">No projects found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
            {search || statusFilter !== 'ALL'
              ? 'No projects matched your active filters. Try resetting the search or filter.'
              : 'Create your first project to start organizing tasks and tracking progress.'}
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
            Create Project
          </Button>
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project"
        description="Set up your project workspace and target schedule."
      >
        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <form onSubmit={handleCreateSubmit(onCreate)} className="space-y-4">
          <Input
            label="Project Name *"
            placeholder="e.g. Website Redesign Q4"
            {...registerCreate('name')}
            error={createErrors.name?.message}
          />

          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Outline project scope and key objectives..."
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              {...registerCreate('description')}
            />
            {createErrors.description && (
              <p className="text-xs text-rose-400 font-medium">{createErrors.description.message}</p>
            )}
          </div>

          <Select
            label="Initial Status"
            {...registerCreate('status')}
            options={[
              { value: 'NOT_STARTED', label: 'Not Started' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="Start Date"
              {...registerCreate('startDate')}
              error={createErrors.startDate?.message}
            />
            <Input
              type="date"
              label="Target End Date"
              {...registerCreate('endDate')}
              error={createErrors.endDate?.message}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        title="Edit Project"
        description="Update project metadata and timeline."
      >
        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4">
          <Input
            label="Project Name *"
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

          <Select
            label="Status"
            {...registerEdit('status')}
            options={[
              { value: 'NOT_STARTED', label: 'Not Started' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="Start Date"
              {...registerEdit('startDate')}
              error={editErrors.startDate?.message}
            />
            <Input
              type="date"
              label="Target End Date"
              {...registerEdit('endDate')}
              error={editErrors.endDate?.message}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProject(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        title="Delete Project"
        description="Are you sure you want to permanently delete this project? All associated tasks will also be removed."
      >
        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300">
          Project to delete: <span className="font-semibold text-rose-100">{deletingProject?.name}</span>
        </div>
        <div className="flex items-center justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeletingProject(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deletingProject && deleteMutation.mutate(deletingProject.id)}
          >
            Delete Project
          </Button>
        </div>
      </Modal>
    </div>
  );
};
