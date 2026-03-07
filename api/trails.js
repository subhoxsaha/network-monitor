import connectDB from './lib/mongodb.js';
import Trail from './lib/Trail.js';

const headers = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  // Set CORS headers
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  try {
    await connectDB();

    // Extract userId from request (sent by frontend)
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string' || userId.length < 5) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing user ID' });
    }

    const today = new Date().toISOString().split('T')[0];

    // ── GET: Retrieve today's trail ──
    if (req.method === 'GET') {
      const date = req.query.date || today;
      const trail = await Trail.findOne({ userId, date });
      return res.status(200).json({ trail: trail || { points: [], totalDistance: 0 } });
    }

    // ── POST: Add a waypoint to today's trail ──
    if (req.method === 'POST') {
      const { point, email, userName, userPicture } = req.body;
      if (!point || !point.lat || !point.lng) {
        return res.status(400).json({ error: 'Invalid point data' });
      }

      // Calculate distance from previous point if available
      // Fetch current trail first to get the last point for distance calc
      // (This is still a slight race for distance, but atomic for the points array)
      const currentTrail = await Trail.findOne({ userId, date: today });
      let distToAdd = 0;
      if (currentTrail && currentTrail.points.length > 0) {
        const last = currentTrail.points[currentTrail.points.length - 1];
        distToAdd = haversine(last, point);
      }

      const trail = await Trail.findOneAndUpdate(
        { userId, date: today },
        { 
          $setOnInsert: { createdAt: new Date() },
          $push: { points: point },
          $inc: { totalDistance: distToAdd },
          $set: { updatedAt: new Date(), email, userName, userPicture }
        },
        { upsert: true, new: true, runValidators: true }
      );

      return res.status(200).json({ trail, pointCount: trail.points.length });
    }

    // ── PUT: Update entire trail (edits / deletions) ──
    if (req.method === 'PUT') {
      const { trail: newPoints, email, userName, userPicture } = req.body;
      if (!Array.isArray(newPoints)) {
        return res.status(400).json({ error: 'Invalid trail data' });
      }

      // Recalculate total distance
      let totalDistance = 0;
      for (let i = 1; i < newPoints.length; i++) {
        totalDistance += haversine(newPoints[i - 1], newPoints[i]);
      }

      const trail = await Trail.findOneAndUpdate(
        { userId, date: today },
        { 
          $set: { 
            points: newPoints, 
            totalDistance, 
            updatedAt: new Date(),
            email, // Ensure email is saved/updated
            userName,
            userPicture
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, new: true, runValidators: true }
      );

      return res.status(200).json({ success: true, trail });
    }

    // ── DELETE: Clear today's trail ──
    if (req.method === 'DELETE') {
      await Trail.deleteOne({ userId, date: today });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    // Log error internally, but don't leak stack traces to the client
    const isMongoError = err.name === 'MongoError' || err.name === 'MongooseError';
    console.error(`[API Error] trails.js ${isMongoError ? '(DB)' : ''}:`, err.message);
    
    return res.status(500).json({ 
      error: isMongoError ? 'Database connection failure. Please try again later.' : 'An internal server error occurred', 
      message: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

// Haversine helper
function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
