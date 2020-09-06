import * as stream from 'stream'

export function readable(promise: Promise<stream.Readable>, opts?: stream.ReadableOptions): stream.Readable {
  const out = new stream.PassThrough(opts)
  promise
    .then(stream => {
      stream.pipe(out)
    })
    .catch(e => {
      out.emit('error', e)
    })
  return out
}

export function writable(promise: Promise<stream.Writable>, opts?: stream.WritableOptions): stream.Writable {
  const out = new stream.PassThrough(opts)
  promise
    .then(stream => {
      out.pipe(stream)
    })
    .catch(e => {
      out.emit('error', e)
    })
  return out
}
