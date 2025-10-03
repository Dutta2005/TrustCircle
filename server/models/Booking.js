const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Core Booking Information
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },

  // Booking Details
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Booking description cannot exceed 1000 characters']
  },
  
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  scheduledTime: {
    type: String,
    required: true,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true,
    min: 15
  },
  actualDuration: {
    type: Number, // in minutes
    min: 0
  },

  // Location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'US'
    },
    instructions: String // Special instructions for finding the location
  },

  // Pricing and Payment
  pricing: {
    servicePrice: {
      type: Number,
      required: true,
      min: 0
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0
    },
    taxes: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },

  // Booking Status Workflow
  status: {
    type: String,
    enum: [
      'pending',      // Customer requested, waiting for provider confirmation
      'confirmed',    // Provider confirmed, booking scheduled
      'in_progress',  // Service is currently being performed
      'completed',    // Service completed successfully
      'cancelled',    // Cancelled by customer or provider
      'no_show',      // Customer didn't show up
      'disputed'      // There's a dispute about the service
    ],
    default: 'pending',
    index: true
  },
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    notes: String
  }],

  // Communication
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],

  // Service Requirements
  requirements: {
    equipment: [String],
    materials: [String],
    specialInstructions: String,
    accessInstructions: String
  },

  // Completion Details
  completion: {
    completedAt: Date,
    workSummary: String,
    beforePhotos: [String],
    afterPhotos: [String],
    customerSignature: String, // Digital signature or confirmation
    providerNotes: String
  },

  // Cancellation
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: [
        'customer_request', 'provider_unavailable', 'weather', 
        'emergency', 'payment_issue', 'mutual_agreement', 'other'
      ]
    },
    refundAmount: {
      type: Number,
      min: 0
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'not_applicable'],
      default: 'not_applicable'
    }
  },

  // Reviews (References to Review model)
  customerReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },
  providerReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },

  // AI Enhancement Fields
  aiData: {
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    fraudProbability: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    sentimentScore: {
      type: Number,
      default: 0,
      min: -1,
      max: 1
    },
    predictedSatisfaction: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    lastAIUpdate: Date
  },

  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  internalNotes: String // For admin use
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ service: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ location: '2dsphere' });

// Compound indexes for complex queries
bookingSchema.index({ customer: 1, scheduledDate: -1 });
bookingSchema.index({ provider: 1, scheduledDate: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

// Virtual for customer details
bookingSchema.virtual('customerDetails', {
  ref: 'User',
  localField: 'customer',
  foreignField: '_id',
  justOne: true
});

// Virtual for provider details
bookingSchema.virtual('providerDetails', {
  ref: 'User',
  localField: 'provider',
  foreignField: '_id',
  justOne: true
});

// Virtual for service details
bookingSchema.virtual('serviceDetails', {
  ref: 'Service',
  localField: 'service',
  foreignField: '_id',
  justOne: true
});

// Virtual for is upcoming
bookingSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const bookingDateTime = new Date(this.scheduledDate);
  return bookingDateTime > now && ['confirmed', 'pending'].includes(this.status);
});

// Virtual for is overdue
bookingSchema.virtual('isOverdue').get(function() {
  const now = new Date();
  const bookingDateTime = new Date(this.scheduledDate);
  return bookingDateTime < now && ['confirmed', 'in_progress'].includes(this.status);
});

// Virtual for duration in hours
bookingSchema.virtual('durationHours').get(function() {
  return Math.round((this.estimatedDuration || 0) / 60 * 10) / 10;
});

// Method to add message
bookingSchema.methods.addMessage = function(senderId, message) {
  this.messages.push({
    sender: senderId,
    message: message,
    timestamp: new Date(),
    isRead: false
  });
  return this.save();
};

// Method to update status with history
bookingSchema.methods.updateStatus = function(newStatus, changedBy, reason = '', notes = '') {
  const oldStatus = this.status;
  
  // Add to history
  this.statusHistory.push({
    status: oldStatus,
    changedAt: new Date(),
    changedBy: changedBy,
    reason: reason,
    notes: notes
  });
  
  // Update current status
  this.status = newStatus;
  
  // Handle status-specific logic
  if (newStatus === 'completed' && !this.completion.completedAt) {
    this.completion.completedAt = new Date();
  }
  
  if (newStatus === 'cancelled' && !this.cancellation.cancelledAt) {
    this.cancellation.cancelledAt = new Date();
    this.cancellation.cancelledBy = changedBy;
    this.cancellation.reason = reason;
  }
  
  return this.save();
};

// Method to calculate cancellation fee
bookingSchema.methods.calculateCancellationFee = function() {
  const now = new Date();
  const bookingTime = new Date(this.scheduledDate);
  const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);
  
  // Cancellation policy - can be enhanced with AI
  if (hoursUntilBooking > 24) {
    return 0; // Free cancellation
  } else if (hoursUntilBooking > 2) {
    return this.pricing.totalAmount * 0.25; // 25% fee
  } else {
    return this.pricing.totalAmount * 0.5; // 50% fee
  }
};

// Method to mark messages as read
bookingSchema.methods.markMessagesAsRead = function(userId) {
  this.messages.forEach(message => {
    if (message.sender.toString() !== userId.toString() && !message.isRead) {
      message.isRead = true;
    }
  });
  return this.save();
};

// Static method to get booking statistics
bookingSchema.statics.getBookingStats = function(userId, role = 'customer') {
  const matchField = role === 'customer' ? 'customer' : 'provider';
  
  return this.aggregate([
    { $match: { [matchField]: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.totalAmount', 0] }
        },
        averageRating: { $avg: '$customerReview.rating' }
      }
    }
  ]);
};

// Pre-save middleware to calculate total amount
bookingSchema.pre('save', function(next) {
  if (this.isModified('pricing')) {
    const { servicePrice, platformFee, taxes } = this.pricing;
    this.pricing.totalAmount = (servicePrice || 0) + (platformFee || 0) + (taxes || 0);
  }
  next();
});

// Pre-save middleware to add status to history on creation
bookingSchema.pre('save', function(next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.customer,
      reason: 'Booking created',
      notes: 'Initial booking request'
    });
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
