# TrustCircle Backend

A comprehensive community service platform backend built with Node.js, Express, MongoDB, and Socket.IO, designed for AI integration.

## 🚀 Features

- **User Management**: JWT authentication with trust scoring system
- **Service Marketplace**: Geospatial service discovery and booking
- **Real-time Communication**: Socket.IO for live chat and notifications
- **Community Features**: Location-based posts, events, and alerts
- **Review System**: AI-ready review analysis and trust calculation
- **Booking System**: Complete booking workflow with status tracking
- **AI-Ready**: Models designed for ML/AI integration

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Real-time**: Socket.IO
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer (ready for cloud storage)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 🚀 Quick Start

1. **Clone and Install Dependencies**
   ```bash
   cd TrustCircle
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env file with your configurations
   ```

3. **Start MongoDB**
   - Local: `mongod`
   - Or use MongoDB Atlas (cloud)

4. **Run the Server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

5. **Verify Installation**
   - Health Check: http://localhost:5000/health
   - API Info: http://localhost:5000/api

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-details` - Update profile
- `PUT /api/auth/update-password` - Change password
- `POST /api/auth/verify-email` - Verify email
- `DELETE /api/auth/delete-account` - Delete account

### Services (Coming Soon)
- `GET /api/services` - Get services with filtering
- `POST /api/services` - Create service
- `GET /api/services/nearby` - Get nearby services
- `GET /api/services/search` - Search services

### Bookings (Coming Soon)
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/status` - Update booking status

### Reviews (Coming Soon)
- `GET /api/reviews` - Get reviews
- `POST /api/reviews` - Create review
- `POST /api/reviews/:id/helpful` - Mark helpful

### Community (Coming Soon)
- `GET /api/community` - Get community posts
- `POST /api/community` - Create post
- `GET /api/community/events` - Get events

## 🔧 Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/trustcircle

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5000000
UPLOAD_PATH=./uploads

# AI Service (Future)
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your_ai_api_key
```

## 🔌 Socket.IO Events

### Client to Server Events
- `user_connect` - Initialize user connection
- `join_booking` - Join booking room
- `booking_message` - Send booking message
- `booking_status_update` - Update booking status
- `community_post_like` - Like/unlike community post
- `share_location` - Share real-time location
- `emergency_alert` - Send emergency alert

### Server to Client Events
- `connection_success` - Connection established
- `booking_message_received` - New booking message
- `booking_status_updated` - Booking status changed
- `community_post_liked` - Post liked by someone
- `emergency_alert_received` - Emergency alert broadcast
- `nearby_user_location` - Nearby user location update

## 📊 Database Models

### User Model
- Authentication and profile data
- Trust score and reputation metrics
- Location and preferences
- AI profile for recommendations

### Service Model
- Service details and pricing
- Geospatial location data
- Availability and portfolio
- AI enhancement fields

### Booking Model
- Complete booking workflow
- Real-time messaging
- Status history tracking
- AI risk assessment

### Review Model
- Detailed rating system
- AI sentiment analysis
- Authenticity scoring
- Helpfulness tracking

### Community Model
- Location-based posts
- Event management
- Engagement metrics
- AI content analysis

## 🔐 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcryptjs
- Rate limiting per IP and user
- CORS protection
- Helmet security headers
- Input validation and sanitization
- User role-based access control

## 🤖 AI Integration Ready

The backend is designed for easy AI integration:

- **Trust Scoring**: User reputation calculation
- **Service Matching**: AI-powered recommendations
- **Content Analysis**: Review and post sentiment analysis
- **Fraud Detection**: Booking and review authenticity
- **Demand Prediction**: Service pricing optimization

## 🚀 Deployment

### Docker (Recommended)
```dockerfile
# Create Dockerfile for containerized deployment
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Setup for Production
- Set `NODE_ENV=production`
- Use MongoDB Atlas or managed MongoDB
- Configure proper JWT secrets
- Set up SSL/TLS certificates
- Configure reverse proxy (nginx)

## 📝 Development

### Code Structure
```
TrustCircle/
├── config/          # Database and app configuration
├── middleware/      # Express middleware
├── models/          # Mongoose data models
├── routes/          # API route handlers
├── socket/          # Socket.IO event handlers
├── scripts/         # Utility scripts
├── server.js        # Main application file
└── package.json     # Dependencies and scripts
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite (coming soon)
- `npm run seed` - Seed database with sample data

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- Check the [Issues](../../issues) for common problems
- Create a new issue for bugs or feature requests
- Join our community discussions

## 🎯 Roadmap

- [ ] Complete all API endpoints
- [ ] Implement file upload with cloud storage
- [ ] Add comprehensive test coverage
- [ ] Integrate AI/ML services
- [ ] Add email notification system
- [ ] Implement advanced search features
- [ ] Add admin dashboard APIs
- [ ] Performance optimizations

---

**Built for the future of community services with AI-first architecture** 🚀
