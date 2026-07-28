// Morning.co (formerly Green Invoice) invoicing API.
// developers.morning.co has no reachable docs (dead JS SPA); Morning still runs
// on the Green Invoice backend, confirmed via api.greeninvoice.co.il/api/v1.

const MORNING_BASE_URL = "https://api.greeninvoice.co.il/api/v1";

// Document type code for "Invoice/Receipt" (חשבונית מס/קבלה) — the combined
// document for a transaction that's already been paid (as opposed to 305,
// a bare invoice implying payment is still pending). Confirmed against the
// API's own JSON Schema enum: [10,100,200,210,300,305,320,330,400,405,500,600,610].
export const MORNING_DOC_TYPE_INVOICE_RECEIPT = 320;

async function getMorningToken(): Promise<string> {
  const id = Deno.env.get("MORNING_API_KEY_ID");
  const secret = Deno.env.get("MORNING_API_KEY_SECRET");
  if (!id || !secret) {
    throw new Error("MORNING_API_KEY_ID / MORNING_API_KEY_SECRET not configured");
  }

  const res = await fetch(`${MORNING_BASE_URL}/account/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, secret }),
  });

  if (!res.ok) {
    throw new Error(`Morning token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.token as string;
}

export interface MorningInvoiceInput {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  description: string;
  price: number;
  currency?: string; // default ILS
  lang?: "he" | "en";
}

export interface MorningInvoiceResult {
  id: string;
  number: number;
  url: { origin: string; he: string; en: string };
}

// Best-effort: throws on failure, caller decides whether that should block
// the wider flow (it shouldn't — invoice creation is a side-effect of a
// successful payment, not a condition of it).
export async function createMorningInvoice(input: MorningInvoiceInput): Promise<MorningInvoiceResult> {
  const token = await getMorningToken();

  const res = await fetch(`${MORNING_BASE_URL}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: MORNING_DOC_TYPE_INVOICE_RECEIPT,
      lang: input.lang || "he",
      currency: input.currency || "ILS",
      client: {
        name: input.clientName,
        emails: input.clientEmail ? [input.clientEmail] : undefined,
        phone: input.clientPhone,
        add: true,
        self: false,
      },
      income: [
        {
          description: input.description,
          quantity: 1,
          price: input.price,
          currency: input.currency || "ILS",
          vatType: 0,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Morning create-document failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
