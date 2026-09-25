// server/workers/syncWorker.js – Claims and processes queued Gmail sync jobs.
//
// Jobs live in PostgreSQL (sync_jobs) and are claimed atomically with
// FOR UPDATE SKIP LOCKED, so any number of API instances can run this worker
// concurrently without ever processing the same job twice. A job whose worker
// dies is recovered by the stale-lock reaper instead of being lost.
import crypto from 'crypto';
import { EmailSyncRepo } from '../repositories/emailSync.repo.js';
import { processSyncJob } from '../services/gmail.service.js';
import { workerBus, JOB_QUEUED } from '../lib/workerBus.js';

const WORKER_ID = `worker-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;

// Cap one drain so a large backlog cannot monopolise the event loop forever.
const MAX_JOBS_PER_DRAIN = 10;
// How often the reaper looks for jobs abandoned by a dead worker.
const REAPER_INTERVAL_MS = 60_000;

let timer = null;
let running = false;
let draining = false;
let lastReapedAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function reapStaleJobs() {
  const staleAfter = Number(process.env.SYNC_WORKER_STALE_MINUTES) || 5;
  lastReapedAt = Date.now();
  const requeued = await EmailSyncRepo.requeueStaleJobs(staleAfter);
  if (requeued > 0) {
    console.log(`[sync-worker] recovered ${requeued} abandoned job(s)`);
  }
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    for (let i = 0; i < MAX_JOBS_PER_DRAIN; i++) {
      const job = await EmailSyncRepo.claimNextJob(WORKER_ID);
      if (!job) break;
      try {
        await processSyncJob(job);
      } catch (err) {
        // processSyncJob already recorded the failure on the job row.
        console.error(`[sync-worker] job ${job.id} failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[sync-worker] drain error: ${err.message}`);
  } finally {
    draining = false;
  }
}

/** Start the polling loop. Safe to call once at boot; idempotent. */
export function startSyncWorker() {
  if (running) return;
  running = true;

  const pollMs = Math.max(500, Number(process.env.SYNC_WORKER_POLL_MS) || 2000);

  // Recover work abandoned by a previous process before taking anything new.
  reapStaleJobs().catch((err) =>
    console.error(`[sync-worker] stale reaper failed: ${err.message}`)
  );

  // A queued job should not wait for the next tick.
  workerBus.on(JOB_QUEUED, () => {
    void drain();
  });

  const tick = async () => {
    if (Date.now() - lastReapedAt > REAPER_INTERVAL_MS) {
      await reapStaleJobs().catch(() => {});
    }
    await drain();
    if (running) timer = setTimeout(tick, pollMs);
  };
  timer = setTimeout(tick, 0);

  console.log(`[sync-worker] started (id=${WORKER_ID}, poll=${pollMs}ms)`);
}

/** Stop the loop. In-flight jobs finish; the reaper recovers them if needed. */
export function stopSyncWorker() {
  running = false;
  if (timer) clearTimeout(timer);
  timer = null;
  workerBus.removeAllListeners(JOB_QUEUED);
}
