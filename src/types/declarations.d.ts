declare module 'ssh2' {
  export class Client {
    connect(config: any): this;
    on(event: string, listener: (...args: any[]) => void): this;
    exec(command: string, callback: (err: any, stream: any) => void): boolean;
    exec(command: string, options: any, callback: (err: any, stream: any) => void): boolean;
    sftp(callback: (err: any, sftp: any) => void): boolean;
    end(): void;
    destroy(): void;
  }
  export interface ConnectConfig {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: string | Buffer;
    readyTimeout?: number;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
    [key: string]: any;
  }
}
declare module 'ssh2-sftp-client';
declare module '../../scripts/backup-database.mjs' {
  export function runDatabaseBackup(): Promise<any>;
  export function runBackup(): Promise<any>;
}
declare module '*/scripts/backup-database.mjs' {
  export function runDatabaseBackup(): Promise<any>;
  export function runBackup(): Promise<any>;
}
