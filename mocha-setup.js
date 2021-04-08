/* eslint-disable @typescript-eslint/no-var-requires */
require('@babel/register')({
  configFile: './babel.config.json',
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
})

const chai = require('chai')
const sinonChai = require('sinon-chai')
const chaiQuantifiers = require('chai-quantifiers')

chai.use(sinonChai)
chai.use(chaiQuantifiers)
