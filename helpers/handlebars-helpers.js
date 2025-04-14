/**
 * Handlebars Helpers
 * Custom helper functions used in Handlebars templates
 */

const moment = require('moment');

// Helper function to format dates with Moment.js
function formatDate(date, format) {
  if (!date) return '';

  // If format is not provided, return a relative date format
  if (!format) {
    const dateObj = moment(date);
    const now = moment();

    // If date is today
    if (dateObj.isSame(now, 'day')) {
      return `Today at ${dateObj.format('h:mm A')}`;
    }

    // If date is yesterday
    if (dateObj.isSame(now.clone().subtract(1, 'day'), 'day')) {
      return `Yesterday at ${dateObj.format('h:mm A')}`;
    }

    // If date is within the last week
    if (dateObj.isAfter(now.clone().subtract(7, 'days'))) {
      return dateObj.format('dddd [at] h:mm A'); // e.g., "Monday at 2:30 PM"
    }

    // Otherwise use full date format
    return dateObj.format('MMMM Do YYYY, h:mm A');
  }

  return moment(date).format(format);
}

// Helper function to check if a value is equal to another
function eq(v1, v2) {
  return v1 === v2;
}

// Helper function to check if a value is greater than another
function gt(v1, v2) {
  return v1 > v2;
}

// Helper function to check if a value is less than another
function lt(v1, v2) {
  return v1 < v2;
}

// Helper function to check if a value is greater than or equal to another
function gte(v1, v2) {
  return v1 >= v2;
}

// Helper function to check if a value is less than or equal to another
function lte(v1, v2) {
  return v1 <= v2;
}

// Helper function to calculate the number of days from now to a date
function daysFromNow(date) {
  if (!date) return 0;
  const now = moment();
  const futureDate = moment(date);
  return Math.max(0, futureDate.diff(now, 'days'));
}

// Helper function to check if a date is in the past
function isPast(date) {
  if (!date) return false;
  return moment(date).isBefore(moment());
}

// Helper function to get a CSS class based on the number of days remaining
function daysRemainingClass(days) {
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

// Helper function to get a CSS class based on subscription status
function subscriptionStatusClass(status) {
  if (!status) return 'secondary';

  switch (status.toLowerCase()) {
    case 'active':
    return 'success';
    case 'pending':
    return 'warning';
    case 'expired':
    return 'danger';
    case 'renewed':
    return 'info';
    default:
    return 'secondary';
  }
}

// Helper function to calculate a percentage
function percentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Helper function to get a CSS class based on a percentage
function percentageClass(value) {
  if (value >= 90) return 'danger';
  if (value >= 70) return 'warning';
  return 'success';
}

// Helper function to convert a number to a currency format
function formatCurrency(amount, currency = 'USD') {
  if (amount === undefined || amount === null) return '';

  const currencySymbol = currency === 'EUR' ? '€' : '$';
  return (
    currencySymbol +
    parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Helper function to check if an array or object contains a value
function contains(collection, value) {
  if (!collection) return false;

  if (Array.isArray(collection)) {
    return collection.some(item => {
      // Handle ObjectId comparison
      if (item && item.toString && value && value.toString) {
        return item.toString() === value.toString();
      }
      return item === value;
    });
  }

  if (typeof collection === 'object') {
    return Object.values(collection).some(item => item === value);
  }

  return false;
}

// Helper function to check if a value is an array
function isArray(value) {
  return Array.isArray(value);
}

// Helper function to convert newlines to HTML line breaks
function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br />');
}

// Helper function to truncate text
function truncate(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Helper function to join array values with a separator
function join(arr, separator) {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(separator || ', ');
}

// Export all helper functions
module.exports = {
  formatDate,
  eq,
  gt,
  lt,
  gte,
  lte,
  daysFromNow,
  isPast,
  daysRemainingClass,
  subscriptionStatusClass,
  percentage,
  percentageClass,
  formatCurrency,
  contains,
  isArray,
  nl2br,
  truncate,
  join,
};
