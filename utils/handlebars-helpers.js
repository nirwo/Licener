const moment = require('moment');

module.exports = {
  // Format date using moment.js
  formatDate: function(date, format) {
    return moment(date).format(format);
  },
  
  // Check if a date is in the past
  isPast: function(date) {
    return moment(date).isBefore(moment());
  },
  
  // Calculate days between two dates
  daysBetween: function(date1, date2) {
    return moment(date2).diff(moment(date1), 'days');
  },
  
  // Calculate days from now
  daysFromNow: function(date) {
    return moment(date).diff(moment(), 'days');
  },
  
  // Format number as currency
  formatCurrency: function(number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(number);
  },
  
  // Calculate percentage
  percentage: function(value, total) {
    if (total <= 0) return 0;
    return Math.round((value / total) * 100);
  },
  
  // Get appropriate CSS class based on percentage
  percentageClass: function(percentage) {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'success';
  },
  
  // Get appropriate CSS class based on days remaining
  daysRemainingClass: function(days) {
    if (days < 0) return 'danger';
    if (days <= 30) return 'warning';
    return 'success';
  },
  
  // Get appropriate CSS class based on license status
  licenseStatusClass: function(status) {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'danger';
      case 'pending': return 'warning';
      case 'renewed': return 'info';
      default: return 'secondary';
    }
  },
  
  // Get appropriate CSS class based on system status
  systemStatusClass: function(status) {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'maintenance': return 'warning';
      case 'retired': return 'danger';
      default: return 'secondary';
    }
  },
  
  // Conditional if equal
  ifEqual: function(a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  },
  
  // Conditional if not equal
  ifNotEqual: function(a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
  },
  
  // Conditional if one of multiple values
  ifIn: function(elem, list, options) {
    if (typeof list === 'string') {
      list = list.split(',');
    }
    return list.indexOf(elem) > -1 ? options.fn(this) : options.inverse(this);
  },
  
  // Check if value is greater than
  ifGt: function(a, b, options) {
    return a > b ? options.fn(this) : options.inverse(this);
  },
  
  // Check if value is less than
  ifLt: function(a, b, options) {
    return a < b ? options.fn(this) : options.inverse(this);
  },
  
  // Simple math operations
  math: function(lvalue, operator, rvalue) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);
    
    switch (operator) {
      case '+': return lvalue + rvalue;
      case '-': return lvalue - rvalue;
      case '*': return lvalue * rvalue;
      case '/': return lvalue / rvalue;
      case '%': return lvalue % rvalue;
      default: return 0;
    }
  },
  
  // Slice an array
  slice: function(array, start, end) {
    if (!Array.isArray(array)) return [];
    return array.slice(start, end);
  },
  
  // Check if an array contains an item
  contains: function(array, item) {
    if (!Array.isArray(array)) return false;
    return array.includes(item);
  },
  
  // JSON stringify for debugging
  json: function(context) {
    return JSON.stringify(context);
  },
  
  // Truncate text
  truncate: function(str, length) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  },
  
  // Convert newlines to <br> tags
  nl2br: function(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  },
  
  // Generate select options for pagination
  paginationOptions: function(currentPage, totalPages) {
    let options = '';
    for (let i = 1; i <= totalPages; i++) {
      options += `<option value="${i}" ${i === currentPage ? 'selected' : ''}>${i}</option>`;
    }
    return options;
  },
  
  // Generate pagination links
  paginationLinks: function(currentPage, totalPages, urlPattern) {
    if (totalPages <= 1) return '';
    
    let links = '';
    const maxLinks = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxLinks / 2));
    let endPage = Math.min(totalPages, startPage + maxLinks - 1);
    
    if (endPage - startPage + 1 < maxLinks) {
      startPage = Math.max(1, endPage - maxLinks + 1);
    }
    
    // Previous button
    if (currentPage > 1) {
      links += `<li class="page-item"><a class="page-link" href="${urlPattern.replace('{{page}}', currentPage - 1)}">Previous</a></li>`;
    } else {
      links += `<li class="page-item disabled"><span class="page-link">Previous</span></li>`;
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
      links += `<li class="page-item disabled"><span class="page-link">Next</span></li>`;
    }
    
    return links;
  }
};