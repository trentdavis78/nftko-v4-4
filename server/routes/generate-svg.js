import Replicate from 'replicate';
import path from 'path';
import { downloadSVG } from '../utils/downloadSvg';
import 'dotenv/config';
const replicate = new Replicate({
  auth:  process.env.REPLICATE_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      ));
    }

    const output = await replicate.run('recraft-ai/recraft-v3-svg', {
      input: { prompt },
    });

    // Save the SVG file
    const outputPath = path.join(process.cwd(), 'public', 'generated');
    const svgCode = await downloadSVG(output.toString(), outputPath);
    console.log(svgCode, "svgCode");
    
    const match = svgCode.match(/generated.*$/);
    if (match) {
      return new Response(JSON.stringify({ 
        success: true, 
        svg: match[0] 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    return new Response(JSON.stringify({
      success: true, 
      svg: "generated/svg_2024-12-09_061259876Z_655f405d.svg"
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Replicate generation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:5173',
      }
    });
  }
}