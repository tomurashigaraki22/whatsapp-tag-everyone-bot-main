const venom = require('venom-bot');
const express = require('express');
const app = express();

// Initialize venom-bot with proper session configuration
venom
  .create(
    'whatsapp-session', // Session name
    undefined, // Catch QR callback
    undefined, // Status callback
    {
      folderNameToken: 'tokens', // Folder name when saving tokens
      mkdirFolderToken: '', // Folder directory tokens, just inside the venom folder, example: { mkdirFolderToken: '/node_modules', } 
      headless: true, // Headless chrome
      devtools: false, // Open devtools by default
      useChrome: true, // If false will use Chromium instance
      debug: false, // Opens a debug session
      logQR: true, // Logs QR automatically in terminal
      browserArgs: ['--no-sandbox'], // Parameters to be added into the chrome browser instance
      refreshQR: 15000, // Will refresh QR every 15 seconds, 0 will load QR once. Default is 30 seconds
      autoClose: 60000, // Will auto close automatically if not synced, 'false' won't auto close. Default is 60 seconds (#milliseconds)
      disableSpins: true, // Will disable Spinnies animation, useful for containers (docker) for a better log
    }
  )
  .then((client) => {
    console.log('Bot is ready!');

    // API endpoint for sending messages
    app.post('/send/:phone/:message', async (req, res) => {
        try {
            const phone = req.params.phone;
            const message = req.params.message;
            
            // Format the phone number to WhatsApp format
            const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
            
            // Send the message using venom-bot
            await client.sendText(chatId, message);
            
            res.json({ success: true, message: 'Message sent successfully' });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Start the Express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error creating bot:', error);
  });
