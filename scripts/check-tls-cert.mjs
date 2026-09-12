import tls from "tls";

async function checkCert(host) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: "45.159.172.137",
      port: 443,
      servername: host,
      rejectUnauthorized: false,
    }, () => {
      const cert = socket.getPeerCertificate();
      resolve({
        authorized: socket.authorized,
        authorizationError: socket.authorizationError,
        subject: cert.subject,
        issuer: cert.issuer,
        valid_from: cert.valid_from,
        valid_to: cert.valid_to,
        subjectaltname: cert.subjectaltname,
      });
      socket.end();
    });

    socket.on("error", (e) => resolve({ error: e.message }));
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve({ error: "Timeout" });
    });
  });
}

async function main() {
  console.log("=== VERIFICANDO CERTIFICADO TLS APRESENTADO PELO TRAEFIK ===");
  console.log("Certificado de openstatus-9d845a79e685.dk1.eqsam.com:");
  console.log(await checkCert("openstatus-9d845a79e685.dk1.eqsam.com"));

  console.log("\nCertificado de admin-openstatus-9d845a79e685.dk1.eqsam.com:");
  console.log(await checkCert("admin-openstatus-9d845a79e685.dk1.eqsam.com"));
}

main().catch(console.error);
