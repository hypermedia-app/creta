import Debugger from 'debug'

export const log = Debugger('talos')
log.enabled = true

export const debug = log.extend('debug')
