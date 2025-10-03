const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const Booking = require('../models/Booking.js');
const Community = require('../models/Community.js');

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive || user.isSuspended) {
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

// Connected users tracking
const connectedUsers = new Map();

const socketHandlers = (io, socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Authenticate socket connection
  socket.use(authenticateSocket);

  // Handle authentication errors
  socket.on('error', (error) => {
    console.error('Socket authentication error:', error.message);
    socket.emit('auth_error', { message: error.message });
  });

  // User connection setup
  socket.on('user_connect', async (data) => {
    try {
      if (!socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      // Add user to connected users
      connectedUsers.set(socket.userId, {
        socketId: socket.id,
        user: socket.user,
        lastSeen: new Date(),
        status: data.status || 'online'
      });

      // Join user to their personal room for notifications
      socket.join(`user_${socket.userId}`);

      // Join location-based room for community features
      if (socket.user.location?.coordinates) {
        const [lng, lat] = socket.user.location.coordinates;
        const locationRoom = `location_${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
        socket.join(locationRoom);
      }

      // Join city-based room
      if (socket.user.address?.city && socket.user.address?.state) {
        const cityRoom = `city_${socket.user.address.city}_${socket.user.address.state}`.toLowerCase().replace(/\s+/g, '_');
        socket.join(cityRoom);
      }

      console.log(`User ${socket.user.firstName} ${socket.user.lastName} connected`);
      
      // Emit connection success
      socket.emit('connection_success', {
        userId: socket.userId,
        connectedAt: new Date(),
        activeRooms: Array.from(socket.rooms)
      });

    } catch (error) {
      console.error('User connect error:', error);
      socket.emit('error', { message: 'Connection setup failed' });
    }
  });

  // Booking-related events
  socket.on('join_booking', (bookingId) => {
    socket.join(`booking_${bookingId}`);
    socket.emit('joined_booking', { bookingId });
  });

  socket.on('leave_booking', (bookingId) => {
    socket.leave(`booking_${bookingId}`);
    socket.emit('left_booking', { bookingId });
  });

  // Booking message handling
  socket.on('booking_message', async (data) => {
    try {
      const { bookingId, message } = data;

      if (!bookingId || !message?.trim()) {
        socket.emit('error', { message: 'Booking ID and message are required' });
        return;
      }

      // Verify user is part of this booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        socket.emit('error', { message: 'Booking not found' });
        return;
      }

      const isParticipant = booking.customer.toString() === socket.userId || 
                           booking.provider.toString() === socket.userId;

      if (!isParticipant) {
        socket.emit('error', { message: 'Not authorized for this booking' });
        return;
      }

      // Add message to booking
      await booking.addMessage(socket.userId, message.trim());

      // Emit to all participants
      const messageData = {
        bookingId,
        message: {
          sender: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`,
            avatar: socket.user.avatar
          },
          content: message.trim(),
          timestamp: new Date()
        }
      };

      io.to(`booking_${bookingId}`).emit('booking_message_received', messageData);

      // Send push notification to offline participant
      const otherParticipantId = booking.customer.toString() === socket.userId ? 
                                booking.provider.toString() : booking.customer.toString();
      
      if (!connectedUsers.has(otherParticipantId)) {
        // TODO: Send push notification
        console.log(`Should send push notification to user ${otherParticipantId}`);
      }

    } catch (error) {
      console.error('Booking message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Booking status updates
  socket.on('booking_status_update', async (data) => {
    try {
      const { bookingId, status, reason, notes } = data;

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        socket.emit('error', { message: 'Booking not found' });
        return;
      }

      // Only allow participants to update status
      const isParticipant = booking.customer.toString() === socket.userId || 
                           booking.provider.toString() === socket.userId;

      if (!isParticipant) {
        socket.emit('error', { message: 'Not authorized for this booking' });
        return;
      }

      // Update booking status
      await booking.updateStatus(status, socket.userId, reason, notes);

      // Emit to all participants
      const updateData = {
        bookingId,
        status,
        updatedBy: {
          id: socket.userId,
          name: `${socket.user.firstName} ${socket.user.lastName}`
        },
        reason,
        notes,
        updatedAt: new Date()
      };

      io.to(`booking_${bookingId}`).emit('booking_status_updated', updateData);

    } catch (error) {
      console.error('Booking status update error:', error);
      socket.emit('error', { message: 'Failed to update booking status' });
    }
  });

  // Community events
  socket.on('join_community_feed', (data) => {
    const { city, state, coordinates } = data;

    if (city && state) {
      const cityRoom = `city_${city}_${state}`.toLowerCase().replace(/\s+/g, '_');
      socket.join(cityRoom);
    }

    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      const [lng, lat] = coordinates;
      const locationRoom = `location_${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
      socket.join(locationRoom);
    }

    socket.emit('joined_community_feed', { city, state, coordinates });
  });

  // Community post interactions
  socket.on('community_post_like', async (data) => {
    try {
      const { postId, action } = data; // action: 'like' or 'unlike'

      const post = await Community.findById(postId);
      if (!post) {
        socket.emit('error', { message: 'Post not found' });
        return;
      }

      if (action === 'like') {
        await post.addLike(socket.userId);
      } else if (action === 'unlike') {
        await post.removeLike(socket.userId);
      }

      // Broadcast to community
      const cityRoom = `city_${post.address.city}_${post.address.state}`.toLowerCase().replace(/\s+/g, '_');
      
      io.to(cityRoom).emit('community_post_liked', {
        postId,
        action,
        userId: socket.userId,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        likeCount: post.engagement.likes.length
      });

    } catch (error) {
      console.error('Community like error:', error);
      socket.emit('error', { message: 'Failed to update like' });
    }
  });

  // Real-time location sharing for services
  socket.on('share_location', (data) => {
    const { coordinates, accuracy, timestamp } = data;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      socket.emit('error', { message: 'Invalid coordinates' });
      return;
    }

    // Update user location in connected users
    if (connectedUsers.has(socket.userId)) {
      connectedUsers.get(socket.userId).location = {
        coordinates,
        accuracy,
        timestamp: timestamp || new Date()
      };
    }

    // Broadcast to nearby users (for service discovery)
    const [lng, lat] = coordinates;
    const locationRoom = `location_${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
    
    socket.to(locationRoom).emit('nearby_user_location', {
      userId: socket.userId,
      userName: `${socket.user.firstName} ${socket.user.lastName}`,
      coordinates,
      trustScore: socket.user.trustScore,
      timestamp: timestamp || new Date()
    });
  });

  // Service availability updates
  socket.on('service_availability_update', (data) => {
    const { serviceId, isAvailable, location } = data;

    // Broadcast to nearby users
    if (location?.coordinates) {
      const [lng, lat] = location.coordinates;
      const locationRoom = `location_${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;
      
      socket.to(locationRoom).emit('service_availability_changed', {
        serviceId,
        providerId: socket.userId,
        providerName: `${socket.user.firstName} ${socket.user.lastName}`,
        isAvailable,
        location,
        timestamp: new Date()
      });
    }
  });

  // Typing indicators for booking chats
  socket.on('booking_typing_start', (data) => {
    const { bookingId } = data;
    socket.to(`booking_${bookingId}`).emit('booking_user_typing', {
      userId: socket.userId,
      userName: `${socket.user.firstName} ${socket.user.lastName}`,
      isTyping: true
    });
  });

  socket.on('booking_typing_stop', (data) => {
    const { bookingId } = data;
    socket.to(`booking_${bookingId}`).emit('booking_user_typing', {
      userId: socket.userId,
      userName: `${socket.user.firstName} ${socket.user.lastName}`,
      isTyping: false
    });
  });

  // Emergency alerts for community
  socket.on('emergency_alert', async (data) => {
    try {
      const { title, description, category, location } = data;

      if (!title || !description || !category) {
        socket.emit('error', { message: 'Title, description, and category are required' });
        return;
      }

      // Create emergency community post
      const emergencyPost = await Community.create({
        author: socket.userId,
        title: `🚨 ALERT: ${title}`,
        content: description,
        type: 'alert',
        category: 'safety',
        location: location || socket.user.location,
        address: socket.user.address,
        isPinned: true,
        pinnedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Pin for 24 hours
        aiData: {
          spamProbability: 0, // Assume emergency alerts are legitimate
          communityRelevance: 1
        }
      });

      // Broadcast to entire community
      const cityRoom = `city_${socket.user.address.city}_${socket.user.address.state}`.toLowerCase().replace(/\s+/g, '_');
      
      io.to(cityRoom).emit('emergency_alert_received', {
        postId: emergencyPost._id,
        title,
        description,
        category,
        location,
        author: {
          id: socket.userId,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          trustScore: socket.user.trustScore
        },
        timestamp: new Date()
      });

      socket.emit('emergency_alert_sent', { postId: emergencyPost._id });

    } catch (error) {
      console.error('Emergency alert error:', error);
      socket.emit('error', { message: 'Failed to send emergency alert' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.user?.firstName || 'Unknown'} disconnected: ${reason}`);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
  });

  // Heartbeat to keep connection alive and update last seen
  socket.on('heartbeat', () => {
    if (connectedUsers.has(socket.userId)) {
      connectedUsers.get(socket.userId).lastSeen = new Date();
    }
    socket.emit('heartbeat_ack');
  });

  // Get online users count for community
  socket.on('get_community_stats', () => {
    if (!socket.user?.address?.city || !socket.user?.address?.state) {
      socket.emit('error', { message: 'User location not set' });
      return;
    }

    const cityRoom = `city_${socket.user.address.city}_${socket.user.address.state}`.toLowerCase().replace(/\s+/g, '_');
    const room = io.sockets.adapter.rooms.get(cityRoom);
    const onlineCount = room ? room.size : 0;

    socket.emit('community_stats', {
      city: socket.user.address.city,
      state: socket.user.address.state,
      onlineUsers: onlineCount,
      connectedUsers: connectedUsers.size
    });
  });
};

// Helper function to emit to specific user
const emitToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

// Helper function to emit to booking participants
const emitToBooking = (io, bookingId, event, data) => {
  io.to(`booking_${bookingId}`).emit(event, data);
};

// Helper function to emit to community (city-based)
const emitToCommunity = (io, city, state, event, data) => {
  const cityRoom = `city_${city}_${state}`.toLowerCase().replace(/\s+/g, '_');
  io.to(cityRoom).emit(event, data);
};

module.exports = socketHandlers;
module.exports.emitToUser = emitToUser;
module.exports.emitToBooking = emitToBooking;
module.exports.emitToCommunity = emitToCommunity;
module.exports.connectedUsers = connectedUsers;
