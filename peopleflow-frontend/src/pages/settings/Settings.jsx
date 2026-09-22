import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, History, KeyRound, Mail, Monitor, Moon, Palette, ShieldCheck, Sun, Table2, User } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { DetailItem } from '../../components/common/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getPreferences, savePreferences } from '../../utils/preferences';
import { ROLE_LABELS } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50].map((n) => ({ value: String(n), label: `${n} rows` }));

const PERMISSION_TEXT = {
  granted: { label: 'Allowed', tone: 'success' },
  denied: { label: 'Blocked', tone: 'danger' },
  default: { label: 'Not requested', tone: 'neutral' },
  unsupported: { label: 'Not supported', tone: 'neutral' },
};

const readPermission = () => ('Notification' in window ? Notification.permission : 'unsupported');

function SettingsCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <span className="card-subtitle">{subtitle}</span>}
        </div>
        <Icon size={20} className="card-icon" />
      </div>
      {children}
    </section>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(getPreferences);
  const [permission, setPermission] = useState(readPermission);
  const [requesting, setRequesting] = useState(false);

  const update = (patch, message) => {
    setPrefs(savePreferences(patch));
    toast.success(message);
  };

  const changeTheme = (theme) => {
    if (theme === prefs.theme) return;
    const label = THEME_OPTIONS.find((t) => t.value === theme)?.label;
    update({ theme }, `Theme set to ${label.toLowerCase()}`);
  };

  const toggleDesktopNotifications = async (enabled) => {
    if (!enabled) {
      update({ desktopNotifications: false }, 'Desktop notifications turned off');
      return;
    }

    if (!('Notification' in window)) {
      toast.error('Not supported', 'This browser does not support desktop notifications.');
      return;
    }

    let result = Notification.permission;
    if (result === 'default') {
      setRequesting(true);
      try {
        result = await Notification.requestPermission();
      } catch {
        result = Notification.permission;
      } finally {
        setRequesting(false);
      }
      setPermission(result);
    }

    if (result === 'granted') {
      update({ desktopNotifications: true }, 'Desktop notifications turned on');
    } else if (result === 'denied') {
      toast.error(
        'Notifications are blocked',
        'Your browser is blocking notifications for this site. Allow them in the browser\'s site settings, then try again.',
      );
    } else {
      toast.info('Permission not granted', 'Desktop notifications stay off until you allow them in the browser prompt.');
    }
  };

  const permissionInfo = PERMISSION_TEXT[permission] || PERMISSION_TEXT.default;
  const desktopEnabled = prefs.desktopNotifications && permission === 'granted';

  return (
    <div>
      <PageHeader title="Settings" subtitle="Personalise how PeopleFlow looks and behaves on this device" />

      <div className="stack max-w-md">
        <SettingsCard icon={Palette} title="Appearance" subtitle="Choose a colour theme. System follows your device setting.">
          <div className="row" role="group" aria-label="Theme">
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={prefs.theme === option.value ? 'primary' : 'secondary'}
                icon={option.icon}
                aria-pressed={prefs.theme === option.value}
                onClick={() => changeTheme(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard icon={Table2} title="Tables" subtitle="Control how much data lists show at once">
          <Select
            label="Rows per page"
            placeholder={null}
            options={PAGE_SIZE_OPTIONS}
            value={String(prefs.pageSize)}
            onChange={(e) => update({ pageSize: Number(e.target.value) }, `Lists will show ${e.target.value} rows per page`)}
            hint="Applies to lists the next time they load."
          />
        </SettingsCard>

        <SettingsCard icon={Bell} title="Notifications" subtitle="In-app notifications are always on">
          <div className="stack-sm">
            <label className="checkbox-row">
              <span>
                <span className="text-bold" style={{ display: 'block' }}>Desktop notifications</span>
                <span className="text-xs text-muted">
                  Show a system notification for new updates while PeopleFlow is in a background tab.
                </span>
              </span>
              <input
                type="checkbox"
                checked={desktopEnabled}
                disabled={requesting || permission === 'unsupported'}
                onChange={(e) => toggleDesktopNotifications(e.target.checked)}
              />
            </label>
            <div className="row text-xs text-muted">
              <span>Browser permission:</span>
              <span className={`badge badge-${permissionInfo.tone}`}>{permissionInfo.label}</span>
            </div>
            {permission === 'denied' && (
              <p className="text-xs text-muted">
                To enable desktop notifications, allow notifications for this site in your browser settings and reload the page.
              </p>
            )}
          </div>
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="Security" subtitle="Keep your account safe">
          <div className="row-between">
            <div>
              <span className="text-sm text-bold" style={{ display: 'block' }}>Password</span>
              <span className="text-xs text-muted">Change the password you use to sign in to PeopleFlow.</span>
            </div>
            <Button variant="secondary" icon={KeyRound} onClick={() => navigate('/change-password')}>
              Change Password
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard icon={User} title="Account summary" subtitle="Details of the account you are signed in with">
          <div className="detail-list">
            <DetailItem icon={User} label="Name">{user?.name}</DetailItem>
            <DetailItem icon={Mail} label="Email">{user?.email}</DetailItem>
            <DetailItem icon={ShieldCheck} label="Role">{ROLE_LABELS[user?.role] || user?.role}</DetailItem>
            <DetailItem icon={History} label="Last login">{formatDateTime(user?.lastLoginAt)}</DetailItem>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
