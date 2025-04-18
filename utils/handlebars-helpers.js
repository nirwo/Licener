const moment = require('moment');

module.exports = {
  // String comparison helpers
  startsWith: function (str, prefix) {
    if (typeof str !== 'string') {
      return false;
    }
    return str.startsWith(prefix);
  },

  // Simple equality comparison
  eq: function (a, b) {
    return a === b;
  },

  // Logical OR operator
  or: function (a, b) {
    return a || b;
  },

  // Logical AND operator
  and: function (a, b) {
    return a && b;
  },

  // Less than comparison
  lessThan: function (a, b) {
    return parseInt(a) < parseInt(b);
  },

  // Greater than comparison
  greaterThan: function (a, b) {
    return parseInt(a) > parseInt(b);
  },

  // Multiply two numbers
  multiply: function (a, b) {
    return parseFloat(a) * parseFloat(b);
  },

  // Divide two numbers
  divide: function (a, b) {
    if (parseFloat(b) === 0) return 0;
    return parseFloat(a) / parseFloat(b);
  },

  // Add two numbers
  add: function (a, b) {
    return parseFloat(a) + parseFloat(b);
  },

  // Get sum of array values
  sumArray: function (arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((sum, val) => sum + parseFloat(val || 0), 0).toFixed(2);
  },

  // Get status color for badge
  statusColor: function (status) {
    switch (status) {
      case 'active':
      return 'success';
      case 'expired':
      return 'danger';
      case 'pending':
      return 'warning';
      case 'renewed':
      return 'primary';
      default:
      return 'secondary';
    }
  },

  // Average function
  average: function (total, count) {
    if (count === 0) return 0;
    return (parseFloat(total) / count).toFixed(2);
  },

  // Format date using moment.js
  formatDate: function (date, format) {
    if (!date) return '';
    return moment(date).format(format);
  },

  // Check if a date is in the past
  isPast: function (date) {
    if (!date) return false;
    const compareDate = new Date(date);
    const now = new Date();
    return compareDate < now;
  },

  // Calculate days between two dates
  daysBetween: function (date1, date2) {
    return moment(date2).diff(moment(date1), 'days');
  },

  // Calculate days from now
  daysFromNow: function (date) {
    if (!date) return '';
    const now = moment();
    const targetDate = moment(date);
    return targetDate.diff(now, 'days');
  },

  // Format number as currency
  formatCurrency: function (number, currency = 'USD') {
    // Make sure we have a valid currency code
    if (typeof currency !== 'string') {
      currency = 'USD';
    }

    // Make sure number is a valid numeric value
    if (isNaN(parseFloat(number))) {
      return '$0.00';
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(parseFloat(number));
    } catch (error) {
      // Fallback if there's an error with the formatter
      return '$' + parseFloat(number).toFixed(2);
    }
  },

  // Calculate percentage
  percentage: function (value, total) {
    if (total <= 0) return 0;
    return Math.round((value / total) * 100);
  },

  // Get appropriate CSS class based on percentage
  percentageClass: function (percentage) {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'success';
  },

  // Get appropriate CSS class based on days remaining
  daysRemainingClass: function (days) {
    if (days < 0) return 'danger'; // Already expired
    if (days < 10) return 'danger'; // Less than 10 days
    if (days < 30) return 'warning'; // Less than 30 days
    if (days < 60) return 'info'; // Less than 60 days
    return 'success'; // 60+ days remaining
  },

  // Get appropriate CSS class based on license status
  licenseStatusClass: function (status) {
    switch (status) {
      case 'active':
      return 'success';
      case 'expired':
      return 'danger';
      case 'pending':
      return 'warning';
      case 'renewed':
      return 'info';
      default:
      return 'secondary';
    }
  },

  // Get appropriate CSS class based on system status
  systemStatusClass: function (status) {
    switch (status) {
      case 'active':
      return 'success';
      case 'inactive':
      return 'secondary';
      case 'maintenance':
      return 'warning';
      case 'retired':
      return 'danger';
      default:
      return 'secondary';
    }
  },

  // Conditional if equal
  ifEqual: function (a, b, options) {
    if (a === b) {
      return options.fn(this);
    }
    return options.inverse(this);
  },

  // Conditional if not equal
  ifNotEqual: function (a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
  },

  // Conditional if one of multiple values
  ifIn: function (elem, list, options) {
    if (typeof list === 'string') {
      list = list.split(',');
    }
    return list.indexOf(elem) > -1 ? options.fn(this) : options.inverse(this);
  },

  // Check if value is greater than
  ifGt: function (a, b, options) {
    return a > b ? options.fn(this) : options.inverse(this);
  },

  // Check if value is less than
  ifLt: function (a, b, options) {
    return a < b ? options.fn(this) : options.inverse(this);
  },

  // Simple math operations
  math: function (lvalue, operator, rvalue) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    switch (operator) {
      case '+':
      return lvalue + rvalue;
      case '-':
      return lvalue - rvalue;
      case '*':
      return lvalue * rvalue;
      case '/':
      return lvalue / rvalue;
      case '%':
      return lvalue % rvalue;
      default:
      return 0;
    }
  },

  // Slice an array
  slice: function (array, start, end) {
    if (!Array.isArray(array)) return [];
    return array.slice(start, end);
  },

  // Check if an array contains an item
  contains: function (array, item) {
    if (!array) return false;
    if (typeof array === 'string') return array.includes(item);
    return Array.isArray(array) && array.includes(item);
  },

  // Check if value is an array
  isArray: function (value) {
    return Array.isArray(value);
  },

  // JSON stringify for debugging and data serialization
  json: function (context) {
    return JSON.stringify(context || []);
  },

  // Safe JSON stringify for use in JavaScript
  safeJson: function (context) {
    if (!context) return '[]';
    try {
      // If it's already a string, return it
      if (typeof context === 'string') return context;

      // If it's an empty array or object, return proper representation
      if (Array.isArray(context) && context.length === 0) return '[]';
      if (typeof context === 'object' && Object.keys(context).length === 0) return '{}';

      // Convert to JSON string with safety checks
      return JSON.stringify(context)
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
    } catch (e) {
      console.error('Error serializing JSON:', e);
      return Array.isArray(context) ? '[]' : '{}';
    }
  },

  // Truncate text
  truncate: function (str, length) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  },

  // Convert newlines to <br> tags
  nl2br: function (text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  },

  // Generate select options for pagination
  paginationOptions: function (currentPage, totalPages) {
    let options = '';
    for (let i = 1; i <= totalPages; i++) {
      options += `<option value="${i}" ${i === currentPage ? 'selected' : ''}>${i}</option>`;
    }
    return options;
  },

  // Generate pagination links
  paginationLinks: function (currentPage, totalPages, urlPattern) {
    if (totalPages <= 1) return '';

    let links = '';
    const maxLinks = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxLinks / 2));
    const endPage = Math.min(totalPages, startPage + maxLinks - 1);

    if (endPage - startPage + 1 < maxLinks) {
      startPage = Math.max(1, endPage - maxLinks + 1);
    }

    // Previous button
    if (currentPage > 1) {
      links += `<li class="page-item"><a class="page-link" href="${urlPattern.replace('{{page}}', currentPage - 1)}">Previous</a></li>`;
    } else {
      links += '<li class="page-item disabled"><span class="page-link">Previous</span></li>';
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      if (i === currentPage) {
        links += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
      } else {
        links += `<li class="page-item"><a class="page-link" href="${urlPattern.replace('{{page}}', i)}">${i}</a></li>`;
      }
    }

    // Next button
    if (currentPage < totalPages) {
      links += `<li class="page-item"><a class="page-link" href="${urlPattern.replace('{{page}}', currentPage + 1)}">Next</a></li>`;
    } else {
      links += '<li class="page-item disabled"><span class="page-link">Next</span></li>';
    }

    return links;
  },
};
