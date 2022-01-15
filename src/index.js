require("dotenv").config()
const Discord = require("discord.js")
const express = require("express")
const bodyParser = require("body-parser")
const WebSocket = require("ws")
const http = require("http")

const CHANNEL_ID = "931955895741603853"

// BOT

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.DIRECT_MESSAGES,
  ],
})

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("message", async (message) => {
  if (message.author.id !== client.user.id) {
    let socket = sockets.get(message.channelId)
    if (socket) {
      socket.send(
        JSON.stringify({
          message: {
            ...message,
            author: message.author,
            attachments: message.attachments.toJSON(),
          },
        })
      )
    }
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)

// SERVER

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })
const sockets = new Map()

wss.on("connection", (socket, request) => {
  const threadId = request.url.split("/").pop()
  sockets.set(threadId, socket)
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded())

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html")
})

app.get("/styles.css", function (req, res) {
  res.sendFile(__dirname + "/styles.css")
})

app.get("/thread/:thread", (req, res) => {
  res.sendFile(__dirname + "/thread.html")
})

app.get("/api/thread/:thread", async (req, res) => {
  let channel = await client.channels.cache.get(CHANNEL_ID)
  let thread = await channel.threads.fetch(req.params.thread)
  let messages = await thread.messages.fetch()
  res.send({
    messages: messages.map((message) => ({
      ...message,
      author: message.author,
      attachments: message.attachments.toJSON(),
    })),
  })
})

app.post("/api/thread/create", async (req, res) => {
  let channel = await client.channels.fetch(CHANNEL_ID)
  let thread = await channel.threads.create({
    name: `Conversation with ${req.body.name}`,
  })
  await thread.send(req.body.message)
  res.redirect("/thread/" + thread.id)
})

app.post("/api/thread/:thread/send", async (req, res) => {
  let channel = await client.channels.fetch(CHANNEL_ID)
  let thread = await channel.threads.fetch(req.params.thread)
  let message = await thread.send(req.body.message)
  res.send({
    message: {
      ...message,
      author: message.author,
      attachments: message.attachments.toJSON(),
    },
  })
})

server.listen(3000, (error) => {
  if (error) {
    throw error
  }
  console.log("Web server is running...")
})
