import { notFound } from 'next/navigation';
import { TradePageClient } from './TradePageClient';

export type MarketData = {
  question: string;
  yesPercent: number;
  noPercent: number;
  volume: number;
  traders: number;
  category: string;
  endsAt: string;
  resolution: string;
};

const MARKETS: Record<string, MarketData> = {
  'market-01': {
    question: 'Will SOL close above $100 on May 1, 2026?',
    yesPercent: 67, noPercent: 33,
    volume: 12480, traders: 142,
    category: 'CRYPTO', endsAt: 'May 1, 2026', resolution: '2026-05-01',
  },
  'market-02': {
    question: 'Will Omnipair TVL exceed $10M by June 2026?',
    yesPercent: 45, noPercent: 55,
    volume: 4320, traders: 89,
    category: 'DEFI', endsAt: 'Jun 1, 2026', resolution: '2026-06-01',
  },
  'market-03': {
    question: 'Will BTC reach $200k before end of 2026?',
    yesPercent: 38, noPercent: 62,
    volume: 28900, traders: 334,
    category: 'CRYPTO', endsAt: 'Dec 31, 2026', resolution: '2026-12-31',
  },
  'market-04': {
    question: 'Will ETH ETF staking be approved by Q3?',
    yesPercent: 72, noPercent: 28,
    volume: 8750, traders: 201,
    category: 'REGULATION', endsAt: 'Sep 30, 2026', resolution: '2026-09-30',
  },
};

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const market = MARKETS[id];
  if (!market) notFound();
  return <TradePageClient market={market} id={id} />;
}
