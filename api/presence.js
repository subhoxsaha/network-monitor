import { supabase } from './lib/supabase.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Content-Type': 'application/json',
};

// 5 minutes threshold for "online" status
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  // Set CORS headers
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  try {
    // Extract userId from request
    const requestingUserId = req.headers['x-user-id'];
    if (!requestingUserId || typeof requestingUserId !== 'string' || requestingUserId.length < 5) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing user ID' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // We look at today's active trails to determine present/recent locations
    const today = new Date().toISOString().split('T')[0];

    // Fetch all trails for today
    const { data: allTrails, error } = await supabase
      .from('trails')
      .select('user_id, email, points, updated_at')
      .eq('date', today);

    if (error) {
      throw error;
    }

    const now = Date.now();
    const otherUsers = [];

    // Process the users
    for (const trail of allTrails) {
      // Skip the requesting user
      if (trail.user_id === requestingUserId) {
        continue;
      }

      // Skip users with no location data
      if (!trail.points || trail.points.length === 0) {
        continue;
      }

      // Get their latest location point
      const lastPoint = trail.points[trail.points.length - 1];
      
      // Determine if they are online based on the updated_at timestamp
      const updatedAtMs = new Date(trail.updated_at).getTime();
      const isOnline = (now - updatedAtMs) <= ONLINE_THRESHOLD_MS;

      otherUsers.push({
        userId: trail.user_id,
        email: trail.email || 'Unknown User',
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        updatedAt: trail.updated_at,
        isOnline: isOnline
      });
    }

    return res.status(200).json({ users: otherUsers });

  } catch (err) {
    console.error(`[API Error] presence.js (Supabase):`, err.message);
    
    return res.status(500).json({ 
      error: 'An internal server error occurred', 
      message: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}
