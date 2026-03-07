import mongoose from 'mongoose';

const TrailPointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: Number,
  altitude: Number,
  timestamp: { type: Number, required: true },
  label: String,
});

const TrailSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  email: { type: String },
  userName: { type: String },
  userPicture: { type: String },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  points: [TrailPointSchema],
  lastLocation: TrailPointSchema,
  totalDistance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound index for efficient user+date lookups
TrailSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Trail || mongoose.model('Trail', TrailSchema);
