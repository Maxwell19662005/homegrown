'use client';
import dynamic from 'next/dynamic';

export type Pin = { id: string; title: string; price: string; lat: number; lng: number; bg: string; ink: string; category: string };

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-[62dvh] min-h-[420px] animate-pulse rounded-[22px] bg-[#E7ECE3]" />,
});

export default function MapView(props: { center: [number, number]; pins: Pin[] }) {
  return <LeafletMap {...props} />;
}
