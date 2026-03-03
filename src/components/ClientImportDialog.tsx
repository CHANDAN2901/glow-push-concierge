import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistProfileId: string;
  lang: string;
  onImportComplete: () => void;
}

type Step = 'upload' | 'mapping' | 'importing' | 'done';

const REQUIRED_FIELDS = ['name'] as const;
const MAPPABLE_FIELDS = [
  { key: 'name', label: 'שם', labelEn: 'Name' },
  { key: 'phone', label: 'טלפון', labelEn: 'Phone' },
  { key: 'email', label: 'אימייל', labelEn: 'Email' },
  { key: 'treatment_date', label: 'תאריך טיפול אחרון', labelEn: 'Last Treatment Date' },
  { key: 'birth_date', label: 'תאריך לידה', labelEn: 'Birth Date' },
] as const;

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter(r => r.some(c => c));
  return { headers, rows };
}

function tryParseDate(value: string): string | null {
  if (!value) return null;
  // Try common formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return value;
  
  const slashMatch = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slashMatch) {
    const [, a, b, y] = slashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    // Assume DD/MM/YYYY for Hebrew locale
    return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  }
  return null;
}

export default function ClientImportDialog({ open, onOpenChange, artistProfileId, lang, onImportComplete }: ClientImportDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const reset = useCallback(() => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0 || r.length === 0) {
        toast({ title: lang === 'en' ? 'Empty or invalid CSV file' : 'קובץ CSV ריק או לא תקין', variant: 'destructive' });
        return;
      }
      setHeaders(h);
      setRows(r);
      
      // Auto-map by header name similarity
      const autoMap: Record<string, string> = {};
      const namePatterns = [/name|שם/i];
      const phonePatterns = [/phone|טלפון|נייד|mobile/i];
      const emailPatterns = [/email|אימייל|מייל/i];
      const treatmentDatePatterns = [/treatment|טיפול|date|תאריך/i];
      const birthPatterns = [/birth|לידה|יום הולדת/i];
      
      h.forEach(header => {
        if (namePatterns.some(p => p.test(header))) autoMap['name'] = header;
        else if (phonePatterns.some(p => p.test(header))) autoMap['phone'] = header;
        else if (emailPatterns.some(p => p.test(header))) autoMap['email'] = header;
        else if (birthPatterns.some(p => p.test(header))) autoMap['birth_date'] = header;
        else if (treatmentDatePatterns.some(p => p.test(header)) && !autoMap['treatment_date']) autoMap['treatment_date'] = header;
      });
      
      setMapping(autoMap);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const canImport = !!mapping['name'];

  const handleImport = async () => {
    if (!canImport) return;
    setStep('importing');
    setProgress(0);
    
    const nameIdx = headers.indexOf(mapping['name']);
    const phoneIdx = mapping['phone'] ? headers.indexOf(mapping['phone']) : -1;
    const emailIdx = mapping['email'] ? headers.indexOf(mapping['email']) : -1;
    const treatmentIdx = mapping['treatment_date'] ? headers.indexOf(mapping['treatment_date']) : -1;
    const birthIdx = mapping['birth_date'] ? headers.indexOf(mapping['birth_date']) : -1;

    let imported = 0;
    let errors = 0;
    const batchSize = 50;
    const baseUrl = window.location.origin;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const inserts = batch
        .map(row => {
          const name = row[nameIdx]?.trim();
          if (!name) return null;
          return {
            artist_id: artistProfileId,
            full_name: name,
            phone: phoneIdx >= 0 ? (row[phoneIdx]?.trim() || null) : null,
            email: emailIdx >= 0 ? (row[emailIdx]?.trim() || null) : null,
            treatment_date: treatmentIdx >= 0 ? tryParseDate(row[treatmentIdx]) : null,
            birth_date: birthIdx >= 0 ? tryParseDate(row[birthIdx]) : null,
          };
        })
        .filter(Boolean) as any[];

      if (inserts.length > 0) {
        const { data, error } = await supabase.from('clients').insert(inserts).select('id, full_name');
        if (error) {
          console.error('Batch import error:', error);
          errors += inserts.length;
        } else {
          imported += data?.length || 0;
        }
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / rows.length) * 100)));
    }

    setImportedCount(imported);
    setErrorCount(errors);
    setStep('done');
  };

  const buildClientUrl = (clientId: string, clientName: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/c/${clientId}?name=${encodeURIComponent(clientName)}`;
  };

  const he = lang !== 'en';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {he ? 'ייבוא לקוחות מקובץ CSV' : 'Import Clients from CSV'}
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-accent/40 rounded-2xl p-10 text-center cursor-pointer hover:border-accent/70 hover:bg-accent/5 transition-all"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-accent" />
              <p className="font-semibold text-sm">
                {he ? 'לחצי כאן או גררי קובץ CSV' : 'Click or drag a CSV file here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {he ? 'פורמט: שם, טלפון, אימייל, תאריך טיפול, תאריך לידה' : 'Format: Name, Phone, Email, Treatment Date, Birth Date'}
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4 py-2" dir={he ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              {he ? `נמצאו ${rows.length} שורות` : `Found ${rows.length} rows`}
            </div>

            <div className="space-y-3">
              {MAPPABLE_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-32 shrink-0">
                    {he ? field.label : field.labelEn}
                    {field.key === 'name' && <span className="text-destructive"> *</span>}
                  </span>
                  <Select
                    value={mapping[field.key] || '_none'}
                    onValueChange={(v) => setMapping(prev => ({ ...prev, [field.key]: v === '_none' ? '' : v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={he ? 'בחרי עמודה' : 'Select column'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{he ? '— לא מופה —' : '— Not mapped —'}</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-3 text-xs overflow-x-auto">
                <p className="font-semibold mb-1">{he ? 'תצוגה מקדימה (3 שורות ראשונות):' : 'Preview (first 3 rows):'}</p>
                <table className="w-full">
                  <thead>
                    <tr>{headers.map(h => <th key={h} className="px-2 py-1 text-start font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j} className="px-2 py-0.5 text-muted-foreground">{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                {he ? 'חזרה' : 'Back'}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!canImport}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {he ? `ייבוא ${rows.length} לקוחות` : `Import ${rows.length} Clients`}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="py-8 space-y-4 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto" />
            <p className="text-sm font-medium">{he ? 'מייבאת לקוחות...' : 'Importing clients...'}</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="py-8 space-y-4 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <p className="text-lg font-bold">
              {he ? `יובאו ${importedCount} לקוחות בהצלחה! 🎉` : `Successfully imported ${importedCount} clients! 🎉`}
            </p>
            {errorCount > 0 && (
              <p className="text-sm text-destructive flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {he ? `${errorCount} שורות נכשלו` : `${errorCount} rows failed`}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {he ? 'לכל לקוחה נוצר מזהה ייחודי וקישור אישי למסע ההחלמה.' : 'Each client received a unique ID and personal recovery journey URL.'}
            </p>
            <Button
              onClick={() => { reset(); onOpenChange(false); onImportComplete(); }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {he ? 'סגירה' : 'Close'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
