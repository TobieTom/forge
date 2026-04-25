import Link from 'next/link';

export default function PortfolioPage() {
  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 100,
      background: 'radial-gradient(ellipse 60% 80% at 50% 20%, rgba(124,58,237,0.08) 0%, transparent 60%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
    }}>
      <div style={{ maxWidth: 680, width: '100%', padding: '40px 24px 80px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 48,
          color: 'var(--white)',
          letterSpacing: '0.03em',
          margin: '0 0 20px',
          lineHeight: 1,
        }}>
          PORTFOLIO
        </h1>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-2)',
          lineHeight: 1.6,
          margin: '0 0 36px',
        }}>
          Your positions will appear here once you place your first trade.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 44,
            padding: '0 28px',
            background: 'linear-gradient(135deg, var(--purple) 0%, var(--purple-bright) 100%)',
            color: 'white',
            borderRadius: 8,
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            letterSpacing: '0.05em',
            textDecoration: 'none',
            boxShadow: '0 0 24px var(--purple-glow)',
          }}
        >
          BROWSE MARKETS
        </Link>
      </div>
    </div>
  );
}
