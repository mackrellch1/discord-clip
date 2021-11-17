require("dotenv").config();
import {  Client, Intents } from "discord.js";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, EndBehaviorType, entersState, StreamType, VoiceConnection, joinVoiceChannel } from "@discordjs/voice"
import { createWriteStream, createReadStream } from "fs";
import { pipeline } from "node:stream";
import { opus } from "prism-media";
import * as mongoose from 'mongoose';
import { makeGoogleFilePublic, uploadFileToGCS, getPublicUrl } from "./storage";
import { logger } from "./logger"
mongoose.connect(process.env.MONGO_URI);


const recordingSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userName: String,
    userId: String,
    guildId: String,
    date: Date,
    channelName: String,
    clipDuration: Number
});

const RecordingModel = mongoose.model('Recording', recordingSchema);

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES,
    ]
});

const prefix = "!"

client.once("ready", () => {
    logger.info("Clipper is online!")
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
                logger.info("Disconnecting from voice channel."); 
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
            logger.info(`Connecting to voice channel: ${channel.name} in ${newMember.guild}`);
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
                    newMember.guild.id,
                    channel.name
                )
            );
        }
    }
});

function connectionListener(connection: VoiceConnection, guildId: string, channelName: string) {
    connection.subscribe(player);
    connection.receiver.speaking.on("start", async userId => {
        handleNewSubscription(userId, guildId, channelName);
    });
    connection.receiver.speaking.on("end", async userId => {
        sendRandomAudio();
    });
    return connection.on("stateChange", async (oldState, newState) => {
        if (newState.status === "disconnected") {
            globalConnections.set(guildId, null);
            currentChannelId = null;
        }
        if (newState.status === "ready") {
            logger.info(`Voice connection in ready state.`);
            //sendStaticAudio();
        }
    });
}

async function getRandomClip() {
    const [ doc ] = await RecordingModel.aggregate([
        { 
            $match: {
                clipDuration: { $lt: Number(process.env.MAX_RANDOM_DURATION || 1000) }
            }
        },
        { 
            $sample: { size: 1 } 
        }
    ]);
    return getPublicUrl(process.env.GCP_BUCKET_NAME, doc._id);
}

function sendRandomAudio() {
    const shouldPlay = Math.random() > Number(process.env.RANDOM_PLAY_CHANCE);
    if (shouldPlay) {
        setTimeout(async () => {
            const clipUrl = await getRandomClip();
            const resource = createAudioResource(`${clipUrl}.ogg`, {
                inputType: StreamType.Arbitrary,
            });
            player.play(resource);
            return entersState(player, AudioPlayerStatus.Playing, 5e3);
        }, Math.random() * (1000 - 500 + 1) + 500);
    }
}

function handleNewSubscription(userId: string, guildId: string, channelName: string) {
    logger.info(`New voice subscription to user: ${userId} in guild: ${guildId}`);
    const fileId = new mongoose.Types.ObjectId();
    const writeStream = createWriteStream(`${fileId.toString()}.ogg`)
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

    const startTime = Date.now()
    pipeline(opusStream, oggStream, writeStream, async (error) => {
        if (error) {
            logger.error(`Error recording file: ${error.message}`);
        } else {
            await uploadFileToGCS(`${fileId.toString()}.ogg`);
            const recording = new RecordingModel({
                _id: fileId,
                userName: client.users.cache.get(userId).username,
                userId: userId,
                guildId: guildId,
                date: new Date(),
                channelName: channelName,
                clipDuration: Date.now()-startTime
            })
            
            await Promise.all([
                recording.save(),
                makeGoogleFilePublic(`${fileId.toString()}`),
            ])

        }
    });
}

client.login(process.env.DISCORD_TOKEN);