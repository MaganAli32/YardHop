import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const principles = [
  {
    id: '01',
    title: 'Market truth over market noise',
    body:
      'We optimize for sold outcomes, not listed wish-prices. Every estimate starts from what buyers actually paid.',
  },
  {
    id: '02',
    title: 'Condition is not a footnote',
    body:
      'A mint camera and a worn one are different assets. We model condition cues directly so pricing reflects reality.',
  },
  {
    id: '03',
    title: 'Confidence should be visible',
    body:
      'Not every item deserves the same certainty. We return a range and confidence so decisions stay honest.',
  },
  {
    id: '04',
    title: 'Tools for people and teams',
    body:
      'From one-off sellers to enterprise intake workflows, the same engine powers clear, defensible pricing decisions.',
  },
];

export default function AboutPage() {
  return (
    <div className="bg-[#F0EAE0] text-[#1A2A1C] font-['Manrope'] min-h-screen">
      <Navbar />

      <main>
        <section className="pt-32 md:pt-44 pb-20 md:pb-28 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#9E8B6F] mb-8">The YardFront manifesto</p>
            <h1
              className="font-['Cormorant_Garamond'] font-light leading-[0.95] tracking-[-0.02em] text-[clamp(44px,8vw,104px)] mb-8"
            >
              Everything has a value.
              <br />
              <span className="italic text-[#B54419]">Almost nothing has a price.</span>
            </h1>
            <p className="max-w-2xl text-[17px] leading-[1.8] text-[#5F6E63]">
              YardFront exists to make secondhand pricing less opaque and more defensible. We combine computer vision,
              live market signals, and confidence modeling so people can decide with evidence.
            </p>
          </div>
        </section>

        <section className="bg-[#1A2A1C] py-20 md:py-28 px-6 md:px-12">
          <div className="max-w-6xl mx-auto grid md:grid-cols-[280px_1fr] gap-12 md:gap-20">
            <div className="md:sticky md:top-28 h-fit">
              <h2 className="font-['Cormorant_Garamond'] font-light text-[#F0EAE0] leading-[1.05] text-[clamp(34px,4.8vw,58px)]">
                The opacity
                <br />
                of <span className="italic text-[#C9BFA9]">resale.</span>
              </h2>
              <div className="w-10 h-px bg-[#B54419] mt-7" />
            </div>

            <div className="text-[#7A9A7C] text-[18px] leading-[1.9] space-y-10 max-w-3xl">
              <p className="font-['Cormorant_Garamond'] text-[#F0EAE0] italic text-[32px] leading-[1.2]">
                "Every day, millions of unique items change hands in the dark."
              </p>
              <p>
                Before YardFront, pricing secondhand goods meant manual searching, subjective judgment, and fragmented
                comps. Sellers guessed. Buyers guessed. Teams improvised.
              </p>
              <p>
                We built YardFront to model what experts do at scale: identify what the item is, evaluate condition,
                query live markets, and turn that evidence into a defensible range.
              </p>
              <p className="text-[#F0EAE0]">
                Not what someone hopes to get.
                <br />
                <span className="border-b border-[#B54419] pb-1 inline-block mt-2">What someone is actually willing to pay.</span>
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="mb-12">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#9E8B6F] mb-4">Our principles</p>
              <h2 className="font-['Cormorant_Garamond'] font-light text-[clamp(34px,4.8vw,58px)] leading-[1.05]">
                How we make prices
                <br />
                <span className="italic text-[#B54419]">trustworthy.</span>
              </h2>
            </div>

            <div className="border-t border-[#CFC4B3]">
              {principles.map((item) => (
                <article
                  key={item.id}
                  className="grid md:grid-cols-[90px_280px_1fr] gap-6 md:gap-10 py-10 border-b border-[#D8CEBF]"
                >
                  <p className="text-[#B54419] text-[30px] font-['Cormorant_Garamond'] leading-none">{item.id}</p>
                  <h3 className="font-['Cormorant_Garamond'] text-[30px] leading-[1.15] text-[#1A2A1C]">
                    {item.title}
                  </h3>
                  <p className="text-[16px] leading-[1.9] text-[#5F6E63] max-w-2xl">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-24 md:pb-32 px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center border-t border-[#CFC4B3] pt-16">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#9E8B6F] mb-4">Start now</p>
            <h2 className="font-['Cormorant_Garamond'] font-light text-[clamp(36px,5.2vw,66px)] leading-[1.02] mb-6">
              Know what it&apos;s worth
              <br />
              <span className="italic text-[#B54419]">before you decide.</span>
            </h2>
            <p className="text-[#5F6E63] text-[16px] leading-[1.8] mb-10 max-w-xl mx-auto">
              Free to start. No account required for your first appraisal.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-sm bg-[#1A2A1C] text-[#F0EAE0] px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] no-underline hover:bg-[#2A3E2E] transition-colors"
              >
                Try it free
              </Link>
              <Link
                to="/business"
                className="inline-flex items-center justify-center rounded-sm border border-[#1A2A1C] text-[#1A2A1C] px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] no-underline hover:bg-[#1A2A1C] hover:text-[#F0EAE0] transition-colors"
              >
                For business
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
