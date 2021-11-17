import { Storage } from "@google-cloud/storage";
import { join } from "path";
import { unlink } from "fs"
import { createLogger, format, transports } from 'winston'

const logConfiguration = {
    transports: [
        new transports.File({
            level: 'error',
            // Create the log directory if it does not exist
            filename: 'storage_error.log'
        })
    ]
};

const logger = createLogger(logConfiguration);


export const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: join(
        process.cwd(),
        "./service-account.json"
    ),
});

export const bucketName = process.env.GCP_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

export function createGoogleUploadStream(fileName: string) {
    try {
        const file = bucket.file(`${fileName}.ogg`);
        return file.createWriteStream({
            metadata: {
                contentType: "audio/ogg",
            },
        });
    } catch (error) {
        error(error);
    }
}

export async function makeGoogleFilePublic(fileName: string) {
    try {
        return await bucket.file(`${fileName}.ogg`).makePublic();
    } catch (error) {
        logger.error(error);
    }
}

export function uploadFileToGCS(fileName: string) {
    return new Promise<void>((resolve, reject) => {
        bucket.upload(fileName, function(err, file) {
            if (err) {
                reject(err);
            }
            unlink(fileName, (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            })
        });
    })
}

export const getPublicUrl = (bucketName: string, fileName: string) => `https://storage.googleapis.com/${bucketName}/${fileName}`;