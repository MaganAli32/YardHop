import { useState } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';

const USE_CASES = [
  'Estate sale company',
  'Thrift store / resale chain',
  'Insurance / claims appraisal',
  'Retail buyback program',
  'Pawn shop',
  'Liquidation / auction house',
  'Other',
];

export default function BusinessPage() {
  const [formData, setFormData] = useState({ name: '', company: '', email: '', use_case: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.company) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: sbError } = await supabase.from('business_waitlist').insert([formData] as any);
      if (sbError) throw sbError;
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F0EAE0] text-[#1A1A18] font-['Manrope'] antialiased overflow-x-hidden">
      <Navbar />

      <section className="pt-36 md:pt-44 pb-20 md:pb-28 px-6 md:px-[56px]">
        <div className="max-w-[1180px] mx-auto text-center">
          <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#9E8B6F] mb-8">
            For developers & businesses
          </p>
          <h1 className="font-['Cormorant_Garamond'] font-light text-[clamp(44px,7vw,92px)] leading-[0.95] tracking-[-0.02em] text-[#1A2A1C] mb-8">
            Price intelligence
            <br />
            <span className="italic text-[#B54419]">as infrastructure.</span>
          </h1>
          <p className="max-w-[560px] mx-auto text-[17px] leading-[1.8] text-[#6B7A6D] mb-10">
            One endpoint for item-level valuation. Send an image or description and receive a market-backed range,
            confidence score, and source evidence.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="#waitlist"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center py-3 px-8 bg-[#1A2A1C] text-[#F0EAE0] rounded-sm text-[12px] font-semibold uppercase tracking-[0.1em] no-underline hover:bg-[#2A3E2E] transition-colors"
            >
              Join beta waitlist
            </a>
            <a
              href="#api-preview"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('api-preview')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center py-3 px-8 border border-[#1A2A1C] text-[#1A2A1C] rounded-sm text-[12px] font-semibold uppercase tracking-[0.1em] no-underline hover:bg-[#1A2A1C] hover:text-[#F0EAE0] transition-colors"
            >
              View response format
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#1A2A1C] py-20 md:py-28 px-6 md:px-[56px]">
        <div className="max-w-[1180px] mx-auto">
          <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#4A6B4E] mb-8">
            Where teams use YardFront
          </p>
          <div className="grid md:grid-cols-2 gap-x-16 border-t border-[#2C3F2F]">
            {[
              { title: 'Estate sale operations', body: 'Price large inventories quickly with consistent valuation logic across your whole team.' },
              { title: 'Thrift and resale chains', body: 'Catch high-value donations early and reduce margin loss from inconsistent intake pricing.' },
              { title: 'Insurance & claims', body: 'Return market-backed value ranges with transparent source evidence for claim review.' },
              { title: 'Buyback programs', body: 'Set defensible offer prices in real time while keeping conversion speed high.' },
            ].map((item, i) => (
              <article key={item.title} className={`py-10 border-b border-[#2C3F2F] ${i % 2 === 0 ? 'md:pr-10' : ''}`}>
                <h2 className="font-['Cormorant_Garamond'] text-[#F0EAE0] text-[34px] leading-[1.05] mb-3">{item.title}</h2>
                <p className="text-[#7A9A7C] text-[15px] leading-[1.8] max-w-[470px]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="api-preview" className="py-20 md:py-28 px-6 md:px-[56px]">
        <div className="max-w-[1180px] mx-auto grid lg:grid-cols-2 gap-10">
          <div>
            <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#9E8B6F] mb-4">How the API works</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4.5vw,56px)] font-light text-[#1A2A1C] leading-[1.02] mb-5">
              One request.
              <br />
              <span className="italic text-[#B54419]">Structured market context.</span>
            </h2>
            <p className="text-[16px] leading-[1.8] text-[#6B7A6D] max-w-[500px] mb-8">
              Submit an image URL or text description. We identify the item, query marketplace comparables, and return
              a recommended price range with confidence and source data.
            </p>
          </div>

          <div className="bg-[#F7F2EA] border border-[#DDD2C1] rounded-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DDD2C1] text-[12px] text-[#8C857A] font-medium">POST /v1/appraise</div>
            <div className="grid md:grid-cols-2 gap-4 p-5">
              <div>
                <p className="font-['DM_Mono'] text-[9px] uppercase tracking-[0.14em] text-[#A49A8C] mb-2">Request</p>
                <pre className="text-[12px] leading-[1.7] text-[#6B6B6B] overflow-x-auto">{`{
  "image_url": "https://...",
  "condition": "good"
}`}</pre>
              </div>
              <div>
                <p className="font-['DM_Mono'] text-[9px] uppercase tracking-[0.14em] text-[#A49A8C] mb-2">Response</p>
                <pre className="text-[12px] leading-[1.7] text-[#6B6B6B] overflow-x-auto">{`{
  "item_name": "Teak credenza",
  "price_recommended": 1250,
  "confidence": 0.91
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="waitlist" className="py-20 md:py-28 px-6 md:px-[56px]">
        <div className="max-w-[640px] mx-auto text-center mb-10">
          <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#9E8B6F] mb-4">Early access</p>
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4.5vw,56px)] font-light text-[#1A2A1C] leading-[1.02] mb-4">
            Join the private beta.
          </h2>
        </div>

        <div className="max-w-[560px] mx-auto">
          {submitted ? (
            <div className="bg-[#FAF7F2] border border-[#E4DACB] rounded-sm p-10 text-center">
              <h3 className="font-['Cormorant_Garamond'] text-[34px] text-[#1A2A1C] mb-2">You&apos;re on the list.</h3>
              <p className="text-[15px] text-[#6B7A6D]">We&apos;ll reach out with access details shortly.</p>
            </div>
          ) : (
            <div className="bg-[#FAF7F2] border border-[#E4DACB] rounded-sm p-7">
              <div className="space-y-4">
                {[
                  { label: 'Name', key: 'name', type: 'text', placeholder: 'Jane Smith' },
                  { label: 'Company', key: 'company', type: 'text', placeholder: 'Acme Estate Group' },
                  { label: 'Work email', key: 'email', type: 'email', placeholder: 'jane@acme.com' },
                ].map((field) => (
                  <label key={field.key} className="block text-left">
                    <span className="block text-[12px] font-medium text-[#7A7268] mb-1.5">{field.label}</span>
                    <input
                      type={field.type}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full border border-[#DCD1C0] bg-white rounded-sm px-4 py-3 text-[15px] text-[#1A1A18] placeholder-[#B6ACA0] focus:outline-none focus:border-[#A89D8E]"
                    />
                  </label>
                ))}
                <label className="block text-left">
                  <span className="block text-[12px] font-medium text-[#7A7268] mb-1.5">Use case</span>
                  <select
                    value={formData.use_case}
                    onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
                    className="w-full border border-[#DCD1C0] bg-white rounded-sm px-4 py-3 text-[15px] text-[#1A1A18] focus:outline-none focus:border-[#A89D8E]"
                  >
                    <option value="">Select one...</option>
                    {USE_CASES.map((uc) => (
                      <option key={uc} value={uc}>{uc}</option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <p className="text-red-600 text-[13px] mt-3">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full py-3 bg-[#1A2A1C] text-[#F0EAE0] rounded-sm text-[12px] font-semibold uppercase tracking-[0.1em] hover:bg-[#2A3E2E] transition-colors disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Request access'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
