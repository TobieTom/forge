import { HeroSceneClient } from './components/HeroSceneClient';
import { MarketTile } from './components/MarketTile';

export type Market = {
  id: string;
  question: string;
  yesPercent: number;
  noPercent: number;
  volume: string;
  traders: number;
  category: string;
  endsAt: string;
};

const MARKETS: Market[] = [
  {
    id: '01',
    question: 'Will SOL close above $100 on May 1, 2026?',
    yesPercent: 67,
    noPercent: 33,
    volume: '$12,480',
    traders: 142,
    category: 'CRYPTO',
    endsAt: 'May 1',
  },
  {
    id: '02',
    question: 'Will Omnipair TVL exceed $10M by June 2026?',
    yesPercent: 45,
    noPercent: 55,
    volume: '$4,320',
    traders: 89,
    category: 'DEFI',
    endsAt: 'Jun 1',
  },
  {
    id: '03',
    question: 'Will BTC reach $200k before end of 2026?',
    yesPercent: 38,
    noPercent: 62,
    volume: '$28,900',
    traders: 334,
    category: 'CRYPTO',
    endsAt: 'Dec 31',
  },
  {
    id: '04',
    question: 'Will ETH ETF staking be approved by Q3?',
    yesPercent: 72,
    noPercent: 28,
    volume: '$8,750',
    traders: 201,
    category: 'REGULATION',
    endsAt: 'Sep 30',
  },
];

const TOTAL_VOLUME = '$54,450';

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <StatusBar />
      <MarketsSection />
    </>
  );
}

/* ── Hero ───────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="hero-section">
      {/* Three.js background */}
      <HeroSceneClient />

      {/* Atmosphere blob 1 — large purple */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '70vw',
          height: '70vw',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Atmosphere blob 2 — green accent */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '10%',
          right: '-20%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,255,135,0.06) 0%, transparent 70%)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* CRT scan lines — barely there */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Stage light ray 1 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -100,
          right: 200,
          width: 2,
          height: 600,
          background:
            'linear-gradient(to bottom, transparent, rgba(124,58,237,0.4), transparent)',
          transform: 'rotate(25deg)',
          filter: 'blur(1px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Stage light ray 2 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -50,
          right: 420,
          width: 1,
          height: 500,
          background:
            'linear-gradient(to bottom, transparent, rgba(124,58,237,0.2), transparent)',
          transform: 'rotate(35deg)',
          filter: 'blur(2px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Stage light ray 3 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -150,
          right: 640,
          width: 1,
          height: 700,
          background:
            'linear-gradient(to bottom, transparent, rgba(124,58,237,0.15), transparent)',
          transform: 'rotate(15deg)',
          filter: 'blur(3px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Bottom fade */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Content — 55/45 left-aligned grid */}
      <div className="hero-layout">
        <div className="hero-text-col">
          {/* Heading */}
          <h1 style={{ margin: 0 }}>
            <span className="hero-heading-solid">PREDICT.</span>
            <span className="hero-heading-outline">WIN.</span>
          </h1>

          {/* Subtext */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: 'var(--text-2)',
              lineHeight: 1.6,
              maxWidth: 440,
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Bet on anything. Every outcome on-chain. Powered by Solana.
          </p>

          {/* Stats row */}
          <div className="stats-row">
            <div className="stat-item">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 32,
                  color: 'var(--white)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {MARKETS.length}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--text-3)',
                }}
              >
                live markets
              </span>
            </div>
            <div className="stat-item">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 32,
                  color: 'var(--white)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {TOTAL_VOLUME}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--text-3)',
                }}
              >
                total volume
              </span>
            </div>
            <div className="stat-item">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 32,
                  color: 'var(--white)',
                  lineHeight: 1,
                }}
              >
                ∞
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--text-3)',
                }}
              >
                market capacity
              </span>
            </div>
          </div>

          {/* CTA row */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              marginTop: 40,
            }}
          >
            <a className="btn-primary" href="#markets">
              TRADE NOW
            </a>
            <a className="btn-secondary" href="#docs">
              HOW IT WORKS
            </a>
          </div>
        </div>

        {/* Right column — empty, Three.js sphere shows through */}
        <div />
      </div>
    </section>
  );
}

/* ── Scrolling ticker ────────────────────────────────────────────── */
const DIA = (
  <span
    aria-hidden="true"
    style={{ color: 'var(--green)', padding: '0 2px' }}
  >
    ◆
  </span>
);

const SEP = (
  <span
    aria-hidden="true"
    style={{ color: 'var(--text-3)', padding: '0 10px' }}
  >
    ·
  </span>
);

function TickerCopy() {
  return (
    <span className="ticker-copy">
      <span>SOL &gt; $100</span>
      {SEP}
      <span>67% YES</span>
      {SEP}
      <span>$12.4K VOL</span>
      {SEP}
      {DIA}
      {SEP}
      <span>OMNIPAIR TVL &gt; $10M</span>
      {SEP}
      <span>45% YES</span>
      {SEP}
      <span>$4.3K VOL</span>
      {SEP}
      {DIA}
      {SEP}
      <span>BTC &gt; $200K</span>
      {SEP}
      <span>38% YES</span>
      {SEP}
      <span>$28.9K VOL</span>
      {SEP}
      {DIA}
      {SEP}
      <span>ETH ETF STAKING</span>
      {SEP}
      <span>72% YES</span>
      {SEP}
      <span>$8.7K VOL</span>
      {SEP}
      {DIA}
      <span style={{ display: 'inline-block', width: 60 }} />
    </span>
  );
}

function Ticker() {
  return (
    <div className="ticker-wrap" aria-hidden="true">
      <div
        className="ticker-track"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-2)',
          letterSpacing: '0.1em',
        }}
      >
        <TickerCopy />
        <TickerCopy />
      </div>
    </div>
  );
}

/* ── Status bar ──────────────────────────────────────────────────── */
const DOT = (
  <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.15)', padding: '0 12px' }}>
    ·
  </span>
);

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <span>SOLANA DEVNET</span>
      {DOT}
      <span>BLOCK 457,831,204</span>
      {DOT}
      <span>LATENCY 23ms</span>
      {DOT}
      <span style={{ color: 'var(--green)' }}>ALL SYSTEMS OPERATIONAL</span>
    </div>
  );
}

/* ── Markets section ─────────────────────────────────────────────── */
function MarketsSection() {
  return (
    <section className="markets-outer" id="markets">
      <div className="markets-glow-left" aria-hidden="true" />
      <div className="markets-glow-right" aria-hidden="true" />
      <div className="markets-floor-line" aria-hidden="true" />

      <div className="page-wrap" style={{ position: 'relative', zIndex: 1 }}>
        <div className="markets-section-header">
          {/* Left: ghost number + label */}
          <div style={{ position: 'relative' }}>
            <span className="markets-ghost-num" aria-hidden="true">
              {String(MARKETS.length).padStart(2, '0')}
            </span>
            <span className="markets-label-text">MARKETS</span>
          </div>

          {/* Right: data pills */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="market-pill">{MARKETS.length} OPEN</span>
            <span className="market-pill">{TOTAL_VOLUME} VOL</span>
            <span className="market-pill market-pill--live">
              <span
                className="blink-dot"
                aria-hidden="true"
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              LIVE
            </span>
          </div>
        </div>

        <div className="markets-grid">
          {MARKETS.map((market, i) => (
            <MarketTile key={market.id} market={market} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
