const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  // Basic Service Information
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Service title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [2000, 'Service description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: [
      'home_maintenance', 'cleaning', 'gardening', 'pet_care', 
      'tutoring', 'childcare', 'elderly_care', 'tech_support',
      'delivery', 'transportation', 'photography', 'event_planning',
      'fitness', 'beauty', 'handyman', 'cooking', 'moving', 'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Service Provider
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Pricing Information
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'per_project', 'negotiable'],
      required: true
    },
    amount: {
      type: Number,
      required: function() {
        return this.pricing.type !== 'negotiable';
      },
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    negotiable: {
      type: Boolean,
      default: false
    }
  },

  // Location and Availability
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    }
  },
  address: {
    street: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: String,
    country: {
      type: String,
      default: 'US'
    }
  },
  serviceArea: {
    radius: {
      type: Number,
      default: 10, // miles
      min: 0,
      max: 100
    },
    areas: [String] // Specific areas/neighborhoods served
  },

  // Service Details
  duration: {
    estimated: {
      type: Number, // in minutes
      required: true,
      min: 15
    },
    flexible: {
      type: Boolean,
      default: true
    }
  },
  requirements: {
    experience: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'beginner'
    },
    equipment: [String],
    materials: [String],
    specialSkills: [String]
  },

  // Media and Portfolio
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  portfolio: [{
    title: String,
    description: String,
    images: [String],
    completedAt: Date
  }],

  // Availability
  availability: {
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String, // Format: "09:00"
      endTime: String,   // Format: "17:00"
      available: {
        type: Boolean,
        default: true
      }
    }],
    exceptions: [{
      date: Date,
      available: {
        type: Boolean,
        default: false
      },
      reason: String
    }],
    advanceBooking: {
      type: Number,
      default: 24 // hours in advance
    }
  },

  // Reviews and Ratings
  reviews: {
    total: {
      type: Number,
      default: 0
    },
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },

  // Service Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  pauseReason: String,
  
  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    }
  },

  // AI Enhancement Fields
  aiData: {
    qualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    demandPrediction: {
      type: Number,
      default: 0
    },
    optimalPricing: {
      suggested: Number,
      confidence: Number
    },
    tags: [String], // AI-generated tags for better matching
    keywords: [String], // Extracted keywords for search
    lastAIUpdate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
serviceSchema.index({ location: '2dsphere' });
serviceSchema.index({ category: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ 'pricing.amount': 1 });
serviceSchema.index({ 'reviews.average': -1 });
serviceSchema.index({ isActive: 1, isPaused: 1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ 'stats.views': -1 });
serviceSchema.index({ 'stats.completedBookings': -1 });

// Compound indexes for complex queries
serviceSchema.index({ category: 1, location: '2dsphere' });
serviceSchema.index({ category: 1, 'pricing.amount': 1 });
serviceSchema.index({ 'reviews.average': -1, 'stats.completedBookings': -1 });

// Virtual for provider details
serviceSchema.virtual('providerInfo', {
  ref: 'User',
  localField: 'provider',
  foreignField: '_id',
  justOne: true
});

// Virtual for service reviews
serviceSchema.virtual('serviceReviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'service',
  justOne: false
});

// Virtual for active bookings
serviceSchema.virtual('activeBookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'service',
  match: { status: { $in: ['pending', 'confirmed', 'in_progress'] } },
  justOne: false
});

// Virtual for completion rate
serviceSchema.virtual('completionRate').get(function() {
  const { completedBookings, cancelledBookings } = this.stats;
  const total = completedBookings + cancelledBookings;
  return total > 0 ? (completedBookings / total) * 100 : 0;
});

// Virtual for primary image
serviceSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Method to increment view count
serviceSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

// Method to update reviews summary
serviceSchema.methods.updateReviewsSummary = async function() {
  const Review = mongoose.model('Review');
  
  const reviewStats = await Review.aggregate([
    { $match: { service: this._id, isActive: true } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        average: { $avg: '$rating' },
        ratings: { $push: '$rating' }
      }
    }
  ]);

  if (reviewStats.length > 0) {
    const stats = reviewStats[0];
    this.reviews.total = stats.total;
    this.reviews.average = Math.round(stats.average * 10) / 10;
    
    // Update breakdown
    this.reviews.breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats.ratings.forEach(rating => {
      this.reviews.breakdown[rating] += 1;
    });
  } else {
    this.reviews.total = 0;
    this.reviews.average = 0;
    this.reviews.breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  }

  return this.save();
};

// Method to check availability for a specific date/time
serviceSchema.methods.isAvailable = function(date, duration = 60) {
  // Basic availability check - can be enhanced with AI
  if (!this.isActive || this.isPaused) {
    return false;
  }

  const requestDate = new Date(date);
  const dayOfWeek = requestDate.toLocaleLowerCase().slice(0, 3);
  
  // Check if day is available in schedule
  const daySchedule = this.availability.schedule.find(
    schedule => schedule.day.startsWith(dayOfWeek) && schedule.available
  );

  if (!daySchedule) {
    return false;
  }

  // Check exceptions
  const hasException = this.availability.exceptions.some(
    exception => exception.date.toDateString() === requestDate.toDateString() && !exception.available
  );

  return !hasException;
};

// Method to get nearby services (for AI recommendations)
serviceSchema.statics.findNearby = function(coordinates, maxDistance = 10000, category = null) {
  const query = {
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: maxDistance // meters
      }
    },
    isActive: true,
    isPaused: false
  };

  if (category) {
    query.category = category;
  }

  return this.find(query);
};

// Pre-save middleware to ensure primary image is set
serviceSchema.pre('save', function(next) {
  if (this.images.length > 0 && !this.images.some(img => img.isPrimary)) {
    this.images[0].isPrimary = true;
  }
  next();
});

module.exports = mongoose.model('Service', serviceSchema);
