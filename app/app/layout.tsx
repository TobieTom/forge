import type { Metadata } from 'next';
import { Bebas_Neue, DM_Mono, Inter } from 'next/font/google';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';
import { WalletContextProvider } from './components/WalletContextProvider';
import { Navbar } from './components/Navbar';

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-bebas-neue',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-dm-mono',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'FORGE — Prediction Markets',
  description:
    'Permissionless prediction markets on Solana. Live odds. LS-LMSR protocol.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${dmMono.variable} ${inter.variable}`}
    >
      <body>
        <WalletContextProvider>
          <Navbar />
          <main>{children}</main>
        </WalletContextProvider>
      </body>
    </html>
  );
}
