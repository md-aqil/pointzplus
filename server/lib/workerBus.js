// server/lib/workerBus.js – Tiny event bus so request handlers can nudge the
// background worker without importing it (avoids a service <-> worker cycle).
import { EventEmitter } from 'events';

// Emitted when a new job is queued; the sync worker listens and drains early
// instead of waiting for its next poll tick.
export const workerBus = new EventEmitter();
export const JOB_QUEUED = 'job:queued';

export function notifyJobQueued() {
  workerBus.emit(JOB_QUEUED);
}
