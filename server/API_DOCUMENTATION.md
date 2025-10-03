# TrustCircle API Documentation

## 🚀 Complete API Guide for Frontend Developers

This documentation provides a comprehensive guide for frontend developers to integrate with the TrustCircle backend API. All endpoints are fully implemented and ready for production use.

## 📊 Base Configuration

```javascript
const BASE_URL = 'http://localhost:5000';
const API_BASE = 'http://localhost:5000/api';

// For authentication, include in headers:
const headers = {
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
};
```

## 🔐 Authentication System

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "country": "US"
  },
  "location": {
    "coordinates": [-122.4194, 37.7749]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "trustScore": 0,
      "verification": {
        "isEmailVerified": false,
        "isPhoneVerified": false
      }
    }
  },
  "message": "User registered successfully"
}
```

### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** Same as register response

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "trustScore": 75,
      "reputation": {
        "totalReviews": 15,
        "averageRating": 4.8,
        "completedServices": 12
      },
      "address": { /* address object */ },
      "location": { /* location object */ },
      "preferences": { /* preferences object */ }
    }
  }
}
```

### Update User Details
```http
PUT /api/auth/update-details
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "Johnny",
  "bio": "Experienced handyman with 10+ years experience",
  "preferences": {
    "serviceCategories": ["home_maintenance", "cleaning"],
    "radius": 15,
    "priceRange": {
      "min": 50,
      "max": 200
    }
  }
}
```

### Update Password
```http
PUT /api/auth/update-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "NewSecurePass123"
}
```

## 👥 User Management APIs

### Search Users
```http
GET /api/users/search?q=john&location=-122.4194,37.7749&radius=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `q` (required): Search term
- `location` (optional): "longitude,latitude"
- `radius` (optional): Search radius in miles (default: 25)
- `page` (optional): Page number
- `limit` (optional): Results per page

### Get User Profile
```http
GET /api/users/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "avatar_url",
      "trustScore": 85,
      "statistics": {
        "reviews": {
          "totalReviews": 20,
          "averageRating": 4.7
        },
        "activeServices": 5,
        "bookingsAsCustomer": {
          "totalBookings": 8,
          "completedBookings": 7
        }
      }
    }
  }
}
```

### Get User's Services
```http
GET /api/users/:userId/services?category=cleaning&isActive=true
```

### Get User's Reviews
```http
GET /api/users/:userId/reviews?rating=5
```

## 🛠 Service Management APIs

### Get All Services
```http
GET /api/services?category=cleaning&minPrice=50&maxPrice=200&page=1&limit=20
```

**Query Parameters:**
- `category` (optional): Service category
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `rating` (optional): Minimum rating filter
- `page` (optional): Page number
- `limit` (optional): Results per page
- `sortBy` (optional): "createdAt", "price", "rating", "views"
- `sortOrder` (optional): "asc" or "desc"

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "service_id",
        "title": "Professional House Cleaning",
        "description": "Complete house cleaning service...",
        "category": "cleaning",
        "pricing": {
          "type": "hourly",
          "amount": 75,
          "currency": "USD"
        },
        "provider": {
          "firstName": "Jane",
          "lastName": "Smith",
          "avatar": "avatar_url",
          "trustScore": 92
        },
        "reviews": {
          "total": 25,
          "average": 4.8
        },
        "location": {
          "coordinates": [-122.4194, 37.7749]
        },
        "address": {
          "city": "San Francisco",
          "state": "CA"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalServices": 100
    }
  }
}
```

### Search Services
```http
GET /api/services/search?q=cleaning&location=-122.4194,37.7749&radius=15&category=cleaning
```

**Query Parameters:**
- `q` (required): Search query
- `location` (optional): "longitude,latitude"
- `radius` (optional): Search radius in miles
- `category` (optional): Service category
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `sortBy` (optional): "relevance", "price_low", "price_high", "rating", "newest"

### Get Nearby Services
```http
GET /api/services/nearby?lng=-122.4194&lat=37.7749&radius=10&category=cleaning
```

**Required Parameters:**
- `lng`: Longitude
- `lat`: Latitude

### Create Service
```http
POST /api/services
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Professional House Cleaning",
  "description": "Complete house cleaning service with eco-friendly products",
  "category": "cleaning",
  "subcategory": "residential",
  "pricing": {
    "type": "hourly",
    "amount": 75,
    "currency": "USD"
  },
  "location": {
    "coordinates": [-122.4194, 37.7749]
  },
  "address": {
    "street": "456 Oak St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94103"
  },
  "duration": {
    "estimated": 120,
    "flexible": true
  },
  "requirements": {
    "experience": "intermediate",
    "equipment": ["vacuum", "cleaning supplies"],
    "specialSkills": ["eco-friendly cleaning"]
  },
  "availability": {
    "schedule": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      }
    ],
    "advanceBooking": 24
  }
}
```

### Get Service Details
```http
GET /api/services/:serviceId
```

**Response includes:**
- Complete service information
- Provider details and trust score
- Recent reviews (5 most recent)
- Upcoming availability (7 days)

### Update Service
```http
PUT /api/services/:serviceId
Authorization: Bearer <token>
```

### Delete Service
```http
DELETE /api/services/:serviceId
Authorization: Bearer <token>
```

### Pause/Unpause Service
```http
PUT /api/services/:serviceId/pause
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "isPaused": true,
  "reason": "Going on vacation"
}
```

## 📅 Booking Management APIs

### Get User Bookings
```http
GET /api/bookings?status=confirmed&role=customer&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): "pending", "confirmed", "in_progress", "completed", "cancelled"
- `role` (optional): "customer", "provider", "all"
- `sortBy` (optional): "scheduledDate", "createdAt", "status"

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking_id",
        "title": "House Cleaning Service",
        "status": "confirmed",
        "scheduledDate": "2024-01-15T00:00:00.000Z",
        "scheduledTime": "10:00",
        "estimatedDuration": 120,
        "pricing": {
          "servicePrice": 150,
          "platformFee": 4.5,
          "taxes": 12.36,
          "totalAmount": 166.86,
          "currency": "USD"
        },
        "customer": {
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "avatar_url"
        },
        "provider": {
          "firstName": "Jane",
          "lastName": "Smith",
          "avatar": "avatar_url"
        },
        "service": {
          "title": "Professional House Cleaning",
          "category": "cleaning"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalBookings": 25
    }
  }
}
```

### Create Booking
```http
POST /api/bookings
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "service": "service_id",
  "title": "Weekly house cleaning",
  "description": "Need regular house cleaning every week",
  "scheduledDate": "2024-01-15",
  "scheduledTime": "10:00",
  "estimatedDuration": 120,
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "instructions": "Use side entrance, key under mat"
  },
  "location": {
    "coordinates": [-122.4194, 37.7749]
  },
  "requirements": {
    "specialInstructions": "Please focus on kitchen and bathrooms",
    "accessInstructions": "Ring doorbell twice"
  }
}
```

### Get Booking Details
```http
GET /api/bookings/:bookingId
Authorization: Bearer <token>
```

**Response includes:**
- Complete booking information
- Customer and provider details
- Service information
- Message history
- Status history

### Update Booking Status
```http
PUT /api/bookings/:bookingId/status
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "confirmed",
  "reason": "Available at requested time",
  "notes": "Looking forward to providing excellent service"
}
```

**Valid Status Transitions:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `in_progress`, `cancelled`, `no_show`
- `in_progress` → `completed`, `cancelled`

### Add Message to Booking
```http
POST /api/bookings/:bookingId/messages
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "message": "Hi! I'll arrive around 10 AM as scheduled."
}
```

### Mark Messages as Read
```http
PUT /api/bookings/:bookingId/messages/read
Authorization: Bearer <token>
```

### Cancel Booking
```http
DELETE /api/bookings/:bookingId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "Schedule conflict - need to reschedule"
}
```

**Response includes cancellation fee and refund amount calculations**

## ⭐ Review System APIs

### Get Reviews
```http
GET /api/reviews?service=service_id&rating=5&reviewType=customer_to_provider
```

**Query Parameters:**
- `service` (optional): Filter by service ID
- `reviewer` (optional): Filter by reviewer ID
- `reviewee` (optional): Filter by reviewee ID
- `rating` (optional): Filter by rating (1-5)
- `reviewType` (optional): "customer_to_provider" or "provider_to_customer"
- `sortBy` (optional): "createdAt", "rating", "helpfulness"

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review_id",
        "rating": 5,
        "title": "Excellent service!",
        "comment": "Jane did an amazing job cleaning our house...",
        "reviewType": "customer_to_provider",
        "detailedRatings": {
          "communication": 5,
          "punctuality": 5,
          "quality": 5,
          "professionalism": 5,
          "value": 4
        },
        "reviewer": {
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "avatar_url"
        },
        "reviewee": {
          "firstName": "Jane",
          "lastName": "Smith",
          "avatar": "avatar_url"
        },
        "service": {
          "title": "Professional House Cleaning",
          "category": "cleaning"
        },
        "helpfulness": {
          "upvotes": 8,
          "downvotes": 1
        },
        "response": {
          "comment": "Thank you for the kind words!",
          "respondedAt": "2024-01-10T15:30:00.000Z"
        },
        "createdAt": "2024-01-08T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalReviews": 89
    }
  }
}
```

### Create Review
```http
POST /api/reviews
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "booking": "booking_id",
  "rating": 5,
  "title": "Excellent service!",
  "comment": "Jane provided exceptional cleaning service. Very thorough and professional.",
  "reviewType": "customer_to_provider",
  "detailedRatings": {
    "communication": 5,
    "punctuality": 5,
    "quality": 5,
    "professionalism": 5,
    "value": 4
  },
  "photos": [
    {
      "url": "photo_url",
      "caption": "After cleaning - spotless!"
    }
  ]
}
```

### Get Review Details
```http
GET /api/reviews/:reviewId
```

### Update Review
```http
PUT /api/reviews/:reviewId
Authorization: Bearer <token>
```

**Note:** Reviews can only be updated within 24 hours of creation

### Delete Review
```http
DELETE /api/reviews/:reviewId
Authorization: Bearer <token>
```

### Vote on Review Helpfulness
```http
POST /api/reviews/:reviewId/helpful
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "vote": "up"  // or "down"
}
```

### Flag Review
```http
POST /api/reviews/:reviewId/flag
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "inappropriate_language",
  "description": "Contains offensive language"
}
```

**Valid flag reasons:**
- `inappropriate_language`
- `spam`
- `fake_review`
- `harassment`
- `off_topic`
- `privacy_violation`
- `other`

### Respond to Review
```http
POST /api/reviews/:reviewId/response
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "comment": "Thank you for the wonderful review! It was a pleasure working with you."
}
```

## 🏘 Community Features APIs

### Get Community Posts
```http
GET /api/community?type=post&category=general&city=San Francisco&state=CA
```

**Query Parameters:**
- `type` (optional): "post", "event", "recommendation", "alert", "question", "announcement"
- `category` (optional): "general", "safety", "events", "recommendations", "lost_found", etc.
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `author` (optional): Filter by author ID
- `sortBy` (optional): "createdAt", "engagement", "views"

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post_id",
        "title": "Neighborhood Watch Meeting",
        "content": "Join us for our monthly neighborhood watch meeting...",
        "type": "announcement",
        "category": "safety",
        "author": {
          "firstName": "Sarah",
          "lastName": "Johnson",
          "avatar": "avatar_url",
          "trustScore": 78
        },
        "address": {
          "city": "San Francisco",
          "state": "CA",
          "neighborhood": "Mission District"
        },
        "engagement": {
          "views": 156,
          "likes": 23,
          "shares": 5,
          "bookmarks": 8
        },
        "commentCount": 12,
        "isPinned": false,
        "isFeatured": true,
        "createdAt": "2024-01-08T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalPosts": 156
    }
  }
}
```

### Get Nearby Posts
```http
GET /api/community/nearby?lng=-122.4194&lat=37.7749&radius=5&type=alert
```

### Get Community Events
```http
GET /api/community/events?city=San Francisco&state=CA&upcoming=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event_id",
        "title": "Community Garden Cleanup",
        "content": "Let's beautify our community garden together!",
        "type": "event",
        "category": "environment",
        "eventDetails": {
          "startDate": "2024-01-20T00:00:00.000Z",
          "endDate": "2024-01-20T00:00:00.000Z",
          "startTime": "09:00",
          "endTime": "12:00",
          "venue": {
            "name": "Mission Community Garden",
            "address": "456 Mission St, San Francisco, CA"
          },
          "maxAttendees": 50,
          "registrationRequired": true,
          "fee": {
            "amount": 0,
            "currency": "USD"
          }
        },
        "attendeeCount": 23,
        "author": {
          "firstName": "Mike",
          "lastName": "Green",
          "avatar": "avatar_url"
        }
      }
    ]
  }
}
```

### Get Trending Posts
```http
GET /api/community/trending?city=San Francisco&state=CA&timeframe=24
```

### Create Community Post
```http
POST /api/community
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Lost Cat - Please Help!",
  "content": "My orange tabby cat 'Whiskers' went missing yesterday evening...",
  "type": "post",
  "category": "lost_found",
  "address": {
    "neighborhood": "Mission District",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94110"
  },
  "location": {
    "coordinates": [-122.4194, 37.7749]
  },
  "media": [
    {
      "type": "image",
      "url": "cat_photo_url",
      "caption": "Whiskers - orange tabby, very friendly"
    }
  ],
  "expiresAt": "2024-02-01T00:00:00.000Z",
  "visibility": "public"
}
```

**For Events:**
```json
{
  "title": "Neighborhood BBQ",
  "content": "Join us for our annual neighborhood BBQ!",
  "type": "event",
  "category": "events",
  "address": {
    "city": "San Francisco",
    "state": "CA"
  },
  "eventDetails": {
    "startDate": "2024-01-25",
    "startTime": "12:00",
    "endTime": "16:00",
    "venue": {
      "name": "Mission Dolores Park",
      "address": "19th St & Dolores St, San Francisco, CA"
    },
    "maxAttendees": 100,
    "registrationRequired": false,
    "fee": {
      "amount": 10,
      "currency": "USD"
    },
    "organizer": {
      "name": "Mission Neighborhood Association",
      "contact": {
        "email": "events@mission-na.org"
      }
    }
  }
}
```

### Get Post Details
```http
GET /api/community/:postId
```

### Update Post
```http
PUT /api/community/:postId
Authorization: Bearer <token>
```

### Delete Post
```http
DELETE /api/community/:postId
Authorization: Bearer <token>
```

### Like/Unlike Post
```http
POST /api/community/:postId/like
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "action": "like"  // or "unlike"
}
```

### Add Comment to Post
```http
POST /api/community/:postId/comment
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Great initiative! I'll definitely be there.",
  "parentComment": "parent_comment_id"  // optional, for replies
}
```

### Join/Leave Event
```http
POST /api/community/:eventId/attend
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "going"  // "going", "maybe", "not_going"
}
```

## 🔌 Real-time Features (Socket.IO)

### Connection Setup

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Initialize connection
socket.emit('user_connect', {
  status: 'online'
});

socket.on('connection_success', (data) => {
  console.log('Connected:', data.userId);
});
```

### Booking Real-time Events

```javascript
// Join booking room for real-time updates
socket.emit('join_booking', bookingId);

// Send message
socket.emit('booking_message', {
  bookingId: 'booking_id',
  message: 'Hello! I have a question about the service.'
});

// Listen for messages
socket.on('booking_message_received', (data) => {
  console.log('New message:', data.message);
});

// Listen for status updates
socket.on('booking_status_updated', (data) => {
  console.log('Booking status changed to:', data.status);
});

// Typing indicators
socket.emit('booking_typing_start', { bookingId });
socket.emit('booking_typing_stop', { bookingId });

socket.on('booking_user_typing', (data) => {
  console.log(`${data.userName} is typing...`);
});
```

### Community Real-time Events

```javascript
// Join community feed
socket.emit('join_community_feed', {
  city: 'San Francisco',
  state: 'CA',
  coordinates: [-122.4194, 37.7749]
});

// Like post
socket.emit('community_post_like', {
  postId: 'post_id',
  action: 'like'
});

// Listen for community updates
socket.on('community_post_liked', (data) => {
  console.log('Post liked:', data.postId, 'by', data.userName);
});

socket.on('new_community_post', (data) => {
  console.log('New post in community:', data.post.title);
});

socket.on('emergency_alert_received', (data) => {
  console.log('🚨 EMERGENCY ALERT:', data.title);
  // Show urgent notification to user
});
```

### Location Sharing

```javascript
// Share location for service discovery
socket.emit('share_location', {
  coordinates: [-122.4194, 37.7749],
  accuracy: 10,
  timestamp: new Date()
});

// Listen for nearby users
socket.on('nearby_user_location', (data) => {
  console.log('Nearby user:', data.userName, 'Trust Score:', data.trustScore);
});

// Service availability updates
socket.emit('service_availability_update', {
  serviceId: 'service_id',
  isAvailable: true,
  location: {
    coordinates: [-122.4194, 37.7749]
  }
});
```

### Notifications

```javascript
// Listen for various notifications
socket.on('new_booking_request', (data) => {
  console.log('New booking request from:', data.customer.name);
});

socket.on('booking_cancelled', (data) => {
  console.log('Booking cancelled by:', data.cancelledBy.name);
});

socket.on('account_suspended', (data) => {
  console.log('Account suspended:', data.reason);
});
```

## 📱 Error Handling

All API responses follow this consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation Error",
    "type": "ValidationError",
    "statusCode": 400,
    "errors": [
      {
        "field": "email",
        "message": "Please provide a valid email",
        "value": "invalid-email"
      }
    ]
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Types
- `ValidationError` - Request validation failed
- `AuthenticationError` - Invalid or missing token
- `AuthorizationError` - Insufficient permissions
- `NotFoundError` - Resource not found
- `DuplicateError` - Resource already exists
- `RateLimitError` - Too many requests
- `CORSError` - CORS policy violation

## 🔒 Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 10 requests per 15 minutes per IP
- **File Upload**: 10 requests per hour per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📍 Geospatial Features

### Location Format
All location coordinates use GeoJSON format:
```json
{
  "location": {
    "type": "Point",
    "coordinates": [longitude, latitude]  // Note: longitude first!
  }
}
```

### Distance Calculations
- All distance parameters are in miles
- Maximum search radius: 100 miles
- Default radius: 10 miles

### Geospatial Queries
```javascript
// Find services within 15 miles
GET /api/services/nearby?lng=-122.4194&lat=37.7749&radius=15

// Search with location
GET /api/services/search?q=cleaning&location=-122.4194,37.7749&radius=25

// Find community posts nearby
GET /api/community/nearby?lng=-122.4194&lat=37.7749&radius=5
```

## 📊 Pagination

All list endpoints support pagination:

### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

### Response Format
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 98,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 🎯 Service Categories

Available service categories:
- `home_maintenance` - Home repair and maintenance
- `cleaning` - House and office cleaning
- `gardening` - Landscaping and garden care
- `pet_care` - Pet sitting, walking, grooming
- `tutoring` - Educational and academic tutoring
- `childcare` - Babysitting and child care
- `elderly_care` - Senior care and assistance
- `tech_support` - Computer and tech help
- `delivery` - Delivery and courier services
- `transportation` - Rides and moving services
- `photography` - Event and portrait photography
- `event_planning` - Party and event planning
- `fitness` - Personal training and fitness
- `beauty` - Hair, makeup, and beauty services
- `handyman` - General repairs and odd jobs
- `cooking` - Meal prep and catering
- `moving` - Moving and relocation services
- `other` - Other services

## 🏘 Community Categories

Available community categories:
- `general` - General discussions
- `safety` - Safety and security
- `events` - Community events
- `recommendations` - Business and service recommendations
- `lost_found` - Lost and found items
- `neighborhood_watch` - Neighborhood watch activities
- `local_business` - Local business discussions
- `services` - Service recommendations and discussions
- `housing` - Housing and real estate
- `transportation` - Transportation and commuting
- `environment` - Environmental initiatives
- `pets` - Pet-related discussions
- `children` - Child and family activities
- `seniors` - Senior community activities

## 🛡 Trust Score System

The trust score is calculated based on:
- **Review ratings** (40% weight)
- **Service completion rate** (30% weight)
- **Account verification status** (15% weight)
- **Community engagement** (10% weight)
- **Time on platform** (5% weight)

Trust score ranges:
- `0-20`: New user
- `21-40`: Building trust
- `41-60`: Trusted member
- `61-80`: Highly trusted
- `81-100`: Top-tier trusted

## 🔐 Security Features

### Authentication
- JWT tokens with 7-day expiration
- Password requirements: minimum 6 characters with uppercase, lowercase, and numbers
- Account lockout after multiple failed login attempts

### Data Protection
- All sensitive data is encrypted at rest
- HTTPS required for production
- Input validation on all endpoints
- SQL injection protection via Mongoose ODM

### Privacy
- Personal information is only shared with consent
- Location data is anonymized for privacy
- Users can control data sharing preferences

## 🚀 Quick Start for Frontend

### 1. Setup API Client
```javascript
// api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
```

### 2. Authentication Hook (React)
```javascript
// useAuth.js
import { useState, useEffect } from 'react';
import API from './api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.get('/auth/me')
        .then(res => setUser(res.data.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await API.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, login, logout, loading };
};
```

### 3. Socket.IO Hook (React)
```javascript
// useSocket.js
import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export const useSocket = (user) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      socketRef.current = io('http://localhost:5000', {
        auth: { token }
      });

      socketRef.current.emit('user_connect', { status: 'online' });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [user]);

  return socketRef.current;
};
```

### 4. Example Service List Component
```javascript
// ServiceList.js
import { useState, useEffect } from 'react';
import API from './api';

const ServiceList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    page: 1
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const params = new URLSearchParams(filters);
        const response = await API.get(`/services?${params}`);
        setServices(response.data.data.services);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [filters]);

  if (loading) return <div>Loading services...</div>;

  return (
    <div>
      <h2>Available Services</h2>
      {services.map(service => (
        <div key={service.id} className="service-card">
          <h3>{service.title}</h3>
          <p>{service.description}</p>
          <p>Price: ${service.pricing.amount}/{service.pricing.type}</p>
          <p>Rating: {service.reviews.average} ({service.reviews.total} reviews)</p>
          <p>Provider: {service.provider.firstName} {service.provider.lastName}</p>
        </div>
      ))}
    </div>
  );
};
```

## 📞 Support & Contact

For technical support or questions about the API:
- Check the error response messages for specific guidance
- Review this documentation for endpoint details
- Test endpoints using the provided examples
- Ensure proper authentication headers are included

## 🔄 API Versioning

Current API version: `v1`

All endpoints are currently unversioned but will follow this pattern in future versions:
```
http://localhost:5000/api/v1/services
```

## 🎉 Ready to Build!

This API provides everything you need to build a complete community service platform. All endpoints are fully implemented and tested. Start with authentication, then build out your service discovery, booking, and community features.

The real-time Socket.IO integration will make your app feel modern and responsive, while the comprehensive trust and review system will help build user confidence in your platform.

Happy coding! 🚀
