import type {
  ServerEndpointConfig,
  ExecOptions,
  ExecResult,
  ConnectionState,
  CircuitState,
  SwarmTransport,
} from "./types.ts";
import { getServerKey, getStatus } from "./state.ts";
import { execCommand, uploadBuffer } from "./ssh-executor.ts";

/**
 * Implementação concreta de transporte Docker Swarm sobre SSH Connection Manager.
 */
export class SshSwarmTransport implements SwarmTransport {
  public readonly server: ServerEndpointConfig;

  constructor(server: ServerEndpointConfig) {
    this.server = server;
  }

  public async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    return execCommand(this.server, command, options);
  }

  public async uploadBuffer(remotePath: string, buffer: Buffer): Promise<void> {
    return uploadBuffer(this.server, remotePath, buffer);
  }

  public getStatus() {
    const key = getServerKey(this.server);
    const all = getStatus();
    const s = (all as any)[key] || { state: "disconnected", circuit: "CLOSED", activeChannels: 0 };
    return {
      state: s.state as ConnectionState,
      circuit: s.circuit as CircuitState,
      activeChannels: s.activeChannels as number,
    };
  }
}
