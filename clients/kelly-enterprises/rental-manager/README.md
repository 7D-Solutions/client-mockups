# Kelly Rental Manager

Property management system for Kelly Enterprises.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed

### Setup

1. **Copy environment file:**
   ```bash
   cp .env.example backend/.env
   ```

2. **Update backend/.env** with your actual database credentials

3. **Start database (separate stack):**
   ```bash
   docker-compose -p kelly-rental-database -f docker-compose.db.yml up -d
   ```

4. **Start application services (separate stack):**
   ```bash
   docker-compose -p kelly-rental-app -f docker-compose.dev.yml up -d
   ```

5. **View logs:**
   ```bash
   docker logs kelly-rental-mysql -f
   docker logs kelly-rental-backend-dev -f
   docker logs kelly-rental-frontend-dev -f
   ```

6. **Access application:**
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:8001
   - Database: localhost:3308

### Development Workflow

#### Hot Module Replacement (HMR) Enabled
- **Frontend**: Vite HMR automatically reloads on file changes
- **Backend**: Node `--watch` flag automatically restarts on file changes

#### Managing Services
```bash
# Stop application services (keep database running)
docker-compose -p kelly-rental-app -f docker-compose.dev.yml down

# Stop database (if needed)
docker-compose -p kelly-rental-database -f docker-compose.db.yml down

# Restart application services
docker-compose -p kelly-rental-app -f docker-compose.dev.yml restart

# Restart database
docker-compose -p kelly-rental-database -f docker-compose.db.yml restart

# View status
docker ps | grep kelly-rental

# Rebuild after dependency changes
docker-compose -p kelly-rental-app -f docker-compose.dev.yml up -d --build
```

### Database Management

#### Create Database and Admin User
```bash
# From backend directory
cd backend
node src/scripts/createDatabase.js
node src/scripts/createAdminUser.js
```

#### Run Migrations
```bash
cd backend
node src/scripts/runMigrations.js
```

#### Seed Test Data
```bash
cd backend
node src/scripts/seedTestData.js
```

### Port Configuration

**Kelly Rental Manager** (this project):
- Backend: 8001
- Frontend: 3002
- Database: 3308 (containerized MySQL)

**Fireproof ERP** (coexisting project):
- Backend: 8000
- Frontend: 3001
- Database: 3307 (containerized MySQL)

### Troubleshooting

#### Database Connection Issues
- Ensure database container is running: `docker ps | grep kelly-rental-mysql`
- Verify database is healthy: `docker logs kelly-rental-mysql`
- Check `DB_HOST=database` in `backend/.env` for container-to-container connectivity

#### HMR Not Working
- Ensure volumes are mounted correctly in docker-compose.dev.yml
- Try hard refresh in browser (Ctrl+Shift+R)
- Check container logs: `docker logs kelly-rental-frontend-dev -f`

#### Port Conflicts
- Verify no other services are using ports 8001, 3002, 3308
- Use `docker ps` to check running containers
- Use `netstat -ano | findstr :8001` on Windows to check port usage

#### Separate Stacks in Docker Desktop
The database and application are now in separate Docker Compose projects:
- **kelly-rental-database**: Database container only
- **kelly-rental-app**: Backend and frontend containers

This separation ensures the database appears as an independent stack in Docker Desktop, matching Fireproof's architecture.

### Project Structure

```
rental-manager/
├── backend/               # Node.js Express API
│   ├── src/
│   │   ├── modules/       # Business logic modules
│   │   ├── infrastructure/ # Shared services
│   │   └── server.js      # Entry point
│   └── .env               # Environment variables
├── frontend/              # React + Vite
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # Reusable components
│       └── lib/           # Utilities
└── docker-compose.dev.yml # Docker configuration
```

### Login Credentials

**Default Admin Account:**
- Email: admin@kelly.com
- Password: password

*Change this password in production!*

## Tech Stack

- **Backend**: Node.js 18, Express.js
- **Frontend**: React 18, Vite 5, React Router 6
- **Database**: MySQL 8.0
- **Authentication**: JWT with bcrypt
- **Development**: Docker Compose with HMR
