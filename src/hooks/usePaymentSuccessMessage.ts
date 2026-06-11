import { useEffect } from 'react';
import { PAYMENT_RESULT_MESSAGE } from '@/components/PaymentIframeBreakout';

/**
 * Listens for the postMessage sent by PaymentIframeBreakout from inside the
 * Tranzila payment iframe. Used by the components that own the payment modal
 * to close it and navigate to the payment result page.
 */
export function usePaymentSuccessMessage(enabled: boolean, onResult: (path: string) => void) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === PAYMENT_RESULT_MESSAGE && typeof e.data.path === 'string') {
        const search = typeof e.data.search === 'string' ? e.data.search : '';
        onResult(`${e.data.path}${search}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [enabled, onResult]);
}
