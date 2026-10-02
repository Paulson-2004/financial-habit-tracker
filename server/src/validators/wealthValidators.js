import { z } from 'zod';

// Bounds how much snapshot history a single response can carry - not client-configurable
// for Day 4 (no query params needed; see docs/api.md).
export const MAX_SNAPSHOT_HISTORY = 90;
