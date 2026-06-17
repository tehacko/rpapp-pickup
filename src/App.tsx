import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';

interface ResolveResponse {
  fulfillmentId: number;
  transactionId: number;
  kioskId: number;
  version: number;
  fulfillmentStatus: string;
  paymentCompleted: boolean;
  paymentRequired: boolean;
  pickupHandoffMode: string | null;
  requiresPickupCode: boolean;
  requiresScanToken: boolean;
}

const DEFAULT_TENANT_CODE =
  typeof import.meta.env.VITE_DEFAULT_TENANT_CODE === 'string'
    ? import.meta.env.VITE_DEFAULT_TENANT_CODE.trim()
    : '';

function PickupRootPage(): JSX.Element {
  if (DEFAULT_TENANT_CODE.length > 0) {
    return <Navigate to={`/${encodeURIComponent(DEFAULT_TENANT_CODE)}/login`} replace />;
  }
  return (
    <main>
      <h1>Pickup staff</h1>
      <p>Enter tenant code in the URL: /{'{tenant}'}/login</p>
    </main>
  );
}

function tokenStorageKey(tenantCode: string): string {
  return `pickup:token:${tenantCode}`;
}

function normalizeScanToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('t') ?? trimmed;
  } catch {
    return trimmed;
  }
}

function PickupLoginPage(): JSX.Element {
  const { tenantCode = '' } = useParams();
  const navigate = useNavigate();
  const [kioskId, setKioskId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const res = await fetch(`/api/${encodeURIComponent(tenantCode)}/v1/pickup/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kioskId: Number(kioskId), pin }),
    });
    if (!res.ok) {
      setError('Login failed');
      return;
    }
    const body = (await res.json()) as { data?: { accessToken: string } };
    const token = body.data?.accessToken;
    if (!token) {
      setError('Missing token');
      return;
    }
    localStorage.setItem(tokenStorageKey(tenantCode), token);
    navigate(`/${encodeURIComponent(tenantCode)}/scan`);
  }

  return (
    <main>
      <h1>Pickup staff login</h1>
      <form onSubmit={(event) => void onSubmit(event)}>
        <label>
          Kiosk ID
          <input value={kioskId} onChange={(event) => setKioskId(event.target.value)} />
        </label>
        <label>
          PIN
          <input value={pin} type="password" onChange={(event) => setPin(event.target.value)} />
        </label>
        <button type="submit">Sign in</button>
      </form>
      {error ? <p>{error}</p> : null}
    </main>
  );
}

async function fetchResolveByCode(
  tenantCode: string,
  accessToken: string,
  pickupCode: string
): Promise<ResolveResponse | null> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve-by-code`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pickupCode: pickupCode.trim().toUpperCase() }),
    }
  );
  if (!res.ok) {
    return null;
  }
  const body = (await res.json()) as { data?: ResolveResponse };
  return body.data ?? null;
}

function PickupScanPage(): JSX.Element {
  const { tenantCode = '' } = useParams();
  const [scanToken, setScanToken] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolveResponse | null>(null);
  const navigate = useNavigate();

  const accessToken = useMemo(
    () => localStorage.getItem(tokenStorageKey(tenantCode)),
    [tenantCode]
  );

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  async function resolveToken(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const normalized = normalizeScanToken(scanToken);
    const res = await fetch(
      `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve?t=${encodeURIComponent(normalized)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      setError('Unable to resolve token');
      return;
    }
    const body = (await res.json()) as { data?: ResolveResponse };
    if (!body.data) {
      setError('Missing order data');
      return;
    }
    setResolved(body.data);
  }

  async function resolveShortCode(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const res = await fetch(
      `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve-by-code`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pickupCode: shortCode.trim().toUpperCase() }),
      }
    );
    if (!res.ok) {
      setError('Unable to resolve short code');
      return;
    }
    const body = (await res.json()) as { data?: ResolveResponse };
    if (!body.data) {
      setError('Missing order data');
      return;
    }
    setResolved(body.data);
  }

  return (
    <main>
      <h1>Scan pickup token</h1>
      <form onSubmit={(event) => void resolveToken(event)}>
        <label>
          Token or QR URL
          <input value={scanToken} onChange={(event) => setScanToken(event.target.value)} />
        </label>
        <button type="submit">Resolve</button>
      </form>
      <form onSubmit={(event) => void resolveShortCode(event)}>
        <label>
          Short pickup code
          <input value={shortCode} onChange={(event) => setShortCode(event.target.value)} />
        </label>
        <button type="submit">Resolve code</button>
      </form>
      {error ? <p>{error}</p> : null}
      {resolved ? (
        <section>
          <p>Fulfillment #{resolved.fulfillmentId}</p>
          <p>Status: {resolved.fulfillmentStatus}</p>
          <p>Paid: {resolved.paymentCompleted ? 'yes' : 'no'}</p>
          <button
            type="button"
            onClick={() => {
              const code = shortCode.trim().toUpperCase();
              if (code.length > 0) {
                navigate(
                  `/${encodeURIComponent(tenantCode)}/order/${resolved.fulfillmentId}?code=${encodeURIComponent(code)}`
                );
                return;
              }
              navigate(
                `/${encodeURIComponent(tenantCode)}/order/${resolved.fulfillmentId}?scanToken=${encodeURIComponent(
                  normalizeScanToken(scanToken)
                )}`
              );
            }}
          >
            Open order
          </button>
        </section>
      ) : null}
    </main>
  );
}

async function fetchResolve(
  tenantCode: string,
  accessToken: string,
  scanToken: string
): Promise<ResolveResponse | null> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve?t=${encodeURIComponent(scanToken)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    return null;
  }
  const body = (await res.json()) as { data?: ResolveResponse };
  return body.data ?? null;
}

function PickupOrderPage(): JSX.Element {
  const { tenantCode = '', fulfillmentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const scanToken = searchParams.get('scanToken') ?? '';
  const shortCode = searchParams.get('code') ?? '';
  const [pickupCode, setPickupCode] = useState('');
  const [order, setOrder] = useState<ResolveResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const accessToken = localStorage.getItem(tokenStorageKey(tenantCode));

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    if (shortCode.length >= 4) {
      void fetchResolveByCode(tenantCode, accessToken, shortCode).then((data) => {
        setOrder(data);
        setLoading(false);
      });
      return;
    }
    if (scanToken.length < 8) {
      setLoading(false);
      return;
    }
    void fetchResolve(tenantCode, accessToken, scanToken).then((data) => {
      setOrder(data);
      setLoading(false);
    });
  }, [accessToken, scanToken, shortCode, tenantCode]);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }
  if (loading) {
    return <main>Loading order…</main>;
  }
  if (!order) {
    return <main>Unable to load order. Return to scan.</main>;
  }

  async function refreshOrder(): Promise<ResolveResponse | null> {
    if (!accessToken) {
      return order;
    }
    if (shortCode.length >= 4) {
      const fresh = await fetchResolveByCode(tenantCode, accessToken, shortCode);
      if (fresh) {
        setOrder(fresh);
      }
      return fresh;
    }
    if (scanToken.length < 8) {
      return order;
    }
    const fresh = await fetchResolve(tenantCode, accessToken, scanToken);
    if (fresh) {
      setOrder(fresh);
    }
    return fresh;
  }

  async function confirmPickup(): Promise<void> {
    if (!order) {
      return;
    }
    const res = await fetch(
      `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(fulfillmentId)}/confirm-pickup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: order.version,
          ...(scanToken.length > 0 ? { scanToken } : {}),
          ...(pickupCode.trim().length > 0 ? { pickupCode: pickupCode.trim() } : {}),
        }),
      }
    );
    setMessage(res.ok ? 'Pickup confirmed' : 'Confirm failed');
    if (res.ok) {
      await refreshOrder();
    }
  }

  async function markPaidCash(): Promise<void> {
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `pickup-${Date.now()}`;
    const res = await fetch(
      `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(fulfillmentId)}/mark-paid-cash`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    if (!res.ok) {
      setMessage('Mark paid failed');
      return;
    }
    setMessage('Marked paid');
    await refreshOrder();
  }

  const canConfirm = !order.paymentRequired;

  return (
    <main>
      <h1>Order #{fulfillmentId}</h1>
      <p>Version: {order.version}</p>
      <p>Status: {order.fulfillmentStatus}</p>
      <p>Payment required: {order.paymentRequired ? 'yes' : 'no'}</p>
      {order.requiresPickupCode ? (
        <label>
          Short pickup code
          <input value={pickupCode} onChange={(event) => setPickupCode(event.target.value)} />
        </label>
      ) : null}
      <button type="button" onClick={() => void confirmPickup()} disabled={!canConfirm}>
        Confirm pickup
      </button>
      <button
        type="button"
        onClick={() => void markPaidCash()}
        disabled={!order.paymentRequired}
      >
        Mark paid (cash)
      </button>
      <p>
        <Link to={`/${encodeURIComponent(tenantCode)}/scan`}>Back to scan</Link>
      </p>
      {message ? <p>{message}</p> : null}
    </main>
  );
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<PickupRootPage />} />
      <Route path="/:tenantCode/login" element={<PickupLoginPage />} />
      <Route path="/:tenantCode/scan" element={<PickupScanPage />} />
      <Route path="/:tenantCode/order/:fulfillmentId" element={<PickupOrderPage />} />
      <Route path="*" element={<PickupRootPage />} />
    </Routes>
  );
}
