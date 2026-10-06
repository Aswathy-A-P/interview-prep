import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api/client';

export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
): boolean {
  if (!(error instanceof ApiError) || error.fieldErrors.length === 0) {
    return false;
  }
  let applied = false;
  for (const fieldError of error.fieldErrors) {
    const match = fields.find((field) => field === fieldError.field);
    if (match) {
      setError(match, { type: 'server', message: fieldError.message });
      applied = true;
    }
  }
  return applied;
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function toNumber(value: unknown): number {
  if (value === '' || value === null || value === undefined) {
    return Number.NaN;
  }
  return Number(value);
}
