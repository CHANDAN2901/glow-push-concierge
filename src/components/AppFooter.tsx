import { Link } from 'react-router-dom';

const AppFooter = () => (
  <footer
    className="py-6 text-center text-xs"
    style={{ borderTop: '1px solid hsl(38 30% 85%)', color: 'hsl(0 0% 60%)' }}
  >
    <div className="container mx-auto px-4 flex items-center justify-center gap-4 flex-wrap">
      <span>© 2026 GlowPush</span>
      <Link to="/privacy" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
        מדיניות פרטיות
      </Link>
      <Link to="/terms" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
        תנאי שימוש
      </Link>
    </div>
  </footer>
);

export default AppFooter;
