import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Coupon {
  id: string;
  code: string;
  label: string;
  discount_type: string;
  discount_percent: number | null;
  free_months: number | null;
  expiration_date: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  new_users_only: boolean;
  created_at: string;
}

export default function CouponManager() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountPercent, setDiscountPercent] = useState('');
  const [freeMonths, setFreeMonths] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [maxUses, setMaxUses] = useState('');
  const [newUsersOnly, setNewUsersOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCoupons(data as Coupon[]);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async () => {
    if (!code.trim()) {
      toast({ title: isHe ? 'יש להזין קוד קופון' : 'Please enter a coupon code', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const payload = {
      code: code.trim().toUpperCase(),
      label: label.trim() || code.trim().toUpperCase(),
      discount_type: discountType,
      discount_percent: discountType === 'percentage' ? parseInt(discountPercent) || 0 : 0,
      free_months: discountType === 'free_months' ? parseInt(freeMonths) || 0 : 0,
      expiration_date: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      new_users_only: newUsersOnly,
      is_active: true,
      current_uses: 0,
    };

    const { error } = await supabase.from('promo_codes').insert(payload);
    if (error) {
      toast({ title: isHe ? 'שגיאה ביצירת קופון' : 'Error creating coupon', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: isHe ? 'קופון נוצר בהצלחה ✨' : 'Coupon created successfully ✨' });
      setCode(''); setLabel(''); setDiscountPercent(''); setFreeMonths('');
      setExpirationDate(undefined); setMaxUses(''); setDiscountType('percentage');
      setNewUsersOnly(false);
      fetchCoupons();
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('promo_codes').delete().eq('id', id);
    toast({ title: isHe ? 'קופון נמחק' : 'Coupon deleted' });
    fetchCoupons();
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-6 max-w-5xl" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Create Form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Ticket className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">{isHe ? 'יצירת קופון חדש' : 'Create New Coupon'}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">{isHe ? 'קוד קופון' : 'Coupon Code'}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PMU-EXPO26"
              dir="ltr"
              className="font-mono"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">{isHe ? 'תיאור / תווית' : 'Description / Label'}</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={isHe ? 'הנחה לתערוכה' : 'Expo discount'} />
          </div>

          <div>
            <Label className="mb-1.5 block">{isHe ? 'סוג הנחה' : 'Discount Type'}</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{isHe ? '% אחוז הנחה' : '% Percentage Discount'}</SelectItem>
                <SelectItem value="free_months">{isHe ? 'חודשים חינם' : 'Free Months'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {discountType === 'percentage' ? (
            <div>
              <Label className="mb-1.5 block">{isHe ? 'אחוז הנחה' : 'Discount Percent'}</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="50"
                dir="ltr"
              />
            </div>
          ) : (
            <div>
              <Label className="mb-1.5 block">{isHe ? 'מספר חודשים חינם' : 'Number of Free Months'}</Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={freeMonths}
                onChange={(e) => setFreeMonths(e.target.value)}
                placeholder="1"
                dir="ltr"
              />
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">{isHe ? 'תאריך תפוגה' : 'Expiration Date'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    `w-full justify-start ${isHe ? 'text-right' : 'text-left'} font-normal`,
                    !expirationDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, 'dd/MM/yyyy') : (isHe ? 'ללא הגבלה' : 'No limit')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={setExpirationDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="mb-1.5 block">{isHe ? 'מגבלת שימושים' : 'Usage Limit'}</Label>
            <Input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder={isHe ? 'ללא הגבלה' : 'No limit'}
              dir="ltr"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3">
              <div>
                <Label className="block">{isHe ? 'למשתמשות חדשות בלבד' : 'New Users Only'}</Label>
                <span className="text-xs text-muted-foreground">
                  {isHe ? 'הקופון יהיה זמין רק לאמניות שנרשמות לראשונה' : 'The coupon will only be available for artists signing up for the first time'}
                </span>
              </div>
              <Switch checked={newUsersOnly} onCheckedChange={setNewUsersOnly} className="data-[state=checked]:bg-accent" />
            </div>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={creating}
          className="mt-5"
        >
          <Plus className="w-4 h-4 ml-1" />
          {isHe ? 'צור קופון' : 'Create Coupon'}
        </Button>
      </div>

      {/* Active Coupons Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-serif font-semibold text-lg">{isHe ? 'קופונים קיימים' : 'Existing Coupons'}</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {isHe ? 'אין קופונים עדיין. צרי את הראשון! 🎫' : 'No coupons yet. Create the first one! 🎫'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{isHe ? 'קוד' : 'Code'}</TableHead>
                  <TableHead>{isHe ? 'תיאור' : 'Description'}</TableHead>
                  <TableHead>{isHe ? 'הנחה' : 'Discount'}</TableHead>
                  <TableHead>{isHe ? 'תפוגה' : 'Expiry'}</TableHead>
                  <TableHead className="text-center">{isHe ? 'שימושים' : 'Uses'}</TableHead>
                  <TableHead className="text-center">{isHe ? 'חדשות בלבד' : 'New Only'}</TableHead>
                  <TableHead className="text-center">{isHe ? 'סטטוס' : 'Status'}</TableHead>
                  <TableHead>{isHe ? 'פעולות' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => {
                  const expired = isExpired(c.expiration_date);
                  const limitReached = c.max_uses !== null && c.current_uses >= c.max_uses;
                  const effectiveStatus = !c.is_active ? 'inactive' : expired ? 'expired' : limitReached ? 'limit' : 'active';

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-semibold text-sm" dir="ltr">
                        {c.code}
                      </TableCell>
                      <TableCell className="text-sm">{c.label}</TableCell>
                      <TableCell className="text-sm">
                        {c.discount_type === 'free_months'
                          ? `${c.free_months || 0} ${isHe ? 'חודשים חינם' : 'free months'}`
                          : `${c.discount_percent || 0}%`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.expiration_date
                          ? format(new Date(c.expiration_date), 'dd/MM/yyyy')
                          : (isHe ? '—' : '—')}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        {c.current_uses}{c.max_uses !== null ? `/${c.max_uses}` : ''}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {c.new_users_only ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">✓ {isHe ? 'כן' : 'Yes'}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                          effectiveStatus === 'active' && 'bg-green-500/10 text-green-600',
                          effectiveStatus === 'expired' && 'bg-destructive/10 text-destructive',
                          effectiveStatus === 'limit' && 'bg-orange-500/10 text-orange-600',
                          effectiveStatus === 'inactive' && 'bg-muted text-muted-foreground',
                        )}>
                          {effectiveStatus === 'active' && (isHe ? 'פעיל' : 'Active')}
                          {effectiveStatus === 'expired' && (isHe ? 'פג תוקף' : 'Expired')}
                          {effectiveStatus === 'limit' && (isHe ? 'מוצה' : 'Limit Reached')}
                          {effectiveStatus === 'inactive' && (isHe ? 'מושבת' : 'Disabled')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.is_active}
                            onCheckedChange={() => toggleActive(c.id, c.is_active)}
                            className="data-[state=checked]:bg-accent"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteCoupon(c.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
