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

export type ViewMode = 'grid' | 'grid-large' | 'list';
