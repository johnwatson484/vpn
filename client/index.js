import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import tls from 'tls'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tlsOptions = {
  ca: fs.readFileSync(path.join(__dirname, '../certificates', 'rootCA.crt'))
}

const client = tls.connect(8089, 'localhost', tlsOptions, () => {
  if (client.authorized) {
    console.log('Connected to the server securely')
    client.write('Hello from client!')
  } else {
    console.error('Connection not authorized:', client.authorizationError)
    client.end()
  }
})

client.on('data', (data) => {
  console.log('Received from server:', data.toString())
})

client.on('error', (err) => {
  console.error('Client error:', err)
})

client.on('close', () => {
  console.log('Connection closed')
})
