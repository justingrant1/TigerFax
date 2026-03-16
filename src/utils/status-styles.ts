/**
 * Shared status style utility — single source of truth for fax status colors/icons.
 * Used by HistoryScreen, FaxDetailScreen, and any other status-aware component.
 */

import { FaxJob } from '../state/fax-store';

export interface StatusStyle {
  /** Tailwind bg + text classes for badge/chip */
  badgeClass: string;
  /** Tailwind text color class */
  textClass: string;
  /** Tailwind bg color class */
  bgClass: string;
  /** Ionicons icon name */
  icon: 'checkmark-circle' | 'time' | 'alert-circle' | 'hourglass';
  /** Human-readable label */
  label: string;
}

export function getStatusStyle(status: FaxJob['status']): StatusStyle {
  switch (status) {
    case 'sent':
      return {
        badgeClass: 'bg-green-100',
        textClass: 'text-green-700',
        bgClass: 'bg-green-100',
        icon: 'checkmark-circle',
        label: 'Sent',
      };
    case 'sending':
      return {
        badgeClass: 'bg-blue-100',
        textClass: 'text-blue-700',
        bgClass: 'bg-blue-100',
        icon: 'time',
        label: 'Sending',
      };
    case 'failed':
      return {
        badgeClass: 'bg-red-100',
        textClass: 'text-red-700',
        bgClass: 'bg-red-100',
        icon: 'alert-circle',
        label: 'Failed',
      };
    default:
      return {
        badgeClass: 'bg-yellow-100',
        textClass: 'text-yellow-700',
        bgClass: 'bg-yellow-100',
        icon: 'hourglass',
        label: 'Pending',
      };
  }
}

/** Pricing constants — single source of truth */
export const FAX_PRICE_PER_PAGE = 0.99;

/** Free pages every new user gets (lifetime, not monthly) */
export const FREE_PAGES_LIFETIME = 3;

/** RevenueCat product ID for a single page credit consumable */
export const PAGE_CREDIT_PRODUCT_ID = 'tigerfax.page.credit';
