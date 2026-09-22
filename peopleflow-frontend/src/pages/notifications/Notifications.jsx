import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CalendarDays,
  Check,
  CheckCheck,
  CheckSquare,
  Clock,
  Trash2,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { Loader, LoadError } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useAction } from '../../hooks/useAction';
import { useNotifications } from '../../context/NotificationContext';
import { notificationsApi } from '../../api/endpoints';
import { getPreference } from '../../utils/preferences';
import { formatDateTime, relativeTime } from '../../utils/format';

const TYPE_ICONS = {
  task: CheckSquare,
  leave: CalendarDays,
  attendance: Clock,
  account: UserCheck,
  payroll: Wallet,
  system: Bell,
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

export function Notifications() {
  const navigate = useNavigate();
  const { unreadCount, setUnreadCount, refreshUnread, version } = useNotifications();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const limit = getPreference('pageSize');
  const unreadOnly = tab === 'unread';

  const { data, meta, loading, error, reload, setData } = useFetch(
    (config) => notificationsApi.list({ page, limit, ...(unreadOnly ? { unread: 'true' } : {}) }, config),
    [page, limit, unreadOnly, version],
  );
  const notifications = data || [];

  const changeTab = (key) => {
    setTab(key);
    setPage(1);
  };

  const applyRead = (id) => {
    setData((list) => (unreadOnly
      ? (list || []).filter((n) => n._id !== id)
      : (list || []).map((n) => (n._id === id ? { ...n, isRead: true } : n))));
    setUnreadCount((count) => Math.max(count - 1, 0));
  };

  const [markRead] = useAction((id) => notificationsApi.markRead(id), {
    error: 'Could not mark as read',
    onSuccess: (_res, id) => applyRead(id),
  });

  const handleMarkRead = async (id) => {
    setMarkingId(id);
    await markRead(id);
    setMarkingId(null);
  };

  const [markAllRead, markingAll] = useAction(() => notificationsApi.markAllRead(), {
    success: 'All notifications marked as read',
    onSuccess: () => {
      setUnreadCount(0);
      if (unreadOnly) {
        setData([]);
        if (page !== 1) setPage(1);
        else reload();
      } else {
        setData((list) => (list || []).map((n) => ({ ...n, isRead: true })));
      }
      refreshUnread();
    },
  });

  const [removeNotification, removing] = useAction((id) => notificationsApi.remove(id), {
    success: 'Notification deleted',
    onSuccess: (_res, id) => {
      const wasUnread = notifications.some((n) => n._id === id && !n.isRead);
      const remaining = notifications.filter((n) => n._id !== id);
      setData(remaining);
      setPendingDelete(null);
      if (wasUnread) setUnreadCount((count) => Math.max(count - 1, 0));
      // Keep pagination totals accurate (and step back if this page is now empty)
      if (!remaining.length && page > 1) setPage(page - 1);
      else reload();
      refreshUnread();
    },
  });

  const openNotification = (notification) => {
    if (!notification.isRead) {
      // Fire and forget: navigation should not wait for the request
      notificationsApi.markRead(notification._id).then(() => applyRead(notification._id)).catch(() => {});
    }
    if (notification.link) {
      if (/^https?:\/\//.test(notification.link)) window.open(notification.link, '_blank', 'noopener,noreferrer');
      else navigate(notification.link);
    }
  };

  let content;
  if (loading && !data) {
    content = <Loader label="Loading notifications…" />;
  } else if (error && !data) {
    content = <LoadError message={error} onRetry={reload} />;
  } else if (!notifications.length) {
    content = (
      <div className="card">
        {unreadOnly ? (
          <EmptyState
            compact
            icon={CheckCheck}
            title="You're all caught up"
            description="There are no unread notifications."
            actionLabel="View all notifications"
            onAction={() => changeTab('all')}
          />
        ) : (
          <EmptyState
            compact
            icon={BellOff}
            title="No notifications yet"
            description="Updates about your tasks, leave requests and account will appear here."
          />
        )}
      </div>
    );
  } else {
    content = (
      <div className="card stack">
        <div className="stack-sm" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <div
                key={n._id}
                className={`list-item notification-item clickable wrap-mobile ${n.isRead ? '' : 'unread'}`}
                role="button"
                tabIndex={0}
                aria-label={`${n.isRead ? '' : 'Unread: '}${n.title}`}
                onClick={(e) => {
                  if (!e.target.closest('button, a')) openNotification(n);
                }}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    openNotification(n);
                  }
                }}
              >
                <span className="notification-icon">
                  <Icon size={18} />
                </span>
                <div className="list-item-body">
                  <span className="list-item-title">{n.title}</span>
                  {n.message && <p className="text-sm text-muted">{n.message}</p>}
                  <span className="list-item-meta" title={formatDateTime(n.createdAt)}>
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
                <div className="list-item-actions">
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="btn-icon"
                      icon={Check}
                      aria-label="Mark as read"
                      title="Mark as read"
                      loading={markingId === n._id}
                      onClick={() => handleMarkRead(n._id)}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="btn-icon"
                    icon={Trash2}
                    aria-label="Delete notification"
                    title="Delete"
                    onClick={() => setPendingDelete(n)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Stay on top of updates across PeopleFlow'}
      >
        <Button variant="secondary" icon={CheckCheck} disabled={!unreadCount} loading={markingAll} onClick={() => markAllRead()}>
          Mark all as read
        </Button>
      </PageHeader>

      <div className="tab-list" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => changeTab(t.key)}
          >
            {t.label}
            {t.key === 'unread' && unreadCount > 0 && <span className="badge badge-info">{unreadCount}</span>}
          </button>
        ))}
      </div>

      {content}

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Notification"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={removing}
        onConfirm={() => removeNotification(pendingDelete._id)}
      >
        <p>
          Delete the notification <strong>{pendingDelete?.title}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
