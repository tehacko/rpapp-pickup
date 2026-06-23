import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchQueue } from '../api/pickupApi';
import { useStaffToken, useTenantCode } from '../hooks/useStaffToken';
import type { QueueItem } from '../types';

export function QueuePage(): JSX.Element {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePickupPointId, setActivePickupPointId] = useState<number | 'all' | 'none'>('all');

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void (async () => {
      const { items: queueItems, ok } = await fetchQueue(tenantCode, accessToken);
      if (!ok) {
        setError(t('pickup.toast.queueLoadFailed'));
      }
      setItems(queueItems);
      setLoading(false);
    })();
  }, [accessToken, t, tenantCode]);

  const pickupPointTabs = useMemo(() => {
    const tabs = new Map<number | 'none', string>();
    for (const item of items) {
      if (item.pickupPointId === null) {
        tabs.set('none', t('pickup.queue.filterUnassigned'));
      } else {
        tabs.set(item.pickupPointId, item.pickupPointName ?? String(item.pickupPointId));
      }
    }
    return tabs;
  }, [items, t]);

  const filteredItems = useMemo(() => {
    if (activePickupPointId === 'all') {
      return items;
    }
    if (activePickupPointId === 'none') {
      return items.filter((item) => item.pickupPointId === null);
    }
    return items.filter((item) => item.pickupPointId === activePickupPointId);
  }, [activePickupPointId, items]);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.queue.title')}</h1>
      <p>
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/scan`}>
          {t('pickup.queue.backToScan')}
        </Link>
      </p>

      <div className="pickup-tabs" role="tablist">
        <button
          className={`pickup-tab${activePickupPointId === 'all' ? ' pickup-tab--active' : ''}`}
          type="button"
          onClick={() => setActivePickupPointId('all')}
        >
          {t('pickup.queue.filterAll')}
        </button>
        {Array.from(pickupPointTabs.entries()).map(([id, label]) => (
          <button
            key={String(id)}
            className={`pickup-tab${activePickupPointId === id ? ' pickup-tab--active' : ''}`}
            type="button"
            onClick={() => setActivePickupPointId(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p>{t('pickup.queue.loading')}</p> : null}
      {error ? <p className="pickup-message pickup-message--error">{error}</p> : null}

      <ul className="pickup-list">
        {filteredItems.map((item) => (
          <li key={item.fulfillmentId}>
            <span>
              #{item.fulfillmentId} — {item.status}
              {item.pickupPointName ? ` @ ${item.pickupPointName}` : ''}
            </span>
            <button
              className="pickup-button pickup-button--secondary"
              type="button"
              onClick={() =>
                navigate(`/${encodeURIComponent(tenantCode)}/order/${item.fulfillmentId}`)
              }
            >
              {t('pickup.queue.open')}
            </button>
          </li>
        ))}
      </ul>

      {filteredItems.length === 0 && !loading ? (
        <p>{t('pickup.queue.empty')}</p>
      ) : null}
    </main>
  );
}
