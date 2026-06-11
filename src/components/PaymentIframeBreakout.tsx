import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const PAYMENT_RESULT_MESSAGE = 'glowpush:payment-result';

const PAYMENT_RESULT_PATHS = ['/payment-success', '/payment-failed'];

/**
 * Rendered once at app level, outside RequireAuth. When Tranzila redirects
 * the payment iframe to /payment-success or /payment-failed, the SPA boots
 * inside that iframe; this notifies the parent window so it can close the
 * modal and navigate — even when the iframe ended up on a different origin
 * than the parent (where reading contentWindow.location.href throws).
 */
export default function PaymentIframeBreakout() {
  const location = useLocation();

  useEffect(() => {
    if (window.self !== window.top && PAYMENT_RESULT_PATHS.includes(location.pathname)) {
      window.parent.postMessage(
        { type: PAYMENT_RESULT_MESSAGE, path: location.pathname, search: location.search },
        '*',
      );
    }
  }, [location.pathname, location.search]);

  return null;
}
