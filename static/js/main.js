/**
 * Licener - License Management System
 * Main JavaScript file
 */

// Initialize tooltips and other components
document.addEventListener('DOMContentLoaded', function() {
  console.log('main.js: DOM content loaded');
  
  // Wait for jQuery to be fully loaded
  if (typeof jQuery === 'undefined') {
    console.error('jQuery is not loaded!');
    return;
  }
  
  // Make sure we have jQuery's $ function
  const $ = jQuery;
  
  // Toggle sidebar
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarWrapper = document.getElementById('sidebarWrapper');
  const contentWrapper = document.querySelector('.content-wrapper');
  
  if (sidebarToggleBtn && sidebarWrapper) {
    // Check for saved state
    const sidebarExpanded = localStorage.getItem('sidebar-expanded') === 'true';
    
    // Apply initial state
    if (sidebarExpanded) {
      sidebarWrapper.classList.add('show');
      contentWrapper.classList.add('sidebar-expanded');
    } else {
      // Default to collapsed
      sidebarWrapper.classList.remove('show');
      contentWrapper.classList.remove('sidebar-expanded');
    }
    
    sidebarToggleBtn.addEventListener('click', function() {
      sidebarWrapper.classList.toggle('show');
      contentWrapper.classList.toggle('sidebar-expanded');
      
      // Save state to localStorage
      localStorage.setItem('sidebar-expanded', sidebarWrapper.classList.contains('show'));
      
      // Debug
      console.log(`Sidebar toggled. Show: ${sidebarWrapper.classList.contains('show')}`);
    });
  }
  
  // Handle mobile sidebar
  const navbarToggler = document.querySelector('.navbar-toggler');
  if (navbarToggler && sidebarWrapper) {
    navbarToggler.addEventListener('click', function() {
      if (window.innerWidth < 768) {
        sidebarWrapper.classList.toggle('show');
      }
    });
  }
  
  // Load notifications
  loadExpiringLicenses();
  
  // Initialize Bootstrap tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Initialize Bootstrap popovers
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map(function(popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });
  
  // Add event listener for delete confirmations
  const deleteButtons = document.querySelectorAll('.delete-confirm');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        e.preventDefault();
      }
    });
  });
  
  // Dynamic field addition for system software
  const addSoftwareButton = document.getElementById('add-software');
  if (addSoftwareButton) {
    addSoftwareButton.addEventListener('click', function() {
      const softwareContainer = document.getElementById('software-container');
      const softwareCount = softwareContainer.querySelectorAll('.software-row').length;
      
      const newRow = document.createElement('div');
      newRow.className = 'row software-row mb-3';
      newRow.innerHTML = `
        <div class="col-md-5">
          <input type="text" class="form-control" name="installedSoftware[name][]" placeholder="Software Name">
        </div>
        <div class="col-md-4">
          <input type="text" class="form-control" name="installedSoftware[version][]" placeholder="Version">
        </div>
        <div class="col-md-2">
          <input type="date" class="form-control" name="installedSoftware[installDate][]">
        </div>
        <div class="col-md-1">
          <button type="button" class="btn btn-danger remove-software">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      
      softwareContainer.appendChild(newRow);
      
      // Add event listener to remove button
      const removeButton = newRow.querySelector('.remove-software');
      removeButton.addEventListener('click', function() {
        softwareContainer.removeChild(newRow);
      });
    });
  }
  
  // Dynamic field addition for license requirements
  const addLicenseButton = document.getElementById('add-license');
  if (addLicenseButton) {
    addLicenseButton.addEventListener('click', function() {
      const licenseContainer = document.getElementById('license-container');
      const licenseCount = licenseContainer.querySelectorAll('.license-row').length;
      const licenseSelect = document.getElementById('license-select');
      
      if (licenseSelect) {
        const newRow = document.createElement('div');
        newRow.className = 'row license-row mb-3';
        newRow.innerHTML = `
          <div class="col-md-8">
            <select class="form-select" name="licenses[id][]" required>
              ${licenseSelect.innerHTML}
            </select>
          </div>
          <div class="col-md-3">
            <input type="number" class="form-control" name="licenses[quantity][]" min="1" value="1" placeholder="Quantity">
          </div>
          <div class="col-md-1">
            <button type="button" class="btn btn-danger remove-license">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
        
        licenseContainer.appendChild(newRow);
        
        // Add event listener to remove button
        const removeButton = newRow.querySelector('.remove-license');
        removeButton.addEventListener('click', function() {
          licenseContainer.removeChild(newRow);
        });
      }
    });
  }
  
  // File input customization
  const fileInputs = document.querySelectorAll('.custom-file-input');
  fileInputs.forEach(input => {
    input.addEventListener('change', function(e) {
      const fileName = e.target.files[0]?.name || 'Choose file';
      const nextSibling = e.target.nextElementSibling;
      if (nextSibling) {
        nextSibling.innerText = fileName;
      }
    });
  });
  
  // Date range filters
  const dateRangeToggles = document.querySelectorAll('.date-range-toggle');
  dateRangeToggles.forEach(toggle => {
    toggle.addEventListener('change', function() {
      const dateRangeContainer = document.getElementById(this.dataset.target);
      if (dateRangeContainer) {
        if (this.checked) {
          dateRangeContainer.classList.remove('d-none');
        } else {
          dateRangeContainer.classList.add('d-none');
        }
      }
    });
  });
  
  // Filter form submission
  const filterForms = document.querySelectorAll('.filter-form');
  filterForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      // Remove empty fields before submission to keep URL clean
      const inputs = form.querySelectorAll('input, select');
      inputs.forEach(input => {
        if (input.value === '' || input.value === 'all') {
          input.disabled = true;
        }
      });
    });
  });
  
  // License expiry warning colors
  const expiryDates = document.querySelectorAll('.expiry-date');
  expiryDates.forEach(element => {
    const expiryDate = new Date(element.dataset.date);
    const today = new Date();
    const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      element.classList.add('text-danger', 'fw-bold');
    } else if (daysUntil <= 30) {
      element.classList.add('text-warning', 'fw-bold');
    }
  });
  
  // Progress bars animation
  const progressBars = document.querySelectorAll('.progress-bar');
  progressBars.forEach(bar => {
    const value = parseInt(bar.getAttribute('aria-valuenow'));
    bar.style.width = '0%';
    
    setTimeout(() => {
      bar.style.width = value + '%';
    }, 100);
    
    // Add color class based on value
    if (value > 90) {
      bar.classList.add('bg-danger');
    } else if (value > 70) {
      bar.classList.add('bg-warning');
    } else {
      bar.classList.add('bg-success');
    }
  });
  
  // Collapsible cards
  const collapsibleCards = document.querySelectorAll('.card-collapsible');
  collapsibleCards.forEach(card => {
    const header = card.querySelector('.card-header');
    const body = card.querySelector('.card-body');
    const icon = document.createElement('i');
    icon.className = 'fas fa-chevron-down float-end';
    
    if (header && body) {
      header.appendChild(icon);
      header.style.cursor = 'pointer';
      
      header.addEventListener('click', function() {
        $(body).collapse('toggle');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
      });
    }
  });
  
  // Data export functionality
  const exportButtons = document.querySelectorAll('.export-data');
  exportButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      const format = this.dataset.format || '';
      const url = new URL(this.dataset.url, window.location.origin);
      
      // Add format parameter to URL
      if (format && typeof format === 'string') {
        url.searchParams.set('format', format);
      }
      
      // Get all filter parameters from the form
      const filterForm = document.querySelector('.filter-form');
      if (filterForm) {
        const formData = new FormData(filterForm);
        for (const [key, value] of formData.entries()) {
          if (value !== '' && value !== 'all') {
            url.searchParams.set(key, value);
          }
        }
      }
      
      // Navigate to the export URL
      window.location.href = url.toString();
    });
  });
  
  // Initialize any chart.js charts
  initializeCharts();

  // Fix welcome section padding
  const welcomeSection = document.querySelector('.welcome-section');
  if (welcomeSection) {
    welcomeSection.style.paddingTop = '60px';
  }

  // Fix table overflow
  const tableResponsives = document.querySelectorAll('.table-responsive');
  tableResponsives.forEach(tableResponsive => {
    tableResponsive.style.width = '100%';
    tableResponsive.style.overflowX = 'auto';
  });

  // Set proper padding for content on mobile
  const adjustForMobile = () => {
    const contentWrapper = document.querySelector('.content-wrapper');
    const dashboardContainer = document.querySelector('.dashboard-container');
    
    if (window.innerWidth < 768) {
      if (contentWrapper) {
        contentWrapper.style.padding = '0.5rem';
      }
      if (dashboardContainer) {
        dashboardContainer.style.padding = '0.5rem';
      }
    } else {
      if (contentWrapper) {
        contentWrapper.style.padding = '1.5rem 0';
      }
      if (dashboardContainer) {
        dashboardContainer.style.padding = '1rem';
      }
    }
  };

  // Call on load
  adjustForMobile();
  // Call on resize
  window.addEventListener('resize', adjustForMobile);

  // Initialize DataTables with responsive configuration if available
  if (typeof $.fn.DataTable !== 'undefined') {
    $('.datatable').DataTable({
      responsive: true,
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
      language: {
        search: "",
        searchPlaceholder: "Search..."
      }
    });
  }
});

// Function to load expiring licenses
function loadExpiringLicenses() {
  const expiringLicensesList = document.getElementById('expiring-licenses-list');
  const expiryBadge = document.getElementById('expiry-badge');
  const expiryBadgeLg = document.getElementById('expiry-badge-lg');
  
  if (!expiringLicensesList) return;
  
  // In a real app, this would be an API call
  // For this demo, we'll simulate loading data
  setTimeout(() => {
    const mockLicenses = [
      { id: 'lic123', name: 'Microsoft Office 365', daysLeft: 5, product: 'Office 365' },
      { id: 'lic456', name: 'Adobe Creative Cloud', daysLeft: 12, product: 'Creative Cloud' },
      { id: 'lic789', name: 'Autodesk AutoCAD', daysLeft: 15, product: 'AutoCAD' },
      { id: 'lic101', name: 'Windows Server 2022', daysLeft: 8, product: 'Windows Server' }
    ];
    
    // Update the badge count
    const count = mockLicenses.length;
    expiryBadge.textContent = count;
    expiryBadgeLg.textContent = count;
    
    // Clear loading placeholder
    expiringLicensesList.innerHTML = '';
    
    if (count === 0) {
      expiringLicensesList.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="fas fa-check-circle fs-4 mb-3"></i>
          <p>No licenses expiring soon.</p>
        </div>
      `;
      return;
    }
    
    // Create notification items
    mockLicenses.forEach(license => {
      const notificationItem = document.createElement('div');
      notificationItem.className = 'card mb-2 border-left-warning';
      
      let statusClass = 'warning';
      if (license.daysLeft <= 7) {
        statusClass = 'danger';
      }
      
      notificationItem.innerHTML = `
        <div class="card-body py-2 px-3">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0">${license.name}</h6>
              <small class="text-muted">${license.product}</small>
            </div>
            <span class="badge bg-${statusClass}">${license.daysLeft} days</span>
          </div>
        </div>
      `;
      
      expiringLicensesList.appendChild(notificationItem);
    });
  }, 1000);
}

// Function to initialize charts
function initializeCharts() {
  // Only initialize if we're on the dashboard
  if (!window.location.pathname.includes('/dashboard')) {
    return;
  }
  
  console.log('Initializing charts safely...');
  
  try {
    // License utilization chart
    const utilizationChart = document.getElementById('utilizationChart');
    if (utilizationChart) {
      try {
        new Chart(utilizationChart, {
          type: 'doughnut',
          data: {
            labels: ['Used', 'Available'],
            datasets: [{
              data: [65, 35],
              backgroundColor: ['#4e73df', '#eaecf4'],
              hoverBackgroundColor: ['#2e59d9', '#dddfeb'],
              hoverBorderColor: 'rgba(234, 236, 244, 1)'
            }]
          },
          options: {
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                displayColors: false,
                callbacks: {
                  label: function(context) {
                    return context.label + ': ' + context.raw + '%';
                  }
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize utilization chart:', error);
      }
    }
    
    // License by vendor chart
    const vendorChart = document.getElementById('vendorChart');
    if (vendorChart) {
      try {
        new Chart(vendorChart, {
          type: 'bar',
          data: {
            labels: ['Microsoft', 'Adobe', 'Oracle', 'VMware', 'Autodesk'],
            datasets: [{
              label: 'License Count',
              backgroundColor: '#4e73df',
              hoverBackgroundColor: '#2e59d9',
              data: [42, 28, 16, 15, 12]
            }]
          },
          options: {
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize vendor chart:', error);
      }
    }
    
    // License expiry timeline
    const expiryChart = document.getElementById('expiryChart');
    if (expiryChart) {
      try {
        new Chart(expiryChart, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
              label: 'Expiring Licenses',
              lineTension: 0.3,
              backgroundColor: 'rgba(231, 74, 59, 0.05)',
              borderColor: '#e74a3b',
              pointRadius: 3,
              pointBackgroundColor: '#e74a3b',
              pointBorderColor: '#e74a3b',
              pointHoverRadius: 5,
              pointHoverBackgroundColor: '#e74a3b',
              pointHoverBorderColor: '#e74a3b',
              pointHitRadius: 10,
              pointBorderWidth: 2,
              data: [5, 7, 3, 12, 8, 9, 14],
              fill: true
            }]
          },
          options: {
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize expiry chart:', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize charts:', error);
  }
}