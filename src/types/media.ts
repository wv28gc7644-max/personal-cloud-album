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

export type ViewMode = 'grid' | 'grid-large' | 'list' | 'masonry';

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
