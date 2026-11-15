import { NEIGHBORHOODS } from '@/lib/neighborhoods';

export function NeighborhoodSelect({ name = 'neighborhood', defaultValue, id }: { name?: string; defaultValue?: string; id?: string }) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ''} required className="input">
      <option value="" disabled>
        Choose your neighborhood
      </option>
      {NEIGHBORHOODS.map((n) => (
        <option key={n.name} value={n.name}>
          {n.name}, {n.borough}
        </option>
      ))}
    </select>
  );
}
