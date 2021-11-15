const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
//const Discord = require('discord.js')
//const client = new Discord.Client()

const prefix = '!'


client.once('ready', () => {
    console.log('Clipper is online!')
})

client.on('message', message => {
    if(!message.content.startsWith(prefix) || message.author.bot) {
        return
    }

    const args = message.content.slice(prefix.length).split(/ +/)
    const command = args.shift().toLowerCase()

    if (command === 'ping') {
        message.channel.send('pong!')
    }
})

client.on("ready", () => {
    const channel = client.channels.get("224997579891539968");
    
    if (!channel) return console.error("The channel does not exist!");
    channel.join().then(connection => {
      // Yay, it worked!
      console.log("Successfully connected.");
    }).catch(e => {
      // Oh no, it errored! Let's log it to console :)
      console.error(e);
    });
  });




client.login('OTA5NjI0MjE4OTc3NzAxOTA4.YZG_kQ.NMz9zvrSSByksI0z1lDUm5OTl4o')