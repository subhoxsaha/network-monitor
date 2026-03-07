import connectDB from '../api/lib/mongodb.js';
import Trail from '../api/lib/Trail.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
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

      // We only want to send the *last known location* of each user, not their full trail
      const activeUsers = activeTrails.map(trail => {
        const lastPoint = trail.points[trail.points.length - 1];
        return {
          userId: trail.userId,
          name: trail.userName || 'Anonymous User',
          picture: trail.userPicture || null,
          lastLocation: {
            lat: lastPoint.lat,
            lng: lastPoint.lng,
            timestamp: lastPoint.timestamp
          },
          lastActive: trail.updatedAt
        };
      });

      return res.status(200).json({ activeUsers });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error('[API Error] users/active.js:', err.message);
    return res.status(500).json({ error: 'Failed to fetch active users' });
  }
}
