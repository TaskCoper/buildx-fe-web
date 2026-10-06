import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 * The canonical shadcn/ui helper — used by every UI primitive.
 *
 * @example cn('px-2', isActive && 'bg-primary', 'px-4') // -> 'bg-primary px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
