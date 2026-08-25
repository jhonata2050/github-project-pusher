import { createFileRoute } from '@tanstack/react-router';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import JSZip from 'jszip';
import { resolveClientRoot } from '@/lib/file-manager/security';

export const Route = createFileRoute('/api/file-manager/bundle/$appId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { appId } = params;
          if (!appId) {
            return new Response('appId is required', { status: 400 });
          }

          const clientRoot = await resolveClientRoot(appId);
          if (!fsSync.existsSync(clientRoot)) {
            return new Response('App storage not found', { status: 404 });
          }

          const zip = new JSZip();

          async function addRecursive(d: string, rel: string = '') {
            const entries = await fs.readdir(d, { withFileTypes: true });
            for (const ent of entries) {
              const full = path.join(d, ent.name);
              const r = rel ? `${rel}/${ent.name}` : ent.name;
              if (ent.isDirectory()) {
                await addRecursive(full, r);
              } else if (!ent.name.endsWith('.zip') && !ent.name.endsWith('.tar') && !ent.name.endsWith('.gz')) {
                const data = await fs.readFile(full);
                zip.file(r.replace(/\\/g, '/'), data);
              }
            }
          }

          await addRecursive(clientRoot);

          const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
          });

          return new Response(zipBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${appId}_bundle.zip"`,
              'Content-Length': zipBuffer.length.toString(),
            },
          });
        } catch (err: any) {
          console.error('[Bundle API Error]:', err);
          return new Response('Error generating bundle: ' + err.message, { status: 500 });
        }
      },
    },
  },
});
