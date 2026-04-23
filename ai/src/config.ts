export const API_PORT = parseInt(process.env["AI_API_PORT"] ?? "3001", 10);
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
export const TERMINATED_TTL_MS = 5 * 60 * 1000;
export const SWEEP_INTERVAL_MS = 30 * 1000;
