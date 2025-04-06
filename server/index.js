import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import tls from 'tls'
import net from 'net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tlsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certificates', 'server-private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certificates', 'server.crt')),
  ca: fs.readFileSync(path.join(__dirname, '../certificates', 'rootCA.crt')),
  requestCert: true,
  rejectUnauthorized: true,
}

const server = tls.createServer(tlsOptions, (clientSocket) => {
  console.log('Client connected')

  clientSocket.on('data', (data) => {
    try {
      const request = JSON.parse(data.toString())
      const { host, port, data: clientData } = request

      console.log(`Forwarding request to ${host}:${port}`)

      // Create a connection to the destination server
      const destinationSocket = net.createConnection(port, host, () => {
        destinationSocket.write(clientData) // Forward client data to the destination
      })

      // Relay data from the destination back to the client
      destinationSocket.on('data', (response) => {
        clientSocket.write(response) // Send the response back to the client
      })

      // Handle errors on the destination socket
      destinationSocket.on('error', (err) => {
        console.error('Error with destination connection:', err)
        clientSocket.write(`Error: ${err.message}`)
      })

      // Close the destination socket when the client disconnects
      clientSocket.on('close', () => {
        destinationSocket.end()
      })
    } catch (err) {
      console.error('Error parsing client request:', err)
      clientSocket.write('Invalid request format')
    }
  })

  clientSocket.on('error', (err) => {
    console.error('Client socket error:', err)
  })

  clientSocket.on('close', () => {
    console.log('Client disconnected')
  })
})

server.listen(8089, () => {
  console.log('VPN server is listening on port 8089')
})
