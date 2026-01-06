export type MediaType = 'image' | 'video';

export type TagColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray';

export interface Tag {
  id: string;
  name: string;
  color: TagColor;
}

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  tags: Tag[];
  createdAt: Date;
  size: number;
  duration?: number; // For videos, in seconds
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  items: MediaItem[];
  createdAt: Date;
}

export type ViewMode = 'grid' | 'grid-large' | 'list' | 'masonry' | 'media-only';

export type SortOption = 
  | 'date-desc' 
  | 'date-asc' 
  | 'name-asc' 
  | 'name-desc' 
  | 'size-desc' 
  | 'size-asc' 
  | 'type-image' 
  | 'type-video'
  | 'duration-desc';

export interface MediaStats {
  mediaId: string;
  viewCount: number;
  totalWatchTime: number; // in seconds
  lastViewed: Date;
  segments?: { start: number; end: number; views: number }[]; // for videos
}

export interface CardDisplaySettings {
  showMetadata: boolean;
  showTitle: boolean;
  showActionText: boolean;
  layoutOrder: 'header-first' | 'media-first';
  videoHoverSound: boolean;
  videoHoverStart: 'beginning' | 'preview';
}

export interface AdvancedCardSettings {
  cardBorderRadius: number;
  cardPadding: number;
  showHeader: boolean;
  headerPadding: number;
  avatarSize: number;
  usernameFontSize: number;
  mediaAspectRatio: 'auto' | '16:9' | '4:3' | '1:1';
  mediaBorderRadius: number;
  showDuration: boolean;
  showViewCount: boolean;
  showMetadata: boolean;
  metadataFontSize: number;
  showTitle: boolean;
  titleFontSize: number;
  titleLineClamp: number;
  showActions: boolean;
  showActionText: boolean;
  actionButtonSize: number;
  actionIconSize: number;
  layoutOrder: 'header-first' | 'media-first';
  sectionGap: number;
  preset: 'normal' | 'minimalist' | 'compact' | 'custom';
}
