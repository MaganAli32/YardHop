/** Landing page demo photography — served from /public/images/landing */

export type LandingImage = {
  src: string
  title: string
  alt: string
}

const base = '/images/landing'

export const landingImages = {
  hero: {
    main: {
      src: `${base}/walnut-chair-2.png`,
      title: 'Walnut lounge chair & ottoman',
      alt: 'Mid-century walnut lounge chair and matching ottoman on a shag rug',
    },
    comparables: [
      {
        src: `${base}/walnut-chair-1.png`,
        title: 'Mid-century lounge chair',
        alt: 'Mid-century lounge chair with brown cushions on asphalt',
      },
      {
        src: `${base}/walnut-chair-3.png`,
        title: 'Mid-century armchair',
        alt: 'Mid-century armchair with beige upholstery beside a window',
      },
      {
        src: `${base}/walnut-chair-4.png`,
        title: 'Walnut armchair',
        alt: 'Walnut armchair with beige linen upholstery in a bright room',
      },
      {
        src: `${base}/eames-lounge-chair.png`,
        title: 'Eames lounge chair',
        alt: 'Eames lounge chair and ottoman in green leather with rosewood shell',
      },
    ] satisfies LandingImage[],
  },
  howItWorks: {
    specimen: {
      src: `${base}/eames-lounge-chair.png`,
      title: 'Eames lounge chair & ottoman',
      alt: 'Eames lounge chair and ottoman in green leather',
    },
  },
  extension: {
    listing: {
      src: `${base}/miles-davis-kind-of-blue.png`,
      title: 'Kind of Blue — first press',
      alt: 'Miles Davis Kind of Blue vinyl album on a turntable',
    },
  },
  tryItSamples: {
    chair: {
      src: `${base}/eames-lounge-chair.png`,
      title: 'Eames lounge chair',
      alt: 'Eames lounge chair and ottoman',
    },
    camera: {
      src: `${base}/leica-m6.png`,
      title: 'Leica M6 rangefinder',
      alt: 'Black Leica M6 rangefinder camera',
    },
    sneakers: {
      src: `${base}/air-jordan-1-chicago.png`,
      title: 'Air Jordan 1 · Chicago',
      alt: 'Air Jordan 1 Retro High in red, white, and black',
    },
    record: {
      src: `${base}/miles-davis-kind-of-blue.png`,
      title: 'Kind of Blue LP',
      alt: 'Miles Davis Kind of Blue vinyl record',
    },
  } satisfies Record<string, LandingImage>,
} as const
