const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },

  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  dateOfBirth: {
    type: Date
  },

  // Location Information
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'IN'
    }
  },
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

  // Trust and Reputation System (AI will enhance these)
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  reputation: {
    totalReviews: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    completedServices: {
      type: Number,
      default: 0
    },
    cancelledServices: {
      type: Number,
      default: 0
    }
  },

  // User Preferences and Behavior (for AI)
  preferences: {
    serviceCategories: [String],
    priceRange: {
      min: Number,
      max: Number
    },
    radius: {
      type: Number,
      default: 10 // miles
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },

  // Verification Status
  verification: {
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    isIDVerified: {
      type: Boolean,
      default: false
    },
    verificationDocuments: [String]
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  lastLoginAt: Date,
  
  // AI Integration Fields (for future use)
  aiProfile: {
    behaviorScore: {
      type: Number,
      default: 0
    },
    preferenceVector: [Number], // For recommendation algorithm
    riskScore: {
      type: Number,
      default: 0
    },
    lastAIUpdate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ location: '2dsphere' });
userSchema.index({ trustScore: -1 });
userSchema.index({ 'reputation.averageRating': -1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for services provided by user
userSchema.virtual('servicesOffered', {
  ref: 'Service',
  localField: '_id',
  foreignField: 'provider',
  justOne: false
});

// Virtual for bookings as customer
userSchema.virtual('bookingsAsCustomer', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'customer',
  justOne: false
});

// Virtual for bookings as provider
userSchema.virtual('bookingsAsProvider', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'provider',
  justOne: false
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update lastLoginAt when user logs in
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('lastLoginAt')) {
    return next();
  }
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Calculate trust score based on reputation (placeholder for AI)
userSchema.methods.calculateTrustScore = function() {
  const { totalReviews, averageRating, completedServices, cancelledServices } = this.reputation;
  
  if (totalReviews === 0) {
    return 0;
  }
  
  // Simple calculation - AI will improve this
  let score = (averageRating / 5) * 100;
  
  // Adjust based on completed services
  const completionRate = completedServices / (completedServices + cancelledServices);
  score *= completionRate;
  
  // Bonus for having more reviews (credibility)
  const reviewBonus = Math.min(totalReviews / 50, 1) * 10;
  score += reviewBonus;
  
  return Math.min(Math.round(score), 100);
};

// Update trust score automatically
userSchema.methods.updateTrustScore = function() {
  this.trustScore = this.calculateTrustScore();
  this.aiProfile.lastAIUpdate = new Date();
};

// Remove password from output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
