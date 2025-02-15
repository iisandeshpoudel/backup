# Rentoo - Product Rental Management System

A full-stack web application for managing product rentals with role-based access control, real-time chat, notifications, and review system.

## Features

- 🔐 Role-based authentication (Admin, Vendor, Customer)
- 📦 Product management with image uploads
- 📅 Rental management system
- 💬 Real-time chat between vendors and customers
- 🔔 Real-time notifications
- ⭐ Product review and rating system
- 📊 Role-specific dashboards
- 🌙 Dark mode interface

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rentoo
```

### 2. Setup MongoDB

1. Install MongoDB on your system
2. Create a new database named 'rentoo'
3. Note down your MongoDB connection URL

### 3. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit the .env file with your configuration:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentoo
JWT_SECRET=your_jwt_secret_here
```

### 4. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit the .env file:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

### 5. Initialize Database with Test Accounts

```bash
cd server
node src/scripts/initTestAccounts.js
```

This will create the following test accounts if they don't already exist:

Admin Account:
- Email: admin@test.com
- Password: admin123

Vendor Account:
- Email: vendor@test.com
- Password: vendor123

Customer Account:
- Email: customer@test.com
- Password: customer123

### 6. Starting the Application

1. Start MongoDB server

2. Start the backend server:

```bash
cd server
npm run dev
```

3. In a new terminal, start the frontend:

```bash
cd client
npm run dev
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## Initial Login Credentials

### Admin

- Email: admin@test.com
- Password: admin123

### Test Accounts

You can register new accounts or use these test accounts:

Vendor:

- Email: vendor@test.com
- Password: vendor123

Customer:

- Email: customer@test.com
- Password: customer123

## Project Structure

```
client/                 # Frontend React application
  ├── src/
  │   ├── components/  # Reusable components
  │   ├── contexts/    # React contexts
  │   ├── pages/       # Page components
  │   ├── types/       # TypeScript types
  │   └── utils/       # Utility functions
  └── ...

server/                # Backend Node.js application
  ├── src/
  │   ├── middleware/  # Express middleware
  │   ├── models/      # Mongoose models
  │   ├── routes/      # API routes
  │   ├── scripts/     # Utility scripts
  │   └── utils/       # Utility functions
  └── ...
```

## API Documentation

Base URL: `http://localhost:5000/api`

### Authentication Routes

- POST `/auth/register` - Register new user
- POST `/auth/login` - User login
- GET `/auth/me` - Get current user

### Product Routes

- GET `/products` - List products
- POST `/products` - Create product (Vendor only)
- GET `/products/:id` - Get product details
- PUT `/products/:id` - Update product (Owner only)
- DELETE `/products/:id` - Delete product (Owner only)

### Rental Routes

- POST `/rentals` - Create rental request
- GET `/rentals` - List user's rentals
- PATCH `/rentals/:id` - Update rental status

### Chat Routes

- GET `/chat/conversations` - List chats
- GET `/chat/messages/:productId` - Get messages
- POST `/chat/messages` - Send message

### Review Routes

- POST `/reviews` - Create review
- GET `/reviews/product/:id` - Get product reviews
- PATCH `/reviews/:id` - Update review status

### Notification Routes

- GET `/notifications` - Get notifications
- PATCH `/notifications/:id/read` - Mark as read
- DELETE `/notifications/:id` - Delete notification

## Environment Variables

### Backend (.env)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentoo
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Development Guidelines

1. Follow TypeScript best practices
2. Use proper error handling
3. Maintain consistent styling with Tailwind CSS
4. Follow the established component structure
5. Keep the file naming conventions
6. Use proper Git branching strategy

## Common Issues

1. Image URLs not working

   - Ensure the `/uploads` directory exists in the server
   - Check image URL transformation in frontend

2. WebSocket connection issues

   - Verify the WebSocket server is running
   - Check firewall settings

3. Database connection issues
   - Verify MongoDB is running
   - Check connection string in .env

## License

MIT License
