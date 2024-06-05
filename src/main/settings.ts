import { LowSync } from 'lowdb'
import { DataFileSync } from 'lowdb/node'
import { app } from 'electron'
import { z } from 'zod'
import yaml from 'yaml'
import path from 'path'

const schema = z.object({
  language: z.enum(['en', 'ru']).nullable().default(null),
  systemMediaControlsSession: z.boolean().default(true)
})

class Settings {
  private adapter = new DataFileSync<typeof schema._type>(path.join(app.getPath('userData'), 'settings.yml'), {
    parse: str => schema.safeParse(yaml.parse(str)).data,
    stringify: yaml.stringify
  })
  private db = new LowSync(this.adapter, schema.safeParse({}).data)
  constructor() {
    this.db.read()
  }
  get data() {
    return this.db.data
  }
  get update() {
    return this.db.update
  }
  get write() {
    return this.db.write
  }
  set<T extends keyof typeof schema._type>(key: T, value: typeof schema._type[T]) {
    this.db.update(data => { data[key] = value })
    this.db.write()
  }
}

export const settings = new Settings