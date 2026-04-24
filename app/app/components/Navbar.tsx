'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then(
      (mod) => mod.WalletMultiButton,
    ),
  { ssr: false },
);

const LINKS = [
  { label: 'MARKETS', href: '/' },
  { label: 'CREATE', href: '/create' },
  { label: 'PORTFOLIO', href: '/portfolio' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              background: 'var(--purple)',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--white)',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}
          >
            FORGE
          </span>
        </Link>

        {/* Center nav */}
        <div
          className="nav-center"
          style={{ display: 'flex', alignItems: 'center', gap: 40 }}
        >
          {LINKS.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                data-active={active}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: LIVE indicator + wallet */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            justifyContent: 'flex-end',
          }}
        >
          <span
            className="blink-dot"
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green-glow)',
            }}
          />
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}
