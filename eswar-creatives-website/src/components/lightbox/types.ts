import type { CSSProperties, ReactNode } from 'react'

export interface GalleryImage {
  id: string
  src: string
  alt: string
  category: string
  client: string
  aspectRatio?: number
  blurDataUrl?: string
  width?: number
  height?: number
  localizedTitle?: string
  description?: string
  priority?: boolean
  groupKey?: string
}

export interface GalleryTheme {
  background: string
  surface: string
  border: string
  text: string
  textMuted: string
  accent: string
  accentForeground: string
  radius: string
  fontHeading?: string
  fontBody?: string
}

export interface ImgRenderProps {
  src: string
  alt: string
  width?: number
  height?: number
  blurDataUrl?: string
  priority?: boolean
  style?: CSSProperties
  className?: string
}

export interface TransformOpts {
  width: number
  quality: number
  format?: 'webp' | 'avif' | 'origin'
}

export interface GalleryLabels {
  all?: string
  loadMore?: string
  noImages?: string
  closeLabel?: string
  prevLabel?: string
  nextLabel?: string
}

export interface GalleryProps {
  images: GalleryImage[]
  theme?: Partial<GalleryTheme>
  columns?: { mobile: number; tablet: number; desktop: number }
  currentColumns?: number
  enableFilter?: boolean
  enableLightbox?: boolean
  labels?: GalleryLabels
  getTransformUrl?: (src: string, opts: TransformOpts) => string
  renderImage?: (props: ImgRenderProps) => ReactNode
  onImageClick?: (image: GalleryImage, index: number) => void
  emptyState?: ReactNode
  pageSize?: number
}
