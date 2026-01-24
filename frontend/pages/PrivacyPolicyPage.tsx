import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-24 w-full">
        {/* Header */}
        <div className="mb-16 space-y-6">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">
            Last Updated: {lastUpdated}
          </p>
          <div className="w-24 h-1 bg-[#FF6B35]"></div>
        </div>

        {/* Introduction */}
        <section className="mb-12 space-y-4">
          <p className="text-lg text-slate-700 font-medium leading-relaxed">
            At YardFront, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
            disclose, and safeguard your information when you use our neighborhood marketplace platform. 
            Please read this policy carefully to understand our practices regarding your personal data.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">1. Information We Collect</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">1.1 Personal Information</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                When you create an account, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Name and email address</li>
                <li>Profile information and preferences</li>
                <li>Profile picture (optional)</li>
                <li>Location data (to show local listings and facilitate meetups)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">1.2 Transaction Information</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                When you buy or sell items, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Payment information (processed securely through Stripe)</li>
                <li>Shipping and delivery addresses</li>
                <li>Transaction history and records</li>
                <li>Communications between buyers and sellers</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">1.3 Usage Data</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                We automatically collect information about how you use YardFront:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Device information (type, operating system, browser)</li>
                <li>IP address and general location data</li>
                <li>Pages visited and features used</li>
                <li>Search queries and browsing patterns</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">1.4 Content You Provide</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                When you create listings or interact with the platform:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Photos and descriptions of items</li>
                <li>Messages and communications</li>
                <li>Reviews and ratings</li>
                <li>Community posts and comments</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Your Information */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">2. How We Use Your Information</h2>
          
          <div className="space-y-4">
            <p className="text-base text-slate-700 font-medium leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and facilitate payments</li>
              <li>Connect buyers and sellers in your neighborhood</li>
              <li>Send you updates, notifications, and marketing communications (you can opt out at any time)</li>
              <li>Verify user identities and prevent fraud</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </div>
        </section>

        {/* Information Sharing */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">3. Information Sharing and Disclosure</h2>
          
          <div className="space-y-4">
            <p className="text-base text-slate-700 font-medium leading-relaxed">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">3.1 With Other Users</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                When you list an item or interact with other users, they may see:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Your public profile information</li>
                <li>Listings you create</li>
                <li>Your general location (neighborhood level, not exact address)</li>
                <li>Reviews and ratings you leave</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">3.2 Service Providers</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
                We work with trusted third-party service providers who help us operate our platform:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
                <li>Payment processors (Stripe) for secure payment processing</li>
                <li>Cloud hosting providers (Supabase) for data storage</li>
                <li>AI service providers (Google Gemini) for listing assistance</li>
                <li>Analytics providers to understand platform usage</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-3">3.3 Legal Requirements</h3>
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                We may disclose your information if required by law, court order, or government regulation, 
                or to protect the rights, property, or safety of YardFront, our users, or others.
              </p>
            </div>
          </div>
        </section>

        {/* Data Security */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">4. Data Security</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            We implement industry-standard security measures to protect your personal information, including:
          </p>
          <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and access controls</li>
            <li>Regular security audits and updates</li>
            <li>Secure payment processing through PCI-compliant providers</li>
          </ul>
          <p className="text-base text-slate-700 font-medium leading-relaxed mt-4">
            However, no method of transmission over the internet or electronic storage is 100% secure. 
            While we strive to protect your data, we cannot guarantee absolute security.
          </p>
        </section>

        {/* Your Rights */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">5. Your Privacy Rights</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
            Depending on your location, you may have certain rights regarding your personal information:
          </p>
          <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
            <li><strong>Portability:</strong> Request transfer of your data to another service</li>
            <li><strong>Objection:</strong> Object to certain processing of your information</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
          </ul>
          <p className="text-base text-slate-700 font-medium leading-relaxed mt-4">
            To exercise these rights, please contact us at <a href="mailto:privacy@yardfront.com" className="text-[#FF6B35] hover:underline">privacy@yardfront.com</a>.
          </p>
        </section>

        {/* Cookies */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">6. Cookies and Tracking Technologies</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed mb-3">
            We use cookies and similar tracking technologies to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-base text-slate-700 font-medium ml-4">
            <li>Remember your preferences and settings</li>
            <li>Keep you logged in</li>
            <li>Analyze site traffic and usage patterns</li>
            <li>Provide personalized content and advertisements</li>
          </ul>
          <p className="text-base text-slate-700 font-medium leading-relaxed mt-4">
            You can control cookies through your browser settings. However, disabling cookies may limit 
            some functionality of our platform. For more information, please see our Cookie Policy.
          </p>
        </section>

        {/* Children's Privacy */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">7. Children's Privacy</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            YardFront is not intended for users under the age of 18. We do not knowingly collect personal 
            information from children under 18. If we become aware that we have collected information from 
            a child under 18, we will take steps to delete such information promptly. If you believe we 
            have collected information from a child under 18, please contact us immediately.
          </p>
        </section>

        {/* International Users */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">8. International Data Transfers</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            Your information may be transferred to and processed in countries other than your country of 
            residence. These countries may have data protection laws that differ from those in your country. 
            By using YardFront, you consent to the transfer of your information to these countries.
          </p>
        </section>

        {/* Changes to Privacy Policy */}
        <section className="mb-12 space-y-6">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">9. Changes to This Privacy Policy</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any material changes 
            by posting the new policy on this page and updating the "Last Updated" date. We encourage you to 
            review this Privacy Policy periodically to stay informed about how we protect your information.
          </p>
        </section>

        {/* Contact Us */}
        <section className="mb-12 space-y-6 pt-8 border-t border-slate-200">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">10. Contact Us</h2>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, 
            please contact us at:
          </p>
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <p className="text-base text-slate-700 font-medium">
              <strong>Email:</strong> <a href="mailto:privacy@yardfront.com" className="text-[#FF6B35] hover:underline">privacy@yardfront.com</a>
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

export default PrivacyPolicyPage;


