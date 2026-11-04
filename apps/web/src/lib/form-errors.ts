import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@vyro/shared';

/** Maps API field errors onto form fields; returns a message for anything left over. */
export function applyApiError<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: string[]): string | null {
  if (err instanceof ApiError) {
    let unmapped = false;
    for (const d of err.details ?? []) {
      if (fields.includes(d.path)) setError(d.path as Path<T>, { message: d.message });
      else unmapped = true;
    }
    if (!err.details?.length || unmapped) return err.message;
    return null;
  }
  return 'Could not reach the server. Check your connection and try again.';
}

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.';
