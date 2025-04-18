# HoeEdu Solution - Deployment Guide

This guide will help you deploy the HoeEdu Solution application to your web hosting provider.

## Prerequisites

Before starting the deployment process, ensure you have:

1. A web hosting provider that supports:
   - Node.js (version 16 or higher)
   - PostgreSQL database
   - Environment variables configuration

2. Database credentials (will need to be set as environment variables)

## Files to Upload

The following files and directories are essential for the application to run:

```
/client/         # Frontend React code
/server/         # Backend Express server code
/shared/         # Shared code between client and server
/node_modules/   # Dependencies (can be reinstalled on the server)
package.json     # Project configuration
package-lock.json # Dependency lock file
drizzle.config.ts # Database ORM configuration
tsconfig.json    # TypeScript configuration
vite.config.ts   # Vite configuration
postcss.config.js # PostCSS configuration
tailwind.config.ts # Tailwind CSS configuration
theme.json       # Theme configuration
```

## Deployment Steps

### 1. Prepare Your Server/Hosting

Ensure your hosting environment provides:
- Node.js runtime (v16 or higher)
- PostgreSQL database
- Ability to set environment variables
- Support for running Node.js applications persistently

### 2. Database Setup

1. Create a PostgreSQL database on your hosting provider
2. Note down the following database credentials:
   - Database name
   - Database username
   - Database password
   - Database host
   - Database port

### 3. Upload Files

You have two options:

#### Option A: Upload Source Code (Recommended for most hosts)

1. Upload all project files to your hosting provider
2. On your hosting server, run:
   ```bash
   npm install
   npm run build
   ```
3. This will install dependencies and build optimized production files

#### Option B: Build Locally, Then Upload (For static file hosts)

1. Build the application locally:
   ```bash
   npm run build
   ```
2. Upload the generated `dist` directory and server files to your hosting provider

### 4. Configure Environment Variables

Set the following environment variables on your hosting provider:

```
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
```

Replace `username`, `password`, `host`, `port`, and `database` with your actual PostgreSQL credentials.

### 5. Database Migration

After setting up your database connection, run the database migration:

```bash
npm run db:push
```

This will create all necessary tables in your database.

### 6. Start the Application

The appropriate start command depends on your hosting provider:

```bash
npm start
```

For some environments, you might need to adjust this command according to your hosting provider's requirements.

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:
1. Verify your DATABASE_URL environment variable is correctly set
2. Ensure your database server allows connections from your application server
3. Check if your hosting provider requires additional configurations for database connections

### Application Not Starting

If the application fails to start:
1. Check the server logs for error messages
2. Verify all environment variables are correctly set
3. Ensure your hosting provider supports all required Node.js features

### Frontend Not Loading

If the frontend doesn't load properly:
1. Check that the build process completed successfully
2. Verify that static files are being served correctly
3. Check for any CORS or path-related issues in your hosting configuration

## Hosting-Specific Notes

### cPanel Hosting

If using cPanel:
1. Use the Node.js application feature to set up your application
2. Set your application's entry point to `dist/index.js`
3. Configure environment variables in the Node.js application settings

### Heroku

If using Heroku:
1. Create a `Procfile` with: `web: npm start`
2. Add a PostgreSQL addon for your database
3. Configure environment variables in the application settings

### DigitalOcean App Platform

If using DigitalOcean App Platform:
1. Point to your GitHub repository
2. Set the run command to `npm start`
3. Add a PostgreSQL database component
4. Configure environment variables in the application settings