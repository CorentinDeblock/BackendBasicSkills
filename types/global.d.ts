declare namespace Express {
  interface Request {
    user?: { id: string } | undefined;
  }
  interface Response {
    success: (message: string, payload?: unknown) => void;
  }
}
