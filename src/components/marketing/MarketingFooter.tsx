import { Shield } from 'lucide-react';

interface Props {
  isHe: boolean;
}

const MarketingFooter = ({ isHe }: Props) => (
  <footer className="border-t py-12 bg-white" style={{ borderColor: '#E8E0D8' }}>
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="text-gold-gradient font-serif text-xl font-bold tracking-wider">GlowPush</span>
        <div className="flex items-center gap-6 text-sm" style={{ color: '#999999' }}>
          <a href="/terms" className="hover:text-foreground transition-colors">{isHe ? 'תנאי שימוש' : 'Terms of Service'}</a>
          <a href="/legal?tab=privacy" className="hover:text-foreground transition-colors">{isHe ? 'פרטיות' : 'Privacy'}</a>
          <a href="/privacy" className="hover:text-foreground transition-colors">{isHe ? 'מדיניות פרטיות' : 'Privacy Policy'}</a>
          <a href="/refund-policy" className="hover:text-foreground transition-colors">{isHe ? 'מדיניות ביטולים' : 'Refund Policy'}</a>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Powered by Stripe</span>
          </div>
        </div>
        <p className="text-xs" style={{ color: '#AAAAAA' }}>
          © 2026 GlowPush. {isHe ? 'כל הזכויות שמורות.' : 'All rights reserved.'}
        </p>
      </div>
    </div>
  </footer>
);

export default MarketingFooter;
