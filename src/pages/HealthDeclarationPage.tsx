import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HealthDeclaration from '@/components/HealthDeclaration';
import type { HealthDeclarationData } from '@/components/HealthDeclaration';


const HealthDeclarationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientName = searchParams.get('name') || '';
  const clientPhone = searchParams.get('client_phone') || '';
  const logo = searchParams.get('logo') || '';
  const artistId = searchParams.get('artist_id') || '';
  const appointmentDate = searchParams.get('start') || '';
  const appointmentTime = searchParams.get('time') || '';

  const [isArtist, setIsArtist] = useState(false);

  // Check if current user is a logged-in artist
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setIsArtist(true);
    });
  }, []);




  const handleComplete = async (data: HealthDeclarationData) => {
    if (!artistId) {
      throw new Error('קישור לא תקין – חסר מזהה מטפלת. פני למטפלת לקבלת קישור חדש.');
    }
    const { data: result, error } = await supabase.functions.invoke('submit-health-declaration', {
      body: {
        artistProfileId: artistId,
        fullName: data.fullName,
        phone: data.phone,
        birthDate: data.birthDate || null,
        formData: {
          idNumber: data.idNumber,
          answers: data.answers,
          answerDetails: data.answerDetails,
          legalConsentAt: data.legalConsentAt,
        },
        signatureDataUrl: data.signatureDataUrl,
      },
    });
    if (error) {
      let msg = error.message || String(error);
      try {
        if (error.context?.body) {
          const body = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
          if (body?.error) msg = body.error;
        }
      } catch {}
      throw new Error(msg);
    }
    return result;
  };

  return (
    <div className="relative">
      {isArtist && (
        <button
          onClick={() => navigate('/artist')}
          className="fixed top-4 right-4 z-50 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-accent/90 transition-colors"
        >
          חזרה לדשבורד ←
        </button>
      )}
      <HealthDeclaration
        clientName={clientName}
        clientPhone={clientPhone}
        logoUrl={logo}
        onComplete={handleComplete}
        onClose={() => {}}
        
        appointmentDate={appointmentDate}
        appointmentTime={appointmentTime}
      />
    </div>
  );
};

export default HealthDeclarationPage;
