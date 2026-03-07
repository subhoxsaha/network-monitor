import connectDB from '../lib/mongodb.js';
import Trail from '../lib/Trail.js';
import { generateRandomName } from '../lib/names.js';

const headers = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
  'Content-Type': 'application/json'
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, headers);
    res.end();
    return;
  }

  if (req.method !== 'PUT') {
    res.writeHead(405, headers);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      res.writeHead(401, headers);
      res.end(JSON.stringify({ error: 'Missing x-user-id header' }));
      return;
    }

    const { point, email, userName, userPicture } = req.body;
    
    if (!point || !point.lat || !point.lng) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: 'Missing point data' }));
      return;
    }

    await connectDB();
    
    const today = new Date().toISOString().split('T')[0];

    await Trail.findOneAndUpdate(
      { userId, date: today },
      {
        $set: {
          updatedAt: new Date(),
          lastLocation: point,
          email: email || undefined,
          userName: userName || undefined,
          userPicture: userPicture || undefined
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, new: true }
    );

    res.writeHead(200, headers);
    res.end(JSON.stringify({ message: 'Ping recorded' }));
  } catch (error) {
    console.error('Ping Error:', error);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
