import React from 'react';
import { cn } from '../../lib/utils';
import type { ProjectStatus, TaskPriority, TaskStatus } from '../../lib/api';

export type BadgeType = ProjectStatus | TaskPriority | TaskStatus | 'default';

interface BadgeProps {
  variant: BadgeType;
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant, label, className }) => {
  const getBadgeConfig = () => {
    switch (variant) {
      // Priorities
      case 'HIGH':
        return {
          text: label || 'High Priority',
          classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
        };
      case 'MEDIUM':
        return {
          text: label || 'Medium Priority',
          classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'LOW':
        return {
          text: label || 'Low Priority',
          classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };

      // Project / Task Statuses
      case 'COMPLETED':
        return {
          text: label || 'Completed',
          classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'IN_PROGRESS':
        return {
          text: label || 'In Progress',
          classes: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
          dot: 'bg-indigo-400 animate-pulse',
        };
      case 'PENDING':
        return {
          text: label || 'Pending',
          classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
        };
      case 'NOT_STARTED':
        return {
          text: label || 'Not Started',
          classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
        };

      default:
        return {
          text: label || variant,
          classes: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none',
        config.classes,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      {config.text}
    </span>
  );
};
