# Licener - Comprehensive License Management System

Licener is a full-featured web application for managing, tracking, and optimizing software licenses across your organization. Built with Node.js, Express, and MongoDB, it provides a robust platform for license lifecycle management.

## Features

- **License Management**: Track license keys, expiry dates, renewals, and costs
- **License Utilization**: Monitor license usage and optimize allocation
- **System Tracking**: Manage systems and their license requirements
- **Reports & Analytics**: Gain insights with detailed reports and visualizations
- **User Management**: Support for multiple user accounts with different roles
- **Import/Export**: Import license data from CSV/Excel and export reports
- **Renewal Tracking**: Get alerts for upcoming license renewals
- **Compliance Monitoring**: Ensure systems are properly licensed

## Installation

### Prerequisites

- Node.js (v14+ recommended)
- MongoDB (local or Atlas)
- npm or yarn

### Setup

1. Clone the repository
   ```
   git clone https://github.com/yourusername/licener.git
   cd licener
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/licener
   SESSION_SECRET=your_session_secret
   JWT_SECRET=your_jwt_secret
   ```

4. Start the application
   ```
   npm start
   ```

5. For standard mode with MongoDB:
   ```
   npm start
   # or
   npm run start:mongo
   ```
   
6. For demo mode (no MongoDB needed):
   ```
   npm run start:demo
   ```
   
7. For development with auto-restart and demo mode (DEFAULT RECOMMENDED):
   ```
   npm run dev
   ```
   
8. For development with auto-restart and MongoDB:
   ```
   npm run dev:mongo
   ```

### Demo Mode

The application includes a comprehensive demo mode that works without requiring a MongoDB connection. This is useful for:
- Evaluating the software without setting up a database
- Development and testing without database dependencies
- Demonstrating features to stakeholders

To run in demo mode:
```
npm run demo
```

Demo mode features:
- Pre-populated sample licenses and systems
- Fully functional UI with all features enabled
- Form submissions are processed and "saved" in memory
- Reports and dashboards work with sample data
- File upload/download operations are simulated
- Flash messages and notifications work normally

Note: Data in demo mode is not persistent and will reset when the application restarts.

For detailed information about demo mode, see [DEMO_MODE.md](DEMO_MODE.md).

7. Access the application at http://localhost:3000

## Usage

### User Roles

- **Admin**: Full access to all features, user management
- **Manager**: Can manage licenses and systems, view reports
- **User**: Can manage their own licenses, view basic reports

### License Management

- Add, edit, and delete licenses
- Track license keys, expiry dates, costs
- Assign licenses to systems
- Monitor license utilization

### System Management

- Add, edit, and delete systems
- Track system details (OS, location, IP)
- Define license requirements for each system
- Monitor system compliance

### Reports

- License Expiry Report
- License Utilization Report
- Cost Analysis
- Compliance Report
- Renewal Forecast
- Custom Report Builder

## API

Licener includes a RESTful API for integration with other systems. API documentation is available at `/api/docs` when running the application.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Express](https://expressjs.com/)
- Database by [MongoDB](https://www.mongodb.com/)
- UI with [Bootstrap](https://getbootstrap.com/)
- Charts by [Chart.js](https://www.chartjs.org/)
- Icons by [Font Awesome](https://fontawesome.com/)