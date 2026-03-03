import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function base64urlToUint8Array(b64url: string): Uint8Array {
  const padding = '='.repeat((4 - (b64url.length % 4)) % 4);
  const base64 = (b64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import VAPID keys as CryptoKey for signing.
 * Public key (65 bytes uncompressed) is used to extract x,y for JWK.
 * Private key (32 bytes) is the d value.
 */
async function importVapidKeys(publicKeyB64url: string, privateKeyB64url: string): Promise<CryptoKey> {
  const pubBytes = base64urlToUint8Array(publicKeyB64url);
  const privBytes = base64urlToUint8Array(privateKeyB64url);

  console.log('[send-push] Public key bytes:', pubBytes.length, 'Private key bytes:', privBytes.length);

  if (pubBytes.length !== 65) {
    throw new Error(`Public key should be 65 bytes (uncompressed), got ${pubBytes.length}`);
  }
  if (privBytes.length !== 32) {
    throw new Error(`Private key should be 32 bytes, got ${privBytes.length}`);
  }

  // Extract x, y from uncompressed public key (0x04 || x || y)
  const x = uint8ArrayToBase64url(pubBytes.slice(1, 33));
  const y = uint8ArrayToBase64url(pubBytes.slice(33, 65));
  const d = uint8ArrayToBase64url(privBytes);

  const jwk = { kty: 'EC', crv: 'P-256', x, y, d, ext: true };

  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );
}

function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  let offset = 2;
  offset++;
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  offset++;
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 32 + (32 - sLen) : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKey: CryptoKey,
  expiration: number
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiration, sub: subject };

  const encHeader = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encHeader}.${encPayload}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigArray = new Uint8Array(signature);
  const rawSig = sigArray.length !== 64 ? derToRaw(sigArray) : sigArray;
  return `${unsignedToken}.${uint8ArrayToBase64url(rawSig)}`;
}

async function encryptPayload(
  clientPublicKeyB64url: string,
  clientAuthB64url: string,
  payload: Uint8Array
): Promise<{ body: Uint8Array }> {
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const clientPubBytes = base64urlToUint8Array(clientPublicKeyB64url);
  const clientAuth = base64urlToUint8Array(clientAuthB64url);

  const clientPubKey = await crypto.subtle.importKey(
    'raw', clientPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey }, serverKeys.privateKey, 256
  );

  const serverPubExported = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const sharedSecretKey = await crypto.subtle.importKey(
    'raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']
  );

  const authInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\0'),
    ...clientPubBytes,
    ...serverPubExported,
  ]);

  const prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: clientAuth, info: authInfo },
    sharedSecretKey, 256
  );

  const prk = await crypto.subtle.importKey('raw', prkBits, { name: 'HKDF' }, false, ['deriveBits']);

  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: aes128gcm\0') },
    prk, 128
  );

  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: nonce\0') },
    prk, 96
  );

  const paddedPayload = new Uint8Array(payload.length + 1);
  paddedPayload.set(payload);
  paddedPayload[payload.length] = 2;

  const cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(nonceBits) }, cek, paddedPayload)
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPubExported.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = serverPubExported.length;
  header.set(serverPubExported, 21);

  const fullBody = new Uint8Array(header.length + encrypted.length);
  fullBody.set(header);
  fullBody.set(encrypted, header.length);

  return { body: fullBody };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, title, body: msgBody, icon, url, day } = await req.json();

    if (!subscription?.endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing subscription data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const rawPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidPublicKey = rawPublic.replace(/[^A-Za-z0-9\-_]/g, '');
    const vapidPrivateKey = rawPrivate.replace(/[^A-Za-z0-9\-_]/g, '');

    console.log('[send-push] VAPID pub length:', vapidPublicKey.length, 'priv length:', vapidPrivateKey.length);

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = day
      ? `${url || '/client'}${(url || '/client').includes('?') ? '&' : '?'}day=${day}`
      : (url || '/client');

    const notificationPayload = JSON.stringify({
      title: title || 'Glow Push ✨',
      body: msgBody || 'יש לך עדכון חדש!',
      icon: icon || '/pwa-192.png',
      data: { url: targetUrl, day: day || null },
    });

    // 1. Import VAPID signing key
    console.log('[send-push] Importing VAPID keys...');
    let signingKey: CryptoKey;
    try {
      signingKey = await importVapidKeys(vapidPublicKey, vapidPrivateKey);
      console.log('[send-push] ✅ VAPID keys imported');
    } catch (keyErr: any) {
      console.error('[send-push] VAPID key import failed:', keyErr.message);
      return new Response(
        JSON.stringify({ error: `VAPID key import failed: ${keyErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Encrypt payload
    console.log('[send-push] Encrypting payload...');
    const { body: pushBody } = await encryptPayload(
      subscription.keys.p256dh,
      subscription.keys.auth,
      new TextEncoder().encode(notificationPayload)
    );

    // 3. Create VAPID JWT
    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;
    const expiration = Math.floor(Date.now() / 1000) + 12 * 3600;
    const jwt = await createVapidJwt(audience, 'mailto:push@glowpush.app', signingKey, expiration);

    // 4. Send
    console.log('[send-push] Sending to:', subscription.endpoint);
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: pushBody,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[send-push] Push failed:', response.status, text);
      return new Response(
        JSON.stringify({ error: 'Push delivery failed', status: response.status, details: text }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-push] ✅ Push delivered successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[send-push] Error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
