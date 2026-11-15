import { CATEGORIES, Category } from '@/lib/config';
import { fileUrl } from '@/lib/uploads';
import { CATEGORY_PATHS, Icon } from './Icons';

/** A listing's photo, or a colored category tile when there's no photo. */
export function Tile({ category, photo, className = '', iconSize = 38, alt = '' }: { category: Category; photo: string | null; className?: string; iconSize?: number; alt?: string }) {
  const c = CATEGORIES[category];
  const url = fileUrl(photo);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`object-cover ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: c.bg, color: c.ink }}>
      <Icon d={CATEGORY_PATHS[category]} size={iconSize} stroke={1.6} />
    </div>
  );
}
