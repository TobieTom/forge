'use client';

import dynamic from 'next/dynamic';

const HeroSceneInner = dynamic(
  () => import('./HeroScene').then((m) => m.HeroScene),
  { ssr: false },
);

export function HeroSceneClient() {
  return <HeroSceneInner />;
}
