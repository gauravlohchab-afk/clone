import { ApiError } from '@vyro/shared';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.';

export function applyApiError<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: string[]): string | null {
  if (!(err instanceof ApiError)) return errorMessage(err);
  let unmapped = !err.details?.length;
  for (const d of err.details ?? []) {
    if (fields.includes(d.path)) setError(d.path as Path<T>, { message: d.message });
    else unmapped = true;
  }
  return unmapped ? err.message : null;
}
