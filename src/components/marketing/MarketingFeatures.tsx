import { ClipboardCheck, ImagePlus, Users, Heart } from 'lucide-react';

interface Props {
  isHe: boolean;
}

const MarketingFeatures = ({ isHe }: Props) => {
  const features = [
    {
      icon: Heart,
      title: isHe ? 'מסע החלמה דיגיטלי אוטומטי ✨' : 'Automated Digital Recovery Journey ✨',
      desc: isHe
        ? 'ליווי צמוד ללקוחה שלך ללא מאמץ מצידך! תזכורות חכמות למריחת משחה, שלבי קילוף וקביעת טאצ\'-אפ שנשלחות אוטומטית לוואטסאפ של הלקוחה.'
        : 'Hands-free client support! Smart reminders for ointment, peeling stages, and touch-up scheduling sent automatically to your client\'s WhatsApp.',
    },
    {
      icon: ClipboardCheck,
      title: isHe ? 'הצהרת בריאות מעוצבת בקליק 📱' : 'Styled Health Declaration in One Click 📱',
      desc: isHe
        ? 'טופס דיגיטלי חכם ומאובטח שנשלח ישירות ללקוחה. נשמר אוטומטית ובצורה מסודרת בתיק האישי שלה, חוסך לך ניירת וזמן.'
        : 'A smart, secure digital form sent directly to the client. Auto-saved neatly in her personal file, saving you paperwork and time.',
    },
    {
      icon: ImagePlus,
      title: isHe ? 'תיק לקוחה וגלריית תמונות 📸' : 'Client File & Photo Gallery 📸',
      desc: isHe
        ? 'ניהול תמונות לפני ואחרי עם כלי עריכה פנימי. כל המידע והיסטוריית הטיפולים של הלקוחה שמורים במקום אחד בטוח.'
        : 'Before & after photo management with built-in editing tools. All client info and treatment history stored securely in one place.',
    },
    {
      icon: Users,
      title: isHe ? 'כרטיס ביקור דיגיטלי 👑' : 'Digital Business Card 👑',
      desc: isHe
        ? 'כרטיס יוקרתי ומעוצב שמרכז את כל הדרכים ליצור איתך קשר ולצפות בתיק העבודות שלך, מגדיל המרות ונוחות.'
        : 'A luxurious, beautifully designed card centralizing all ways to contact you and view your portfolio — boosting conversions and convenience.',
    },
  ];

  return (
    <section className="py-28" style={{ backgroundColor: '#FFF5F5' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <div className="inline-block bg-white rounded-xl px-8 py-5 shadow-md" style={{ borderRight: '6px solid', borderImage: 'linear-gradient(180deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%) 1' }}>
            <h2 className="text-3xl md:text-5xl font-serif font-light tracking-wider" style={{ color: '#1a1a1a' }}>
              {isHe ? 'הכל מה שהעסק שלך צריך' : 'Everything Your Business Needs'}
            </h2>
          </div>
          <p className="max-w-xl mx-auto leading-relaxed mt-6" style={{ color: '#666666' }}>
            {isHe
              ? 'כלים מקצועיים שנבנו במיוחד כדי לחסוך לך זמן, להעניק חוויית לקוח יוקרתית ולהגדיל את ההכנסות.'
              : 'Professional tools built to save you time, deliver a luxury client experience, and grow your revenue.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white p-10 rounded-2xl border-2 border-gold/20 text-center hover:border-gold/60 hover:shadow-gold transition-all duration-500 group"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-7 transition-all duration-500"
                style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)' }}
              >
                <f.icon className="w-7 h-7" style={{ color: '#5C4033' }} />
              </div>
              <h3 className="font-serif text-xl font-medium mb-3 tracking-wide" style={{ color: '#333333' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#666666' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MarketingFeatures;
