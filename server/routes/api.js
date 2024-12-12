import express from 'express';
import { generateSVG } from '../controllers/svgController.js';

export const router = express.Router();

router.post('/generate-svg', generateSVG);