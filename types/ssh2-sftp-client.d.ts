declare module 'ssh2-sftp-client' {
  import { ClientChannel } from 'ssh2'

  type ConnectConfig = {
    host: string
    port?: number
    username: string
    password?: string
    privateKey?: string | Buffer
    passphrase?: string
    readyTimeout?: number
    retries?: number
    retry_factor?: number
    retry_minTimeout?: number
  }

  export default class SftpClient {
    constructor(name?: string)
    connect(config: ConnectConfig): Promise<void>
    end(): Promise<void>
    put(input: Buffer | string | NodeJS.ReadableStream, remotePath: string, options?: any): Promise<void>
    get(remotePath: string, options?: any): Promise<Buffer | NodeJS.ReadableStream>
    mkdir(remotePath: string, recursive?: boolean): Promise<void>
    exists(remotePath: string): Promise<false | 'd' | '-' | 'l'>
    delete(remotePath: string, useFastDelete?: boolean): Promise<void>
    rmdir(remotePath: string, recursive?: boolean): Promise<void>
    list(remotePath: string, pattern?: string | RegExp): Promise<Array<{ name: string; type: string; size: number; modifyTime: number; accessTime: number; rights: { user?: string; group?: string; other?: string }; owner?: number; group?: number }>>
    rename(fromPath: string, toPath: string): Promise<void>
    on(event: string, callback: (...args: any[]) => void): this
  }
}

