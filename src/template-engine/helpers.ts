/**
 * Template Helpers
 *
 * Custom Handlebars helpers for template rendering.
 */

import type { HelperDelegate } from 'handlebars';

/**
 * Join array elements with a separator
 */
export const join: HelperDelegate = function (array: unknown[], separator = ', ') {
  if (!Array.isArray(array)) return '';
  return array.filter(Boolean).join(separator);
};

/**
 * Get first N elements of an array
 */
export const first: HelperDelegate = function (array: unknown[], n = 1) {
  if (!Array.isArray(array)) return [];
  return array.slice(0, n);
};

/**
 * Truncate a string to a maximum length
 */
export const truncate: HelperDelegate = function (str: unknown, len = 50, suffix = '...') {
  if (typeof str !== 'string') return '';
  if (str.length <= len) return str;
  return str.slice(0, len) + suffix;
};

/**
 * Slugify a string (convert to URL-friendly format)
 */
export const slugify: HelperDelegate = function (str: unknown) {
  if (typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Format a date
 */
export const formatDate: HelperDelegate = function (date: unknown, format = 'ISO') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date as Date;
  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'ISO':
      return d.toISOString();
    case 'locale':
      return d.toLocaleDateString();
    case 'time':
      return d.toLocaleTimeString();
    case 'short':
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    default:
      return d.toISOString();
  }
};

/**
 * Conditional equality check
 */
export const eq: HelperDelegate = function (this: unknown, a: unknown, b: unknown, options: any) {
  return a === b ? options.fn(this) : options.inverse(this);
};

/**
 * Conditional inequality check
 */
export const ne: HelperDelegate = function (this: unknown, a: unknown, b: unknown, options: any) {
  return a !== b ? options.fn(this) : options.inverse(this);
};

/**
 * Logical AND
 */
export const and: HelperDelegate = function (this: unknown, ...args: unknown[]) {
  const options = args[args.length - 1] as any;
  const values = args.slice(0, -1);
  return values.every(v => Boolean(v)) ? options.fn(this) : options.inverse(this);
};

/**
 * Logical OR
 */
export const or: HelperDelegate = function (this: unknown, ...args: unknown[]) {
  const options = args[args.length - 1] as any;
  const values = args.slice(0, -1);
  return values.some(v => Boolean(v)) ? options.fn(this) : options.inverse(this);
};

/**
 * Default value if undefined/null
 */
export const defaults: HelperDelegate = function (value: unknown, defaultValue: unknown) {
  return value !== null && value !== undefined ? value : defaultValue;
};

/**
 * JSON stringify
 */
export const json: HelperDelegate = function (obj: unknown, spaces = 2) {
  return JSON.stringify(obj, null, spaces);
};

/**
 * Get object keys
 */
export const keys: HelperDelegate = function (obj: Record<string, unknown>) {
  return Object.keys(obj || {});
};

/**
 * Get object values
 */
export const values: HelperDelegate = function (obj: Record<string, unknown>) {
  return Object.values(obj || {});
};

/**
 * Register all helpers with a Handlebars instance
 */
export function registerHelpers(Handlebars: any): void {
  Handlebars.registerHelper('join', join);
  Handlebars.registerHelper('first', first);
  Handlebars.registerHelper('truncate', truncate);
  Handlebars.registerHelper('slugify', slugify);
  Handlebars.registerHelper('formatDate', formatDate);
  Handlebars.registerHelper('eq', eq);
  Handlebars.registerHelper('ne', ne);
  Handlebars.registerHelper('and', and);
  Handlebars.registerHelper('or', or);
  Handlebars.registerHelper('defaults', defaults);
  Handlebars.registerHelper('json', json);
  Handlebars.registerHelper('keys', keys);
  Handlebars.registerHelper('values', values);
}

/**
 * Export helpers as an object for external use
 */
export const helpers = {
  join,
  first,
  truncate,
  slugify,
  formatDate,
  eq,
  ne,
  and,
  or,
  defaults,
  json,
  keys,
  values
};
