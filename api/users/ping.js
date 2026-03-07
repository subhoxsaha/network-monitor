import connectDB from '../lib/mongodb.js';
import Trail from '../lib/Trail.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
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

    // Attempt to read the JSON body
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { point, email, userName, userPicture } = JSON.parse(body);
        
        if (!point || !point.lat || !point.lng) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: 'Missing point data' }));
          return;
        }

        await connectDB();
        
        const today = new Date().toISOString().split('T')[0];

        // We use findOneAndUpdate to atomically push this single silent point.
        // It updates the updatedAt timestamp to ensure they appear as "active".
        await Trail.findOneAndUpdate(
          { userId, date: today },
          {
            $set: {
              updatedAt: new Date(),
              email: email || undefined,
              userName: userName || undefined,
              userPicture: userPicture || undefined
            },
            // Push the silent background point to their trail silently
            $push: { points: point },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true, new: true }
        );

        res.writeHead(200, headers);
        res.end(JSON.stringify({ message: 'Ping recorded' }));
      } catch (parseError) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
  } catch (error) {
    console.error('Ping Error:', error);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
