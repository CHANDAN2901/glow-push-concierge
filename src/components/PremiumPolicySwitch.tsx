import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface PremiumPolicySwitchProps {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
}

/**
 * A luxury-styled Switch with rich Gold track when ON
 * and subtle dusty-rose outline when OFF.
 */
export default function PremiumPolicySwitch({
  id,
  checked,
  onCheckedChange,
  className,
}: PremiumPolicySwitchProps) {
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn('premium-policy-switch', className)}
      style={{
        background: checked
          ? 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F0D060)'
          : 'hsl(340 20% 85%)',
        border: checked ? '1.5px solid #B8860B' : '1.5px solid hsl(340 20% 78%)',
        boxShadow: checked
          ? '0 2px 8px rgba(184, 134, 11, 0.35)'
          : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease',
      }}
    />
  );
}
