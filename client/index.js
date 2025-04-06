import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import tls from 'tls'
import { Buffer } from 'buffer'

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

// Ensure the TUN interface is removed on exit
function cleanupTunInterface () {
  try {
    console.log('Cleaning up TUN interface...')
    // Check if the TUN interface exists
    const interfaces = execSync('ip link show').toString()
    if (interfaces.includes('tun0')) {
      execSync('sudo ip link delete tun0')
      console.log('TUN interface deleted')
    } else {
      console.log('TUN interface does not exist, skipping deletion')
    }
  } catch (err) {
    console.error('Error deleting TUN interface:', err.message)
  }
}

process.on('exit', cleanupTunInterface)
process.on('SIGINT', () => process.exit(0)) // Handle Ctrl+C
process.on('SIGTERM', () => process.exit(0)) // Handle termination signals

// Open the TUN device
let tunFd
try {
  // Open the TUN device directly
  tunFd = fs.openSync('/dev/net/tun', 'r+')

  // Set up the TUN interface
  console.log('TUN device opened successfully')
} catch (err) {
  console.error('Error opening TUN device:', err.message)
  process.exit(1)
}

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
  if (!tunFd) {
    console.error('TUN device not initialized')
    return
  }

  try {
    const bytesRead = fs.readSync(tunFd, buffer, 0, buffer.length)
    if (bytesRead > 0) {
      const packet = buffer.slice(0, bytesRead)
      console.log('Sending packet to VPN server:', packet.toString('hex'))
      client.write(packet)
    }
    // Continue reading from the TUN interface
    setImmediate(readFromTun)
  } catch (err) {
    console.error('Error reading from TUN interface:', err.message)
    // Add a small delay before retrying
    setTimeout(readFromTun, 1000)
  }
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
  process.exit(0) // Trigger cleanup
})
