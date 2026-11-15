'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, CircleMarker } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { CATEGORY_PATHS } from '@/components/Icons';
import type { Pin } from './MapView';

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function pinIcon(p: Pin) {
  const d = CATEGORY_PATHS[p.category as keyof typeof CATEGORY_PATHS];
  return L.divIcon({
    className: '',
    iconSize: [80, 36],
    iconAnchor: [18, 18],
    html: `<div style="display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 10px 0 5px;border-radius:999px;background:#fff;border:1px solid #C9D1C6;box-shadow:0 2px 6px rgba(23,36,27,.18);font:700 13px Inter,system-ui,sans-serif;color:#17241B;white-space:nowrap">
      <span style="width:26px;height:26px;border-radius:50%;background:${p.bg};color:${p.ink};display:flex;align-items:center;justify-content:center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>
      </span>${esc(p.price)}</div>`,
  });
}

export default function LeafletMap({ center, pins }: { center: [number, number]; pins: Pin[] }) {
  const router = useRouter();
  return (
    <div className="h-[62dvh] min-h-[420px] overflow-hidden rounded-[22px] border border-line">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url={process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
        <CircleMarker center={center} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }} />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p)} title={`${p.title}, ${p.price}`} eventHandlers={{ click: () => router.push(`/listings/${p.id}`) }} />
        ))}
      </MapContainer>
    </div>
  );
}
