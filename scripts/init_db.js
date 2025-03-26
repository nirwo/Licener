/**
 * MongoDB initialization script for Licener
 * This script creates an admin user and sample data for testing
 */

// Creating admin user
db.users.insertOne({
  name: "Admin User",
  email: "admin@example.com",
  password: "$2a$10$CwTycUXWue0Thq9StjUM0uQxTmrjFPEjxNLPoLtz7BZh.hiFZ.7FS", // hashed password for 'password123'
  role: "admin",
  company: "Licener",
  department: "IT",
  createdAt: new Date(),
  lastLogin: null
});

// Creating regular user
db.users.insertOne({
  name: "Regular User",
  email: "user@example.com",
  password: "$2a$10$CwTycUXWue0Thq9StjUM0uQxTmrjFPEjxNLPoLtz7BZh.hiFZ.7FS", // hashed password for 'password123'
  role: "user",
  company: "Test Company",
  department: "Sales",
  createdAt: new Date(),
  lastLogin: null
});

// Creating sample systems
const systems = [
  {
    name: "Production Server",
    description: "Main production web server",
    type: "server",
    location: "Data Center A",
    operatingSystem: "Ubuntu 20.04 LTS",
    ipAddress: "192.168.1.10",
    macAddress: "00:1B:44:11:3A:B7",
    installedSoftware: [
      {
        name: "MySQL",
        version: "8.0.27",
        installDate: new Date("2023-01-15")
      },
      {
        name: "Node.js",
        version: "16.13.0",
        installDate: new Date("2023-01-15")
      },
      {
        name: "Nginx",
        version: "1.18.0",
        installDate: new Date("2023-01-15")
      }
    ],
    notes: "Critical system, requires immediate attention for any issues",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Development Workstation",
    description: "Developer workstation for engineering team",
    type: "workstation",
    location: "Office - Engineering Dept",
    operatingSystem: "Windows 11 Pro",
    ipAddress: "192.168.1.25",
    macAddress: "00:1B:44:22:3A:C8",
    installedSoftware: [
      {
        name: "Visual Studio Code",
        version: "1.63.2",
        installDate: new Date("2023-02-10")
      },
      {
        name: "Node.js",
        version: "16.13.0",
        installDate: new Date("2023-02-10")
      },
      {
        name: "Git",
        version: "2.34.1",
        installDate: new Date("2023-02-10")
      }
    ],
    notes: "Used for development purposes only",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Database Server",
    description: "Primary database server",
    type: "server",
    location: "Data Center B",
    operatingSystem: "CentOS 8",
    ipAddress: "192.168.1.15",
    macAddress: "00:1B:44:33:3A:D9",
    installedSoftware: [
      {
        name: "MongoDB",
        version: "5.0.5",
        installDate: new Date("2023-01-20")
      },
      {
        name: "PostgreSQL",
        version: "14.1",
        installDate: new Date("2023-01-20")
      }
    ],
    notes: "Hosts all production databases",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

db.systems.insertMany(systems);

// Creating sample licenses
const licenses = [
  {
    name: "Microsoft 365 Business",
    publisher: "Microsoft",
    product: "Microsoft 365",
    licenseType: "subscription",
    licenseKey: "XXXX-XXXX-XXXX-XXXX-1234",
    purchaseDate: new Date("2023-01-01"),
    expiryDate: new Date("2024-01-01"),
    seats: 10,
    usedSeats: 8,
    cost: 1200,
    currency: "USD",
    vendor: "Microsoft Direct",
    purchaseOrder: "PO-2023-001",
    notes: "Annual subscription, auto-renewal enabled",
    attachments: [],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Adobe Creative Cloud",
    publisher: "Adobe",
    product: "Creative Cloud",
    licenseType: "subscription",
    licenseKey: "ADBE-XXXX-XXXX-XXXX-5678",
    purchaseDate: new Date("2023-02-15"),
    expiryDate: new Date("2024-02-15"),
    seats: 5,
    usedSeats: 5,
    cost: 3000,
    currency: "USD",
    vendor: "Adobe",
    purchaseOrder: "PO-2023-002",
    notes: "Design team licenses",
    attachments: [],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Windows Server 2022",
    publisher: "Microsoft",
    product: "Windows Server",
    licenseType: "perpetual",
    licenseKey: "XXXX-XXXX-XXXX-XXXX-9012",
    purchaseDate: new Date("2023-03-10"),
    expiryDate: null,
    seats: 2,
    usedSeats: 2,
    cost: 1800,
    currency: "USD",
    vendor: "CDW",
    purchaseOrder: "PO-2023-003",
    notes: "Production server licenses",
    attachments: [],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "MySQL Enterprise",
    publisher: "Oracle",
    product: "MySQL Enterprise",
    licenseType: "subscription",
    licenseKey: "MSQL-XXXX-XXXX-XXXX-3456",
    purchaseDate: new Date("2023-04-05"),
    expiryDate: new Date("2023-11-05"),
    seats: 1,
    usedSeats: 1,
    cost: 5000,
    currency: "USD",
    vendor: "Oracle",
    purchaseOrder: "PO-2023-004",
    notes: "Database server license, renewal coming up",
    attachments: [],
    status: "expiring-soon",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

db.licenses.insertMany(licenses);

print("Database initialization completed successfully!");
print("You can now log in with the following credentials:");
print("Admin User: admin@example.com / password123");
print("Regular User: user@example.com / password123");