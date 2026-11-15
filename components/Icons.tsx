import type { Category } from '@/lib/config';

export const CATEGORY_PATHS: Record<Category, string> = {
  produce: 'M12 7c-4.4 0-8 3-8 7s3.6 7 8 7 8-3 8-7-3.6-7-8-7zM12 7c0-2 1-3.5 3-4M12 7c-1.5-1.5-3.5-2-5-1.5M12 7c1.5-1.2 3.5-1.5 5-1',
  baked: 'M4 11a4 4 0 0 1 3-6h10a4 4 0 0 1 3 6v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 9l-1 3M13 9l-1 3M17 9l-1 3',
  plants: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3.5 2.5-5.5 7-5.5 0 3.5-2.5 5.5-7 5.5zM7 21h10',
  farm: 'M3 21V10l9-6 9 6v11zM9 21v-6h6v6M3 10h18',
  eggs: 'M12 3c-3.5 0-6.5 5.5-6.5 10a6.5 6.5 0 0 0 13 0C18.5 8.5 15.5 3 12 3z',
};

export function Icon({ d, size = 20, stroke = 2, className }: { d: string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}

export const I = {
  back: 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M6 9l6 6 6-6',
  right: 'M9 6l6 6-6 6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  box: 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  bag: 'M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
  sprout: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3.5 2.5-5.5 7-5.5 0 3.5-2.5 5.5-7 5.5z',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  store: 'M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6',
};

export function Star({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill={filled ? '#C2410C' : '#C9D1C6'} d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.8 6.6 19.6l1.1-6L3.2 9.4l6.1-.8z" />
    </svg>
  );
}
