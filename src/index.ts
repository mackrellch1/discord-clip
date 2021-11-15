import { Client, Intents, VoiceChannel } from "discord.js";
import { joinVoiceChannel, VoiceConnection } from '@discordjs/voice'

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES,
    ]
});


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

client.on("voiceStateUpdate", async (oldMember, newMember) => {
    // const channel = guild.channels.cache.get('224997579891539968')
    // console.log(channel)

    // Assuming 'newMember' is the second parameter of the event.
const voiceChannels = newMember.guild.channels.filter(c => c.type === 'voice');
let count = 0;

for (const [id, voiceChannel] of voiceChannels) count += voiceChannel.members.size;

console.log(count);


    // const channels = await guild.channels.fetch();
    // const voiceChannels = channels.filter(c => c.type === "GUILD_VOICE") ;
    // let channelMostUsers = null;
    // let mostUserCount = 0;
    // for (const channel of voiceChannels) {
    //     console.log(channel)
    //     if (channel.members.length > mostUserCount) {
    //         mostUserCount = channel.members.length;
    //         channelMostUsers = channel;
    //     }
    // }
    // if (!channelMostUsers) {
    //     return VoiceConnection.disconnect();
    // } else {
    //     const connection = joinVoiceChannel({
    //         channelId: newMember.channelId,
    //         guildId: newMember.guild.id,
    //         adapterCreator: newMember.guild.voiceAdapterCreator,
    //     });
    // }
});



client.login('OTA5NjI0MjE4OTc3NzAxOTA4.YZG_kQ.NMz9zvrSSByksI0z1lDUm5OTl4o')