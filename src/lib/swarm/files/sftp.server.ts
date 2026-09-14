/**
 * Realiza upload de buffer binário diretamente via SFTP de forma robusta e sem limite de tamanho.
 */
export function uploadSftpBuffer(conn: any, remotePath: string, buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err: any, sftp: any) => {
      if (err) return reject(err);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on("close", () => {
        try {
          sftp.end();
        } catch {}
        resolve();
      });
      writeStream.on("error", (wErr: any) => {
        try {
          sftp.end();
        } catch {}
        reject(wErr);
      });
      writeStream.end(buffer);
    });
  });
}
