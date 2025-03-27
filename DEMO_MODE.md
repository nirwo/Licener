# Licener Demo Mode

The Licener application includes a comprehensive demo mode that allows you to run and explore the application without requiring a MongoDB database connection. This document provides detailed information about the demo mode and its capabilities.

## Starting Demo Mode

To start the application in demo mode, use one of the following commands:

```bash
# Run in demo mode
npm run demo

# Run in demo mode with auto-restart (for development)
npm run dev:demo

# Directly with environment variable
START_WITHOUT_MONGO=true npm start
```

## Demo Mode Features

### Pre-populated Data

The demo mode includes sample data for:

- **Licenses**: 5 sample licenses with different statuses (active, expired), vendors, and expiry dates
- **Systems**: 3 sample systems with different configurations and assigned licenses
- **User**: A mock admin user is pre-authenticated

### Fully Functional UI

All UI components and features work in demo mode:

- Dashboard with charts and statistics
- License management (view, add, edit, delete, renew)
- System management (view, add, edit, delete)
- Reports and analytics
- Filtering and sorting of data

### Form Operations

All form submissions are processed and "saved" to in-memory data:

- Adding/editing licenses
- Adding/editing systems
- License renewals
- License-system assignments
- Data import/export (simulated)

### Data Relationships

The demo mode maintains proper data relationships:

- When licenses are assigned to systems, both entities are updated
- When systems are deleted, associated licenses are updated
- When licenses are deleted, associated systems are updated

### Reports and Analytics

All reports and analytics work with the demo data:

- License expiry reports
- Utilization reports
- Cost analysis
- Compliance monitoring
- Custom reports

### File Operations

File operations are simulated in demo mode:

- File uploads are accepted but not stored on disk
- File downloads return mock CSV/Excel content
- Import/export functionality demonstrates the workflow

## Demo Mode Limitations

- **Data Persistence**: All changes are stored in memory and will be reset when the application restarts
- **Authentication**: All users are automatically authenticated as an admin user
- **File Storage**: Files are not actually stored on disk

## Demo Mode Implementation

The demo mode works by:

1. Bypassing MongoDB connection
2. Creating in-memory data structures for licenses and systems
3. Intercepting HTTP requests to handle form submissions
4. Overriding response methods to inject mock data
5. Simulating database operations (create, read, update, delete)
6. Maintaining data relationships in memory

## Use Cases for Demo Mode

- **Evaluation**: Try out the application without setting up MongoDB
- **Development**: Develop and test UI without database dependencies
- **Demonstration**: Show features to stakeholders without requiring setup
- **Testing**: Test frontend functionality isolated from database issues
- **CI/CD**: Run tests in environments without database access

## Exiting Demo Mode

To exit demo mode and use a real MongoDB connection, simply run:

```bash
npm start
```

Make sure your MongoDB connection is properly configured in your `.env` file.