const Telegram = require('node-telegram-bot-api');
require('dotenv-flow').config();
const { Client } = require('youtubei')
const ytdl = require("youtube-dl-exec")
const fs = require('fs');
const https = require('https');
const client = new Telegram(process.env.TOKEN, { polling: true });
const YT = new Client()
const getVideoId = require('get-video-id')
const Scl = require('soundcloud-scraper')
const SC = new Scl.Client()

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
    if (getVideoId(args)?.id && getVideoId(args)?.service === "youtube") {
      let ID = getVideoId(args).id
      YT.search(ID, { type: "video", limit: 1 }).then(async (videos) => {

        let video = videos.items[0]
        const url = `https://www.youtube.com/watch?v=${video.id}`
        const title = video.title.replace("@", "@\u200b")
        const duration = video.duration
        const thumbnail = video.thumbnails.best;
        const channel = video.channel.name


        let yt = ytdl.create("./yt-dlp")
        let audio = yt.exec(`https://www.youtube.com/watch?v=${video.id}`, { format: "bestaudio", output: "-", cookies: "cookies.txt" }).stdout.pipe(fs.createWriteStream(`./songs/${video.id}.mp3`))

        await downloadImage(thumbnail, video.id)

        audio.on('finish', async () => {


          await client.sendAudio(msg.chat.id, `./songs/${video.id}.mp3`, {
            duration: video.duration, title: video.title,
            thumb: `./songs/${video.id}.jpg`, performer: video.channel?.name,
          })

          fs.rm(`./songs/${video.id}.jpg`, () => { })
          fs.rm(`./songs/${video.id}.mp3`, () => { })
          return
        })
      }).catch(err => {
        console.error(err)
        return
      })
    } else {
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
              callback_data: String(x + 1) + "y",

            }, {
              text: String(x + 2), callback_data: String(x + 2) + "y",
            }]
            ))
          })
        };

        client.sendMessage(msg.chat.id, `Elije la cancion que quieres escuchar según el numero\n\n${message}`, options)

      })
    }
  } else if (msg.text.startsWith("/scsong")) {
    let args = msg.text.replace('/scsong', '')
    if (args == "") { return client.sendMessage(msg.chat.id, "Debes de escribir el nombre de una cancion.") }

    SC.search(args, "track").then(async (videos) => {

      if (videos.length < 1) return client.sendMessage(msg.chat.id, "No existe ningún resultado con ese nombre.").then(msg => setTimeout(() => client.deleteMessage(msg.chat.id, msg.message_id), 5000))
      const vidNameArr = []
      let message = ''
      videoArr = videos
      for (let v = 0; v < videos.length && v <= 10; v++) {

        vidNameArr.push(`${v + 1}: ${videos[v].name}`);
        message += `${vidNameArr[v]}\n\n`
      }

      var menu = [0, 2, 4, 6, 8];

      var options = {
        reply_markup: JSON.stringify({
          inline_keyboard: menu.map((x, xi) => ([{
            text: String(x + 1),
            callback_data: String(x + 1) + "s",

          }, {
            text: String(x + 2), callback_data: String(x + 2) + "s",
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
  if (q.data.endsWith("y")) {
    let video = videoArr[parseInt(q.data.slice(0, -1)) - 1]
    if (!video) return
    let yt = ytdl.create("./yt-dlp")
    let audio = yt.exec(`https://www.youtube.com/watch?v=${video.id}`, { format: "bestaudio", output: "-", cookies: "cookies.txt" }).stdout.pipe(fs.createWriteStream(`./songs/${video.id}.mp3`))

    let thumbnail = video.thumbnails.best
    await downloadImage(thumbnail, video.id)

    audio.on('finish', async () => {


      await client.sendAudio(q.message.chat.id, `./songs/${video.id}.mp3`, {
        duration: video.duration, title: video.title,
        thumb: `./songs/${video.id}.jpg`, performer: video.channel?.name,
      })

      fs.rm(`./songs/${video.id}.jpg`, () => { })
      fs.rm(`./songs/${video.id}.mp3`, () => { })
    })

  } else if (q.data.endsWith("s")) {



    let video = videoArr[parseInt(q.data.slice(0, -1)) - 1]
    if (!video) return

    let song = await SC.getSongInfo(video.url)
    video = song
    let audio = (await song.downloadProgressive()).pipe(fs.createWriteStream(`./songs/${video.title}.mp3`))

    let thumbnail = video.thumbnail
    console.log(video.thumbnail)
    await downloadImage(thumbnail, video.title)

    audio.on('finish', async () => {


      await client.sendAudio(q.message.chat.id, `./songs/${video.title}.mp3`, {
        title: video.title,
        thumb: `./songs/${video.title}.jpg`, performer: video.author.name,
      })

      fs.rm(`./songs/${video.title}.jpg`, () => { })
      fs.rm(`./songs/${video.title}.mp3`, () => { })
    })
  }
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
function cleanString(input) {
  var output = "";
  for (var i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i);
    }
  }
  return output;
}
const clean = text => {
  if (typeof (text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
    return text;
}