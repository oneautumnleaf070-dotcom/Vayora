import React from 'react';
import { cn } from '../../utils/helpers';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'slate' | 'teal' | 'verified';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'green',
  size = 'sm',
  className,
  dot = false,
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    green: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    blue: 'bg-blue-50 text-blue-800 border border-blue-200/80',
    amber: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    red: 'bg-red-50 text-red-800 border border-red-200/80',
    purple: 'bg-purple-50 text-purple-800 border border-purple-200/80',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200',
    teal: 'bg-teal-50 text-teal-800 border border-teal-200/80',
    verified: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold shadow-xs',
  };

  const dotColors = {
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-500',
    teal: 'bg-teal-500',
    verified: 'bg-emerald-600',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full tracking-tight',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  );
};
