import { WebSocketServer } from 'ws';

const PORT = process.env.WS_PORT || 8080;

let wss = null;
const connections = new Map(); // tokenId -> Set<WebSocket>

/**
 * Initialize WebSocket server
 */
export function initWebSocket() {
  wss = new WebSocketServer({ port: PORT });
  
  console.log(`🔌 WebSocket server listening on ws://localhost:${PORT}`);
  
  wss.on('connection', (ws, req) => {
    console.log(`   🔗 Client connected: ${req.socket.remoteAddress}`);
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(ws, msg);
      } catch (error) {
        console.error(`   ⚠️  Invalid message:`, error.message);
      }
    });
    
    ws.on('close', () => {
      console.log(`   🔌 Client disconnected`);
      // Remove from all subscriptions
      for (const [tokenId, subscribers] of connections.entries()) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          connections.delete(tokenId);
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error(`   ❌ WebSocket error:`, error.message);
    });
  });
  
  return wss;
}

/**
 * Handle client subscription messages
 */
function handleClientMessage(ws, msg) {
  if (msg.type === 'subscribe' && msg.tokenId) {
    const tokenId = msg.tokenId.toString();
    
    if (!connections.has(tokenId)) {
      connections.set(tokenId, new Set());
    }
    
    connections.get(tokenId).add(ws);
    console.log(`   📡 Client subscribed to token #${tokenId}`);
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'subscribed',
      tokenId,
    }));
  }
}

/**
 * Broadcast gauntlet event to all subscribers for a token
 */
export function broadcast(tokenId, event) {
  const tokenIdStr = tokenId.toString();
  const subscribers = connections.get(tokenIdStr);
  
  if (!subscribers || subscribers.size === 0) {
    return;
  }
  
  const message = JSON.stringify(event);
  
  for (const ws of subscribers) {
    if (ws.readyState === 1) { // OPEN
      ws.send(message);
    }
  }
}

/**
 * Send gauntlet start event
 */
export function sendGauntletStart(tokenId, traits) {
  broadcast(tokenId, {
    type: 'gauntlet_start',
    tokenId: tokenId.toString(),
    traits,
    timestamp: Date.now(),
  });
}

/**
 * Send challenge update
 */
export function sendChallengeUpdate(tokenId, challengeIndex, status, score = null) {
  broadcast(tokenId, {
    type: 'challenge_update',
    tokenId: tokenId.toString(),
    challengeIndex,
    status, // 'running' | 'passed' | 'failed'
    score,
    timestamp: Date.now(),
  });
}

/**
 * Send gauntlet complete event
 */
export function sendGauntletComplete(tokenId, totalScore, passed, txHash = null) {
  broadcast(tokenId, {
    type: 'gauntlet_complete',
    tokenId: tokenId.toString(),
    totalScore,
    passed,
    txHash,
    timestamp: Date.now(),
  });
}

/**
 * Send error event
 */
export function sendError(tokenId, message) {
  broadcast(tokenId, {
    type: 'error',
    tokenId: tokenId.toString(),
    message,
    timestamp: Date.now(),
  });
}
