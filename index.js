const download = require('download')
const gm = require('gm').subClass({ imageMagick: true })
const uuid = require('uuid/v4')
const path = require('path')
const fs = require('fs')
const potrace = require('potrace')
const express = require('express')

process.on('unhandledRejection', (err) => console.error(err))

const paths = [ 'tmp/download', 'tmp/process' ]
paths.forEach((pathName) => {
  if(!fs.existsSync(pathName)) {
    fs.mkdirSync(pathName)
  }
})

function size(filename) {
  return new Promise((resolve, reject) => 
    gm(filename).size((err, size) => err ? reject(err) : resolve(size))
  )
}

async function prepare(url) {
  const data = await download(url, 'tmp/download')

  return new Promise(async (resolve, reject) => {
    const tempfile = path.resolve('tmp/process/' + uuid() + ".bmp")

    const filesize = await size(data)
    gm(data)
      .resize(500, 500)
      .blur(2,2)
      .write(tempfile, (err) => err ? reject(err) : resolve(tempfile))
  })
}

function vectorize(filename, color) {
  return new Promise((resolve, reject) => {
    potrace.trace(filename, { 
      turdSize: 10, 
      optTolerance: 10,
      color: color ? '#' + color : undefined
    }, (err, svg) => err ? reject(err) : resolve(svg))
  })
}

async function run(url, color) {
  const tmpfile = await prepare(url)
  const svg = await vectorize(tmpfile, color)
  return svg
}

const app = express()
  .disable('x-powered-by')
  .get('/*', async (req, res) => {
    const url = req.originalUrl.match(/\/(([0-9A-Fa-f]{6})\/|)(http.*)/)

    if(!url) {
      res.send("Usage: " + req.hostname + "/[COLOR/]IMAGE_URL")
    } else {

      const svg = await run(url[3], url[2])
      res.set('Content-Type', 'image/svg+xml')
      res.send(svg)
    }
  })

app.listen(process.env.PORT || 3000)