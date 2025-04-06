import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import tls from 'tls'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tlsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certificates', 'client-private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certificates', 'client.crt')),
  ca: fs.readFileSync(path.join(__dirname, '../certificates', 'rootCA.crt')),
  requestCert: true,
  rejectUnauthorized: true
}

const client = tls.connect(8089, 'localhost', tlsOptions, () => {
  if (client.authorized) {
    console.log('Connected to the server securely')

    // Example: Forward a request to example.com:80
    const request = JSON.stringify({
      host: 'example.com',
      port: 80,
      data: 'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n',
    })

    client.write(request)
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
