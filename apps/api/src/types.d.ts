import type { AuthState } from './middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: AuthState;
    }
  }
}
export {};
