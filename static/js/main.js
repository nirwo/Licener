/**
 * Licener - License Management System
 * Main JavaScript file
 */

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
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
      const format = this.dataset.format;
      const url = new URL(this.dataset.url, window.location.origin);
      
      // Add format parameter to URL
      url.searchParams.set('format', format);
      
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
});