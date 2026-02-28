import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';
import glowPushLogo from '@/assets/glowpush-logo.png';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2
      className="text-lg font-serif font-medium tracking-wide"
      style={{ color: '#5C4033' }}
    >
      {title}
    </h2>
    <div className="text-sm leading-relaxed space-y-3" style={{ color: 'hsl(0 0% 30%)' }}>
      {children}
    </div>
  </section>
);

const Divider = () => (
  <div
    className="h-px w-full"
    style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }}
  />
);

const PrivacyPolicy = () => {
  const { lang } = useI18n();
  const isHe = lang === 'he';

  return (
    <div
      className="min-h-screen py-16 px-4"
      style={{ background: 'linear-gradient(165deg, hsl(0 0% 100%) 0%, hsl(38 60% 97%) 100%)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/">
            <img src={glowPushLogo} alt="Glow Push" className="h-14 mx-auto object-contain mb-4" />
          </Link>
          <h1
            className="text-2xl font-serif tracking-wide"
            style={{ color: 'hsl(0 0% 15%)', fontWeight: 300 }}
          >
            Privacy Policy
          </h1>
          <p className="text-xs mt-2" style={{ color: 'hsl(0 0% 55%)' }}>
            Last Updated: February 28, 2026
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 md:p-10 space-y-8"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid hsl(38 40% 82%)',
            boxShadow: '0 8px 40px -12px hsla(38, 55%, 62%, 0.12)',
          }}
        >
          {/* Intro */}
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
            Welcome to Glow Push ("we," "our," or "us"). We are committed to protecting your privacy and ensuring that your personal data is handled safely and responsibly. This Privacy Policy outlines how we collect, use, and protect the information of the Permanent Makeup (PMU) Artists who use our platform ("Users") and their end-clients ("Clients").
          </p>

          <Divider />

          <Section title="1. Our Role in Data Processing">
            <p>
              Under the General Data Protection Regulation (GDPR) and similar privacy laws, Glow Push acts as a <strong>Data Processor</strong>. The PMU Artist (our User) is the <strong>Data Controller</strong>. This means the Artist is responsible for obtaining the necessary consents from their Clients to collect and store medical declarations, facial images, and contact information on our platform.
            </p>
          </Section>

          <Divider />

          <Section title="2. Information We Collect">
            <p>
              <strong>From Users (Artists):</strong> Account information (name, email, business details), billing information (processed securely via third-party providers like Lemon Squeezy), and app usage data.
            </p>
            <p>
              <strong>From Clients (via Artists):</strong> Name, contact details (phone number for SMS/WhatsApp notifications), facial images (before/after mapping and treatment photos), treatment logs (pigment formulas, needle configurations), and sensitive medical information required for Digital Health Declarations (e.g., allergies, medical conditions).
            </p>
          </Section>

          <Divider />

          <Section title="3. How We Use the Information">
            <p>We strictly use the data to provide the Glow Push service. This includes:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>Hosting the digital clinic management system.</li>
              <li>Storing and securing Digital Health Declarations and clinical notes.</li>
              <li>Generating the Digital Recovery Journal for Clients.</li>
              <li>Sending automated aftercare instructions and reminders via third-party communication APIs (e.g., SMS, WhatsApp) on behalf of the Artist.</li>
            </ul>
          </Section>

          <Divider />

          <Section title="4. Data Sharing and Third-Party Services">
            <p>
              We do not sell, rent, or trade personal data. We only share information with trusted third-party service providers necessary to operate the app (e.g., secure cloud hosting databases, automated messaging APIs). All third-party providers are strictly vetted for GDPR and CCPA compliance.
            </p>
          </Section>

          <Divider />

          <Section title="5. Data Security">
            <p>
              We implement high-level security measures, including Row Level Security (RLS) on our databases and encryption, to ensure that unauthorized parties cannot access sensitive medical data or client records. An Artist can only access the data of their own Clients.
            </p>
          </Section>

          <Divider />

          <Section title="6. Your Privacy Rights (GDPR & CCPA)">
            <p>Depending on your location, you and your Clients have the following rights:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li><strong>The Right to Access:</strong> You can request a copy of the personal data we hold.</li>
              <li><strong>The Right to Rectification:</strong> You can correct inaccurate or incomplete data.</li>
              <li><strong>The Right to Erasure ("Right to be Forgotten"):</strong> Users can delete their accounts directly within the app's settings, which will permanently erase all associated Client data, images, and health records from our servers.</li>
              <li><strong>The Right to Opt-Out:</strong> Clients may opt out of receiving automated SMS/WhatsApp notifications at any time.</li>
            </ul>
          </Section>

          <Divider />

          <Section title="7. Data Retention">
            <p>
              We retain Client data and health declarations as long as the Artist maintains an active Glow Push account, or as required by local medical liability laws, unless a deletion request is initiated.
            </p>
          </Section>

          <Divider />

          <Section title="8. Contact Us">
            <p>
              If you have any questions or requests regarding this Privacy Policy or your data, please contact us at:
            </p>
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:hello@glowpush.app" className="underline" style={{ color: '#D4AF37' }}>
                hello@glowpush.app
              </a>
            </p>
            <p>
              <strong>Website:</strong>{' '}
              <a href="https://www.glowpush.app" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#D4AF37' }}>
                www.glowpush.app
              </a>
            </p>
          </Section>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors font-serif"
            style={{ color: 'hsl(38 40% 45%)' }}
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            {isHe ? 'חזרה לדף הראשי' : 'Back to home'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
