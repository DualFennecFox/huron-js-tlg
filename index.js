const Telegram = require('node-telegram-bot-api');
require('dotenv-flow').config();
const YT = require('scrape-yt')
const ytdl = require("ytdl-core")
const fs = require('fs');
const client = new Telegram(process.env.TOKEN, {polling: true});
let id 
let name
client.on('message', async msg => {

  YT.search(msg.message.replace('/eval', ''), { type: "video", limit: 10 }).then(async (videos) => {
  if (videos.length < 1) return client.sendMessage(msg.chat.id, "No existe ningún resultado con ese nombre.").then(msg => setTimeout(() => client.deleteMessage(msg.chat.id, msg.message_id), 5000))

  let vidNameArr = []
  let videoID = []
  let message = ''

  for (let v = 0; v < videos.length; v++) {
    videoID.push(`https://www.youtube.com/watch?v=${videos[v].id}`)
    vidNameArr.push(`${v + 1}: ${videos[v].title}`);
  
}
for (let v = 0; v < videos.length; v++) {

  message += `${vidNameArr[v]}\n\n`
}

var menu = [0,2,4,6,8];

  var options = {
       reply_markup: JSON.stringify({
            inline_keyboard: menu.map((x, xi) => ([{
                text: String(x + 1),
                callback_data: String(x + 1),
                
            }, { text: String(x + 2), callback_data: String(x + 2), 
            }]
            ))
      })
  };

  client.sendMessage(msg.chat.id, `Elije la cancion que quieres escuchar según el numero\n\n${message}`, options)

  id = videoID
  name = videos
})
})

client.on('callback_query', async q => {

try {

  client.deleteMessage(q.message.chat.id, q.message.message_id)
} catch (err) {

  console.error(err)
}

let video = name[q.data -1]

  let audio = ytdl(id[q.data - 1], { filter: 'audioonly', quality: 'highestaudio' }).pipe(fs.createWriteStream(`${video.title}.mp3`))


  audio.on('finish', async () => {

   await client.sendAudio(q.message.chat.id, `./${video.title}.mp3`, { duration: video.duration, title: video.title, 
      thumb: video.thumbnail, performer: video.channel.name, })

  fs.unlink(`${video.title}.mp3`, function (err) {
  
    console.log(err)
    
  })
  })

})

client.onText(/\/eval (.+)/, async (msg, match) => {

  if(msg.from.id != parseInt(process.env.OWNER)) return
  const chat = msg.chat.id;

  try {
      const code = match[1]
      let evaled = await eval(code)
  
      if (typeof evaled !== "string")
        evaled = require("util").inspect(evaled);
  
      client.sendMessage(chat, clean(evaled), {code:"xl"});
    } catch (err) {
      client.sendMessage(chat, `Error\n\n${clean(err)}\n`);
    }
})
const clean = text => {
    if (typeof(text) === "string")
      return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
    else
        return text;
}
