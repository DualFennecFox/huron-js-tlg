const Telegram = require('node-telegram-bot-api');
require('dotenv-flow').config();
const { Client } = require('youtubei')
const ytdl = require("youtube-dl-exec")
const fs = require('fs');
const http = require('http');
const https = require('https');
const client = new Telegram(process.env.TOKEN, { polling: true });
const shell = require('shelljs')
const YT = new Client()
let qindex = 0;
async function downloadImage(url, title) {

  return new Promise((resolve) => {
    https.get(url, (res) => {
      res.pipe(fs.createWriteStream(`./songs/${title}.jpg`));
      res.on("end", () => {
        resolve()
      })
    });

  })
}

let vidNameArr = []
let videoArr = []
let inlineArr = []
client.on('message', async msg => {
  vidNameArr = []
  videoArr = []

  if (!msg.text) return

  if (msg.text.startsWith("/song")) {
    let args = msg.text.replace('/song', '')
    if (args == "") { return client.sendMessage(msg.chat.id, "Debes de escribir el nombre de una cancion.") }

    YT.search(args, { type: "video" }).then(async (videos) => {
      let length = videos.items.length
      if (length < 1) return client.sendMessage(msg.chat.id, "No existe ningún resultado con ese nombre.").then(msg => setTimeout(() => client.deleteMessage(msg.chat.id, msg.message_id), 5000))
      if (length > 10) length = 10
      let message = ''

      for (let v = 0; v < length; v++) {
        videoArr = videos.items
        vidNameArr.push(`${v + 1}: ${videos.items[v].title}`);
        message += `${vidNameArr[v]}\n\n`

      }

      var menu = [0, 2, 4, 6, 8];

      var options = {
        reply_markup: JSON.stringify({
          inline_keyboard: menu.map((x, xi) => ([{
            text: String(x + 1),
            callback_data: String(x + 1),

          }, {
            text: String(x + 2), callback_data: String(x + 2),
          }]
          ))
        })
      };

      client.sendMessage(msg.chat.id, `Elije la cancion que quieres escuchar según el numero\n\n${message}`, options)

    })
  }
})


client.on('callback_query', async q => {

  try {

    client.deleteMessage(q.message.chat.id, q.message.message_id)
  } catch (err) {

    console.error(err)
  }
  let video = videoArr[parseInt(q.data) - 1]
  if (!video) return
  let audio = ytdl.exec(`https://www.youtube.com/watch?v=${video.id}`, { format: "bestaudio", output: "-", cookies: "cookies.txt" }).stdout.pipe(fs.createWriteStream(`./songs/${video.title}.mp3`))

  let thumbnail = video.thumbnails.min
  await downloadImage(thumbnail, video.title)

  audio.on('finish', async () => {


    await client.sendAudio(q.message.chat.id, `./songs/${video.title}.mp3`, {
      duration: video.duration, title: video.title,
      thumb: `./songs/${video.title}.jpg`, performer: video.channel?.name,
    })

fs.rm(`./songs/${video.title}.jpg`, () => {})
fs.rm(`./songs/${video.title}.mp3`, () => {})
  })

})

client.onText(/\/eval (.+)/, async (msg, match) => {

  if (msg.from.id != parseInt(process.env.OWNER)) return
  const chat = msg.chat.id;

  try {
    const code = match[1]
    let evaled = await eval(code)

    if (typeof evaled !== "string")
      evaled = require("util").inspect(evaled);

    client.sendMessage(chat, clean(evaled), { code: "xl" });
  } catch (err) {
    client.sendMessage(chat, `Error\n\n${clean(err)}\n`);
  }
})
const clean = text => {
  if (typeof (text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
    return text;
}
