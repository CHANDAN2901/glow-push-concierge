import AdminHealingEditor from '@/components/AdminHealingEditor';
import AdminSidebar from '@/components/AdminSidebar';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const adminViewFromPath = 'timeline' as const;

export default function TimelineEditorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex pt-16">
      <AdminSidebar active={adminViewFromPath} onNavigate={(v) => {
        if (v === 'timeline') return;
        if (v === 'aftercare') return navigate('/admin/aftercare');
        return navigate('/super-admin', { state: { view: v } });
      }} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <Shield className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold">ADMIN EDITOR — Timeline</h1>
              <p className="text-xs text-muted-foreground">Manage healing phase timeline</p>
            </div>
          </div>
          <AdminHealingEditor />
        </div>
      </main>
    </div>
  );
}
