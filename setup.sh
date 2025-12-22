#!/bin/bash

echo "Setting up Social Media Platform..."
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "1. Make sure MongoDB is running"
echo "2. Start backend: cd backend && npm start"
echo "3. Start frontend: cd frontend && npm start"
echo ""
echo "Or use the convenience scripts:"
echo "  npm run start-backend  (in one terminal)"
echo "  npm run start-frontend (in another terminal)"

