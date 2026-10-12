import { syncRiftboundPrices } from './prices.js';

// The public Worker account stays read-only. Scheduled jobs require a separate
// binding and explicit enable flag; credentials and upstream errors never log.
export async function scheduledPriceSync(event, env, database, sync = syncRiftboundPrices) {
  if (env.PRICE_SYNC_ENABLED !== 'true') return { status: 'disabled' };
  if (!env.TCG_API_KEY || !env.SYNC_HYPERDRIVE?.connectionString) throw new Error('Scheduled sync is not configured');
  const now = new Date(event.scheduledTime ?? Date.now());
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid scheduled date');
  const date = now.toISOString().slice(0,10);
  return database({ HYPERDRIVE: env.SYNC_HYPERDRIVE }, async db => {
    const lease = await db.query(`INSERT INTO riftbound.sync_leases (sync_date,started_at,expires_at,attempts,requests)
      VALUES ($1,now(),now()+interval '30 minutes',1,0)
      ON CONFLICT (sync_date) DO UPDATE SET started_at=now(),expires_at=now()+interval '30 minutes',attempts=riftbound.sync_leases.attempts+1
      WHERE riftbound.sync_leases.completed_at IS NULL AND riftbound.sync_leases.expires_at < now()
        AND riftbound.sync_leases.attempts < 3 AND riftbound.sync_leases.requests < 80
      RETURNING attempts,requests`, [date]);
    if (!lease.rows.length) return { status: 'skipped' };
    const { attempts,requests }=lease.rows[0];
    const beforeRequest=async () => {
      const reserved=await db.query(`UPDATE riftbound.sync_leases SET requests=requests+1
        WHERE sync_date=$1 AND attempts=$2 AND completed_at IS NULL AND expires_at>now() AND requests<80 RETURNING requests`,[date,attempts]);
      if (!reserved.rows.length) throw new Error('Scheduled request budget or lease exhausted');
    };
    const result=await sync(db,env.TCG_API_KEY,{now,beforeRequest,requestBudget:80-requests,signal:AbortSignal.timeout(240000)});
    await db.query(`UPDATE riftbound.sync_leases SET completed_at=now() WHERE sync_date=$1 AND attempts=$2`,[date,attempts]);
    return {status:'completed',inserted:result.inserted};
  });
}
