import { Storage } from "@google-cloud/storage";
import { join } from "path";

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
        console.error(error);
    }
}

export async function makeGoogleFilePublic(fileName: string) {
    try {
        return await bucket.file(`${fileName}.ogg`).makePublic();
    } catch (error) {
        console.error(error);
    }
}

export function uploadFileToGCS(fileName: string) {
    const gcs = new Storage({
        projectId: 'Discord-Clips',
        keyFilename: './service-account.json'
    });
    bucket.upload(`${fileName}.ogg`, function(err, file) {
        if (err) console.error(err);
        //TODO delete file
    });
}

export const getPublicUrl = (bucketName: string, fileName: string) => `https://storage.googleapis.com/${bucketName}/${fileName}`;