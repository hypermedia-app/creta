import { promisify } from 'util'
import path from 'path'
import * as fs from 'fs-extra'

export async function copyResources(): Promise<void> {
  const sourceDir = path.resolve(__dirname, '../resources')
  const destDir = path.resolve(process.cwd(), 'resources')

  return promisify(fs.copy)(sourceDir, destDir)
}
