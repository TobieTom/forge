'use client';

import { useState } from 'react';
import Link from 'next/link';

type FormState = 'idle' | 'loading' | 'success';
type FormErrors = Partial<Record<'question' | 'resolution' | 'subsidy', string>>;

function randomHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-3)',
  letterSpacing: '0.15em',
  display: 'block',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '14px 16px',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  color: 'var(--white)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 28,
};

export default function CreateMarketPage() {
  const [question, setQuestion] = useState('');
  const [resolution, setResolution] = useState('');
  const [subsidy, setSubsidy] = useState('10.00');
  const [fee, setFee] = useState('30');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [marketId, setMarketId] = useState('');

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--purple)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!question.trim()) e.question = 'Question is required';
    if (!resolution || resolution < tomorrow()) e.resolution = 'Resolution date must be in the future';
    const s = parseFloat(subsidy);
    if (!subsidy || isNaN(s) || s < 1) e.subsidy = 'Minimum subsidy is 1 USDG';
    return e;
  };

  const handleSubmit = () => {
    if (formState !== 'idle') return;
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setFormState('loading');
    setTimeout(() => {
      setMarketId(`0x${randomHex(8)}...${randomHex(6)}`);
      setFormState('success');
    }, 2000);
  };

  if (formState === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        paddingTop: 100,
        background: 'radial-gradient(ellipse 60% 80% at 50% 20%, rgba(124,58,237,0.08) 0%, transparent 60%)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 680, padding: '0 24px 80px' }}>
          <div style={{
            background: 'rgba(0,255,135,0.04)',
            border: '1px solid rgba(0,255,135,0.2)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            animation: 'slide-in-top 400ms cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 48,
              color: 'var(--green)',
              letterSpacing: '0.05em',
              marginBottom: 12,
            }}>
              MARKET CREATED
            </div>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-2)',
              lineHeight: 1.6,
              margin: '0 0 28px',
            }}>
              Your market will be live on devnet once wallet integration is complete.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 32,
              textAlign: 'left',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 6 }}>
                MARKET ID
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--purple-bright)', letterSpacing: '0.04em' }}>
                {marketId}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link
                href="/markets/market-01"
                style={{
                  height: 44,
                  padding: '0 28px',
                  background: 'linear-gradient(135deg, var(--purple) 0%, var(--purple-bright) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  boxShadow: '0 0 24px var(--purple-glow)',
                }}
              >
                VIEW MARKET
              </Link>
              <button
                type="button"
                onClick={() => { setFormState('idle'); setQuestion(''); setResolution(''); setSubsidy('10.00'); setFee('30'); setMarketId(''); }}
                style={{
                  height: 44,
                  padding: '0 24px',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 100,
      background: 'radial-gradient(ellipse 60% 80% at 50% 20%, rgba(124,58,237,0.08) 0%, transparent 60%)',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Devnet notice */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.7 }}>
          Devnet only · Wallet integration in progress · Markets deploy to program{' '}
          J6tbrmGmpQ7bskpUB2DXcjjDp4VwVs78haXQ7FqZ1CUi
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 48,
          color: 'var(--white)',
          letterSpacing: '0.03em',
          margin: '0 0 40px',
          lineHeight: 1,
        }}>
          CREATE A MARKET
        </h1>

        {/* ── QUESTION ─────────────────────────────────────────── */}
        <div style={fieldStyle}>
          <label style={labelStyle}>WHAT ARE YOU PREDICTING?</label>
          <textarea
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Will SOL close above $150 by end of 2026?"
            style={{
              ...inputStyle,
              resize: 'vertical',
              lineHeight: 1.5,
              borderColor: errors.question ? 'var(--red)' : 'var(--border)',
            }}
          />
          {errors.question && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', marginTop: 6 }}>
              {errors.question}
            </div>
          )}
        </div>

        {/* ── OUTCOMES ─────────────────────────────────────────── */}
        <div style={fieldStyle}>
          <label style={labelStyle}>OUTCOMES</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['YES', 'NO'] as const).map(o => (
              <div
                key={o}
                style={{
                  height: 44,
                  padding: '0 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  background: o === 'YES' ? 'rgba(0,255,135,0.08)' : 'rgba(255,59,107,0.08)',
                  border: `1px solid ${o === 'YES' ? 'rgba(0,255,135,0.25)' : 'rgba(255,59,107,0.25)'}`,
                  gap: 2,
                  userSelect: 'none',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: o === 'YES' ? 'var(--green)' : 'var(--red)',
                  letterSpacing: '0.15em',
                }}>
                  {o}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Binary markets only. Multi-outcome coming soon.
          </p>
        </div>

        {/* ── RESOLUTION DATE ──────────────────────────────────── */}
        <div style={fieldStyle}>
          <label style={labelStyle}>RESOLVES ON</label>
          <input
            type="date"
            value={resolution}
            min={tomorrow()}
            onChange={e => setResolution(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
              ...inputStyle,
              colorScheme: 'dark',
              borderColor: errors.resolution ? 'var(--red)' : 'var(--border)',
            }}
          />
          {errors.resolution && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', marginTop: 6 }}>
              {errors.resolution}
            </div>
          )}
        </div>

        {/* ── SUBSIDY ──────────────────────────────────────────── */}
        <div style={fieldStyle}>
          <label style={labelStyle}>INITIAL SUBSIDY (USDG)</label>
          <input
            type="number"
            value={subsidy}
            min={1}
            step="0.01"
            onChange={e => setSubsidy(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="10.00"
            style={{
              ...inputStyle,
              marginBottom: 10,
              borderColor: errors.subsidy ? 'var(--red)' : 'var(--border)',
            }}
          />
          {errors.subsidy && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', marginTop: -4, marginBottom: 8 }}>
              {errors.subsidy}
            </div>
          )}
          <div style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 6,
            padding: '10px 14px',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>
              Your subsidy seeds market liquidity. Max protocol loss = subsidy × 0.693.{' '}
              Unused subsidy is returned when the market resolves.
            </p>
          </div>
        </div>

        {/* ── CREATOR FEE ──────────────────────────────────────── */}
        <div style={fieldStyle}>
          <label style={labelStyle}>CREATOR FEE (BASIS POINTS)</label>
          <input
            type="number"
            value={fee}
            min={0}
            max={200}
            onChange={e => setFee(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
            {fee && !isNaN(Number(fee))
              ? `${fee} bps = ${(Number(fee) / 100).toFixed(2)}% of each trade routed to you`
              : '30 bps = 0.30% of each trade routed to you'}
          </p>
        </div>

        {/* ── SUBMIT ───────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={formState !== 'idle'}
          style={{
            width: '100%',
            height: 52,
            background: 'linear-gradient(135deg, var(--purple) 0%, var(--purple-bright) 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            letterSpacing: '0.05em',
            cursor: formState === 'idle' ? 'pointer' : 'default',
            boxShadow: '0 0 30px var(--purple-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'filter 150ms ease',
          }}
          onMouseEnter={e => {
            if (formState === 'idle')
              (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)';
          }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
        >
          {formState === 'loading' ? (
            <>
              <span style={{
                display: 'inline-block',
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 700ms linear infinite',
              }} />
              DEPLOYING...
            </>
          ) : 'DEPLOY MARKET'}
        </button>

      </div>
    </div>
  );
}
