import { Client } from "ssh2";

async function test() {
  console.log("Connecting...");
  const t0 = Date.now();
  const conn = new Client();
  await new Promise((res, rej) => {
    conn.on("ready", res).on("error", rej).connect({
      host: "45.159.172.137",
      port: 30795,
      username: "root",
      password: process.env.SWARM_SSH_PASSWORD || "uvU8Ly3S6IaXW1fE",
      readyTimeout: 15000,
      keepaliveInterval: 10000,
    });
  });
  console.log(`SSH Handshake connected in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  await new Promise((res) => {
    conn.exec("uptime", (err, stream) => {
      let out = "";
      stream.on("data", (d) => (out += d)).on("close", () => {
        console.log(`Command 1 (uptime) executed in ${Date.now() - t1}ms: ${out.trim()}`);
        res();
      });
    });
  });

  const t2 = Date.now();
  await new Promise((res) => {
    conn.exec('docker stats --no-stream --format "{{json .}}"', (err, stream) => {
      let out = "";
      stream.on("data", (d) => (out += d)).on("close", () => {
        console.log(`Command 2 (docker stats) executed in ${Date.now() - t2}ms, lines: ${out.trim().split("\n").length}`);
        res();
      });
    });
  });

  conn.end();
}

test().catch(console.error);
