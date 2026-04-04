import { type ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-gray-900 border border-gray-800 p-4 shadow-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}
