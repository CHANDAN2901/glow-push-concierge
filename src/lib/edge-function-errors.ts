export interface EdgeFunctionErrorDetails {
  message: string;
  status?: number;
  failureReason?: string;
  payload?: any;
  rawText?: string;
}

const EXPIRED_RE = /expired|unsubscribed|not.?registered|gone|410/i;

export async function extractEdgeFunctionError(error: unknown): Promise<EdgeFunctionErrorDetails> {
  const fallbackMessage = 'Request failed';

  if (!error || typeof error !== 'object') {
    return { message: fallbackMessage };
  }

  const err = error as any;
  const response: Response | undefined = err?.context instanceof Response ? err.context : undefined;

  if (!response) {
    return {
      message: err?.message || fallbackMessage,
      status: typeof err?.status === 'number' ? err.status : undefined,
      payload: err,
    };
  }

  let rawText = '';
  let payload: any = null;

  try {
    rawText = await response.clone().text();
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = rawText;
      }
    }
  } catch {
    // Ignore parse errors and keep fallback message
  }

  const payloadMessage =
    (payload && typeof payload === 'object' && (payload.error || payload.message)) ||
    (typeof payload === 'string' ? payload : '');

  const message =
    payloadMessage ||
    err?.message ||
    `Request failed (${response.status})`;

  const failureReason = payload && typeof payload === 'object' ? payload.failure_reason : undefined;

  return {
    message,
    status: response.status,
    failureReason,
    payload,
    rawText,
  };
}

export function isPushSubscriptionExpired(details: EdgeFunctionErrorDetails): boolean {
  const providerStatus =
    typeof details.payload?.provider_status === 'number'
      ? details.payload.provider_status
      : undefined;

  if (details.failureReason === 'subscription_expired') return true;
  if (details.status === 410 || details.status === 404) return true;
  if (providerStatus === 410 || providerStatus === 404) return true;

  const textBlob = [
    details.message,
    details.rawText,
    typeof details.payload === 'string' ? details.payload : '',
    typeof details.payload?.provider_response === 'string' ? details.payload.provider_response : '',
  ]
    .filter(Boolean)
    .join(' ');

  return EXPIRED_RE.test(textBlob);
}
