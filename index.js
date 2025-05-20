const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const schedule = require('node-schedule');
const express = require('express');
const app = express();

console.log("initializing");
const client = new Client({
    authStrategy: new LocalAuth(),
    takeoverOnConflict: true,
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on("qr", (qr) => {
	console.log("qring");
	qrcode.generate(qr, { small: true });
	console.log("qred");
});

client.on("ready", () => {
	console.log("server is running");
});

client.on("message_create", async (message) => {
	// Return if a message is not an actual chat but a status
	if (message.from === "status@broadcast") return;

	// Get the chat the message belongs to and return if it is not a group chat
	const chat = await message.getChat();
	if (!chat.isGroup) return;

	console.log("Group chat:", chat.name);

	const scheduleMessage = async (time, reminderContent) => {
		// Set the timezone to "Africa/Cairo" for Egypt
		const tz = 'Africa/Cairo';
	
		// Define a later schedule using the "date" module of the "later" library
		const [hours, minutes] = time.split(':').map(Number);
	
		// Get the current date in the "Africa/Cairo" timezone
		const nowInCairo = new Date().toLocaleString('en-US', { timeZone: tz });
		const scheduledDate = new Date(nowInCairo);
		console.log(scheduledDate)
		scheduledDate.setHours(hours);
		scheduledDate.setMinutes(minutes);
	
		// Calculate the delay until the scheduled time
		const delay = scheduledDate - Date.now();
	
		// Schedule the reminder
		setTimeout(() => {
			chat.sendMessage(`Scheduled Reminder: ${reminderContent}`);
		}, delay);
	
		chat.sendMessage(`Reminder Scheduled for ${time}`);
		};
	
	const messageBody = message.body.trim();
	if (messageBody === "/everyone") {
		const participants = await chat.participants;
		const contacts = participants.map(participant => {
			return { id: { _serialized: participant.id._serialized } };
		});

		// Send message to group chat and mention everyone
		chat.sendStateTyping();
		chat.sendMessage("", { mentions: contacts, sendSeen: false });
	} else if (messageBody.startsWith('/schedule')) {
		const messageParts = messageBody.split(' ');
		if (messageParts.length < 3) {
			chat.sendMessage("Invalid format. Use /schedule time reminder");
			return;
		}
		if (messageParts > 3) {
			chat.sendMessage('Invalid format. Use /schedule <time> <reminder>')
			return;
		}

		const time = messageParts[1];
		const reminderContent = messageParts.slice(2).join(' ');

		// Schedule the reminder
		scheduleMessage(time, reminderContent);
	} else if (messageBody.startsWith('/help')) {
		const helpMessage = `Available Commands:
	  * /everyone: Used to tag everyone in the gc (For admins only)
	  * /schedule: Format- /schedule <time(24hr format)> <message to be reminded>
	  * /quote: Generates a random quote
	  * /invite-link: Retrieve invite link for group chat. Format: /invite-link <frontend, backend, or index.>
	  * /giveRole: Format: /giveRole <name> <number eg 2348071273078> <role>
	  * /fetchRole: Format: /fetchRole <number>`;
  
		chat.sendMessage(helpMessage);
		return;
	}
	else if (messageBody === '/quote') {
		fetch('https://api.quotable.io/quotes/random')
		.then((response) => response.json())
		.then((quotes) => {
			console.log(quotes)
			const quote = quotes[0]
			const author = quote.author
			const content = quote.content
			chat.sendMessage(`Quote: ${content} -${author}`)
		})
		.catch((error) => {
			console.error(error)

		})
	} else if (messageBody.startsWith('/invite-link')) {
		const inviteCodeBackend = `https://chat.whatsapp.com/JmUASjiiZmWltbdB1EySo`
		const inviteCodeFrontend = `https://chat.whatsapp.com/L9UW6rB15D0lwxAlBn0mwM`
		const inviteCodeIndex = `https://chat.whatsapp.com/KjY9nhU1kZ0BXaYGQVWL37`

		const command = messageBody.split(' ')
		if (command.length < 2) {
			console.log('Invalid syntax')
			chat.sendMessage('Wrong syntax. The syntax is /invite-link <group-stack> i.e backend, frontend and index')
			return;
		} else if (command.length > 2) {
			chat.sendMessage('Wrong syntax. The syntax is /invite-link <group-stack> i.e backend, frontend and index')
			return;
		}
		const commands = command[1]
		if (commands === 'backend') {
			chat.sendMessage(`${inviteCodeBackend}`)
			return;
		} else if (commands === 'frontend') {
			chat.sendMessage(`${inviteCodeFrontend}`)
			return;
		} else if (commands === 'index') {
			chat.sendMessage(`${inviteCodeIndex}`)
			return;
		} else {
			chat.sendMessage(`No group called ${commands}`)
		}

	} else if (messageBody === '/contact-name') {
		try {
			const contact = await message.getContact();
			console.log(contact);
			
			const contactName = contact.pushname; // Get the name from the contact object
			
			chat.sendMessage(`Contact name: ${contactName}`);
		} catch (error) {
			console.error("Error fetching contact:", error);
			chat.sendMessage("Error fetching contact.");
		}
	} else if (messageBody.startsWith('/giveRole')) {
		const indComm = messageBody.split(' ')
		const role = indComm[3]
		const name = indComm[1]
		const number = indComm[2]

		try {
			await giveNewRole(name, number, role)
			chat.sendMessage('Role added successfully')
		} catch (error) {
			console.error(error)
		}
	
	} else if (messageBody.startsWith('/fetchRole')) {
		const command = messageBody.split(' ');
		const number = command[1];
	
		try {
			const role = await fetchRole(number);
			if (role) {
				console.log("Role found:", role);
				chat.sendMessage(`Role found: ${role}`);
			} else {
				console.log("No role set for the provided number");
				chat.sendMessage("No role set for the provided number");
			}
		} catch (error) {
			console.error("Error fetching role:", error);
		}
	} else if (messageBody.includes('A Collectable card Has Dropped')) {
		chat.sendMessage('#collect')
	}
});

client.on('group_join', (notification) => {
	// User has joined or been added to the group.
	const participant = notification.id.participant;
	const participantWithoutSuffix = participant.split('@')[0];
	const welcomeMessage = `! As a developer, please join the group that matches your coding stack. Full-stack developers are free to join any group of their choice. Happy coding!`;

  
	console.log('join', participantWithoutSuffix);
	notification.reply(`Welcome @+${participantWithoutSuffix}${welcomeMessage}`);
  });
  

client.initialize();

// Add Express middleware
app.use(express.json());

// API endpoint to send message
app.post('/send/:phone/:message', async (req, res) => {
    try {
        const phone = req.params.phone;
        const message = req.params.message;
        
        // Format the phone number to WhatsApp format
        const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        
        // Send the message
        await client.sendMessage(chatId, message);
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});
