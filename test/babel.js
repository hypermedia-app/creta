// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@babel/register')({
  configFile: './babel.config.json',
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
})
