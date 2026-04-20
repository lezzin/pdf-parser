import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { convert } from '@opendataloader/pdf';

const app = Fastify({ logger: true });

await app.register(multipart);

const UPLOAD_DIR = './uploads';
const OUTPUT_DIR = './output';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.post('/parse', async (request, reply) => {
    const data = await request.file();

    if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
    }

    const filePath = path.join(UPLOAD_DIR, data.filename);

    await pipeline(data.file, fs.createWriteStream(filePath));

    try {
        await convert([filePath], {
            outputDir: OUTPUT_DIR,
            format: "json"
        });

        const outputFile = path.join(
            OUTPUT_DIR,
            path.parse(data.filename).name + '.json'
        );

        const result = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

        return reply.send({
            success: true,
            data: result
        });

    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            error: 'Error processing PDF'
        });
    } finally {
        fs.unlinkSync(filePath);
    }
});

app.listen({ port: 3000, host: '0.0.0.0' });

console.log(app.printRoutes());