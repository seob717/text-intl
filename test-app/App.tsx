/**
 * Sample app for testing AI translation
 */
import { useTranslation } from 'text-intl/react';

export function App() {
  const { t } = useTranslation('common');

  return (
    <div>
      {/* Simple messages */}
      <h1>{t('Welcome to our application')}</h1>
      <p>{t('This is a sample app for testing internationalization.')}</p>

      {/* Messages with variables */}
      <p>{t('Hello, {name}!', { name: 'John' })}</p>
      <p>{t('You have {count} new messages', { count: 5 })}</p>

      {/* ICU plural format */}
      <p>
        {t('{count, plural, =0 {No items} one {# item} other {# items}} in your cart', {
          count: 3,
        })}
      </p>

      {/* Messages with tags */}
      <p>
        {t('Click <link>here</link> to learn more', {
          link: (children) => <a href="/learn">{children}</a>,
        })}
      </p>

      {/* Complex message */}
      <p>
        {t('Your order of {itemCount} items totaling {price} will arrive on {date}', {
          itemCount: 2,
          price: '$29.99',
          date: new Date().toLocaleDateString(),
        })}
      </p>
    </div>
  );
}

export function Header() {
  const { t } = useTranslation('common');

  return (
    <header>
      <nav>
        <a href="/">{t('Home')}</a>
        <a href="/about">{t('About Us')}</a>
        <a href="/contact">{t('Contact')}</a>
        <a href="/help">{t('Help & Support')}</a>
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer>
      <p>{t('All rights reserved.')}</p>
      <p>{t('Privacy Policy')}</p>
      <p>{t('Terms of Service')}</p>
    </footer>
  );
}
