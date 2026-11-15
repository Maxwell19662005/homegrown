'use client';
import { useState } from 'react';
import { Star } from '@/components/Icons';

export function StarInput({ initial }: { initial: number }) {
  const [v, setV] = useState(initial);
  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">Rating</legend>
      <input type="hidden" name="rating" value={v} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => setV(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={v === n} className="flex h-11 w-10 items-center justify-center">
          <Star filled={n <= v} size={28} />
        </button>
      ))}
    </fieldset>
  );
}
