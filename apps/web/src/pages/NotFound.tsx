import { Link } from 'react-router';
export function NotFound({ message = "This page doesn't exist." }: { message?: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-bold text-link">404</p>
      <p className="mt-3 text-muted">{message}</p>
      <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold">Go home</Link>
    </div>
  );
}
