import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SCRAPERS } from '@/lib/scrapers';

export const maxDuration = 60;

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  // Runs at 00:00 IST, so the totals belong to the day that just ended.
  const date = new Date(Date.now() - 3600e3).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const { data } = await db.from('profiles').select('*');
  const profiles = (data ?? []) as { platform: string; handle: string }[];
  const results = await Promise.allSettled(
    profiles.map(async (p) => {
      const total = await SCRAPERS[p.platform](p.handle);
      const { error } = await db.from('snapshots').upsert({ date, platform: p.platform, total });
      if (error) throw error;
      return { platform: p.platform, total };
    })
  );
  return NextResponse.json({
    date,
    results: results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { platform: profiles[i].platform, error: String(r.reason) }
    ),
  });
}
