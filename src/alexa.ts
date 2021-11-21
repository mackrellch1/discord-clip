import * as AVS from 'alexa-voice-service'

const avs = new AVS({
    debug: true,
    clientId: 'amzn1.application-oa2-client.79459effe1504f00bc533870888f0bbc',
    clientSecret: '0cf824503da3faca02da9f8549c442e46bf7ba4ae1413945a7f73c079db6af5d',
    deviceId: 'amplifyBotMk1',
    refreshToken: ''
}) as any;

(async () => {
    const response = await avs.login();
    console.log(response)
})()