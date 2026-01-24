import React from 'react';

const TermsOfServicePage: React.FC = () => {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-24 w-full">
        {/* Header */}
        <div className="mb-16 space-y-6">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">
            Last Updated: {lastUpdated}
          </p>
          <div className="w-24 h-1 bg-[#FF6B35]"></div>
        </div>

        {/* Introduction */}
        <section className="mb-12 space-y-4">
          <p className="text-lg text-slate-700 font-medium leading-relaxed">
            Welcome to YardFront! These Terms of Service ("Terms") govern your access to and use of the 
            YardFront platform, including our website, mobile application, and related services (collectively, 
            the "Service"). By accessing or using YardFront, you agree to be bound by these Terms.
          </p>
        </section>

        {/* Acceptance of Terms */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">1. Acceptance of Terms</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            By creating an account, accessing, or using YardFront, you acknowledge that you have read, 
            understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree 
            to these Terms, you may not use the Service. You must be at least 18 years old to use YardFront.
          </p>
        </section>

        {/* Description of Service */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">2. Description of Service</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
            YardFront is a neighborhood marketplace platform that connects buyers and sellers for the 
            exchange of second-hand items. Our Service includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
            <li>Platform for listing and browsing items for sale</li>
            <li>Communication tools for buyers and sellers</li>
            <li>Payment processing services</li>
            <li>Community features and garage sale listings</li>
            <li>AI-powered listing assistance ("Stitch")</li>
            <li>Location-based services and safe exchange zones</li>
          </ul>
        </section>

        {/* User Accounts */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">3. User Accounts</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">3.1 Account Creation</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                To use certain features of YardFront, you must create an account. You agree to provide 
                accurate, current, and complete information during registration and to update such information 
                to keep it accurate, current, and complete.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">3.2 Account Security</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and for 
                all activities that occur under your account. You agree to notify us immediately of any 
                unauthorized use of your account.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">3.3 Account Termination</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                We reserve the right to suspend or terminate your account at any time, with or without notice, 
                for any violation of these Terms or for any other reason we deem necessary to protect the 
                integrity of the platform.
              </p>
            </div>
          </div>
        </section>

        {/* User Conduct */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">4. User Conduct</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
            You agree not to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
            <li>List or sell illegal, stolen, counterfeit, or prohibited items</li>
            <li>Misrepresent items, prices, or your identity</li>
            <li>Engage in fraudulent, deceptive, or harmful conduct</li>
            <li>Harass, abuse, threaten, or harm other users</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Use automated systems to access the Service without authorization</li>
            <li>Copy, modify, or create derivative works of the Service</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Use the Service for commercial purposes beyond selling items as an individual</li>
          </ul>
        </section>

        {/* Listings and Transactions */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">5. Listings and Transactions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">5.1 Listing Items</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                When you list an item, you represent and warrant that you have the legal right to sell the item, 
                that the listing is accurate and complete, and that the item is not prohibited by these Terms 
                or applicable law.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">5.2 Transaction Terms</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                YardFront facilitates transactions between buyers and sellers but is not a party to the transaction. 
                You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Negotiating price and terms with the other party</li>
                <li>Arranging safe pickup or delivery</li>
                <li>Verifying the condition and authenticity of items</li>
                <li>Completing the transaction in a timely manner</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">5.3 Payment Processing</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                Payment processing is provided by third-party payment processors (e.g., Stripe). YardFront 
                is not responsible for payment processing errors or disputes. All fees and charges are disclosed 
                at the time of transaction.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">5.4 Disputes</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                YardFront is not responsible for disputes between buyers and sellers. We encourage users to 
                resolve disputes amicably. If a dispute cannot be resolved, you may contact us for assistance, 
                but we are under no obligation to intervene.
              </p>
            </div>
          </div>
        </section>

        {/* Fees and Payments */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">6. Fees and Payments</h2>
          <div className="space-y-4">
            <p className="text-base text-slate-700 font-medium leading-relaxed">
              Listing individual items on YardFront is free. We may charge fees for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
              <li>Multi-family garage sale events</li>
              <li>Premium features or subscriptions</li>
              <li>Payment processing (if applicable)</li>
            </ul>
            <p className="text-base text-slate-700 font-medium leading-relaxed mt-4">
              All fees are clearly disclosed before you complete a transaction. Fees are non-refundable 
              unless required by law.
            </p>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">7. Intellectual Property</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">7.1 YardFront Content</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                All content on YardFront, including text, graphics, logos, software, and design, is the 
                property of YardFront or its licensors and is protected by copyright, trademark, and other 
                intellectual property laws.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">7.2 User Content</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                You retain ownership of content you submit to YardFront (photos, descriptions, messages, etc.). 
                By submitting content, you grant YardFront a worldwide, non-exclusive, royalty-free license to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Use, display, and distribute your content on the Service</li>
                <li>Modify and adapt your content as necessary to provide the Service</li>
                <li>Promote and market the Service using your content</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Disclaimers */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">8. Disclaimers</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
            EXPRESS OR IMPLIED. YARDFRONT DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO WARRANTIES 
            OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT 
            THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">9. Limitation of Liability</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, YARDFRONT SHALL NOT BE LIABLE FOR ANY INDIRECT, 
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, 
            WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER 
            INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        {/* Indemnification */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">10. Indemnification</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            You agree to indemnify, defend, and hold harmless YardFront and its officers, directors, 
            employees, and agents from any claims, liabilities, damages, losses, costs, or expenses 
            (including reasonable attorneys' fees) arising from your use of the Service, your violation 
            of these Terms, or your violation of any rights of another party.
          </p>
        </section>

        {/* Modification of Terms */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">11. Modification of Terms</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify you of material changes 
            by posting the updated Terms on this page and updating the "Last Updated" date. Your continued 
            use of the Service after such modifications constitutes acceptance of the updated Terms.
          </p>
        </section>

        {/* Termination */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">12. Termination</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            Either you or YardFront may terminate your access to the Service at any time, with or without 
            cause. Upon termination, your right to use the Service will immediately cease. Provisions of 
            these Terms that by their nature should survive termination shall survive, including but not 
            limited to intellectual property rights, disclaimers, and limitations of liability.
          </p>
        </section>

        {/* Governing Law */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">13. Governing Law</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of [Your State/Country], 
            without regard to its conflict of law provisions. Any disputes arising from these Terms or the 
            Service shall be resolved in the courts of [Your Jurisdiction].
          </p>
        </section>

        {/* Contact Us */}
        <section className="mb-12 space-y-6 pt-8 border-t border-slate-200">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">14. Contact Us</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            If you have questions about these Terms, please contact us at:
          </p>
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <p className="text-base text-slate-700 font-medium">
              <strong>Email:</strong> <a href="mailto:legal@yardfront.com" className="text-[#FF6B35] hover:underline">legal@yardfront.com</a>
            </p>
            <p className="text-base text-slate-700 font-medium mt-2">
              <strong>Address:</strong> YardFront, Inc.<br />
              [Your Business Address]<br />
              [City, State ZIP Code]
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;


