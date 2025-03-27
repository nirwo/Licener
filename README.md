# Licener - Comprehensive License Management System

Licener is a full-featured web application for managing, tracking, and optimizing software licenses across your organization. Built with Node.js and Express, it provides a robust platform for license lifecycle management.

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
   SESSION_SECRET=your_session_secret
   JWT_SECRET=your_jwt_secret
   ```

4. Start the application
   ```
   npm start
   ```

5. For development with auto-restart:
   ```
   npm run dev
   ```

6. Access the application at http://localhost:3000

## File Database

Licener uses a file-based database system with LowDB for data storage. This provides:

- Simple setup with no external database requirements
- JSON file storage for easy backup and portability
- Persistence across application restarts
- Familiar Mongoose-like API for data operations

### Data Storage

- All data is stored in JSON files in the `data` directory
- License data: `data/licenses.json`
- System data: `data/systems.json`
- User data: `data/users.json`

### Quick Start Scripts

To ensure all required data files are created:

```
# For production
./scripts/start_file_db.sh

# For development with auto-restart
./scripts/dev_file_db.sh
```

### Default User

On first run, the system automatically creates a demo user:
- Email: demo@example.com
- Password: password
- Role: admin

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
- Database by [LowDB](https://github.com/typicode/lowdb)
- UI with [Bootstrap](https://getbootstrap.com/)
- Charts by [Chart.js](https://www.chartjs.org/)
- Icons by [Font Awesome](https://fontawesome.com/)