/**
 * Auto-generated types for i18n messages
 * Do not edit manually - generated from meta files
 */

import type { TagHandler } from '@unknown/i18n';

export type Locale = 'en' | 'ko' | 'ja' | 'zh';

export type CommonMessageKey =
  | 'About Us'
  | 'All rights reserved.'
  | 'Click <link>here</link> to learn more'
  | 'Contact'
  | 'Hello, {name}!'
  | 'Help & Support'
  | 'Home'
  | 'Privacy Policy'
  | 'Terms of Service'
  | 'This is a sample app for testing internationalization.'
  | 'Welcome to our application'
  | 'You have {count} new messages'
  | 'Your order of {itemCount} items totaling {price} will arrive on {date}'
  | '{count, plural, =0 {No items} one {# item} other {# items}} in your cart';

export type DashboardMessageKey =
  | 'Active sessions: {count}'
  | 'Create New Report'
  | 'Dashboard'
  | 'Export Data'
  | 'Last login: {time}'
  | 'Manage Users'
  | 'Quick Actions'
  | 'Recent Activity'
  | 'Revenue this month: {amount}'
  | 'Statistics'
  | 'Total users: {count}'
  | 'View Analytics'
  | 'Welcome back, {username}!'
  | '{count, plural, =0 {No new notifications} one {# new notification} other {# new notifications}}';

export type Namespace = 'common' | 'dashboard';

export type MessageParams<T extends string> = T extends 'About Us'
  ? undefined
  : T extends 'All rights reserved.'
    ? undefined
    : T extends 'Click <link>here</link> to learn more'
      ? { link?: TagHandler }
      : T extends 'Contact'
        ? undefined
        : T extends 'Hello, {name}!'
          ? { name: string | number | Date | boolean }
          : T extends 'Help & Support'
            ? undefined
            : T extends 'Home'
              ? undefined
              : T extends 'Privacy Policy'
                ? undefined
                : T extends 'Terms of Service'
                  ? undefined
                  : T extends 'This is a sample app for testing internationalization.'
                    ? undefined
                    : T extends 'Welcome to our application'
                      ? undefined
                      : T extends 'You have {count} new messages'
                        ? { count: string | number | Date | boolean }
                        : T extends 'Your order of {itemCount} items totaling {price} will arrive on {date}'
                          ? {
                              itemCount: string | number | Date | boolean;
                              price: string | number | Date | boolean;
                              date: string | number | Date | boolean;
                            }
                          : T extends '{count, plural, =0 {No items} one {# item} other {# items}} in your cart'
                            ? { count: string | number | Date | boolean }
                            : T extends 'Active sessions: {count}'
                              ? { count: string | number | Date | boolean }
                              : T extends 'Create New Report'
                                ? undefined
                                : T extends 'Dashboard'
                                  ? undefined
                                  : T extends 'Export Data'
                                    ? undefined
                                    : T extends 'Last login: {time}'
                                      ? { time: string | number | Date | boolean }
                                      : T extends 'Manage Users'
                                        ? undefined
                                        : T extends 'Quick Actions'
                                          ? undefined
                                          : T extends 'Recent Activity'
                                            ? undefined
                                            : T extends 'Revenue this month: {amount}'
                                              ? { amount: string | number | Date | boolean }
                                              : T extends 'Statistics'
                                                ? undefined
                                                : T extends 'Total users: {count}'
                                                  ? { count: string | number | Date | boolean }
                                                  : T extends 'View Analytics'
                                                    ? undefined
                                                    : T extends 'Welcome back, {username}!'
                                                      ? {
                                                          username:
                                                            | string
                                                            | number
                                                            | Date
                                                            | boolean;
                                                        }
                                                      : T extends '{count, plural, =0 {No new notifications} one {# new notification} other {# new notifications}}'
                                                        ? {
                                                            count: string | number | Date | boolean;
                                                          }
                                                        : Record<string, unknown>;
