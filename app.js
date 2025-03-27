const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { displayBanner } = require('./utils/banner');

// Load environment variables
dotenv.config();

const app = express();

// DB Config
const db = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/licener';

// Connect to MongoDB with retry logic and improved error handling
const connectWithRetry = () => {
  console.log('MongoDB connection attempt...');
  mongoose.connect(db, {
    serverSelectionTimeoutMS: 5000, // 5 seconds timeout on server selection
    connectTimeoutMS: 10000,       // 10 seconds timeout on connection
  })
    .then(() => {
      console.log('MongoDB Connected');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

// For development/testing purposes - allow app to start even if MongoDB is not available
const startWithoutMongo = process.env.START_WITHOUT_MONGO === 'true';

// Use a mock database for demo mode
if (startWithoutMongo) {
  displayBanner(true);
  
  // Create comprehensive demo data
  const demoLicenses = [
    {
      _id: 'license1',
      name: 'Microsoft 365 Business',
      product: 'Microsoft 365',
      licenseKey: 'XXXX-XXXX-XXXX-XXXX-1234',
      purchaseDate: new Date('2023-01-01'),
      expiryDate: new Date('2024-01-01'),
      totalSeats: 10,
      usedSeats: 8,
      cost: 1200,
      currency: 'USD',
      vendor: 'Microsoft',
      notes: 'Annual subscription, auto-renewal enabled',
      status: 'active',
      assignedSystems: ['system1', 'system2'],
      owner: 'mockuser123',
      attachments: [
        {
          _id: 'att1',
          filename: 'invoice.pdf',
          path: '/path/to/invoice.pdf',
          uploadDate: new Date('2023-01-01')
        }
      ]
    },
    {
      _id: 'license2',
      name: 'Adobe Creative Cloud',
      product: 'Creative Cloud',
      licenseKey: 'ADBE-XXXX-XXXX-XXXX-5678',
      purchaseDate: new Date('2023-02-15'),
      expiryDate: new Date('2024-02-15'),
      totalSeats: 5,
      usedSeats: 5,
      cost: 3000,
      currency: 'USD',
      vendor: 'Adobe',
      notes: 'Design team licenses',
      status: 'active',
      assignedSystems: ['system2'],
      owner: 'mockuser123',
      attachments: []
    },
    {
      _id: 'license3',
      name: 'Antivirus Enterprise',
      product: 'Security Suite Pro',
      licenseKey: 'AVPRO-XXXX-XXXX-XXXX-5432',
      purchaseDate: new Date('2022-09-15'),
      expiryDate: new Date('2023-01-01'),
      totalSeats: 100,
      usedSeats: 95,
      cost: 3599.99,
      currency: 'USD',
      vendor: 'Symantec',
      notes: 'Company-wide antivirus solution - EXPIRED',
      status: 'expired',
      assignedSystems: [],
      owner: 'mockuser123',
      attachments: []
    },
    {
      _id: 'license4',
      name: 'VMware vSphere',
      product: 'vSphere',
      licenseKey: 'VMWR-XXXX-XXXX-XXXX-9876',
      purchaseDate: new Date('2023-03-10'),
      expiryDate: new Date('2025-03-10'),
      totalSeats: 8,
      usedSeats: 6,
      cost: 8000,
      currency: 'USD',
      vendor: 'VMware',
      notes: 'Virtualization infrastructure',
      status: 'active',
      assignedSystems: ['system1'],
      owner: 'mockuser123',
      attachments: []
    },
    {
      _id: 'license5',
      name: 'SQL Server 2019',
      product: 'SQL Server',
      licenseKey: 'MSQL-XXXX-XXXX-XXXX-4321',
      purchaseDate: new Date('2023-06-20'),
      expiryDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      totalSeats: 2,
      usedSeats: 2,
      cost: 5000,
      currency: 'USD',
      vendor: 'Microsoft',
      notes: 'Database servers',
      status: 'active',
      assignedSystems: ['system3'],
      owner: 'mockuser123',
      attachments: []
    }
  ];
  
  const demoSystems = [
    {
      _id: 'system1',
      name: 'Production Server A',
      type: 'physical',
      os: 'Linux',
      osVersion: 'Ubuntu 20.04 LTS',
      location: 'Data Center A',
      department: 'Operations',
      status: 'active',
      managedBy: 'mockuser123',
      ip: '192.168.1.10',
      lastSeen: new Date(),
      installedSoftware: [
        { name: 'Docker', version: '20.10.12', installDate: new Date('2023-01-15') },
        { name: 'Nginx', version: '1.18.0', installDate: new Date('2023-01-15') }
      ],
      licenseRequirements: [
        { licenseType: 'Microsoft 365', quantity: 1, licenseId: 'license1' },
        { licenseType: 'vSphere', quantity: 1, licenseId: 'license4' }
      ],
      notes: 'Primary production server'
    },
    {
      _id: 'system2',
      name: 'Development VM 1',
      type: 'virtual',
      os: 'Windows',
      osVersion: 'Windows Server 2019',
      location: 'Cloud',
      department: 'Development',
      status: 'active',
      managedBy: 'mockuser123',
      ip: '192.168.1.20',
      lastSeen: new Date(),
      installedSoftware: [
        { name: 'Visual Studio', version: '2022', installDate: new Date('2023-02-10') },
        { name: 'Node.js', version: '16.14.0', installDate: new Date('2023-02-10') },
        { name: 'Adobe Creative Cloud', version: '2023', installDate: new Date('2023-02-20') }
      ],
      licenseRequirements: [
        { licenseType: 'Microsoft 365', quantity: 1, licenseId: 'license1' },
        { licenseType: 'Creative Cloud', quantity: 1, licenseId: 'license2' }
      ],
      notes: 'Developer workstation'
    },
    {
      _id: 'system3',
      name: 'Database Server',
      type: 'physical',
      os: 'Windows',
      osVersion: 'Windows Server 2019',
      location: 'Data Center B',
      department: 'Operations',
      status: 'active',
      managedBy: 'mockuser123',
      ip: '192.168.1.30',
      lastSeen: new Date(),
      installedSoftware: [
        { name: 'SQL Server', version: '2019', installDate: new Date('2023-06-25') }
      ],
      licenseRequirements: [
        { licenseType: 'SQL Server', quantity: 1, licenseId: 'license5' }
      ],
      notes: 'Primary database server'
    }
  ];
  
  // Define helper function to find item by ID
  const findById = (collection, id) => {
    return collection.find(item => item._id === id);
  };

  // Define helper function to generate ID
  const generateId = (prefix) => {
    return prefix + Math.random().toString(36).substring(2, 10);
  };
  
  // Mock middleware
  app.use((req, res, next) => {
    // Mock authenticated user
    req.isAuthenticated = () => true;
    req.user = { 
      _id: 'mockuser123',
      id: 'mockuser123', 
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'admin' 
    };
    
    // Mock flash messages
    if (!req.session) {
      req.session = {};
    }
    
    const flashMessages = {
      success_msg: [],
      error_msg: [],
      error: []
    };
    
    req.flash = (type, msg) => {
      if (flashMessages[type]) {
        flashMessages[type].push(msg);
        console.log(`FLASH: ${type} - ${msg}`);
      }
      return flashMessages[type];
    };
    
    // Get flash messages
    req.flash.get = (type) => {
      return flashMessages[type] || [];
    };
    
    // Override res.redirect to handle form submissions
    const originalRedirect = res.redirect;
    res.redirect = function(path) {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        console.log(`Demo mode: intercepting ${req.method} redirect to ${path}`);
        
        // Handle license operations
        if (path === '/licenses' || path.startsWith('/licenses/')) {
          if (req.originalUrl.includes('/licenses/add') || req.originalUrl === '/licenses') {
            // Create new license
            const newLicense = {
              _id: generateId('license'),
              name: req.body.name || 'New Demo License',
              product: req.body.product || 'Demo Product',
              licenseKey: req.body.licenseKey || 'DEMO-XXXX-XXXX-XXXX',
              purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
              expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000),
              totalSeats: parseInt(req.body.totalSeats) || 10,
              usedSeats: req.body.assignedSystems ? (Array.isArray(req.body.assignedSystems) ? req.body.assignedSystems.length : 1) : 0,
              cost: parseFloat(req.body.cost) || 1000,
              currency: req.body.currency || 'USD',
              vendor: req.body.vendor || 'Demo Vendor',
              notes: req.body.notes || 'Created in demo mode',
              status: req.body.status || 'active',
              assignedSystems: req.body.assignedSystems ? (Array.isArray(req.body.assignedSystems) ? req.body.assignedSystems : [req.body.assignedSystems]) : [],
              owner: req.user.id,
              attachments: req.files ? req.files.map(file => ({
                _id: generateId('att'),
                filename: file.originalname || 'document.pdf',
                path: '/path/to/demo/file',
                uploadDate: new Date()
              })) : []
            };
            
            demoLicenses.push(newLicense);
            req.flash('success_msg', 'License added successfully in demo mode');
          } else if (req.originalUrl.includes('/edit/') && req.method === 'PUT') {
            // Update license
            const licenseId = req.params.id;
            const license = findById(demoLicenses, licenseId);
            
            if (license) {
              license.name = req.body.name || license.name;
              license.product = req.body.product || license.product;
              license.licenseKey = req.body.licenseKey || license.licenseKey;
              license.purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : license.purchaseDate;
              license.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : license.expiryDate;
              license.totalSeats = parseInt(req.body.totalSeats) || license.totalSeats;
              license.cost = parseFloat(req.body.cost) || license.cost;
              license.currency = req.body.currency || license.currency;
              license.vendor = req.body.vendor || license.vendor;
              license.notes = req.body.notes || license.notes;
              license.status = req.body.status || license.status;
              
              // Handle assigned systems
              if (req.body.assignedSystems) {
                license.assignedSystems = Array.isArray(req.body.assignedSystems) ? req.body.assignedSystems : [req.body.assignedSystems];
                license.usedSeats = license.assignedSystems.length;
              }
              
              // Add attachments if files were uploaded
              if (req.files && req.files.length > 0) {
                const newAttachments = req.files.map(file => ({
                  _id: generateId('att'),
                  filename: file.originalname || 'document.pdf',
                  path: '/path/to/demo/file',
                  uploadDate: new Date()
                }));
                
                license.attachments = [...license.attachments, ...newAttachments];
              }
              
              req.flash('success_msg', 'License updated successfully in demo mode');
            } else {
              req.flash('error_msg', 'License not found in demo mode');
            }
          } else if (req.originalUrl.includes('/renew/') && req.method === 'POST') {
            // Renew license
            const licenseId = req.params.id;
            const license = findById(demoLicenses, licenseId);
            
            if (license) {
              license.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000);
              license.status = 'renewed';
              license.notes = req.body.notes ? `${license.notes}\n\nRenewal Notes (${new Date().toLocaleDateString()}):\n${req.body.notes}` : license.notes;
              
              req.flash('success_msg', 'License renewed successfully in demo mode');
            } else {
              req.flash('error_msg', 'License not found in demo mode');
            }
          } else if (req.method === 'DELETE') {
            // Delete license
            const licenseId = req.params.id;
            const licenseIndex = demoLicenses.findIndex(l => l._id === licenseId);
            
            if (licenseIndex !== -1) {
              demoLicenses.splice(licenseIndex, 1);
              req.flash('success_msg', 'License deleted successfully in demo mode');
            } else {
              req.flash('error_msg', 'License not found in demo mode');
            }
          }
        } 
        // Handle system operations
        else if (path === '/systems' || path.startsWith('/systems/')) {
          if (req.originalUrl.includes('/systems/add') || req.originalUrl === '/systems') {
            // Create new system
            const newSystem = {
              _id: generateId('system'),
              name: req.body.name || 'New Demo System',
              type: req.body.type || 'virtual',
              os: req.body.os || 'Linux',
              osVersion: req.body.osVersion || 'Ubuntu 22.04 LTS',
              location: req.body.location || 'Demo Location',
              department: req.body.department || 'IT',
              status: req.body.status || 'active',
              managedBy: req.user.id,
              ip: req.body.ip || '192.168.1.100',
              lastSeen: new Date(),
              notes: req.body.notes || 'Created in demo mode',
              installedSoftware: [],
              licenseRequirements: []
            };
            
            // Process installed software
            if (req.body.installedSoftware) {
              const softwareNames = Array.isArray(req.body.installedSoftware.name) ? req.body.installedSoftware.name : [req.body.installedSoftware.name];
              const softwareVersions = Array.isArray(req.body.installedSoftware.version) ? req.body.installedSoftware.version : [req.body.installedSoftware.version];
              
              for (let i = 0; i < softwareNames.length; i++) {
                if (softwareNames[i]) {
                  newSystem.installedSoftware.push({
                    name: softwareNames[i],
                    version: softwareVersions[i] || '',
                    installDate: new Date()
                  });
                }
              }
            }
            
            // Process license requirements
            if (req.body.licenses) {
              const licenseIds = Array.isArray(req.body.licenses.id) ? req.body.licenses.id : [req.body.licenses.id];
              const licenseQuantities = Array.isArray(req.body.licenses.quantity) ? req.body.licenses.quantity : [req.body.licenses.quantity];
              
              for (let i = 0; i < licenseIds.length; i++) {
                if (licenseIds[i]) {
                  const license = findById(demoLicenses, licenseIds[i]);
                  
                  if (license) {
                    newSystem.licenseRequirements.push({
                      licenseType: license.product,
                      quantity: parseInt(licenseQuantities[i]) || 1,
                      licenseId: licenseIds[i]
                    });
                    
                    // Update license's assignedSystems
                    if (!license.assignedSystems.includes(newSystem._id)) {
                      license.assignedSystems.push(newSystem._id);
                      license.usedSeats = license.assignedSystems.length;
                    }
                  }
                }
              }
            }
            
            demoSystems.push(newSystem);
            req.flash('success_msg', 'System added successfully in demo mode');
          } else if (req.originalUrl.includes('/edit/') && req.method === 'PUT') {
            // Update system
            const systemId = req.params.id;
            const system = findById(demoSystems, systemId);
            
            if (system) {
              system.name = req.body.name || system.name;
              system.type = req.body.type || system.type;
              system.os = req.body.os || system.os;
              system.osVersion = req.body.osVersion || system.osVersion;
              system.location = req.body.location || system.location;
              system.department = req.body.department || system.department;
              system.status = req.body.status || system.status;
              system.ip = req.body.ip || system.ip;
              system.notes = req.body.notes || system.notes;
              system.lastSeen = new Date();
              
              // Process installed software
              if (req.body.installedSoftware) {
                system.installedSoftware = [];
                const softwareNames = Array.isArray(req.body.installedSoftware.name) ? req.body.installedSoftware.name : [req.body.installedSoftware.name];
                const softwareVersions = Array.isArray(req.body.installedSoftware.version) ? req.body.installedSoftware.version : [req.body.installedSoftware.version];
                
                for (let i = 0; i < softwareNames.length; i++) {
                  if (softwareNames[i]) {
                    system.installedSoftware.push({
                      name: softwareNames[i],
                      version: softwareVersions[i] || '',
                      installDate: new Date()
                    });
                  }
                }
              }
              
              // Get old license requirements for comparison
              const oldLicenseIds = system.licenseRequirements.map(req => req.licenseId);
              
              // Process license requirements
              if (req.body.licenses) {
                system.licenseRequirements = [];
                const licenseIds = Array.isArray(req.body.licenses.id) ? req.body.licenses.id : [req.body.licenses.id];
                const licenseQuantities = Array.isArray(req.body.licenses.quantity) ? req.body.licenses.quantity : [req.body.licenses.quantity];
                
                const newLicenseIds = [];
                for (let i = 0; i < licenseIds.length; i++) {
                  if (licenseIds[i]) {
                    const license = findById(demoLicenses, licenseIds[i]);
                    
                    if (license) {
                      system.licenseRequirements.push({
                        licenseType: license.product,
                        quantity: parseInt(licenseQuantities[i]) || 1,
                        licenseId: licenseIds[i]
                      });
                      
                      newLicenseIds.push(licenseIds[i]);
                      
                      // Add system to license if not already assigned
                      if (!license.assignedSystems.includes(system._id)) {
                        license.assignedSystems.push(system._id);
                        license.usedSeats = license.assignedSystems.length;
                      }
                    }
                  }
                }
                
                // Remove system from licenses that are no longer assigned
                const licensesToRemove = oldLicenseIds.filter(id => !newLicenseIds.includes(id));
                for (const licenseId of licensesToRemove) {
                  const license = findById(demoLicenses, licenseId);
                  if (license) {
                    license.assignedSystems = license.assignedSystems.filter(sysId => sysId !== system._id);
                    license.usedSeats = license.assignedSystems.length;
                  }
                }
              }
              
              req.flash('success_msg', 'System updated successfully in demo mode');
            } else {
              req.flash('error_msg', 'System not found in demo mode');
            }
          } else if (req.method === 'DELETE') {
            // Delete system
            const systemId = req.params.id;
            const systemIndex = demoSystems.findIndex(s => s._id === systemId);
            
            if (systemIndex !== -1) {
              const system = demoSystems[systemIndex];
              
              // Remove system from licenses
              for (const license of demoLicenses) {
                license.assignedSystems = license.assignedSystems.filter(sysId => sysId !== system._id);
                license.usedSeats = license.assignedSystems.length;
              }
              
              demoSystems.splice(systemIndex, 1);
              req.flash('success_msg', 'System deleted successfully in demo mode');
            } else {
              req.flash('error_msg', 'System not found in demo mode');
            }
          }
        }
      }
      
      return originalRedirect.call(this, path);
    };
    
    // Helper function to populate licenses and systems with related objects
    const populateLicenses = (licenses) => {
      return licenses.map(license => {
        // Deep clone to avoid modifying the original
        const populatedLicense = JSON.parse(JSON.stringify(license));
        
        // Populate assigned systems
        populatedLicense.assignedSystems = populatedLicense.assignedSystems.map(systemId => {
          return findById(demoSystems, systemId) || systemId;
        });
        
        // Populate owner
        populatedLicense.owner = {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email
        };
        
        return populatedLicense;
      });
    };
    
    const populateSystems = (systems) => {
      return systems.map(system => {
        // Deep clone to avoid modifying the original
        const populatedSystem = JSON.parse(JSON.stringify(system));
        
        // Populate license requirements
        populatedSystem.licenseRequirements = populatedSystem.licenseRequirements.map(req => {
          if (req.licenseId) {
            const license = findById(demoLicenses, req.licenseId);
            if (license) {
              return {
                ...req,
                licenseId: license
              };
            }
          }
          return req;
        });
        
        // Populate managed by
        populatedSystem.managedBy = {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email
        };
        
        return populatedSystem;
      });
    };
    
    // Override route handlers with mock data
    const originalRender = res.render;
    res.render = function(view, options) {
      options = options || {};
      
      // Make flash messages available to all views
      options.success_msg = req.flash.get('success_msg');
      options.error_msg = req.flash.get('error_msg');
      options.error = req.flash.get('error');
      
      // Set user in all views
      options.user = req.user;
      
      if (view === 'dashboard') {
        options.title = 'License Manager Dashboard';
        options.active = 'dashboard';
        options.stats = {
          totalLicenses: demoLicenses.length,
          activeLicenses: demoLicenses.filter(l => l.status === 'active').length,
          pendingLicenses: 0,
          expiredLicenses: demoLicenses.filter(l => l.status === 'expired').length,
          renewedLicenses: demoLicenses.filter(l => l.status === 'renewed').length,
          expiringSoon: demoLicenses.filter(l => 
            l.status === 'active' && 
            l.expiryDate > new Date() && 
            l.expiryDate < new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
          ).length,
          totalSystems: demoSystems.length
        };
        options.recentLicenses = populateLicenses(demoLicenses.slice(0, 5));
        options.chartData = {
          expiryTimeline: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            data: [1, 1, 0, 2, 1, 0],
            colors: ['#e74a3b', '#e74a3b', '#f6c23e', '#f6c23e', '#1cc88a', '#1cc88a']
          },
          vendors: {
            labels: ['Microsoft', 'Adobe', 'Symantec', 'VMware'],
            data: [2, 1, 1, 1]
          },
          costs: {
            labels: ['Microsoft', 'Adobe', 'Symantec', 'VMware'],
            data: [6200, 3000, 3600, 8000]
          }
        };
      } 
      else if (view === 'licenses/index') {
        options.title = 'Licenses';
        options.active = 'licenses';
        
        // Support filtering in demo mode
        let filteredLicenses = [...demoLicenses];
        
        if (req.query.status && req.query.status !== 'all') {
          filteredLicenses = filteredLicenses.filter(l => l.status === req.query.status);
        }
        
        if (req.query.product) {
          filteredLicenses = filteredLicenses.filter(l => 
            l.product.toLowerCase().includes(req.query.product.toLowerCase())
          );
        }
        
        if (req.query.vendor) {
          filteredLicenses = filteredLicenses.filter(l => 
            l.vendor.toLowerCase().includes(req.query.vendor.toLowerCase())
          );
        }
        
        options.licenses = populateLicenses(filteredLicenses);
        options.products = [...new Set(demoLicenses.map(l => l.product))];
        options.vendors = [...new Set(demoLicenses.map(l => l.vendor))];
        options.filters = req.query;
      }
      else if (view === 'licenses/add') {
        options.title = 'Add License';
        options.active = 'licenses';
        options.systems = demoSystems;
      }
      else if (view === 'licenses/edit') {
        options.title = 'Edit License';
        options.active = 'licenses';
        options.systems = demoSystems;
        
        if (req.params.id) {
          const license = findById(demoLicenses, req.params.id);
          if (license) {
            options.license = license;
          }
        }
      }
      else if (view === 'licenses/view') {
        options.title = 'License Details';
        options.active = 'licenses';
        
        if (req.params.id) {
          const license = findById(demoLicenses, req.params.id);
          if (license) {
            options.license = populateLicenses([license])[0];
          }
        }
      }
      else if (view === 'licenses/renew') {
        options.title = 'Renew License';
        options.active = 'licenses';
        
        if (req.params.id) {
          const license = findById(demoLicenses, req.params.id);
          if (license) {
            options.license = license;
          }
        }
      }
      else if (view === 'licenses/import') {
        options.title = 'Import Licenses';
        options.active = 'licenses';
      }
      else if (view === 'systems/index') {
        options.title = 'Systems';
        options.active = 'systems';
        
        // Support filtering in demo mode
        let filteredSystems = [...demoSystems];
        
        if (req.query.type && req.query.type !== 'all') {
          filteredSystems = filteredSystems.filter(s => s.type === req.query.type);
        }
        
        if (req.query.os) {
          filteredSystems = filteredSystems.filter(s => 
            s.os.toLowerCase().includes(req.query.os.toLowerCase())
          );
        }
        
        if (req.query.status && req.query.status !== 'all') {
          filteredSystems = filteredSystems.filter(s => s.status === req.query.status);
        }
        
        options.systems = populateSystems(filteredSystems);
        options.osValues = [...new Set(demoSystems.map(s => s.os))];
        options.filters = req.query;
      }
      else if (view === 'systems/add') {
        options.title = 'Add System';
        options.active = 'systems';
        options.licenses = demoLicenses;
      }
      else if (view === 'systems/edit') {
        options.title = 'Edit System';
        options.active = 'systems';
        options.licenses = demoLicenses;
        
        if (req.params.id) {
          const system = findById(demoSystems, req.params.id);
          if (system) {
            options.system = system;
          }
        }
      }
      else if (view === 'systems/view') {
        options.title = 'System Details';
        options.active = 'systems';
        
        if (req.params.id) {
          const system = findById(demoSystems, req.params.id);
          if (system) {
            options.system = populateSystems([system])[0];
          }
        }
      }
      else if (view === 'systems/import') {
        options.title = 'Import Systems';
        options.active = 'systems';
      }
      else if (view === 'reports/index') {
        options.title = 'Reports Dashboard';
        options.active = 'reports';
      }
      else if (view === 'reports/license-expiry') {
        options.title = 'License Expiry Report';
        options.active = 'reports';
        
        const timeframe = parseInt(req.query.timeframe || '30');
        const expiryDate = new Date(new Date().getTime() + timeframe * 24 * 60 * 60 * 1000);
        
        const expiringLicenses = demoLicenses.filter(l => 
          l.expiryDate > new Date() && 
          l.expiryDate < expiryDate
        );
        
        const expiredLicenses = demoLicenses.filter(l => 
          l.expiryDate < new Date()
        );
        
        options.expiringLicenses = populateLicenses(expiringLicenses);
        options.expiredLicenses = populateLicenses(expiredLicenses);
        options.timeframe = timeframe;
      }
      else if (view === 'reports/license-utilization') {
        options.title = 'License Utilization Report';
        options.active = 'reports';
        
        // Group licenses by product
        const licensesByProduct = {};
        
        demoLicenses.forEach(license => {
          if (!licensesByProduct[license.product]) {
            licensesByProduct[license.product] = [];
          }
          
          licensesByProduct[license.product].push(license);
        });
        
        // Calculate product utilization
        const productUtilization = [];
        
        for (const [product, productLicenses] of Object.entries(licensesByProduct)) {
          const totalSeats = productLicenses.reduce((sum, license) => sum + license.totalSeats, 0);
          const usedSeats = productLicenses.reduce((sum, license) => sum + license.usedSeats, 0);
          const utilization = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
          
          productUtilization.push({
            product,
            totalSeats,
            usedSeats,
            utilization,
            licenses: populateLicenses(productLicenses)
          });
        }
        
        // Sort by utilization (highest to lowest)
        productUtilization.sort((a, b) => b.utilization - a.utilization);
        
        options.productUtilization = productUtilization;
      }
      else if (view === 'reports/cost-analysis') {
        options.title = 'Cost Analysis Report';
        options.active = 'reports';
        
        // Group costs by vendor and product
        const vendorCosts = {};
        const productCosts = {};
        let totalCost = 0;
        
        demoLicenses.forEach(license => {
          if (!license.cost) return;
          
          const cost = license.cost;
          totalCost += cost;
          
          // Vendor costs
          if (!vendorCosts[license.vendor]) {
            vendorCosts[license.vendor] = 0;
          }
          vendorCosts[license.vendor] += cost;
          
          // Product costs
          if (!productCosts[license.product]) {
            productCosts[license.product] = 0;
          }
          productCosts[license.product] += cost;
        });
        
        // Convert to arrays for sorting
        const vendorCostsArray = Object.entries(vendorCosts).map(([vendor, cost]) => ({
          vendor,
          cost,
          percentage: (cost / totalCost) * 100
        }));
        
        const productCostsArray = Object.entries(productCosts).map(([product, cost]) => ({
          product,
          cost,
          percentage: (cost / totalCost) * 100
        }));
        
        // Sort by cost (highest to lowest)
        vendorCostsArray.sort((a, b) => b.cost - a.cost);
        productCostsArray.sort((a, b) => b.cost - a.cost);
        
        options.vendorCosts = vendorCostsArray;
        options.productCosts = productCostsArray;
        options.totalCost = totalCost;
        options.period = req.query.period || 'year';
      }
      else if (view === 'reports/compliance') {
        options.title = 'System License Compliance Report';
        options.active = 'reports';
        
        // Calculate compliance status for each system
        const complianceData = demoSystems.map(system => {
          const licenseRequirements = system.licenseRequirements.filter(req => req.licenseId);
          
          // Check if all licenses are active
          const hasExpiredLicense = licenseRequirements.some(req => {
            const license = findById(demoLicenses, req.licenseId);
            return license && license.status === 'expired';
          });
          
          // Check if system has any licenses at all
          const hasLicenses = licenseRequirements.length > 0;
          
          let complianceStatus;
          if (!hasLicenses) {
            complianceStatus = 'unknown';
          } else if (hasExpiredLicense) {
            complianceStatus = 'non-compliant';
          } else {
            complianceStatus = 'compliant';
          }
          
          return {
            system: populateSystems([system])[0],
            complianceStatus,
            licenseRequirements: system.licenseRequirements.map(req => {
              const license = findById(demoLicenses, req.licenseId);
              return {
                ...req,
                licenseId: license
              };
            })
          };
        });
        
        // Count compliance statuses
        const compliantCount = complianceData.filter(data => data.complianceStatus === 'compliant').length;
        const nonCompliantCount = complianceData.filter(data => data.complianceStatus === 'non-compliant').length;
        const unknownCount = complianceData.filter(data => data.complianceStatus === 'unknown').length;
        
        options.complianceData = complianceData;
        options.stats = {
          compliantCount,
          nonCompliantCount,
          unknownCount,
          totalCount: demoSystems.length
        };
      }
      else if (view === 'reports/renewal-forecast') {
        options.title = 'License Renewal Forecast';
        options.active = 'reports';
        
        const period = parseInt(req.query.period || '12');
        const renewalData = [];
        let totalCost = 0;
        
        // Generate data for each month in the forecast period
        for (let i = 0; i < period; i++) {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() + i);
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0);
          monthEnd.setHours(23, 59, 59, 999);
          
          const expiringLicenses = demoLicenses.filter(license => 
            license.expiryDate >= monthStart && 
            license.expiryDate <= monthEnd
          );
          
          const monthCost = expiringLicenses.reduce((sum, license) => sum + (license.cost || 0), 0);
          totalCost += monthCost;
          
          renewalData.push({
            month: `${monthStart.toLocaleString('default', { month: 'long' })} ${monthStart.getFullYear()}`,
            licenses: populateLicenses(expiringLicenses),
            cost: monthCost
          });
        }
        
        options.renewalData = renewalData;
        options.totalCost = totalCost;
        options.period = period;
      }
      else if (view === 'reports/custom') {
        options.title = 'Custom Report Builder';
        options.active = 'reports';
        
        const fields = req.query.fields ? (Array.isArray(req.query.fields) ? req.query.fields : [req.query.fields]) : [];
        const groupBy = req.query.groupBy;
        const sortBy = req.query.sortBy || 'name';
        const sortOrder = req.query.sortOrder || 'asc';
        
        let reportData = [];
        
        if (fields.length > 0) {
          // Filter licenses by selected fields
          let filteredLicenses = demoLicenses.map(license => {
            const filtered = {};
            fields.forEach(field => {
              filtered[field] = license[field];
            });
            return filtered;
          });
          
          // Sort licenses
          const sortDirection = sortOrder === 'desc' ? -1 : 1;
          filteredLicenses.sort((a, b) => {
            if (a[sortBy] < b[sortBy]) return -1 * sortDirection;
            if (a[sortBy] > b[sortBy]) return 1 * sortDirection;
            return 0;
          });
          
          if (groupBy && fields.includes(groupBy)) {
            // Group data
            const groupedData = {};
            
            filteredLicenses.forEach(license => {
              const groupValue = license[groupBy] || 'Unknown';
              if (!groupedData[groupValue]) {
                groupedData[groupValue] = [];
              }
              
              groupedData[groupValue].push(license);
            });
            
            // Convert to array for template
            reportData = Object.entries(groupedData).map(([key, items]) => ({
              groupValue: key,
              items
            }));
          } else {
            reportData = filteredLicenses;
          }
        }
        
        options.fields = fields;
        options.groupBy = groupBy;
        options.sortBy = sortBy;
        options.sortOrder = sortOrder;
        options.reportData = reportData;
        options.fieldOptions = [
          { value: 'name', label: 'License Name' },
          { value: 'product', label: 'Product' },
          { value: 'vendor', label: 'Vendor' },
          { value: 'purchaseDate', label: 'Purchase Date' },
          { value: 'expiryDate', label: 'Expiry Date' },
          { value: 'renewalDate', label: 'Renewal Date' },
          { value: 'totalSeats', label: 'Total Seats' },
          { value: 'usedSeats', label: 'Used Seats' },
          { value: 'status', label: 'Status' },
          { value: 'cost', label: 'Cost' }
        ];
      }
      else if (view === 'welcome') {
        options.title = 'Welcome to Licener';
      }
      else if (view === 'users/login') {
        options.title = 'Login';
      }
      else if (view === 'users/register') {
        options.title = 'Register';
      }
      else if (view === 'error') {
        options.title = 'Error';
      }
      
      return originalRender.call(this, view, options);
    };
    
    // Mock API responses
    const originalJson = res.json;
    res.json = function(data) {
      if (req.originalUrl.includes('/api/licenses')) {
        return originalJson.call(this, { 
          success: true,
          licenses: demoLicenses
        });
      } else if (req.originalUrl.includes('/api/systems')) {
        return originalJson.call(this, { 
          success: true, 
          systems: demoSystems
        });
      } else if (req.originalUrl.includes('/systems/') && req.originalUrl.includes('/licenses')) {
        const systemId = req.params.id;
        const system = findById(demoSystems, systemId);
        
        if (system) {
          const licenseRequirements = system.licenseRequirements.map(req => {
            const license = findById(demoLicenses, req.licenseId);
            return {
              ...req,
              licenseId: license
            };
          });
          
          return originalJson.call(this, {
            success: true,
            licenseRequirements
          });
        } else {
          return originalJson.call(this, { 
            success: false, 
            error: 'System not found'
          });
        }
      }
      
      return originalJson.call(this, data);
    };
    
    // Add mock implementation for file downloads
    const originalDownload = res.download;
    res.download = function(path, filename, callback) {
      console.log(`Demo mode: Mocking file download of ${filename}`);
      res.setHeader('Content-disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-type', 'text/csv');
      
      // Send mock CSV content based on the file type
      if (filename.includes('licenses')) {
        res.send('Name,LicenseKey,Product,Vendor,PurchaseDate,ExpiryDate\nMock Download - This is a demo file');
      } else if (filename.includes('systems')) {
        res.send('Name,Type,OS,OSVersion,Location\nMock Download - This is a demo file');
      } else if (filename.includes('report')) {
        res.send('Report Data\nMock Download - This is a demo file');
      } else {
        res.send('Mock Download - This is a demo file');
      }
      
      if (callback) {
        callback(null);
      }
      
      return;
    };
    
    next();
  });
  
  // Skip MongoDB connection in demo mode
  console.log('MongoDB connection skipped in demo mode');
} else {
  connectWithRetry();
}

// Configure Passport
require('./config/passport')(passport);

// Handlebars Middleware
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: require('./utils/handlebars-helpers')
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'templates'));

// Body parser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override middleware
app.use(methodOverride('_method'));

// Express session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash middleware
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  
  // For debugging
  console.log('Session data:', {
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'function not available',
    user: req.user ? `User ID: ${req.user.id}` : 'Not logged in',
    session: req.session ? 'Session exists' : 'No session'
  });
  
  next();
});

// Set static folder
app.use(express.static(path.join(__dirname, 'static')));

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/licenses', require('./routes/licenses'));
app.use('/systems', require('./routes/systems'));
app.use('/reports', require('./routes/reports'));
app.use('/api', require('./routes/api'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  try {
    res.status(500).render('error', {
      title: 'Server Error',
      error: err.message || 'An unknown error occurred'
    });
  } catch (renderError) {
    console.error('Error rendering error page:', renderError);
    res.status(500).send('Internal Server Error. Please try again later.');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  if (!startWithoutMongo) {
    displayBanner(false);
  }
  console.log(`Server started on port ${PORT}`);
  console.log(`Application URL: http://localhost:${PORT}`);
});