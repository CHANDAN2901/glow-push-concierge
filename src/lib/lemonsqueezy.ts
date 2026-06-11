// lemon.js (loaded in index.html) overlay helper. After payment the overlay
// only shows a confirmation modal — the redirect_url requires a user click —
// so we listen for the Checkout.Success event to close the overlay and
// continue to /payment-success ourselves.

interface LemonSqueezyGlobal {
  Setup: (opts: { eventHandler: (event: { event?: string }) => void }) => void;
  Url: { Open: (url: string) => void; Close: () => void };
}

let onCheckoutSuccess: (() => void) | null = null;
let setupDone = false;

export function openLemonSqueezyCheckout(checkoutUrl: string, onSuccess: () => void): void {
  const LS = (window as unknown as { LemonSqueezy?: LemonSqueezyGlobal }).LemonSqueezy;
  if (!LS) {
    // lemon.js not loaded — hosted checkout in a new tab; the webhook +
    // /payment-success polling in that tab take over from there.
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  onCheckoutSuccess = onSuccess;
  if (!setupDone) {
    LS.Setup({
      eventHandler: (event) => {
        if (event?.event === 'Checkout.Success') {
          LS.Url.Close();
          onCheckoutSuccess?.();
        }
      },
    });
    setupDone = true;
  }
  LS.Url.Open(checkoutUrl);
}
