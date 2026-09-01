import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const customerDist = resolve(scriptDirectory, '..', 'dist')

const portals = [
  {
    name: 'Shopkeeper Partner',
    source: resolve(scriptDirectory, '..', '..', 'shopkeeper pov', 'dist'),
    destination: resolve(customerDist, 'shopkeeperpartner'),
  },
  {
    name: 'Driver',
    source: resolve(scriptDirectory, '..', '..', 'delivery boy app', 'dist'),
    destination: resolve(customerDist, 'driver'),
  },
]

if (!existsSync(customerDist)) {
  throw new Error('Customer production build is missing. Run the customer build first.')
}

for (const portal of portals) {
  if (!existsSync(resolve(portal.source, 'index.html'))) {
    throw new Error(`${portal.name} production build is missing its index.html file.`)
  }

  rmSync(portal.destination, { recursive: true, force: true })
  mkdirSync(portal.destination, { recursive: true })
  cpSync(portal.source, portal.destination, { recursive: true })
  console.log(`Assembled ${portal.name} portal at ${portal.destination}`)
}
