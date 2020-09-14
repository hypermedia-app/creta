/* eslint-disable @typescript-eslint/no-var-requires */
require('@babel/register')({
  configFile: './babel.config.json',
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
})

const chai = require('chai')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)
