'use client';

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import Link from 'next/link';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import type { MarketData } from './page';
import { playTick, playConfirm, playHover } from '../../../utils/sounds';
import { mintTestUSDC, getUSDCBalance } from '../../../utils/faucet';

/* ── constants ──────────────────────────────────────────────────── */
const CAT_COLOR: Record<string, string> = {
  CRYPTO: '#7C3AED',
  DEFI: '#00FF87',
  REGULATION: '#FFB800',
};

const RANGES = ['1H', '6H', '24H', '7D', 'ALL'] as const;
type Range = typeof RANGES[number];

const RANGE_POINTS: Record<Range, number> = {
  '1H': 12, '6H': 24, '24H': 48, '7D': 48, 'ALL': 48,
};

/* ── chart data generation ──────────────────────────────────────── */
function generateChartData(points: number, endValue: number): number[] {
  let p = 50;
  const data: number[] = [];
  for (let i = 0; i < points - 1; i++) {
    p += (Math.random() - 0.48) * 3;
    p = Math.max(5, Math.min(95, p));
    data.push(p);
  }
  data.push(endValue);
  return data;
}

/* ── wallet generator ───────────────────────────────────────────── */
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
function randomWallet() {
  const r = (n: number) =>
    Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  return `${r(4)}...${r(4)}`;
}

/* ── countdown ──────────────────────────────────────────────────── */
function Countdown({ resolution }: { resolution: string }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date(resolution).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resolution]);

  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green)', letterSpacing: '0.06em' }}>
      RESOLVES IN: {p(t.d)}D {p(t.h)}H {p(t.m)}M{' '}
      <span style={{ display: 'inline-block', minWidth: 22 }}>{p(t.s)}S</span>
    </span>
  );
}

/* ── probability chart ─────────────────────────────────���────────── */
function ProbabilityChart({ yesPercent }: { yesPercent: number }) {
  const [range, setRange] = useState<Range>('24H');
  const [data, setData] = useState<number[]>([]);
  const pathRef = useRef<SVGPathElement>(null);

  const rebuild = useCallback((r: Range) => {
    setData(generateChartData(RANGE_POINTS[r], yesPercent));
  }, [yesPercent]);

  useEffect(() => { rebuild(range); }, [rebuild, range]);

  useEffect(() => {
    if (!pathRef.current || data.length === 0) return;
    const len = pathRef.current.getTotalLength();
    pathRef.current.style.transition = 'none';
    pathRef.current.style.strokeDasharray = `${len}`;
    pathRef.current.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => {
      if (pathRef.current) {
        pathRef.current.style.transition = 'stroke-dashoffset 1500ms ease-out';
        pathRef.current.style.strokeDashoffset = '0';
      }
    });
  }, [data]);

  // Fix 1: height 280
  const W = 800, H = 280, PL = 44, PR = 60, PT = 12, PB = 28;
  const CW = W - PL - PR, CH = H - PT - PB;
  const toX = (i: number) => PL + (i / (data.length - 1)) * CW;
  const toY = (pv: number) => PT + (1 - pv / 100) * CH;

  const linePath = data.length > 1
    ? data.map((pv, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(pv).toFixed(1)}`).join(' ')
    : '';
  const areaPath = linePath
    ? `${linePath} L${toX(data.length - 1).toFixed(1)},${(PT + CH).toFixed(1)} L${PL},${(PT + CH).toFixed(1)} Z`
    : '';

  const green = yesPercent >= 50;
  const lineColor = green ? '#00FF87' : '#FF3B6B';
  const gradId = `ag-${green ? 'g' : 'r'}`;
  const grad2Id = `ag2-${green ? 'g' : 'r'}`;

  const xLabels = data.map((_, i) => {
    const n = data.length - 1;
    if (i === n) return null; // label handled separately near dot
    if (range === '24H' || range === '1H' || range === '6H') {
      const totalHours = range === '1H' ? 1 : range === '6H' ? 6 : 48;
      const hoursAgo = Math.round((1 - i / n) * totalHours);
      if (i === 0) return { x: toX(i), label: `${totalHours}h` };
      if (hoursAgo % Math.max(1, Math.floor(totalHours / 6)) === 0)
        return { x: toX(i), label: `${hoursAgo}h` };
    } else if (range === '7D') {
      const daysAgo = ((1 - i / n) * 7).toFixed(0);
      if (i === 0) return { x: toX(i), label: '7D' };
      if (i % 12 === 0) return { x: toX(i), label: `${daysAgo}D` };
    } else {
      if (i === 0) return { x: toX(i), label: 'START' };
    }
    return null;
  }).filter(Boolean) as { x: number; label: string }[];

  const last = data.length > 0 ? data[data.length - 1] : yesPercent;
  const dotX = data.length > 0 ? toX(data.length - 1) : 0;
  const dotY = toY(last);

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)', padding: '16px 16px 12px' }}>
      {/* Fix 6: Range selector with active background */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
              color: r === range ? 'var(--white)' : 'var(--text-3)',
              background: r === range ? 'rgba(0,255,135,0.08)' : 'none',
              border: 'none',
              borderBottom: r === range ? '1px solid var(--green)' : '1px solid transparent',
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: 'pointer', transition: 'color 150ms ease, background 150ms ease',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Fix 1: height 280 */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 280, display: 'block', overflow: 'visible' }}>
        <defs>
          {/* Fix 3: area fill opacity 0.35 */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
          {/* Fix 3: second depth gradient */}
          <linearGradient id={grad2Id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fix 7: Y-axis labels — correct font and color */}
        {[0, 25, 50, 75, 100].map(pv => (
          <text key={pv} x={PL - 6} y={toY(pv) + 3.5} textAnchor="end"
            fontSize="9" style={{ fill: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {pv}%
          </text>
        ))}

        {/* Fix 4: Horizontal grid lines at 25, 75 (not 50 — 50 has its own dashed line) */}
        {[25, 75].map(pv => (
          <line key={pv}
            x1={PL} y1={toY(pv)} x2={PL + CW} y2={toY(pv)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}

        {/* Fix 4: 50% dashed line — more visible */}
        <line x1={PL} y1={toY(50)} x2={PL + CW} y2={toY(50)}
          stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" strokeWidth="1"
        />

        {/* Fix 4: Vertical grid lines every 8 data points */}
        {data.map((_, i) => {
          if (i === 0 || i === data.length - 1 || i % 8 !== 0) return null;
          return (
            <line key={`v${i}`}
              x1={toX(i)} y1={PT} x2={toX(i)} y2={PT + CH}
              stroke="rgba(255,255,255,0.03)" strokeWidth="1"
            />
          );
        })}

        {/* Fix 3: Double area fill for depth */}
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {areaPath && <path d={areaPath} fill={`url(#${grad2Id})`} />}

        {/* Fix 2: Line with neon glow filter */}
        {linePath && (
          <path ref={pathRef} d={linePath} fill="none"
            stroke={lineColor} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${lineColor})` }}
          />
        )}

        {/* X-axis labels */}
        {xLabels.map(({ x, label }) => (
          <text key={label} x={x} y={H - 4} textAnchor="middle"
            fontSize="9" style={{ fill: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {label}
          </text>
        ))}

        {/* Fix 5: Current price indicator */}
        {data.length > 0 && (
          <>
            {/* Vertical drop line */}
            <line x1={dotX} y1={dotY} x2={dotX} y2={PT + CH}
              stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" strokeWidth="1"
            />
            {/* Outer ring 14px */}
            <circle cx={dotX} cy={dotY} r="7"
              fill="none" stroke={lineColor} strokeWidth="1" opacity="0.3"
            />
            {/* Inner dot 10px */}
            <circle cx={dotX} cy={dotY} r="5"
              fill={lineColor} style={{ filter: `drop-shadow(0 0 8px ${lineColor})` }}
            />
            {/* Price label */}
            <text x={dotX + 12} y={dotY + 4} fontSize="11"
              style={{ fill: lineColor, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {Math.round(last)}%
            </text>
            {/* NOW label on x-axis */}
            <text x={dotX} y={H - 4} textAnchor="middle"
              fontSize="9" style={{ fill: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              NOW
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/* ── market stats ───────────────────────────────────────────────── */
function MarketStats({ market }: { market: MarketData }) {
  const stats = [
    { label: 'YES PRICE', value: (market.yesPercent / 100).toFixed(2), suffix: ' USDG', color: 'var(--green)' },
    { label: 'NO PRICE', value: (market.noPercent / 100).toFixed(2), suffix: ' USDG', color: 'var(--red)' },
    { label: 'VOLUME', value: `$${market.volume.toLocaleString()}`, suffix: '', color: 'var(--white)' },
    { label: 'TRADERS', value: market.traders.toString(), suffix: '', color: 'var(--white)' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          padding: '16px 20px',
          borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>
            {s.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: s.color, lineHeight: 1 }}>
            {s.value}
            {s.suffix && <span style={{ fontSize: 11, opacity: 0.6 }}>{s.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── activity feed ──────────────────────────────────────────────── */
type TradeEntry = {
  id: number;
  wallet: string;
  outcome: 'YES' | 'NO';
  amount: number;
  createdAt: number;
  fresh: boolean;
};

function ActivityFeed({ yesPercent }: { yesPercent: number }) {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  const counterRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const newTrade = useCallback((): TradeEntry => {
    const yesLead = yesPercent > 50;
    return {
      id: counterRef.current++,
      wallet: randomWallet(),
      outcome: Math.random() < (yesLead ? 0.65 : 0.35) ? 'YES' : 'NO',
      amount: Math.floor(Math.random() * 495) + 5,
      createdAt: Date.now(),
      fresh: true,
    };
  }, [yesPercent]);

  useEffect(() => {
    // Seed initial trades
    const seed = Array.from({ length: 6 }, (_, i): TradeEntry => ({
      id: counterRef.current++,
      wallet: randomWallet(),
      outcome: Math.random() < (yesPercent > 50 ? 0.65 : 0.35) ? 'YES' : 'NO',
      amount: Math.floor(Math.random() * 495) + 5,
      createdAt: Date.now() - (6 - i) * 28000,
      fresh: false,
    }));
    setTrades(seed);

    const schedule = () => {
      timerRef.current = setTimeout(() => {
        const t = newTrade();
        setTrades(prev => {
          const next = [t, ...prev].slice(0, 12);
          return next;
        });
        setTimeout(() => {
          setTrades(prev => prev.map(x => x.id === t.id ? { ...x, fresh: false } : x));
        }, 350);
        schedule();
      }, 3000 + Math.random() * 3000);
    };
    schedule();

    const clockId = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(clockId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const age = (t: number) => {
    const s = Math.floor((now - t) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.15em', marginBottom: 12 }}>
        RECENT ACTIVITY
      </div>
      <div style={{ maxHeight: 264, overflowY: 'auto', overflowX: 'hidden' }}>
        {trades.map(t => (
          <div
            key={t.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 88px 44px 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '7px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              animation: t.fresh ? 'slide-in-top 300ms ease' : 'none',
            }}
          >
            <span style={{ color: 'var(--text-3)' }}>{age(t.createdAt)}</span>
            <span style={{ color: 'var(--text-2)' }}>{t.wallet}</span>
            <span style={{
              color: t.outcome === 'YES' ? 'var(--green)' : 'var(--red)',
              fontWeight: 500,
            }}>
              {t.outcome}
            </span>
            <span style={{ color: 'var(--text-2)' }}>${t.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── mini arc ───────────────────────────────────────────────────── */
function MiniArc({ yesPercent }: { yesPercent: number }) {
  const r = 22, cx = 30, cy = 30;
  const circ = 2 * Math.PI * r;
  const fill = (yesPercent / 100) * circ;
  const color = yesPercent >= 50 ? '#00FF87' : '#FF3B6B';
  return (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 500ms ease, stroke 300ms ease' }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11"
        fill="white" fontFamily="monospace" fontWeight="500">
        {yesPercent}%
      </text>
    </svg>
  );
}

/* ── particles ──────────────────────────────────────────────────── */
type Particle = { id: number; angle: number; dist: number; size: number };

function ParticleBurst({ active, color, burstKey }: { active: boolean; color: string; burstKey: number }) {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (i / 20) * 360 + Math.random() * 18 - 9,
      dist: 80 + Math.random() * 70,
      size: 4 + Math.random() * 4,
    }))
  , [burstKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, overflow: 'visible' }}>
      {particles.map(p => {
        const dx = Math.cos((p.angle * Math.PI) / 180) * p.dist;
        const dy = Math.sin((p.angle * Math.PI) / 180) * p.dist;
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            // @ts-expect-error CSS custom props
            '--pdx': `${dx}px`,
            '--pdy': `${dy}px`,
            animation: 'particle-burst 600ms cubic-bezier(0.16,1,0.3,1) forwards',
          }} />
        );
      })}
    </div>
  );
}

/* ── trading panel ──────────────────────────────────────────────── */
type TradeState = 'idle' | 'loading' | 'success' | 'error';
type FaucetState = 'idle' | 'minting' | 'success' | 'error';

function TradingPanel({ market }: { market: MarketData }) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [tradeState, setTradeState] = useState<TradeState>('idle');
  const [tradeError, setTradeError] = useState('');
  const [burstKey, setBurstKey] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [faucetState, setFaucetState] = useState<FaucetState>('idle');
  const [faucetError, setFaucetError] = useState('');

  const fetchBalance = useCallback(async () => {
    if (!wallet.publicKey) { setBalance(null); return; }
    const b = await getUSDCBalance(connection, wallet.publicKey);
    setBalance(b);
  }, [connection, wallet.publicKey]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const handleFaucet = async () => {
    if (faucetState !== 'idle') return;
    setFaucetState('minting');
    setFaucetError('');
    try {
      await mintTestUSDC(connection, wallet);
      setFaucetState('success');
      await fetchBalance();
      setTimeout(() => setFaucetState('idle'), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      setFaucetError(msg.length > 36 ? msg.slice(0, 33) + '...' : msg);
      setFaucetState('error');
      setTimeout(() => { setFaucetState('idle'); setFaucetError(''); }, 3000);
    }
  };

  const price = outcome === 'YES' ? market.yesPercent / 100 : market.noPercent / 100;
  const amt = parseFloat(amount) || 0;
  const shares = amt > 0 ? (amt / price).toFixed(2) : '—';
  const maxWin = amt > 0 ? `$${(amt / price).toFixed(2)}` : '—';
  const impact = amt > 0 ? `${(amt / 1000 * 2).toFixed(1)}%` : '—';

  const yesSelected = outcome === 'YES';
  const noSelected = outcome === 'NO';

  const burstColor = yesSelected ? '#00FF87' : '#FF3B6B';

  const selectOutcome = (o: 'YES' | 'NO') => {
    playTick();
    setOutcome(o);
  };

  const handleTrade = () => {
    if (tradeState !== 'idle') return;
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setTradeState('error');
      setTradeError('Enter an amount first');
      setTimeout(() => setTradeState('idle'), 2000);
      return;
    }
    setTradeState('loading');
    setTimeout(() => {
      setTradeState('success');
      playConfirm();
      setBurstKey(k => k + 1);
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 700);
      setTimeout(() => setTradeState('idle'), 2000);
    }, 1500);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      position: 'sticky',
      top: 80,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--white)', letterSpacing: '0.05em' }}>
          PLACE BET
        </span>
        <MiniArc yesPercent={market.yesPercent} />
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: 20 }}>
        BALANCE: {balance === null ? '—' : `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
      </div>

      {/* Outcome selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => selectOutcome('YES')}
          onMouseEnter={playHover}
          onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
          style={{
            height: 64, borderRadius: 8, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
            background: yesSelected ? 'rgba(0,255,135,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${yesSelected ? 'var(--green)' : 'var(--border)'}`,
            boxShadow: yesSelected ? '0 0 20px rgba(0,255,135,0.2)' : 'none',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em', color: yesSelected ? 'var(--green)' : 'var(--text-3)' }}>
            YES
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--white)', fontVariantNumeric: 'tabular-nums' }}>
            {market.yesPercent}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => selectOutcome('NO')}
          onMouseEnter={playHover}
          onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
          style={{
            height: 64, borderRadius: 8, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
            background: noSelected ? 'rgba(255,59,107,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${noSelected ? 'var(--red)' : 'var(--border)'}`,
            boxShadow: noSelected ? '0 0 20px rgba(255,59,107,0.2)' : 'none',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em', color: noSelected ? 'var(--red)' : 'var(--text-3)' }}>
            NO
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--white)', fontVariantNumeric: 'tabular-nums' }}>
            {market.noPercent}%
          </span>
        </button>
      </div>

      {/* Amount input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 8 }}>
          AMOUNT (USDG)
        </div>
        <input
          type="number"
          className="trade-amount-input"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
        />
        {/* Faucet */}
        <button
          type="button"
          onClick={handleFaucet}
          disabled={faucetState !== 'idle' || !wallet.connected}
          style={{
            width: '100%', height: 36, marginTop: 8,
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em',
            background: faucetState === 'error' ? 'rgba(255,59,107,0.06)' : 'transparent',
            color: faucetState === 'error' ? 'var(--red)' : '#FFB800',
            border: `1px solid ${faucetState === 'error' ? 'rgba(255,59,107,0.3)' : 'rgba(245,166,35,0.3)'}`,
            borderRadius: 6, cursor: faucetState === 'idle' && wallet.connected ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'border-color 150ms ease, background 150ms ease',
            opacity: !wallet.connected ? 0.4 : 1,
          }}
          onMouseEnter={e => {
            if (faucetState === 'idle' && wallet.connected) {
              (e.currentTarget as HTMLElement).style.borderColor = '#FFB800';
              (e.currentTarget as HTMLElement).style.background = 'rgba(245,166,35,0.08)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,166,35,0.3)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {faucetState === 'minting' ? (
            <>
              <span style={{ width: 10, height: 10, border: '1.5px solid rgba(255,184,0,0.3)', borderTopColor: '#FFB800', borderRadius: '50%', display: 'inline-block', animation: 'spin 700ms linear infinite' }} />
              MINTING...
            </>
          ) : faucetState === 'success' ? (
            '✓ 50,000 USDC ADDED'
          ) : faucetState === 'error' ? (
            faucetError || 'TRANSACTION FAILED'
          ) : (
            'GET 50K TEST USDC'
          )}
        </button>

        {/* Quick amounts */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {['10', '50', '100', '500'].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              style={{
                flex: 1, height: 28,
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 4, cursor: 'pointer',
                transition: 'border-color 150ms ease, color 150ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple)';
                (e.currentTarget as HTMLElement).style.color = 'var(--white)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
              }}
            >
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* Price impact display */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 1, marginBottom: 20,
        background: 'var(--border)', borderRadius: 8, overflow: 'hidden',
      }}>
        {[
          { label: 'SHARES', value: shares },
          { label: 'AVG PRICE', value: price.toFixed(3) },
          { label: 'MAX WIN', value: maxWin },
          { label: 'PRICE IMPACT', value: impact },
        ].map((item, i) => (
          <div key={item.label} style={{
            padding: '10px 12px',
            background: 'rgba(8,0,16,1)',
            borderRadius: i === 0 ? '8px 0 0 0' : i === 1 ? '0 8px 0 0' : i === 2 ? '0 0 0 8px' : '0 0 8px 0',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Trade button */}
      <div style={{ position: 'relative' }}>
        <ParticleBurst active={showBurst} color={burstColor} burstKey={burstKey} />
        <button
          type="button"
          onClick={handleTrade}
          disabled={tradeState !== 'idle'}
          style={{
            width: '100%', height: 52,
            background: tradeState === 'success'
              ? 'linear-gradient(135deg, #00FF87 0%, #00CC6A 100%)'
              : tradeState === 'error'
              ? 'linear-gradient(135deg, rgba(255,59,107,0.8) 0%, rgba(200,30,80,0.8) 100%)'
              : 'linear-gradient(135deg, var(--purple) 0%, var(--purple-bright) 100%)',
            color: 'white', border: 'none', borderRadius: 8,
            fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.05em',
            cursor: tradeState === 'idle' ? (amt > 0 ? 'pointer' : 'not-allowed') : 'default',
            boxShadow: tradeState === 'success'
              ? '0 0 30px rgba(0,255,135,0.4)'
              : tradeState === 'error'
              ? '0 0 20px rgba(255,59,107,0.3)'
              : '0 0 30px var(--purple-glow)',
            opacity: tradeState === 'idle' && amt <= 0 ? 0.5 : 1,
            transition: 'box-shadow 300ms ease, background 300ms ease, filter 200ms ease, opacity 200ms ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => {
            if (tradeState === 'idle' && amt > 0)
              (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)';
          }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
        >
          {tradeState === 'loading' ? (
            <>
              <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 700ms linear infinite' }} />
              CONFIRMING...
            </>
          ) : tradeState === 'success' ? (
            '✓ BET PLACED'
          ) : tradeState === 'error' ? (
            tradeError
          ) : (
            `BUY ${outcome} →`
          )}
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
        DEVNET ONLY · FORGE PROTOCOL v0.1
      </div>
    </div>
  );
}

/* ── page header ────────────────────────────────────────────────── */
function PageHeader({ market }: { market: MarketData }) {
  const catColor = CAT_COLOR[market.category] ?? 'var(--text-3)';
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link
          href="/#markets"
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)',
            letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 150ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
        >
          ← MARKETS
        </Link>
        <span style={{ color: 'var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: catColor, letterSpacing: '0.08em' }}>
          {market.category}
        </span>
      </div>

      {/* Question */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--white)',
        lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '0.01em',
        maxWidth: 720,
      }}>
        {market.question}
      </h1>

      {/* Countdown */}
      <Countdown resolution={market.resolution} />
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────── */
export function TradePageClient({ market, id }: { market: MarketData; id: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 80,
      background: `radial-gradient(ellipse 60% 80% at 75% 20%, rgba(124,58,237,0.08) 0%, transparent 60%)`,
    }}>
      {/* Subtle atmosphere */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse 40% 60% at 70% 50%, rgba(124,58,237,0.05) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px',
      }}>
        <PageHeader market={market} />

        {/* Two-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '65fr 35fr',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ProbabilityChart yesPercent={market.yesPercent} />
            <MarketStats market={market} />
            <ActivityFeed yesPercent={market.yesPercent} />
          </div>

          {/* RIGHT */}
          <TradingPanel market={market} />
        </div>
      </div>
    </div>
  );
}
