// This script applies essential styles to fix the navbar appearance
document.addEventListener('DOMContentLoaded', function () {
  // Inject CSS directly into the head
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    /* Emergency navbar fix - injected via JavaScript */
    .navbar, nav.navbar, .navbar-dark, .bg-dark, .navbar-expand-lg.navbar-dark.bg-dark, .fixed-top {
      background-color: #343a40 !important; 
      color: white !important;
    }
    .navbar > *, nav.navbar > *, .navbar a:not(.dropdown-item), .navbar-brand, .navbar > .nav-link, .navbar > i, 
    .navbar .nav-item > a, .navbar button, .navbar > span {
      color: white !important;
    }
    .navbar-toggler-icon {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 0.9%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e") !important;
    }
    .navbar .dropdown-menu { 
      background-color: white !important; 
    }
    .navbar .dropdown-menu .dropdown-item { 
      color: #3a3b45 !important; 
    }
    .navbar .dropdown-menu .dropdown-item i { 
      color: #4e73df !important; 
    }
    .navbar .dropdown-menu .dropdown-item:hover { 
      background-color: #f8f9fc !important;
      color: #2e59d9 !important;
    }
  `;
  document.head.appendChild(styleEl);

  // More forceful approach to override Bootstrap styles
  function applyNavbarFix() {
    console.log('Applying navbar dark theme fix');

    // Force dark background on all navbar elements
    const navbarElements = document.querySelectorAll('.navbar, .navbar-dark, .bg-dark, nav');
    navbarElements.forEach(element => {
      element.setAttribute(
        'style',
        'background-color: #343a40 !important; color: white !important;'
      );
    });

    // Force container-fluid to have dark background
    const containers = document.querySelectorAll('.navbar .container-fluid');
    containers.forEach(container => {
      container.setAttribute('style', 'background-color: #343a40 !important;');
    });

    // Force white text on all navbar links EXCEPT dropdown items
    const navLinks = document.querySelectorAll(
      '.navbar > .nav-link, .navbar-brand, .navbar > i, .navbar > a, .navbar .nav-item > a, .nav-link.dropdown-toggle'
    );
    navLinks.forEach(link => {
      link.setAttribute('style', 'color: white !important;');
    });

    // Fix dropdown menus to have white background and dark text
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');
    dropdownMenus.forEach(menu => {
      menu.setAttribute('style', 'background-color: white !important;');
    });

    // Fix dropdown items to have dark text
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
      item.setAttribute('style', 'color: #3a3b45 !important;');
    });

    // Fix dropdown item icons to be blue
    const dropdownIcons = document.querySelectorAll('.dropdown-item i');
    dropdownIcons.forEach(icon => {
      icon.setAttribute('style', 'color: #4e73df !important;');
    });

    // Fix hamburger icon
    const togglerIcons = document.querySelectorAll('.navbar-toggler-icon');
    togglerIcons.forEach(icon => {
      icon.setAttribute(
        'style',
        "background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 0.9%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e\") !important;"
      );
    });
  }

  // Apply immediately
  applyNavbarFix();

  // Also apply after a delay to handle any dynamic loading
  setTimeout(applyNavbarFix, 100);
  setTimeout(applyNavbarFix, 500);
});
