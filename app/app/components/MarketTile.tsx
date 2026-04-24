'use client';

import { useRef, useEffect, useState } from 'react';
import type { Market } from '../page';

const CAT_COLOR: Record<string, string> = {
  CRYPTO: '#7C3AED',
  DEFI: '#00FF87',
  REGULATION: '#FFB800',
};

function VolIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ color: 'var(--text-3)', flexShrink: 0 }}
    >
      <rect x="0" y="7" width="2" height="5" fill="currentColor" />
      <rect x="3" y="4" width="2" height="8" fill="currentColor" />
      <rect x="6" y="2" width="2" height="10" fill="currentColor" />
      <rect x="9" y="5" width="2" height="7" fill="currentColor" />
    </svg>
  );
}

export function MarketTile({ market, index }: { market: Market; index: number }) {
  const { id, question, yesPercent, noPercent, volume, traders, category, endsAt } = market;

  const catColor = CAT_COLOR[category] ?? 'var(--text-3)';
  const yesLeading = yesPercent >= 50;
  const leadingColor = yesLeading ? 'var(--green)' : 'var(--red)';
  const cardGlow = yesLeading ? 'rgba(0,255,135,0.12)' : 'rgba(255,59,107,0.12)';
  const cardGlowStrong = yesLeading ? 'rgba(0,255,135,0.15)' : 'rgba(255,59,107,0.15)';

  const tileRef = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <a
      ref={tileRef}
      href={`/markets/market-${id}`}
      className="market-card"
      onMouseMove={handleMouseMove}
      style={{
        '--card-glow': cardGlow,
        '--card-glow-strong': cardGlowStrong,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${index * 100}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${index * 100}ms`,
      } as React.CSSProperties}
    >
      {/* Tapered leading-outcome left border */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: `linear-gradient(to bottom, transparent, ${leadingColor} 20%, ${leadingColor} 80%, transparent)`,
          zIndex: 2,
        }}
      />

      {/* 1. HEADER BAND */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: catColor,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              color: catColor,
              letterSpacing: '0.15em',
            }}
          >
            {category}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
          ENDS {endsAt.toUpperCase()}
        </span>
      </div>

      {/* 2. QUESTION AREA */}
      <div className="card-z" style={{ padding: '20px 16px 12px' }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--white)',
            lineHeight: 1.4,
            margin: '0 0 8px',
          }}
        >
          {question}
        </p>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-3)',
            letterSpacing: '0.08em',
          }}
        >
          CREATED BY FORGE PROTOCOL
        </span>
      </div>

      {/* 3. ODDS SECTION */}
      <div className="card-z" style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
        <button type="button" className="card-bet card-bet--yes">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--green)',
              letterSpacing: '0.15em',
              marginBottom: 4,
              display: 'block',
            }}
          >
            YES
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 36,
              color: 'var(--white)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {yesPercent}%
          </span>
        </button>

        <button type="button" className="card-bet card-bet--no">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--red)',
              letterSpacing: '0.15em',
              marginBottom: 4,
              display: 'block',
            }}
          >
            NO
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 36,
              color: 'var(--white)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {noPercent}%
          </span>
        </button>
      </div>

      {/* 4. MARKET FOOTER */}
      <div className="card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <VolIcon />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
            VOL {volume}
          </span>
        </div>

        {/* Mini probability bar */}
        <div style={{ width: 80, height: 3, borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
          <div
            style={{
              width: `${yesPercent}%`,
              background: 'linear-gradient(to right, var(--green), rgba(0,255,135,0.5))',
            }}
          />
          <div style={{ flex: 1, background: 'rgba(255,59,107,0.4)' }} />
        </div>

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
          {traders} traders
        </span>
      </div>
    </a>
  );
}
