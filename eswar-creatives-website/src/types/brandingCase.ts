export interface BrandingCase {
  id: string
  brandName: string
  industry: string
  year: number
  coverImage: string
  coverAlt: string
  tagline: string
  problem: string
  deliverables: string[]
  outcome: string
  images: BrandingCaseImage[]
  sections: BrandingSection[]
  client: 'Vim Events Decor' | 'Newgen Event Makers'
}

export interface BrandingCaseImage {
  src: string
  alt: string
  caption?: string
}

export interface BrandingSection {
  id: string
  category:
    | 'Brand Concept'
    | 'Logo System'
    | 'Colour + Typography'
    | 'Print + Stationery'
    | 'Digital Presence'
    | 'Field + Physical'
    | 'Event Decor'
    | 'Photography + Content'
    | 'B2B + Corporate'
  description: string
  images: BrandingCaseImage[]
}
