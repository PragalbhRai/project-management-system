import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  ArrowUpRight,
  Plus,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { motion } from 'framer-motion';

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 600;
    const stepTime = Math.max(Math.floor(duration / end), 20);
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 5);
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
}

export const DashboardPage: React.FC = () => {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.dashboard.get(),
  });

  const { data: recentProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'recent'],
    queryFn: () => apiClient.projects.list(),
  });

  const { data: recentTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'recent'],
    queryFn: () => apiClient.tasks.list(),
  });

  if (statsError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-rose-300 flex items-center gap-4">
        <AlertCircle className="w-8 h-8 text-rose-500 shrink-0" />
        <div>
          <h3 className="font-semibold text-lg text-rose-200">Unable to load dashboard</h3>
          <p className="text-sm mt-1">{statsError instanceof Error ? statsError.message : 'Please check your connection and try again.'}</p>
        </div>
      </div>
    );
  }

  const completionRate =
    stats && stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  const kpis = [
    {
      title: 'Total Projects',
      value: stats?.totalProjects ?? 0,
      icon: FolderKanban,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    {
      title: 'Projects In Progress',
      value: stats?.projectsInProgress ?? 0,
      icon: Activity,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Total Tasks',
      value: stats?.totalTasks ?? 0,
      icon: Layers,
      color: 'from-sky-500 to-cyan-600',
      textColor: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
    },
    {
      title: 'Completed Tasks',
      value: stats?.completedTasks ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Pending Tasks',
      value: stats?.pendingTasks ?? 0,
      icon: Clock,
      color: 'from-purple-500 to-pink-600',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time metric breakdown across your projects and ongoing tasks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/projects">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4 mr-1.5" />
              Manage Projects
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`p-5 rounded-2xl bg-slate-900/70 border ${kpi.borderColor} backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-xl ${kpi.bgColor} ${kpi.textColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-14" />
                  ) : (
                    <AnimatedCounter value={kpi.value} />
                  )}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion Progress Bar Overview */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Overall Task Execution Velocity</h3>
            <p className="text-xs text-slate-400">Total completion ratio for all active project work items</p>
          </div>
          <span className="text-lg font-extrabold text-indigo-400">{completionRate}% Done</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full"
          />
        </div>
      </div>

      {/* Two Column Layout: Recent Projects & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-400" />
              Active Projects
            </h3>
            <Link
              to="/projects"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projectsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : recentProjects && recentProjects.length > 0 ? (
            <div className="space-y-2.5 flex-1">
              {recentProjects.slice(0, 4).map((proj) => (
                <Link
                  key={proj.id}
                  to={`/projects/${proj.id}`}
                  className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex items-center justify-between group block"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                      {proj.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {proj.description || 'No description provided'}
                    </p>
                  </div>
                  <Badge variant={proj.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800 flex-1">
              <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No projects yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Create your first project to organize deliverables and assign tasks.
              </p>
              <Link to="/projects" className="mt-4">
                <Button size="sm" variant="secondary">
                  Create Project
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Recent Tasks
            </h3>
            <Link
              to="/projects"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              Explore <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {tasksLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : recentTasks && recentTasks.length > 0 ? (
            <div className="space-y-2.5 flex-1">
              {recentTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold text-slate-200 truncate">{task.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Due: {formatDate(task.dueDate)}</span>
                      <span>•</span>
                      <Badge variant={task.priority} className="py-0 px-2 text-[10px]" />
                    </div>
                  </div>
                  <Badge variant={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800 flex-1">
              <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No tasks created yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Tasks will appear here once you assign them to your projects.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
