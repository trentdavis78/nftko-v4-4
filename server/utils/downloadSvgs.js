import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { URL } from 'url';
import crypto from 'crypto';
 
export async function downloadSVG(url, outputDir) {
    try {
        // Validate URL
        const parsedUrl = new URL(url);
        if (!parsedUrl.protocol || !parsedUrl.hostname) {
            throw new Error('Invalid URL provided');
        }

        // Create output directory if it doesn't exist
        await fs.mkdir(outputDir, { recursive: true });

        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').split('T').join('_');
        const randomId = crypto.randomBytes(4).toString('hex');
        const filename = `svg_${timestamp}_${randomId}.svg`;
        const filepath = path.join(outputDir, filename);

        // Download the SVG
        const svgContent = await new Promise((resolve, reject) => {
            https.get(url, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Accept': 'image/svg+xml, application/svg+xml'
                }
            }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP error! status: ${res.statusCode}`));
                    return;
                }

                // Check content type
                const contentType = res.headers['content-type']?.toLowerCase() || '';
                if (!contentType.includes('svg') && !contentType.includes('xml')) {
                    reject(new Error(`Unexpected content type: ${contentType}`));
                    return;
                }

                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    // Verify it looks like SVG content
                    if (!data.includes('<svg') && !data.includes('<?xml')) {
                        reject(new Error('Content does not appear to be SVG'));
                        return;
                    }
                    resolve(data);
                });
            }).on('error', reject)
              .on('timeout', () => {
                  reject(new Error('Request timed out'));
              });
        });

        // Save the SVG
        await fs.writeFile(filepath, svgContent, 'utf8');
        console.log(`Successfully downloaded SVG to: ${filepath}`);
        return filepath;

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error downloading SVG: ${error.message}`);
        } else {
            console.error('Error downloading SVG:', error);
        }
        throw error;
    }
}
 