require("dotenv").config();
import { Client, Intents } from "discord.js";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, EndBehaviorType, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnection } from "@discordjs/voice"
import { createWriteStream, createReadStream } from "fs";
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

const player = createAudioPlayer();

let globalConnections: Map <string, VoiceConnection> = new Map(); 
let currentChannelId: string | null = null;

client.on("voiceStateUpdate", async (oldMember, newMember) => {
    if (oldMember) {
        // Left channel
        const channel = oldMember.channel;
        if (globalConnections.get(oldMember.guild.id) && channel && currentChannelId === channel.id) {
            const memberCount = channel.members.filter(u => u.user.bot !== true).size;
            if (memberCount === 0) {
                console.log("Disconnecting from voice channel.");
                globalConnections.get(oldMember.guild.id).disconnect();
                globalConnections.delete(oldMember.guild.id);
                currentChannelId = null;
            }
        }
    }
    if (newMember) {
        // Joined channel
        const channel = newMember.channel;
        if (!globalConnections.get(newMember.guild.id) && channel) {
            console.log(`Connecting to voice channel: ${channel.name}`);
            currentChannelId = channel.id;
            globalConnections.set(
                newMember.guild.id, 
                connectionListener(
                    joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guildId,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                        selfDeaf: false,
                        selfMute: false
                    }),
                    newMember.guild.id
                )
            );
        }
    }
});

function connectionListener(connection: VoiceConnection, guildId: string) {
    connection.subscribe(player);
    connection.receiver.speaking.on("start", userId => {
        handleNewSubscription(userId, guildId);
    });
    return connection.on("stateChange", (oldState, newState) => {
        if (newState.status === "disconnected") {
            globalConnections.set(guildId, null);
            currentChannelId = null;
        }
        if (newState.status === "ready") {
            console.log(`Voice connection in ready state.`);
            //sendStaticAudio();
        }
    });
}

function sendStaticAudio() {
    const readStream = createReadStream("./input/morse.mp3");
    const resource = createAudioResource(readStream, {
        inputType: StreamType.Arbitrary,
    });
    player.play(resource);
    return entersState(player, AudioPlayerStatus.Playing, 5e3)
}

function handleNewSubscription(userId: string, guildId: string) {
    console.log(`New voice subscription to user: ${userId} in guild: ${guildId}`);
    const writeStream = createWriteStream(`./recordings/${Date.now()}-${userId}.ogg`);
    const opusStream = globalConnections.get(guildId).receiver.subscribe(userId, {
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
    pipeline(opusStream, oggStream, writeStream, (error) => {
        if (error) {
            console.error(`Error recording file: ${error.message}`);
        }
    });
}

client.login(process.env.DISCORD_TOKEN);