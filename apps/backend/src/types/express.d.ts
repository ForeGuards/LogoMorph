import '@clerk/express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        orgId?: string;
        orgRole?: string;
        orgSlug?: string;
      };
    }
  }
}
