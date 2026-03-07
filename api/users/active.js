import connectDB from '../lib/mongodb.js';
import Trail from '../lib/Trail.js';
import { generateRandomName } from '../lib/names.js';

const headers = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // Extract requesting user ID
    const requestUserId = req.headers['x-user-id'];
    if (!requestUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const today = new Date().toISOString().split('T')[0];

      // Find all active trails for today, excluding the requesting user
      const activeTrails = await Trail.find({
        date: today,
        userId: { $ne: requestUserId },
        'points.0': { $exists: true } // Must have at least one point
      }).select('userId userName userPicture points updatedAt').lean();

      const activeUsers = activeTrails.map(trail => {
        const points = trail.points || [];
        const lastLocation = trail.lastLocation || (points.length > 0 ? points[points.length - 1] : { lat: 0, lng: 0, timestamp: Date.now() });
        
        return {
          userId: trail.userId,
          name: (trail.userName && trail.userName !== 'Anonymous User') ? trail.userName : generateRandomName(trail.userId),
          picture: trail.userPicture || null,
          lastLocation: {
            lat: lastLocation.lat,
            lng: lastLocation.lng,
            timestamp: lastLocation.timestamp
          },
          points: points.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp })),
          lastActive: trail.updatedAt
        };
      });

      return res.status(200).json({ activeUsers });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error('[API Error] users/active.js:', err);
    return res.status(500).json({ error: 'Failed to fetch active users', details: err.message });
  }
}
