import { Bell, Check, MonitorCog, Save, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { loadAccount, saveDisplaySettings, saveNotificationSettings, saveSettings } from '../features/user/userSlice';
import Spinner from '../components/common/Spinner';

export default function Settings() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.user.settings);
  const [form, setForm] = useState(() => (settings ? { ...settings } : null));
  const [notice, setNotice] = useState('');
  const [savingSection, setSavingSection] = useState(null);

  useEffect(() => {
    if (!settings) dispatch(loadAccount());
  }, [dispatch, settings]);

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => prev || { ...settings });
    }
  }, [settings]);

  if (!form) {
    return (
      <div className="loading-card tall">
        <Spinner />
        <span>Loading settings…</span>
      </div>
    );
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice('');
    }, 4000);
  };

  const saveAll = async (e) => {
    e.preventDefault();
    setSavingSection('all');
    try {
      const r = await dispatch(
        saveSettings({
          emailNotifications: form.emailNotifications,
          smsNotifications: form.smsNotifications,
          pushNotifications: form.pushNotifications,
          delayAlertThresholdMinutes: Number(form.delayAlertThresholdMinutes),
          etaChangeAlerts: form.etaChangeAlerts,
          theme: form.theme,
          distanceUnit: form.distanceUnit,
          timeFormat: form.timeFormat,
          autoRefreshIntervalSeconds: Number(form.autoRefreshIntervalSeconds),
          preferredTravelClass: form.preferredTravelClass,
          preferredBerthChoice: form.preferredBerthChoice,
        })
      );
      if (saveSettings.fulfilled.match(r)) {
        showNotice('All settings saved.');
      }
    } finally {
      setSavingSection(null);
    }
  };

  const saveNotif = async () => {
    setSavingSection('notif');
    try {
      const r = await dispatch(
        saveNotificationSettings({
          emailNotifications: form.emailNotifications,
          smsNotifications: form.smsNotifications,
          pushNotifications: form.pushNotifications,
          delayAlertThresholdMinutes: Number(form.delayAlertThresholdMinutes),
          etaChangeAlerts: form.etaChangeAlerts,
        })
      );
      if (saveNotificationSettings.fulfilled.match(r)) {
        showNotice('Notification settings saved.');
      }
    } finally {
      setSavingSection(null);
    }
  };

  const saveDisplay = async () => {
    setSavingSection('display');
    try {
      const r = await dispatch(
        saveDisplaySettings({
          theme: form.theme,
          distanceUnit: form.distanceUnit,
          timeFormat: form.timeFormat,
          autoRefreshIntervalSeconds: Number(form.autoRefreshIntervalSeconds),
        })
      );
      if (saveDisplaySettings.fulfilled.match(r)) {
        showNotice('Display settings saved.');
      }
    } finally {
      setSavingSection(null);
    }
  };

  return (
    <div className="settings-page-wrap">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Personalize RightTrack</span>
          <h1>Settings</h1>
          <p>Control alerts, display preferences, and travel defaults.</p>
        </div>
      </section>

      <form className="settings-dashboard-grid" onSubmit={saveAll}>
        {/* Section 1: Notifications */}
        <section className="settings-section-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <h2>
                <Bell size={17} /> Notifications
              </h2>
              <p>Choose when RightTrack should keep you informed.</p>
            </div>
            <button
              type="button"
              className="secondary-button small"
              onClick={saveNotif}
              disabled={savingSection === 'notif'}
            >
              {savingSection === 'notif' ? 'Saving…' : 'Save notifications'}
            </button>
          </div>

          <div className="setting-rows-list">
            <SettingRow
              title="Email notifications"
              desc="Receive travel updates and delay alerts via email"
              control={
                <button
                  type="button"
                  className={`toggle ${form.emailNotifications ? 'on' : ''}`}
                  onClick={() => set('emailNotifications', !form.emailNotifications)}
                  aria-pressed={Boolean(form.emailNotifications)}
                  aria-label="Toggle email notifications"
                >
                  <span />
                </button>
              }
            />

            <SettingRow
              title="SMS notifications"
              desc="Get critical delay and platform notices on your phone"
              control={
                <button
                  type="button"
                  className={`toggle ${form.smsNotifications ? 'on' : ''}`}
                  onClick={() => set('smsNotifications', !form.smsNotifications)}
                  aria-pressed={Boolean(form.smsNotifications)}
                  aria-label="Toggle SMS notifications"
                >
                  <span />
                </button>
              }
            />

            <SettingRow
              title="Push notifications"
              desc="Instant browser alerts when journey updates occur"
              control={
                <button
                  type="button"
                  className={`toggle ${form.pushNotifications ? 'on' : ''}`}
                  onClick={() => set('pushNotifications', !form.pushNotifications)}
                  aria-pressed={Boolean(form.pushNotifications)}
                  aria-label="Toggle push notifications"
                >
                  <span />
                </button>
              }
            />

            <SettingRow
              title="ETA change alerts"
              desc="Notify when predicted arrival time changes significantly"
              control={
                <button
                  type="button"
                  className={`toggle ${form.etaChangeAlerts ? 'on' : ''}`}
                  onClick={() => set('etaChangeAlerts', !form.etaChangeAlerts)}
                  aria-pressed={Boolean(form.etaChangeAlerts)}
                  aria-label="Toggle ETA change alerts"
                >
                  <span />
                </button>
              }
            />

            <SettingRow
              title="Delay alert threshold"
              desc="Minimum delay in minutes before triggering an alert"
              control={
                <input
                  type="number"
                  min="1"
                  className="setting-threshold-input"
                  value={form.delayAlertThresholdMinutes}
                  onChange={(e) => set('delayAlertThresholdMinutes', e.target.value)}
                  aria-label="Delay alert threshold minutes"
                />
              }
            />
          </div>
        </section>

        {/* Section 2: Display */}
        <section className="settings-section-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <h2>
                <MonitorCog size={17} /> Display
              </h2>
              <p>These preferences also drive live polling cadence.</p>
            </div>
            <button
              type="button"
              className="secondary-button small"
              onClick={saveDisplay}
              disabled={savingSection === 'display'}
            >
              {savingSection === 'display' ? 'Saving…' : 'Save display'}
            </button>
          </div>

          <div className="settings-field-grid">
            <div className="settings-field-item">
              <label htmlFor="theme-select">Theme</label>
              <select
                id="theme-select"
                className="settings-control-select"
                value={form.theme}
                onChange={(e) => set('theme', e.target.value)}
              >
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            <div className="settings-field-item">
              <label htmlFor="distance-unit-select">Distance unit</label>
              <select
                id="distance-unit-select"
                className="settings-control-select"
                value={form.distanceUnit}
                onChange={(e) => set('distanceUnit', e.target.value)}
              >
                <option value="KM">Kilometers (km)</option>
                <option value="MILES">Miles (mi)</option>
              </select>
            </div>

            <div className="settings-field-item">
              <label htmlFor="time-format-select">Time format</label>
              <select
                id="time-format-select"
                className="settings-control-select"
                value={form.timeFormat}
                onChange={(e) => set('timeFormat', e.target.value)}
              >
                <option value="H12">12-hour (1:30 PM)</option>
                <option value="H24">24-hour (13:30)</option>
              </select>
            </div>

            <div className="settings-field-item">
              <label htmlFor="refresh-interval-input">Auto-refresh interval (seconds)</label>
              <input
                id="refresh-interval-input"
                type="number"
                min="10"
                className="settings-control-input"
                value={form.autoRefreshIntervalSeconds}
                onChange={(e) => set('autoRefreshIntervalSeconds', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Travel Defaults */}
        <section className="settings-section-card full-width">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <h2>
                <SlidersHorizontal size={17} /> Travel defaults
              </h2>
              <p>Defaults for how you plan, search, and view train journeys.</p>
            </div>
          </div>

          <div className="settings-field-grid">
            <div className="settings-field-item">
              <label htmlFor="class-select">Preferred travel class</label>
              <select
                id="class-select"
                className="settings-control-select"
                value={form.preferredTravelClass}
                onChange={(e) => set('preferredTravelClass', e.target.value)}
              >
                <option value="SL">Sleeper (SL)</option>
                <option value="3A">AC 3 Tier (3A)</option>
                <option value="2A">AC 2 Tier (2A)</option>
                <option value="1A">AC First Class (1A)</option>
                <option value="CC">AC Chair Car (CC)</option>
                <option value="2S">Second Sitting (2S)</option>
              </select>
            </div>

            <div className="settings-field-item">
              <label htmlFor="berth-select">Preferred berth</label>
              <select
                id="berth-select"
                className="settings-control-select"
                value={form.preferredBerthChoice}
                onChange={(e) => set('preferredBerthChoice', e.target.value)}
              >
                <option value="NO_PREFERENCE">No preference</option>
                <option value="LOWER">Lower berth</option>
                <option value="MIDDLE">Middle berth</option>
                <option value="UPPER">Upper berth</option>
                <option value="SIDE_LOWER">Side lower</option>
                <option value="SIDE_UPPER">Side upper</option>
              </select>
            </div>
          </div>

          <div className="settings-footer-actions">
            <div>
              {notice ? (
                <span className="settings-notice-pill">
                  <Check size={13} /> {notice}
                </span>
              ) : (
                <span className="text-[11px] text-[#738d8f]">
                  Changes saved here apply immediately across your session.
                </span>
              )}
            </div>
            <button
              type="submit"
              className="primary-button small"
              disabled={savingSection === 'all'}
            >
              <Save size={14} /> {savingSection === 'all' ? 'Saving…' : 'Save all settings'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function SettingRow({ title, desc, control }) {
  return (
    <div className="setting-row">
      <div className="setting-row-left">
        <span className="setting-row-title">{title}</span>
        {desc && <span className="setting-row-desc">{desc}</span>}
      </div>
      <div className="setting-row-control">{control}</div>
    </div>
  );
}
