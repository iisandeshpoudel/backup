# Development Context

This is a localhost demo implementation, not intended for production use. The features are simplified for demonstration purposes and local testing only.

## Development Environment

- Backend: http://localhost:5000
- Frontend: http://localhost:5173
- Database: Local MongoDB
- File Storage: Local filesystem
- WebSocket: Local WebSocket server
- No external services required

## Implementation Notes

- All features are simplified for demo purposes
- No production-level security measures required
- Local storage for all data and files
- Basic error handling
- Simple WebSocket implementation
- No need for complex scaling solutions

### Image URL Handling - Critical Note

When handling image URLs between server and client, follow these exact rules:

1. Server-side URL transformation:

   ```js
   // In route handlers (e.g., customer.js, vendor.js)
   const addFullImageUrls = (data, req) => {
     const baseUrl = `${req.protocol}://${req.get("host")}`;
     // Always ensure /api prefix is present
     return {
       ...data,
       images: data.images.map((image) => ({
         ...image,
         url: image.url.startsWith("http")
           ? image.url
           : `${baseUrl}/api${
               image.url.startsWith("/") ? image.url : `/${image.url}`
             }`,
       })),
     };
   };
   ```

2. Client-side URL handling:

   ```ts
   // In imageUrl.ts utility
   export const getImageUrl = (url: string | undefined): string => {
     if (!url) return `${API_BASE_URL}/api/placeholder-product.jpg`;

     // Remove duplicate /api/ prefixes
     const cleanUrl = url.replace(/\/api\/api\//, "/api/");

     // Handle various URL formats
     if (cleanUrl.startsWith(API_BASE_URL) && cleanUrl.includes("/api/")) {
       return cleanUrl;
     }

     if (cleanUrl.startsWith(API_BASE_URL)) {
       return cleanUrl.replace(API_BASE_URL, `${API_BASE_URL}/api`);
     }

     if (cleanUrl.startsWith("/uploads/")) {
       return `${API_BASE_URL}/api${cleanUrl}`;
     }

     return `${API_BASE_URL}/api/uploads/${cleanUrl}`;
   };
   ```

3. Key points to remember:
   - Static files are served under `/api/uploads/`
   - Placeholder images are under `/api/`
   - Always ensure the `/api` prefix is present
   - Handle both absolute and relative URLs properly
   - Clean up any duplicate `/api` prefixes
   - Use consistent error fallback to placeholder

This setup prevents the common issues where:

- Images fail to load due to missing `/api` prefix
- Double `/api/api/` prefixes appear in URLs
- Placeholder images don't load correctly
- Server returns incorrect image URLs

### Common Issues and Solutions

#### Image URL Handling Issue (Recurring)

This is a common issue that appears when:

1. Images show placeholder instead of actual image
2. Server returns URLs without `/api` prefix
3. Images fail to load in specific components while working in others

Solution steps:

1. First, verify the URL structure in the server response:

   ```js
   console.error("Image load error:", {
     originalUrl,
     transformedUrl,
     urlDetails: {
       hasApiPrefix: originalUrl?.includes("/api/"),
       hasUploadsPrefix: originalUrl?.includes("/uploads/"),
       isAbsolute: originalUrl?.startsWith("http"),
     },
   });
   ```

2. Check server-side URL transformation:

   - Ensure the `addFullImageUrls` helper is using `/api` prefix
   - Verify baseUrl construction includes protocol and host
   - Check URL path starts with `/api/uploads` or `/api`

3. Client-side fixes:

   - Use `getImageUrl` utility for ALL image URLs
   - Handle both absolute and relative paths
   - Clean up duplicate `/api` prefixes
   - Always fall back to `${API_BASE_URL}/api/placeholder-product.jpg`

4. Debug checklist:
   - Server returns correct URLs with `/api` prefix
   - No double `/api/api/` in URLs
   - Placeholder image path is consistent
   - Image URLs are properly transformed in components
   - Error handling falls back to placeholder correctly

This is an infrastructure-level issue that requires consistent handling across both server and client. Always implement the complete solution rather than fixing it in individual components.

### Upcoming Features (Localhost Demo Version)

#### 1. Review System (Simplified)

- Basic star rating (1-5)
- Simple text reviews
- Local image upload (max 1 image per review)
- Basic moderation (approve/reject)
- No need for complex analytics

Technical Implementation:

```javascript
// Simple Review Schema
{
  product: ObjectId,
  reviewer: ObjectId,
  rating: Number,
  comment: String,
  image: String,
  status: String, // pending/approved/rejected
  createdAt: Date
}

// Basic API Endpoints
/api/reviews
├── POST / - Create review
├── GET /product/:id - Get reviews
├── PATCH /:id/moderate - Basic moderation
└── DELETE /:id - Delete review
```

#### 2. Chat System (Basic)

- Simple text messaging
- Basic conversation list
- Local file sharing
- No need for complex read receipts
- Basic online/offline status

Technical Implementation:

```javascript
// Simple Message Schema
{
  conversation: ObjectId,
  sender: ObjectId,
  content: String,
  attachment: String,
  createdAt: Date
}

// Basic Conversation Schema
{
  participants: [ObjectId],
  lastMessage: String,
  updatedAt: Date
}

// Basic WebSocket Events
socket.on('message', handleMessage)
socket.on('typing', handleTyping)
```

#### 3. Notification System (Basic)

- Simple in-app notifications
- Basic notification types
- No email integration needed
- No push notifications
- Simple read/unread status

Technical Implementation:

```javascript
// Simple Notification Schema
{
  recipient: ObjectId,
  type: String,
  message: String,
  read: Boolean,
  createdAt: Date
}

// Basic API Endpoints
/api/notifications
├── GET / - Get notifications
├── POST / - Create notification
└── PATCH /:id/read - Mark as read
```

### Simplified Implementation Timeline

1. Review System (1 week)

   - Day 1-2: Basic backend
   - Day 3-4: Simple frontend
   - Day 5: Testing

2. Chat System (1 week)

   - Day 1-2: WebSocket setup
   - Day 3-4: Basic chat UI
   - Day 5: Testing

3. Notification System (3-4 days)
   - Day 1: Backend setup
   - Day 2-3: Frontend integration
   - Day 4: Testing

### Local Development Guidelines

1. Keep It Simple

   - Minimal dependencies
   - Basic error handling
   - Simple UI components
   - Local storage only

2. Testing

   - Manual testing is sufficient
   - Basic error scenarios
   - No need for extensive test coverage

3. Data Management

   - Use local MongoDB
   - Simple data relationships
   - Basic data validation

4. UI Implementation
   - Reuse existing components
   - Basic styling
   - Simple animations
   - Mobile-responsive layouts

### Development Workflow

1. Start MongoDB locally
2. Run backend server (npm run dev)
3. Run frontend server (npm run dev)
4. Test in browser (Chrome preferred)
5. Use React DevTools for debugging

### Local Testing Accounts

- Admin: admin@test.com / admin123
- Vendor: vendor@test.com / vendor123
- Customer: customer@test.com / customer123

## Recent Updates (Latest First)

### Rental Availability Improvements

- Enhanced rental availability display:
  - Added current bookings display in rental modal
  - Shows who has booked the product and for what dates
  - Improved unavailable dates handling with server-side integration
  - Added new endpoint to fetch product rental information
- Improved user experience:
  - Clear visibility of existing bookings
  - Better date selection with unavailable dates blocked
  - Informative messages about product availability
  - Streamlined rental creation process

### Key Improvements

- More transparent booking information
- Better date availability handling
- Improved error messages and feedback
- Enhanced server-side integration

### Next Steps

- Consider implementing calendar heatmap view
- Add booking conflict prevention
- Implement rental notifications
- Consider adding waitlist functionality

### Rental Date Validation Improvements

- Enhanced rental date selection to prevent unavailable dates:
  - Added unavailable dates handling in StyledDatePicker component
  - Implemented server-side date availability checking
  - Added clear messaging when dates are unavailable
  - Shows when product will be available again
- Improved date picker styling and user experience:
  - Consistent dark theme styling
  - Better error and availability message display
  - Proper date range validation
  - Prevents selection of past dates

### Key Improvements

- More intuitive date selection process
- Better error handling for unavailable dates
- Consistent styling with the application theme
- Improved user feedback for date selection

### Next Steps

- Consider implementing calendar view of all booked dates
- Add rental duration recommendations
- Implement date range presets (weekend, week, month)
- Consider adding a waitlist feature for popular items

### Rental Management Workflow Simplification

- Simplified rental status workflow to be more intuitive:
  - Removed unnecessary payment status tracking (since no payment integration)
  - Removed return damage reporting for simpler return process
  - Streamlined status transitions: pending -> approved/rejected -> active -> completed
- Fixed vendor dashboard loading issues:
  - Corrected route ordering in vendor.js to properly handle /products/recent
  - Added proper error logging for debugging
  - Fixed stats calculation for active rentals and revenue
- Improved button states and UI:
  - Added loading states to all action buttons
  - Improved button styling and consistency
  - Added proper disabled states based on rental status
  - Removed redundant actions to simplify the interface

### Key Improvements

- More intuitive rental management workflow
- Better error handling and loading states
- Consistent button styling and behavior
- Fixed dashboard data loading
- Improved route organization

### Next Steps

- Consider implementing rental notifications
- Add rental duration validation
- Implement rental analytics
- Add sorting and filtering options for rental lists
- Consider adding rental review system

### Route Separation and Navigation Fixes

- Separated vendor and customer routes to prevent conflicts
- Updated route paths for better organization:
  - `/vendor/products` for vendor product management
  - `/vendor/rentals` for vendor rental management
  - `/customer/rentals` for customer rental views
- Fixed navigation from dashboard stats to respective pages
- Improved tab parameter handling in rental views
- Ensured proper role-based access control for all routes
- Added debug panels to track navigation state and parameters

### Key Improvements

- Clear separation between vendor and customer functionalities
- Consistent URL structure across the application
- Proper handling of query parameters for tab navigation
- Enhanced debugging capabilities for navigation issues
- Maintained role-based access control integrity

### Next Steps

- Consider adding breadcrumb navigation
- Implement URL-based filtering for rental lists
- Add route-based analytics tracking
- Consider adding route transitions for better UX

### Rental Status and Display Improvements

- Fixed issue with rental display to show both active and approved rentals
- Updated rental status handling across customer, vendor, and admin routes for consistency
- Modified stats endpoints to include both active and approved rentals in counts
- Improved rental history filtering to properly categorize rentals based on status
- Standardized rental status handling across the application

### Dashboard and My Rentals Page Implementation

- Created dedicated My Rentals page to replace CustomerDashboard component
- Implemented real-time data fetching for rental statistics and recent rentals
- Added proper loading and error states for data fetching
- Introduced TypeScript interfaces for better type safety
- Fixed routing issues to ensure proper navigation to My Rentals page

### Key Features

- Active rentals now include both 'active' and 'approved' status
- Rental history properly shows completed, cancelled, and rejected rentals
- Stats endpoints provide accurate counts for all rental states
- Consistent rental status handling across customer, vendor, and admin routes
- Improved type safety with TypeScript interfaces

### Next Steps

- Consider adding more detailed rental status transitions
- Implement rental status change notifications
- Add filtering and sorting options for rental lists
- Consider adding rental analytics and reporting features

### Admin Dashboard Improvements (Latest)

- Fixed image handling in admin dashboard:
  - Implemented proper image URL transformation
  - Added error handling for image loading
  - Fixed placeholder image display
  - Added debug logging for image processing
- Enhanced rental management:
  - Fixed rental display in admin dashboard
  - Improved rental search functionality
  - Added proper data transformation for rentals
  - Enhanced rental status filtering
- Updated stats calculation:
  - Fixed active users count
  - Improved revenue calculation
  - Enhanced rental statistics accuracy

### Upcoming Major Features

#### Review System Design

1. Core Features

   - Product and rental reviews
   - Star rating system (1-5 stars)
   - Written reviews with character limit
   - Review moderation by admins
   - Review analytics and reporting
   - Review response system for vendors

2. Technical Implementation
   - Review model schema:
     ```javascript
     {
       product: ObjectId,
       rental: ObjectId,
       reviewer: ObjectId,
       rating: Number,
       comment: String,
       images: [String],
       response: {
         vendor: ObjectId,
         comment: String,
         timestamp: Date
       },
       status: String, // pending/approved/rejected
       createdAt: Date,
       updatedAt: Date
     }
     ```
   - API Endpoints:
     ```
     /api/reviews
     ├── POST / - Create review
     ├── GET /product/:id - Get product reviews
     ├── GET /rental/:id - Get rental reviews
     ├── PATCH /:id - Update review
     ├── DELETE /:id - Delete review
     ├── POST /:id/response - Add vendor response
     └── PATCH /:id/moderate - Moderate review
     ```

### Chat System Implementation (Current)

1. Core Features

   - Real-time messaging with 3-second polling
   - Product-based conversations
   - Role-based access (vendor-customer communication)
   - Message history with timestamps
   - Unified chat interface in MyChats

2. Technical Implementation

   - Message model schema:

     ```javascript
     {
       sender: ObjectId(ref: "User"),
       receiver: ObjectId(ref: "User"),
       product: ObjectId(ref: "Product"),
       content: String,
       createdAt: Date
     }
     ```

   - Current API Endpoints:

     ```
     /api/chat
     ├── GET /conversations - List user's conversations grouped by product
     ├── GET /product/:productId - Get messages for a product
     └── POST /product/:productId - Send new message
     ```

   - Role-based Message Routing:
     - Customer -> Messages sent to product owner (vendor)
     - Vendor -> Messages sent to last customer who messaged about the product
     - Each conversation is tied to a specific product

3. Frontend Structure:

   ```
   /src/pages/
   ├── MyChats.tsx - Combined chat list and messaging interface
   └── ProductDetails.tsx - Initial chat entry point
   ```

4. Current Limitations:
   - Simple polling instead of WebSocket
   - Basic text-only messages
   - No typing indicators
   - No message status (read/unread)
   - No file attachments

### Next Steps for Chat System

1. Performance Improvements

   - [ ] Implement WebSocket for real-time updates
   - [ ] Add message pagination
   - [ ] Optimize message fetching

2. Feature Enhancements

   - [ ] Add typing indicators
   - [ ] Add read receipts
   - [ ] Support file attachments
   - [ ] Add chat notifications

3. UI Improvements
   - [ ] Add chat search
   - [ ] Add message reactions
   - [ ] Enhance mobile responsiveness
   - [ ] Add loading states for messages

#### Notification System Design

1. Core Features

   - Real-time notifications
   - Multiple notification types
   - Read/unread status
   - Notification preferences
   - Email notifications
   - Push notifications (future)

2. Technical Implementation
   - Notification model schema:
     ```javascript
     {
       recipient: ObjectId,
       type: String,
       title: String,
       message: String,
       data: {
         type: Map,
         of: mongoose.Schema.Types.Mixed
       },
       read: Boolean,
       createdAt: Date
     }
     ```
   - API Endpoints:
     ```
     /api/notifications
     ├── GET / - Get notifications
     ├── POST / - Create notification
     ├── PATCH /:id/read - Mark as read
     ├── DELETE /:id - Delete notification
     └── PUT /preferences - Update preferences
     ```

### Implementation Timeline

1. Phase 1: Review System (2-3 weeks)

   - Week 1: Backend implementation
   - Week 2: Frontend components
   - Week 3: Testing and refinement

2. Phase 2: Chat System (3-4 weeks)

   - Week 1: WebSocket setup
   - Week 2: Backend implementation
   - Week 3: Frontend components
   - Week 4: Real-time features

3. Phase 3: Notification System (2-3 weeks)
   - Week 1: Backend implementation
   - Week 2: Frontend integration
   - Week 3: Real-time updates

### Technical Considerations

1. Performance

   - Implement proper pagination
   - Use WebSocket for real-time features
   - Optimize image loading
   - Cache frequently accessed data

2. Security

   - Rate limiting for reviews
   - Content moderation
   - File upload validation
   - User authentication checks

3. Scalability
   - Message queue for notifications
   - Separate WebSocket server
   - CDN for media storage
   - Database indexing

### UI/UX Guidelines

1. Review System

   - Clean rating interface
   - Easy review submission
   - Clear review display
   - Helpful sorting options

2. Chat System

   - Modern chat interface
   - Message status indicators
   - Smooth animations
   - Mobile-responsive design

3. Notification System
   - Non-intrusive notifications
   - Clear notification center
   - Easy preference management
   - Consistent styling
