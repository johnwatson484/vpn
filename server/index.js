import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import tls from 'tls'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tlsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certificates', 'server-private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certificates', 'server.crt')),
  ca: fs.readFileSync(path.join(__dirname, '../certificates', 'rootCA.crt')),
}

const server = tls.createServer(tlsOptions, (socket) => {
  socket.on('data', (data) => {
    console.log('Received data:', data.toString())
    socket.write('Hello from server!')
  })

  socket.on('error', (err) => {
    console.error('Socket error:', err)
  })

  socket.on('close', () => {
    console.log('Client disconnected')
  })
})

server.listen(8089, () => {
  console.log('Server is listening on port 8089')
})
