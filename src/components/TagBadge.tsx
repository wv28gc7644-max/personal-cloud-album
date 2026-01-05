import { Tag, TagColor } from '@/types/media';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: Tag;
  size?: 'sm' | 'md';
  onClick?: () => void;
  selected?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const colorClasses: Record<TagColor, string> = {
  red: 'bg-tag-red/20 text-tag-red border-tag-red/30',
  orange: 'bg-tag-orange/20 text-tag-orange border-tag-orange/30',
  yellow: 'bg-tag-yellow/20 text-tag-yellow border-tag-yellow/30',
  green: 'bg-tag-green/20 text-tag-green border-tag-green/30',
  blue: 'bg-tag-blue/20 text-tag-blue border-tag-blue/30',
  purple: 'bg-tag-purple/20 text-tag-purple border-tag-purple/30',
  pink: 'bg-tag-pink/20 text-tag-pink border-tag-pink/30',
  gray: 'bg-tag-gray/20 text-tag-gray border-tag-gray/30',
};

const selectedClasses: Record<TagColor, string> = {
  red: 'bg-tag-red text-background',
  orange: 'bg-tag-orange text-background',
  yellow: 'bg-tag-yellow text-background',
  green: 'bg-tag-green text-background',
  blue: 'bg-tag-blue text-background',
  purple: 'bg-tag-purple text-background',
  pink: 'bg-tag-pink text-background',
  gray: 'bg-tag-gray text-background',
};

export function TagBadge({ tag, size = 'md', onClick, selected, removable, onRemove }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-all duration-200",
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        selected ? selectedClasses[tag.color] : colorClasses[tag.color],
        onClick && 'cursor-pointer hover:scale-105'
      )}
      onClick={onClick}
    >
      {tag.name}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="ml-1 hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
}
