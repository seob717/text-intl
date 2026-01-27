/**
 * Dashboard component with 'dashboard' namespace
 */
import { useTranslation } from 'text-intl/react';

export function Dashboard() {
  const { t } = useTranslation('dashboard');

  return (
    <div>
      <h1>{t('Dashboard')}</h1>
      <p>{t('Welcome back, {username}!', { username: 'Admin' })}</p>

      <section>
        <h2>{t('Statistics')}</h2>
        <p>{t('Total users: {count}', { count: 1234 })}</p>
        <p>{t('Active sessions: {count}', { count: 56 })}</p>
        <p>{t('Revenue this month: {amount}', { amount: '$12,345' })}</p>
      </section>

      <section>
        <h2>{t('Recent Activity')}</h2>
        <p>{t('Last login: {time}', { time: '2 hours ago' })}</p>
        <p>
          {t(
            '{count, plural, =0 {No new notifications} one {# new notification} other {# new notifications}}',
            {
              count: 7,
            }
          )}
        </p>
      </section>

      <section>
        <h2>{t('Quick Actions')}</h2>
        <button>{t('Create New Report')}</button>
        <button>{t('Export Data')}</button>
        <button>{t('View Analytics')}</button>
        <button>{t('Manage Users')}</button>
      </section>
    </div>
  );
}
