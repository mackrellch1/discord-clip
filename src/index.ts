require("dotenv").config();
import { BaseGuildVoiceChannel, Client, Intents, VoiceChannel } from "discord.js";
import { EndBehaviorType, getVoiceConnection, joinVoiceChannel, VoiceConnection } from "@discordjs/voice"
import { createWriteStream } from "fs";
import { pipeline } from "node:stream";
import { opus } from "prism-media";

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES,
    ]
});


const prefix = "!"

client.once("ready", () => {
    console.log("Clipper is online!")
})

client.on("message", message => {
    if (!message.content.startsWith(prefix) || message.author.bot) {
        return
    }

    const args = message.content.slice(prefix.length).split(/ +/)
    const command = args.shift().toLowerCase()

    if (command === "ping") {
        message.channel.send("pong!")
    }
})

let globalConnection: VoiceConnection | null = null; // TODO: Change to map by guild IDs
let currentChannelId: string | null = null;

client.on("voiceStateUpdate", async (oldMember, newMember) => {
    if (oldMember) {
        // Left channel
        const channel = oldMember.channel;
        if (globalConnection && channel && currentChannelId === channel.id) {
            const memberCount = channel.members.filter(u => u.user.bot !== true).size;
            if (memberCount === 0) {
                console.log("Disconnecting from voice channel.");
                globalConnection.disconnect();
                globalConnection = null;
                currentChannelId = null;
            }
        }
    }
    if (newMember) {
        // Joined channel
        if (globalConnection) {
            handleNewSubscription(newMember.id);
        }
        const channel = newMember.channel;
        if (!globalConnection && channel) {
            console.log(`Connecting to voice channel: ${channel.name}`);
            currentChannelId = channel.id;
            globalConnection = connectionListener(
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guildId,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: true
                })
            );
        }
    }
});

function connectionListener(connection: VoiceConnection) {
    return connection.on("stateChange", (oldState, newState) => {
        if (newState.status === "disconnected") {
            globalConnection = null;
            currentChannelId = null;
        }
        if (newState.status === "ready") {
            console.log(`Voice connection in ready state.`);
        }
    });
}

function handleNewSubscription(userId: string) {
    const writeStream = createWriteStream(`./recordings/${Date.now()}-${userId}.ogg`);
    const opusStream = globalConnection.receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 100,
        },
    });
    const oggStream = new opus.OggLogicalBitstream({
        opusHead: new opus.OpusHead({
            channelCount: 2,
            sampleRate: 48000,
        }),
        pageSizeControl: {
            maxPackets: 10,
        },
    });
    console.log(`Started recording for user ID: ${userId}`);
    pipeline(opusStream, oggStream, writeStream, (error) => {
        if (error) {
            console.error(`Error recording file: ${error.message}`);
        } else {
            console.log(`Successfully recorded file.`);
        }
    });
}

client.login(process.env.DISCORD_TOKEN);