'use client';
import { useEffect, useMemo, useState } from 'react';
import { Flame, Dumbbell, Check, Plus, Zap, Skull } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getSupabaseClient } from '@/lib/supabase';

const BOX = 'border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5';
const BTN = 'border-4 border-black font-display text-xl uppercase px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none';

const PLATFORMS: Record<string, { label: string; color: string; fg: string; span: string }> = {
  leetcode: { label: 'LeetCode', color: '#FF6A00', fg: '#000', span: 'lg:col-span-4' },
  codingninjas: { label: 'Coding Ninjas', color: '#22C55E', fg: '#000', span: 'lg:col-span-2' },
  codechef: { label: 'CodeChef', color: '#1F2937', fg: '#fff', span: 'lg:col-span-2' },
  gfg: { label: 'GFG', color: '#FACC15', fg: '#000', span: 'lg:col-span-2' },
  tuf: { label: 'TakeUForward', color: '#06B6D4', fg: '#000', span: 'lg:col-span-2' },
};
const KEYS = Object.keys(PLATFORMS);
const TITLES = ['Rookie', 'Script Kiddie', 'Loop Wrangler', 'Array Slayer', 'Graph Goblin', 'DSA Warrior', 'DP Demon', 'Grandmaster'];

type Snap = { date: string; platform: string; total: number };
type Task = { id: string; title: string; date: string; done: boolean };

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const addDays = (d: string, n: number) => {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const dow = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay();
const streak = (days: Set<string>) => {
  let d = today();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
};

export default function Page() {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [gym, setGym] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState('');
  const [range, setRange] = useState(7);
  const [loading, setLoading] = useState(() => Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));
  const [error, setError] = useState<string | null>(() =>
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? null
      : 'Connect Supabase by setting NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
  const T = today();

  useEffect(() => {
    (async () => {
      const client = getSupabaseClient();
      if (!client) {
        setError('Connect Supabase by setting NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }

      try {
        const [s, t, g] = await Promise.all([
          client.from('snapshots').select('*').order('date'),
          client.from('tasks').select('*').eq('date', T),
          client.from('gym_logs').select('date'),
        ]);
        const failure = s.error ?? t.error ?? g.error;
        if (failure) throw failure;
        setSnaps((s.data ?? []) as Snap[]);
        setTasks((t.data ?? []) as Task[]);
        setGym(new Set((g.data ?? []).map((r) => r.date)));
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not load tracker data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [T]);

  // daily delta per platform: total today minus total on the previous snapshot
  const { byDay, totals } = useMemo(() => {
    const byDay: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};
    for (const p of KEYS) {
      let prev: number | null = null;
      for (const s of snaps.filter((x) => x.platform === p)) {
        if (prev !== null && s.total > prev) (byDay[s.date] ??= {})[p] = s.total - prev;
        prev = s.total;
        totals[p] = s.total;
      }
    }
    return { byDay, totals };
  }, [snaps]);

  const grand = KEYS.reduce((a, k) => a + (totals[k] ?? 0), 0);
  const level = Math.floor(grand / 50) + 1;
  const solveStreak = streak(new Set(Object.keys(byDay)));
  const gymStreak = streak(gym);

  const done = tasks.filter((t) => t.done).length;
  const quote =
    tasks.length === 0 ? 'EMPTY BOARD! Add a task and make some noise.'
    : done === tasks.length ? 'ALL DONE! The leaderboard fears you. 💥'
    : done === 0 ? 'ZERO tasks done. The couch is winning. 🛋️'
    : `${done}/${tasks.length} down. Finish the rest, hero! ⚡`;

  async function addTask() {
    if (!draft.trim()) return;
    const client = getSupabaseClient();
    if (!client) return;
    const { data, error: insertError } = await client.from('tasks').insert({ title: draft.trim(), date: T }).select().single();
    if (insertError) { setError(insertError.message); return; }
    if (data) setTasks([...tasks, data as Task]);
    setDraft('');
  }
  async function setGymDay(date: string, on: boolean) {
    const client = getSupabaseClient();
    if (!client) return;
    const { error: gymError } = on
      ? await client.from('gym_logs').upsert({ date })
      : await client.from('gym_logs').delete().eq('date', date);
    if (gymError) { setError(gymError.message); return; }
    setGym((g) => { const n = new Set(g); on ? n.add(date) : n.delete(date); return n; });
  }
  async function toggleTask(t: Task) {
    const client = getSupabaseClient();
    if (!client) return;
    const { error: taskError } = await client.from('tasks').update({ done: !t.done }).eq('id', t.id);
    if (taskError) { setError(taskError.message); return; }
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)));
    if (!t.done && /gym/i.test(t.title)) setGymDay(t.date, true); // completing a "gym" task logs attendance
  }

  // heatmap: 26 weeks, columns = weeks, rows = weekdays
  const heat = useMemo(() => {
    let d = addDays(T, -175);
    d = addDays(d, -dow(d));
    const out: string[] = [];
    for (; d <= T; d = addDays(d, 1)) out.push(d);
    return out;
  }, [T]);
  const tile = (d: string) => {
    const ps = Object.keys(byDay[d] ?? {});
    if (!ps.length) return '#fff';
    if (ps.length === 1) return PLATFORMS[ps[0]].color;
    return `linear-gradient(135deg, ${ps.map((p, i) => `${PLATFORMS[p].color} ${(i * 100) / ps.length}% ${((i + 1) * 100) / ps.length}%`).join(',')})`;
  };

  const chart = Array.from({ length: range }, (_, i) => {
    const d = addDays(T, i - range + 1);
    return { d: d.slice(5), ...Object.fromEntries(KEYS.map((k) => [k, byDay[d]?.[k] ?? 0])) };
  });

  // gym calendar for the current month
  const [y, m] = T.split('-').map(Number);
  const monthDays = new Date(y, m, 0).getDate();
  const offset = dow(`${y}-${String(m).padStart(2, '0')}-01`);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5">
      <section className={`${BOX} bg-pink-500 md:col-span-6 lg:col-span-8 relative`}>
        <h1 className="font-display text-5xl md:text-7xl uppercase leading-none">POW! Grind Tracker</h1>
        <p className="mt-4 inline-block bg-white border-4 border-black px-4 py-2 font-bold rounded-[2rem] rounded-bl-none">{quote}</p>
        {loading && <p role="status" className="mt-3 font-bold">Loading your tracker…</p>}
        {error && <p role="alert" className="mt-3 border-2 border-black bg-white p-2 font-bold">{error}</p>}
      </section>

      <section className={`${BOX} bg-cyan-300 md:col-span-6 lg:col-span-4`}>
        <div className="font-display text-4xl">LEVEL {level}</div>
        <div className="font-bold text-lg">{TITLES[Math.min(Math.floor(level / 4), TITLES.length - 1)]}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center font-bold">
          <div className="bg-white border-4 border-black p-1"><Zap className="mx-auto" />{grand}<br />solved</div>
          <div className="bg-white border-4 border-black p-1"><Flame className="mx-auto" />{solveStreak}d<br />code</div>
          <div className="bg-white border-4 border-black p-1"><Dumbbell className="mx-auto" />{gymStreak}d<br />gym</div>
        </div>
      </section>

      {KEYS.map((k) => (
        <section key={k} className={`${BOX} md:col-span-3 ${PLATFORMS[k].span}`} style={{ background: PLATFORMS[k].color, color: PLATFORMS[k].fg }}>
          <div className="font-bold uppercase">{PLATFORMS[k].label}</div>
          <div className="font-display text-6xl">{totals[k] ?? 0}</div>
          <span className="inline-block bg-white text-black border-2 border-black px-2 font-bold text-sm">
            +{Object.keys(byDay).filter((d) => d >= addDays(T, -6)).reduce((a, d) => a + (byDay[d][k] ?? 0), 0)} this week
          </span>
        </section>
      ))}

      <section className={`${BOX} bg-white md:col-span-6 lg:col-span-8 overflow-x-auto`}>
        <h2 className="font-display text-3xl mb-3">HEATMAP</h2>
        <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
          {heat.map((d) => (
            <div key={d} title={`${d}: ${JSON.stringify(byDay[d] ?? {})}`} className="w-6 h-6 border-2 border-black" style={{ background: tile(d) }} />
          ))}
        </div>
      </section>

      <section className={`${BOX} bg-orange-300 md:col-span-6 lg:col-span-4`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-display text-3xl">VELOCITY</h2>
          <div className="flex gap-2">
            {[7, 30].map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`${BTN} text-base py-0 ${range === r ? 'bg-black text-white' : 'bg-white'}`}>{r}D</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart}>
            <XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} width={24} /><Tooltip />
            {KEYS.map((k) => <Bar key={k} dataKey={k} stackId="a" fill={PLATFORMS[k].color} stroke="#000" />)}
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className={`${BOX} bg-lime-300 md:col-span-6 lg:col-span-7`}>
        <h2 className="font-display text-3xl mb-3">TODAY&apos;S MISSIONS</h2>
        <div className="flex gap-2 mb-4">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="New mission… (say “gym” to auto-log attendance)" className="flex-1 border-4 border-black p-3 font-bold text-lg" />
          <button onClick={addTask} className={`${BTN} bg-yellow-300`}><Plus /></button>
        </div>
        <div className="grid gap-4">
          {tasks.map((t) => (
            <button key={t.id} onClick={() => toggleTask(t)}
              className={`${BOX} text-left flex items-center justify-between text-2xl font-bold ${t.done ? 'bg-green-400' : 'bg-red-400'}`}>
              <span className={t.done ? 'line-through' : ''}>{t.title}</span>
              {t.done ? <Check size={40} strokeWidth={5} />
                : <span className="bg-yellow-300 border-4 border-black px-2 text-base flex items-center gap-1"><Skull size={18} />PENDING!</span>}
            </button>
          ))}
        </div>
      </section>

      <section className={`${BOX} bg-white md:col-span-6 lg:col-span-5`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-3xl">GYM CALENDAR</h2>
          <button onClick={() => setGymDay(T, !gym.has(T))} className={`${BTN} ${gym.has(T) ? 'bg-green-400' : 'bg-pink-400'}`}>
            {gym.has(T) ? 'Gym done ✔' : 'Gym done?'}
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-bold">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((c, i) => <div key={i}>{c}</div>)}
          {Array.from({ length: offset }, (_, i) => <div key={'o' + i} />)}
          {Array.from({ length: monthDays }, (_, i) => {
            const d = `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            return (
              <button key={d} onClick={() => setGymDay(d, !gym.has(d))}
                className={`aspect-square border-2 border-black flex items-center justify-center ${gym.has(d) ? 'bg-pink-500' : 'bg-white'} ${d === T ? 'ring-4 ring-black' : ''}`}>
                {gym.has(d) ? <Dumbbell size={18} /> : i + 1}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
