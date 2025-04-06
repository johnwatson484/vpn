import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import tls from 'tls'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// TLS options for secure connection to the VPN server
const tlsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certificates', 'client-private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certificates', 'client.crt')),
  ca: fs.readFileSync(path.join(__dirname, '../certificates', 'rootCA.crt')),
  requestCert: true,
  rejectUnauthorized: true,
}

// Configure the TUN interface
try {
  console.log('Configuring TUN interface...')
  execSync('sudo ip tuntap add dev tun0 mode tun')
  execSync('sudo ip link set tun0 up')
  execSync('sudo ip addr add 10.0.0.2/24 dev tun0')
  console.log('TUN interface configured successfully')
} catch (err) {
  console.error('Error configuring TUN interface:', err.message)
  process.exit(1)
}

// Open the TUN device
const tunFd = fs.openSync('/dev/net/tun', 'r+')

// Connect to the VPN server
const client = tls.connect(8089, 'localhost', tlsOptions, () => {
  if (client.authorized) {
    console.log('Connected to the VPN server securely')
  } else {
    console.error('Connection not authorized:', client.authorizationError)
    client.end()
    process.exit(1)
  }
})

// Read packets from the TUN interface and send them to the VPN server
const buffer = Buffer.alloc(1500) // MTU size
function readFromTun () {
  fs.read(tunFd, buffer, 0, buffer.length, null, (err, bytesRead) => {
    if (err) {
      console.error('Error reading from TUN interface:', err.message)
      return
    }

    const packet = buffer.slice(0, bytesRead)
    console.log('Sending packet to VPN server:', packet.toString('hex'))
    client.write(packet) // Send the packet to the VPN server

    // Continue reading from the TUN interface
    readFromTun()
  })
}
readFromTun()

// Handle data received from the VPN server and write it to the TUN interface
client.on('data', (data) => {
  console.log('Received packet from VPN server:', data.toString('hex'))
  fs.write(tunFd, data, 0, data.length, null, (err) => {
    if (err) {
      console.error('Error writing to TUN interface:', err.message)
    }
  })
})

// Handle errors
client.on('error', (err) => {
  console.error('Client error:', err.message)
})

// Handle connection close
client.on('close', () => {
  console.log('Connection to VPN server closed')
  // Clean up the TUN interface
  try {
    execSync('sudo ip link delete tun0')
    console.log('TUN interface deleted')
  } catch (err) {
    console.error('Error deleting TUN interface:', err.message)
  }
})
