import React from 'react';
import { useReveal } from '../../hooks/useReveal';
import { cn } from '../../utils/helpers';

export interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** Which element to render — sections, divs, etc. Defaults to 'div'. */
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Wraps content in a one-shot fade-up reveal that fires the first time it
 * scrolls into view (see useReveal / .reveal-on-scroll in src/index.css).
 * Used on marketing/landing sections below the fold — the hero itself is
 * intentionally not wrapped, since above-the-fold content should never be
 * hidden behind a scroll trigger.
 */
export const Reveal: React.FC<RevealProps> = ({ children, as = 'div', className, ...props }) => {
  const { ref, isVisible } = useReveal<HTMLElement>();
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={cn('reveal-on-scroll', isVisible && 'is-visible', className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
