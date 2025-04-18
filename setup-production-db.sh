#!/bin/bash

# This script helps set up your database in a production environment

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]
then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Please set the DATABASE_URL environment variable before running this script."
  exit 1
fi

# Run the database migration
echo "Running database schema migration..."
npm run db:push

# Verify the result
if [ $? -eq 0 ]
then
  echo "Database schema successfully migrated!"
  echo "Your database is now ready for use."
else
  echo "ERROR: Database migration failed. Please check your database connection and try again."
  exit 1
fi

# Print success message
echo ""
echo "==================================="
echo "Database setup completed successfully!"
echo "You can now start your application using: npm start"
echo "==================================="