const moment = require('moment');

module.exports = {
  formatDate: function (date, format) {
    if (!date) return '';
    const momentDate = moment(date);
    if (!momentDate.isValid()) {
      console.log(`Invalid date encountered: ${date}`);
      return 'Invalid date';
    }
    return momentDate.format(format || 'YYYY-MM-DD');
  },

  eq: function (a, b) {
    return a === b;
  },

  ifEqual: function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  },

  neq: function (a, b) {
    return a !== b;
  },

  gt: function (a, b) {
    return a > b;
  },

  lt: function (a, b) {
    return a < b;
  },

  gte: function (a, b) {
    return a >= b;
  },

  lte: function (a, b) {
    return a <= b;
  },

  and: function () {
    return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
  },

  or: function () {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  },

  not: function (value) {
    return !value;
  },

  json: function (context) {
    return JSON.stringify(context);
  },

  contains: function (list, item) {
    if (!list || !Array.isArray(list)) return false;
    if (item === undefined || item === null) return false;
    return list.includes(item);
  },

  isArray: function (value) {
    return Array.isArray(value);
  },

  startsWith: function (str, prefix) {
    if (typeof str !== 'string') return false;
    return str.startsWith(prefix);
  },

  endsWith: function (str, suffix) {
    if (typeof str !== 'string') return false;
    return str.endsWith(suffix);
  },

  toLowerCase: function (str) {
    if (typeof str !== 'string') return '';
    return str.toLowerCase();
  },

  toUpperCase: function (str) {
    if (typeof str !== 'string') return '';
    return str.toUpperCase();
  },

  formatCurrency: function (amount, currency = 'USD') {
    if (amount === undefined || amount === null) return '';
    try {
      const currencySymbol = currency === 'EUR' ? '€' : '$';
      return (
        currencySymbol +
        parseFloat(amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    } catch (e) {
      return amount;
    }
  },

  nl2br: function (text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  },
};
