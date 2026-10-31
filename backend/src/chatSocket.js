import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db/index.js';
import { doctorPatientChats } from './db/schema.js';
import { eq, and } from 'drizzle-orm';

// Map of roomId -> Set of WebSocket clients
// roomId format: `${doctorId}:${patientId}`
const rooms = new Map();

/**
 * Broadcast a new message to all connected clients in a doctor-patient chat room.
 */
export function broadcastChatMessage(doctorId, patientId, message) {
  const roomId = `${doctorId}:${patientId}`;
  const clients = rooms.get(roomId);
  if (clients && clients.size > 0) {
    const payload = JSON.stringify({
      type: 'new_message',
      doctorId,
      patientId,
      message,
    });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}

/**
 * Initialize WebSocket Server for Doctor-Patient Clinical Chat
 */
export function initChatWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/chat' });

  wss.on('connection', (ws) => {
    let currentRoomId = null;

    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'join') {
          const { doctorId, patientId } = payload;
          if (doctorId && patientId) {
            // Remove from previous room if any
            if (currentRoomId && rooms.has(currentRoomId)) {
              rooms.get(currentRoomId).delete(ws);
            }

            currentRoomId = `${doctorId}:${patientId}`;
            if (!rooms.has(currentRoomId)) {
              rooms.set(currentRoomId, new Set());
            }
            rooms.get(currentRoomId).add(ws);
            ws.send(JSON.stringify({ type: 'joined', roomId: currentRoomId }));
          }
        } else if (payload.type === 'send_message') {
          const { text, doctorId, patientId, senderId, senderRole } = payload;
          if (!text || !text.trim() || !doctorId || !patientId || !senderId || !senderRole) {
            return;
          }

          // Find or initialize the chat session
          let [chat] = await db
            .select()
            .from(doctorPatientChats)
            .where(
              and(
                eq(doctorPatientChats.doctorId, doctorId),
                eq(doctorPatientChats.patientId, patientId)
              )
            );

          if (!chat) {
            const [insertedChat] = await db
              .insert(doctorPatientChats)
              .values({
                doctorId,
                patientId,
                messages: [],
              })
              .returning();
            chat = insertedChat;
          }

          const newMessage = {
            senderId,
            senderRole,
            text: text.trim(),
            timestamp: new Date().toISOString(),
          };

          const updatedMessages = [...(chat.messages || []), newMessage];

          await db
            .update(doctorPatientChats)
            .set({
              messages: updatedMessages,
              updatedAt: new Date(),
            })
            .where(eq(doctorPatientChats.id, chat.id));

          // Real-time broadcast to both participants
          broadcastChatMessage(doctorId, patientId, newMessage);
        }
      } catch (err) {
        console.error('[WS Chat Message Error]', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        rooms.get(currentRoomId).delete(ws);
        if (rooms.get(currentRoomId).size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    });

    ws.on('error', (err) => {
      console.error('[WS Chat Error]', err);
    });
  });

  console.log('[WebSocket Server] Doctor-patient chat WebSocket initialized on /ws/chat');
  return wss;
}
