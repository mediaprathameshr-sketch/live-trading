import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function csvSaverPlugin() {
  return {
    name: 'csv-saver',
    configureServer(server: any) {
      // Endpoint to list available CSV files
      server.middlewares.use('/api/available-stocks', (req: any, res: any) => {
        if (req.method === 'GET') {
          try {
            const dataDir = path.resolve(process.cwd(), 'public/data');
            const files = fs.readdirSync(dataDir).filter((file: string) => file.endsWith('.csv'));
            const stocks = files.map((file: string) => file.replace('.csv', ''));
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ stocks }));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ stocks: [], error: err.message }));
          }
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });

      // Endpoint to save CSV
      server.middlewares.use('/api/save-csv', (req: any, res: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { filename, content } = JSON.parse(body);
              const dir = path.resolve(process.cwd(), 'signals recorded');
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              const filePath = path.join(dir, filename);
              fs.writeFileSync(filePath, content, 'utf8');

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, path: filePath }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), csvSaverPlugin()],
})
