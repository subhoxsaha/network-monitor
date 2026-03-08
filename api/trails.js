import { supabase } from './lib/supabase.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
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
    // Extract userId from request (sent by frontend)
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string' || userId.length < 5) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing user ID' });
    }

    const today = new Date().toISOString().split('T')[0];

    // ── GET: Retrieve today's trail ──
    if (req.method === 'GET') {
      const date = req.query.date || today;
      const { data: trail, error } = await supabase
        .from('trails')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        throw error;
      }

      return res.status(200).json({ 
        trail: trail ? {
          points: trail.points,
          totalDistance: parseFloat(trail.total_distance || 0)
        } : { points: [], totalDistance: 0 } 
      });
    }

    // ── POST: Add a waypoint to today's trail ──
    if (req.method === 'POST') {
      const { point, email } = req.body;
      if (!point || !point.lat || !point.lng) {
        return res.status(400).json({ error: 'Invalid point data' });
      }

      // Fetch current trail points to append and calculate distance
      const { data: currentTrail, error: fetchError } = await supabase
        .from('trails')
        .select('points, total_distance')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const prevPoints = currentTrail?.points || [];
      const prevDistance = parseFloat(currentTrail?.total_distance || 0);
      
      let distToAdd = 0;
      if (prevPoints.length > 0) {
        const last = prevPoints[prevPoints.length - 1];
        distToAdd = haversine(last, point);
      }

      const newPoints = [...prevPoints, point];
      const newTotalDistance = prevDistance + distToAdd;

      const { data: updatedTrail, error: upsertError } = await supabase
        .from('trails')
        .upsert({
          user_id: userId,
          date: today,
          email,
          points: newPoints,
          total_distance: newTotalDistance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      return res.status(200).json({ 
        trail: {
          points: updatedTrail.points,
          totalDistance: parseFloat(updatedTrail.total_distance)
        }, 
        pointCount: updatedTrail.points.length 
      });
    }

    // ── PUT: Update entire trail (edits / deletions) ──
    if (req.method === 'PUT') {
      const { trail: newPoints, email } = req.body;
      if (!Array.isArray(newPoints)) {
        return res.status(400).json({ error: 'Invalid trail data' });
      }

      // Recalculate total distance
      let totalDistance = 0;
      for (let i = 1; i < newPoints.length; i++) {
        totalDistance += haversine(newPoints[i - 1], newPoints[i]);
      }

      const { data: updatedTrail, error: upsertError } = await supabase
        .from('trails')
        .upsert({
          user_id: userId,
          date: today,
          email,
          points: newPoints,
          total_distance: totalDistance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      return res.status(200).json({ 
        success: true, 
        trail: {
          points: updatedTrail.points,
          totalDistance: parseFloat(updatedTrail.total_distance)
        } 
      });
    }

    // ── DELETE: Clear today's trail ──
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('trails')
        .delete()
        .eq('user_id', userId)
        .eq('date', today);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(`[API Error] trails.js (Supabase):`, err.message);
    
    return res.status(500).json({ 
      error: 'An internal server error occurred', 
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
