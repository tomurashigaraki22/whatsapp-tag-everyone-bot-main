import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import QRCode from 'qrcode';
import 'dotenv/config';

const app = express();
let sock; // Global socket variable

async function connectToWhatsApp() {
  try {
    // Load auth state from files
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    // Create WhatsApp socket
    sock = makeWASocket({
      auth: state,
      // Removed printQRInTerminal to avoid deprecation warning
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Handle QR code generation with smaller size
      if (qr) {
        console.log('QR Code received, scan it with your phone:');
        console.log(await QRCode.toString(qr, { 
          type: 'terminal',
          small: true,
          width: 40
        }));
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('connection closed due to', lastDisconnect?.error, ', reconnecting', shouldReconnect);
        
        // reconnect if not logged out
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      } else if (connection === 'open') {
        console.log('opened connection');
        
        // Start Express server after successful connection
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`API Server is running on port ${PORT}`);
        });
      }
    });

    // Handle credential updates
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
      console.log(JSON.stringify(m, undefined, 2));
      
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            console.log('Message from:', msg.key.remoteJid);
            // Handle incoming messages here if needed
          }
        }
      }
    });

  } catch (error) {
    console.error('Error connecting to WhatsApp:', error);
  }
}

// API endpoint for sending messages
app.get('/send', async (req, res) => {
  try {
    const phone = req.query.phone;
    const message = req.query.message;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }
    
    if (!sock) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp not connected' 
      });
    }
    
    // Format the phone number to WhatsApp format
    const chatId = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
    
    // Send the message using Baileys
    await sock.sendMessage(chatId, { text: message });
    
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connected: sock ? true : false,
    timestamp: new Date().toISOString()
  });
});

// Start the WhatsApp connection
connectToWhatsApp();
