import express from 'express'
import {hydraBox} from './index';

const app = express()

async function main() {
  app.use(await hydraBox({
    codePath: './demo',
    sparql: {
      endpointUrl: 'http://localhost:3030/labyrinth'
    }
  }))

  app.listen(8888, () => console.log('API started'))
}

main().catch(console.error)
