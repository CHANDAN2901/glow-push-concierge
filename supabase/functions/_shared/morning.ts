// Morning.co (formerly Green Invoice) invoicing API.
// developers.morning.co has no reachable docs (dead JS SPA); Morning still runs
// on the Green Invoice backend, confirmed via api.greeninvoice.co.il/api/v1.

const MORNING_BASE_URL = "https://api.greeninvoice.co.il/api/v1";

// Document type code. Full enum recovered from the API blueprint:
// 10 quote, 100 order, 200 delivery note, 210 return note, 300 transaction
// account, 305 tax invoice, 320 tax invoice/receipt, 330 credit invoice,
// 400 receipt, 405 donation receipt, 500 purchase order, 600/610 deposit.
// 305/320 both require a VAT-registered business ("עוסק מורשה"); this
// account is an exempt dealer ("עוסק פטור"), which can't issue VAT invoices
// and gets a 400 error on 305/320 — a plain receipt (400) is what's valid.
export const MORNING_DOC_TYPE_INVOICE_RECEIPT = 400;

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

  // Normalize to a positive number with 2-decimal precision. Morning rejects
  // 0 / NaN / string prices as "ערך סכום תקבול צריך להיות שונה מ 0" (2434).
  const rawPrice = Number(input.price);
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    throw new Error(`Morning invoice price must be > 0 (got ${input.price})`);
  }
  const price = Math.round(rawPrice * 100) / 100;
  const currency = input.currency || "ILS";
  const today = new Date().toISOString().slice(0, 10);

  const body = {
    type: MORNING_DOC_TYPE_INVOICE_RECEIPT,
    lang: input.lang || "he",
    currency,
    vatType: 0, // document-level VAT (required by API even for VAT-exempt dealers)
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
        price,
        currency,
        currencyRate: 1,
        vatType: 0,
        vatRate: 0,
      },
    ],
    // Receipt (type 400) requires at least one payment row matching income total.
    // PaymentGroup 3 = credit card.
    payment: [
      {
        date: today,
        type: 3,
        price,
        currency,
        currencyRate: 1,
      },
    ],
  };

  const res = await fetch(`${MORNING_BASE_URL}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[morning] create-document failed", { status: res.status, body, errText });
    throw new Error(`Morning create-document failed: ${res.status} ${errText}`);
  }

  return res.json();
}

