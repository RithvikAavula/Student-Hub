/**
 * Certificate Text Analysis Library
 * 
 * Provides OCR-based text extraction and name verification for certificate fraud detection.
 * Uses Tesseract.js for image OCR and PDF.js for PDF text extraction.
 */

import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import jsQR from 'jsqr';

// Configure PDF.js worker - use local copy in public folder
// This avoids CDN version mismatch issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// ========================================
// TEXT ANALYSIS TYPES
// ========================================

export interface TextAnalysisResult {
  extracted_text: string;
  confidence: number;
  names_found: string[];
  name_match_score: number;
  name_verification_status: 'verified' | 'suspicious' | 'mismatch' | 'not_found';
  text_anomalies: TextAnomaly[];
  font_inconsistencies: boolean;
  text_extraction_method: 'pdf_native' | 'ocr' | 'hybrid';
  image_edit_analysis?: ImageEditAnalysis;
  qr_code_analysis?: QRCodeAnalysis;
}

export interface TextAnomaly {
  type: 'spacing' | 'font' | 'alignment' | 'case' | 'character' | 'editing_artifact' | 'pixel_anomaly' | 'compression_artifact';
  description: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
}

export interface ImageEditAnalysis {
  likely_edited: boolean;
  edit_confidence: number; // 0-100
  suspicious_regions: string[]; // Descriptions of suspicious areas
  compression_quality_variance: number;
  color_inconsistencies: boolean;
  edge_anomalies: boolean;
  ocr_confidence_variance: number;
}

export interface QRCodeAnalysis {
  qr_codes_found: number;
  qr_codes: QRCodeData[];
  verification_status: 'verified' | 'suspicious' | 'invalid' | 'not_found';
  verification_details: string[];
}

export interface QRCodeData {
  data: string;
  format: string;
  position: { x: number; y: number; width: number; height: number };
  is_valid: boolean;
  validation_result?: string;
}

export interface NameMatchResult {
  matched: boolean;
  confidence: number;
  extracted_name: string;
  expected_name: string;
  match_type: 'exact' | 'partial' | 'fuzzy' | 'no_match';
  discrepancies: string[];
}

// Common name patterns to look for in certificates
// These patterns are case-insensitive and handle various certificate formats
const NAME_PATTERNS = [
  // Standard certificate phrases (more flexible)
  /(?:this\s+is\s+to\s+certify\s+that|certify\s+that|awarded\s+to|presented\s+to|conferred\s+upon|granted\s+to|given\s+to|successfully\s+completed\s+by|completed\s+by|has\s+been\s+awarded\s+to|certificate\s+is\s+awarded\s+to|hereby\s+certif(?:y|ies)\s+that|has\s+successfully|is\s+hereby\s+awarded)\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.\']{2,50})/gi,
  // Name field patterns
  /(?:name|recipient|awardee|student|participant|candidate|holder|person|learner)[\s:]+([A-Za-z][A-Za-z\s\.\']{2,50})/gi,
  // Title + name patterns (Indian titles)
  /(?:mr\.?|ms\.?|mrs\.?|dr\.?|shri|smt\.?|kumari|miss|sri|srimati)\s+([A-Za-z][A-Za-z\s\']{2,50})/gi,
  // "for" or "to" followed by name
  /(?:for|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g,
  // ALL CAPS name after keywords
  /(?:certify that|awarded to|presented to|completed by)\s+([A-Z][A-Z\s]{3,40})/g,
  // Standalone ALL CAPS name (2-4 words, common in certificates) 
  /\b([A-Z][A-Z]+(?:\s+[A-Z][A-Z]+){1,3})\b/g,
];

// Suspicious patterns that might indicate text editing
const SUSPICIOUS_PATTERNS = [
  /(.)\1{4,}/g, // Repeated characters (more than 4)
  /[A-Za-z]\d+[A-Za-z]/g, // Numbers mixed oddly in names
  /\s{3,}/g, // Excessive spacing
  /[^\x00-\x7F]/g, // Non-ASCII characters that might be substitutes
];

// ========================================
// PDF TEXT EXTRACTION
// ========================================

/**
 * Extract text from a PDF file using PDF.js
 */
export async function extractTextFromPdf(file: File): Promise<{
  text: string;
  pageTexts: string[];
  hasSelectionText: boolean;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const pageTexts: string[] = [];
    let fullText = '';
    let hasSelectionText = false;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            if (item.str.trim()) hasSelectionText = true;
            return item.str;
          }
          return '';
        })
        .join(' ');
      
      pageTexts.push(pageText);
      fullText += pageText + ' ';
    }

    return {
      text: fullText.trim(),
      pageTexts,
      hasSelectionText,
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return {
      text: '',
      pageTexts: [],
      hasSelectionText: false,
    };
  }
}

/**
 * Render PDF page to image and run OCR (for scanned PDFs)
 */
export async function extractTextFromScannedPdf(file: File): Promise<{
  text: string;
  confidence: number;
}> {
  console.log('[OCR-PDF] Starting OCR on scanned PDF...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    let totalConfidence = 0;
    const numPages = Math.min(pdf.numPages, 5); // Limit to first 5 pages for performance
    
    console.log('[OCR-PDF] Processing', numPages, 'pages...');
    
    for (let i = 1; i <= numPages; i++) {
      console.log('[OCR-PDF] Rendering page', i);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale = better OCR
      
      // Create canvas to render PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      
      // Convert canvas to data URL and run OCR
      const imageDataUrl = canvas.toDataURL('image/png');
      console.log('[OCR-PDF] Running OCR on page', i);
      
      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log('[OCR-PDF] Page', i, 'progress:', Math.round(m.progress * 100) + '%');
          }
        },
      });
      
      if (result?.data?.text) {
        fullText += result.data.text + '\n';
        totalConfidence += result.data.confidence || 0;
        console.log('[OCR-PDF] Page', i, 'text length:', result.data.text.length);
      }
    }
    
    const avgConfidence = numPages > 0 ? totalConfidence / numPages : 0;
    console.log('[OCR-PDF] Total text extracted:', fullText.length, 'chars, avg confidence:', avgConfidence);
    
    return {
      text: fullText,
      confidence: avgConfidence,
    };
  } catch (error) {
    console.error('[OCR-PDF] Error:', error);
    return {
      text: '',
      confidence: 0,
    };
  }
}

// ========================================
// IMAGE OCR
// ========================================

/**
 * Perform OCR on an image file using Tesseract.js
 */
export async function extractTextFromImage(file: File): Promise<{
  text: string;
  confidence: number;
  words: Array<{ text: string; confidence: number; bbox: any }>;
}> {
  console.log('%c[OCR] ========== STARTING OCR ==========', 'background: blue; color: white; font-size: 16px;');
  console.log('[OCR] File:', file.name, '| Type:', file.type, '| Size:', file.size, 'bytes');
  
  try {
    // Convert file to data URL for better compatibility
    console.log('[OCR] Converting file to data URL...');
    const imageDataUrl = await fileToDataUrl(file);
    console.log('[OCR] Data URL ready, length:', imageDataUrl.length);
    console.log('[OCR] Data URL preview:', imageDataUrl.substring(0, 100));
    
    console.log('%c[OCR] Calling Tesseract.recognize()...', 'color: orange;');

    const result = await Tesseract.recognize(imageDataUrl, 'eng', {
      logger: (m) => {
        console.log('[OCR Progress]', m.status, m.progress ? `${Math.round(m.progress * 100)}%` : '');
      },
    });
    
    console.log('%c[OCR] ========== OCR COMPLETE ==========', 'background: green; color: white; font-size: 16px;');
    console.log('[OCR] Result object exists:', !!result);
    console.log('[OCR] Result.data exists:', !!result?.data);
    
    if (!result || !result.data) {
      console.error('[OCR] Result is null or has no data!');
      return { text: '', confidence: 0, words: [] };
    }
    
    const extractedText = result.data.text || '';
    const confidence = result.data.confidence || 0;
    
    console.log('[OCR] Text length:', extractedText.length);
    console.log('[OCR] Confidence:', confidence);
    console.log('%c[OCR] ===== FULL EXTRACTED TEXT =====', 'color: cyan;');
    console.log(extractedText);
    console.log('%c[OCR] ===== END OF TEXT =====', 'color: cyan;');
    
    // Cast to any to access words property
    const pageData = result.data as any;
    const words = (pageData.words || []).map((word: any) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox,
    }));
    
    console.log('[OCR] Words extracted:', words.length);
    if (words.length > 0) {
      console.log('[OCR] First 20 words:', words.slice(0, 20).map((w: any) => w.text).join(' '));
    }
    
    return {
      text: extractedText,
      confidence: confidence,
      words,
    };
  } catch (error) {
    console.error('%c[OCR] ========== OCR ERROR ==========', 'background: red; color: white; font-size: 16px;');
    console.error('[OCR] Error:', error);
    if (error instanceof Error) {
      console.error('[OCR] Name:', error.name);
      console.error('[OCR] Message:', error.message);
      console.error('[OCR] Stack:', error.stack);
    }
    return {
      text: '',
      confidence: 0,
      words: [],
    };
  }
}

/**
 * Convert File to data URL for better OCR compatibility
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ========================================
// QR CODE DETECTION AND VERIFICATION
// ========================================

/**
 * Detect and analyze QR codes in certificate images/PDFs
 */
export async function detectAndAnalyzeQRCodes(file: File): Promise<QRCodeAnalysis> {
  console.log('[QR] Starting QR code analysis...');

  const result: QRCodeAnalysis = {
    qr_codes_found: 0,
    qr_codes: [],
    verification_status: 'not_found',
    verification_details: [],
  };

  try {
    let imageData: ImageData | null = null;

    if (file.type.startsWith('image/')) {
      // For images, load directly
      const imageUrl = URL.createObjectURL(file);
      const img = await loadImage(imageUrl);
      URL.revokeObjectURL(imageUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return result;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else if (file.type === 'application/pdf') {
      // For PDFs, render first page to canvas
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      if (pdf.numPages === 0) return result;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return result;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    if (!imageData) return result;

    // Scan for QR codes using jsQR
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (qrCode) {
      console.log('[QR] QR code detected:', qrCode.data.substring(0, 100) + '...');

      const qrData: QRCodeData = {
        data: qrCode.data,
        format: 'QR_CODE',
        position: {
          x: qrCode.location.topLeftCorner.x,
          y: qrCode.location.topLeftCorner.y,
          width: Math.abs(qrCode.location.topRightCorner.x - qrCode.location.topLeftCorner.x),
          height: Math.abs(qrCode.location.bottomLeftCorner.y - qrCode.location.topLeftCorner.y),
        },
        is_valid: false,
      };

      // Validate QR code content
      const validation = await validateQRCodeContent(qrCode.data);
      qrData.is_valid = validation.isValid;
      qrData.validation_result = validation.message;

      result.qr_codes.push(qrData);
      result.qr_codes_found = 1;

      // Determine overall verification status
      if (validation.isValid) {
        result.verification_status = 'verified';
        result.verification_details.push('QR code contains valid certificate verification data');
      } else {
        result.verification_status = 'invalid';
        result.verification_details.push(`QR code validation failed: ${validation.message}`);
      }

      console.log('[QR] QR code validation result:', validation);
    } else {
      console.log('[QR] No QR codes detected');
      result.verification_status = 'not_found';
      result.verification_details.push('No QR codes found in certificate');
    }

  } catch (error) {
    console.error('[QR] Error during QR code analysis:', error);
    result.verification_status = 'invalid';
    result.verification_details.push('Error analyzing QR codes');
  }

  return result;
}

/**
 * Validate QR code content for certificate verification
 */
async function validateQRCodeContent(qrData: string): Promise<{ isValid: boolean; message: string }> {
  try {
    // Check if it's a URL (common for certificate verification)
    if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
      // Try to validate the URL (basic checks)
      const url = new URL(qrData);

      // Check for common certificate verification domains
      const validDomains = [
        'verify.certificates.com',
        'certificate.verification.org',
        'edu.certify.com',
        'accreditation.board.org',
        'diploma.verify.edu',
      ];

      const isValidDomain = validDomains.some(domain =>
        url.hostname.includes(domain) || url.hostname.endsWith('.edu') || url.hostname.endsWith('.org')
      );

      if (isValidDomain) {
        return { isValid: true, message: 'Valid certificate verification URL' };
      } else {
        // Check if URL is accessible (optional - might be slow)
        try {
          const response = await fetch(url.toString(), { method: 'HEAD', mode: 'no-cors' });
          return { isValid: true, message: 'Accessible verification URL' };
        } catch {
          return { isValid: false, message: 'URL not accessible or invalid domain' };
        }
      }
    }

    // Check if it's structured data (JSON, etc.)
    if (qrData.startsWith('{') || qrData.startsWith('[')) {
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.certificateId || parsed.studentId || parsed.verificationCode) {
          return { isValid: true, message: 'Valid certificate data structure' };
        }
      } catch {
        return { isValid: false, message: 'Invalid JSON structure' };
      }
    }

    // Check for common certificate data patterns
    const certificatePatterns = [
      /certificate.*id|id.*certificate/i,
      /student.*id|verification.*code/i,
      /diploma|degree|graduation/i,
      /serial.*number|cert.*number/i,
    ];

    const hasCertificateData = certificatePatterns.some(pattern => pattern.test(qrData));

    if (hasCertificateData) {
      return { isValid: true, message: 'Contains certificate-related data' };
    }

    // If it's just plain text, might be copied from elsewhere
    if (qrData.length > 10) {
      return { isValid: false, message: 'QR code contains unrecognized data - may be copied' };
    }

    return { isValid: false, message: 'QR code data format not recognized' };

  } catch (error) {
    return { isValid: false, message: `Error validating QR code: ${error.message}` };
  }
}

/**
 * Analyze image for signs of editing/manipulation
 * This is crucial for detecting when someone edits a friend's certificate
 * to change the name to their own
 */
export async function analyzeImageForEdits(file: File): Promise<ImageEditAnalysis> {
  console.log('[EditDetection] Starting image manipulation analysis...');
  
  const result: ImageEditAnalysis = {
    likely_edited: false,
    edit_confidence: 0,
    suspicious_regions: [],
    compression_quality_variance: 0,
    color_inconsistencies: false,
    edge_anomalies: false,
    ocr_confidence_variance: 0,
  };

  if (!file.type.startsWith('image/')) {
    console.log('[EditDetection] Skipping - not an image file');
    return result;
  }

  try {
    // Load image into canvas for pixel analysis
    const imageUrl = URL.createObjectURL(file);
    const img = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);
    
    console.log('[EditDetection] Image loaded:', img.width, 'x', img.height);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return result;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Analyze JPEG compression artifacts
    const compressionResult = analyzeCompressionArtifacts(imageData);
    result.compression_quality_variance = compressionResult.variance;
    console.log('[EditDetection] Compression variance:', compressionResult.variance.toFixed(4));
    
    // Analyze color consistency
    const colorResult = analyzeColorConsistency(imageData, canvas.width, canvas.height);
    result.color_inconsistencies = colorResult.hasInconsistencies;
    result.suspicious_regions.push(...colorResult.suspiciousRegions);
    console.log('[EditDetection] Color inconsistencies:', colorResult.hasInconsistencies, 'Regions:', colorResult.suspiciousRegions.length);
    
    // Analyze edge anomalies (indicates pasted text/elements)
    const edgeResult = analyzeEdgeAnomalies(imageData, canvas.width, canvas.height);
    result.edge_anomalies = edgeResult.hasAnomalies;
    result.suspicious_regions.push(...edgeResult.suspiciousRegions);
    console.log('[EditDetection] Edge anomalies:', edgeResult.hasAnomalies, 'Regions:', edgeResult.suspiciousRegions.length);
    
    // Calculate overall edit confidence (adjusted thresholds to reduce false positives)
    let editScore = 0;
    if (compressionResult.variance > 0.5) editScore += 25; // Increased from 0.3
    else if (compressionResult.variance > 0.25) editScore += 15; // Increased from 0.15
    
    if (colorResult.hasInconsistencies) editScore += 15; // Reduced from 20
    if (edgeResult.hasAnomalies) editScore += 25; // Reduced from 30
    
    // High number of suspicious regions (increased thresholds)
    if (result.suspicious_regions.length > 5) editScore += 15; // Increased from 3
    else if (result.suspicious_regions.length > 2) editScore += 5; // Increased from 0
    
    result.edit_confidence = Math.min(100, editScore);
    result.likely_edited = editScore >= 60; // Increased from 50 - very conservative
    
    console.log('[EditDetection] Final edit score:', editScore);
    console.log('[EditDetection] Likely edited:', result.likely_edited);
    console.log('[EditDetection] Edit confidence:', result.edit_confidence + '%');
    if (result.likely_edited) {
      console.log('[EditDetection] ⚠️ IMAGE APPEARS TO BE EDITED!');
    }
    
  } catch (error) {
    console.error('[EditDetection] Error analyzing image for edits:', error);
  }
  
  return result;
}

/**
 * Analyze PDF for pixel-level manipulation by rendering first page
 */
export async function analyzePdfForEdits(file: File): Promise<ImageEditAnalysis> {
  console.log('[EditDetection-PDF] Starting PDF manipulation analysis...');
  
  const result: ImageEditAnalysis = {
    likely_edited: false,
    edit_confidence: 0,
    suspicious_regions: [],
    compression_quality_variance: 0,
    color_inconsistencies: false,
    edge_anomalies: false,
    ocr_confidence_variance: 0,
  };

  try {
    // Render first page of PDF to canvas
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    if (pdf.numPages === 0) {
      console.log('[EditDetection-PDF] PDF has no pages');
      return result;
    }
    
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better analysis
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[EditDetection-PDF] Could not get canvas context');
      return result;
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    console.log('[EditDetection-PDF] Rendering PDF page:', canvas.width, 'x', canvas.height);
    
    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    }).promise;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Run the same analysis as for images
    const compressionResult = analyzeCompressionArtifacts(imageData);
    result.compression_quality_variance = compressionResult.variance;
    console.log('[EditDetection-PDF] Compression variance:', compressionResult.variance.toFixed(4));
    
    const colorResult = analyzeColorConsistency(imageData, canvas.width, canvas.height);
    result.color_inconsistencies = colorResult.hasInconsistencies;
    result.suspicious_regions.push(...colorResult.suspiciousRegions);
    console.log('[EditDetection-PDF] Color inconsistencies:', colorResult.hasInconsistencies, 'Regions:', colorResult.suspiciousRegions.length);
    
    const edgeResult = analyzeEdgeAnomalies(imageData, canvas.width, canvas.height);
    result.edge_anomalies = edgeResult.hasAnomalies;
    result.suspicious_regions.push(...edgeResult.suspiciousRegions);
    console.log('[EditDetection-PDF] Edge anomalies:', edgeResult.hasAnomalies, 'Regions:', edgeResult.suspiciousRegions.length);
    
    // Calculate overall edit confidence (balanced thresholds for PDFs)
    let editScore = 0;
    if (compressionResult.variance > 0.6) editScore += 25; // Lowered from 0.8
    else if (compressionResult.variance > 0.3) editScore += 15; // Lowered from 0.5
    
    if (colorResult.hasInconsistencies) editScore += 15; // Increased from 10
    if (edgeResult.hasAnomalies) editScore += 20; // Increased from 15
    
    // Reasonable number of suspicious regions for PDFs
    if (result.suspicious_regions.length > 6) editScore += 15; // Lowered from 10
    else if (result.suspicious_regions.length > 3) editScore += 5; // Lowered from 6
    
    result.edit_confidence = Math.min(100, editScore);
    result.likely_edited = editScore >= 45; // Lowered from 70
    
    console.log('[EditDetection-PDF] Final edit score:', editScore);
    console.log('[EditDetection-PDF] Likely edited:', result.likely_edited);
    console.log('[EditDetection-PDF] Edit confidence:', result.edit_confidence + '%');
    if (result.likely_edited) {
      console.log('[EditDetection-PDF] ⚠️ PDF APPEARS TO BE EDITED!');
    }
    
  } catch (error) {
    console.error('[EditDetection-PDF] Error analyzing PDF for edits:', error);
  }
  
  return result;
}

/**
 * Load image as HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Analyze JPEG compression artifacts
 * Edited images often have inconsistent compression quality
 * because the edited region was saved at a different quality level
 */
function analyzeCompressionArtifacts(imageData: ImageData): { variance: number; blocks: number[] } {
  const { data, width, height } = imageData;
  const blockSize = 8; // JPEG uses 8x8 blocks
  const blockQualities: number[] = [];
  
  // Analyze 8x8 blocks across the image
  for (let y = 0; y < height - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      const blockQuality = calculateBlockQuality(data, width, x, y, blockSize);
      blockQualities.push(blockQuality);
    }
  }
  
  if (blockQualities.length === 0) {
    return { variance: 0, blocks: [] };
  }
  
  // Calculate variance in block qualities
  const mean = blockQualities.reduce((a, b) => a + b, 0) / blockQualities.length;
  const variance = blockQualities.reduce((acc, q) => acc + Math.pow(q - mean, 2), 0) / blockQualities.length;
  const normalizedVariance = Math.min(1, variance / 1000); // Normalize to 0-1
  
  return { variance: normalizedVariance, blocks: blockQualities };
}

/**
 * Calculate quality metric for a single 8x8 block
 * based on high-frequency content (sharp edges = higher quality)
 */
function calculateBlockQuality(data: Uint8ClampedArray, width: number, startX: number, startY: number, blockSize: number): number {
  let edgeIntensity = 0;
  
  for (let y = startY; y < startY + blockSize - 1; y++) {
    for (let x = startX; x < startX + blockSize - 1; x++) {
      const idx = (y * width + x) * 4;
      const idxRight = (y * width + x + 1) * 4;
      const idxDown = ((y + 1) * width + x) * 4;
      
      // Calculate horizontal gradient
      const grayH = Math.abs(
        (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) -
        (data[idxRight] * 0.299 + data[idxRight + 1] * 0.587 + data[idxRight + 2] * 0.114)
      );
      
      // Calculate vertical gradient
      const grayV = Math.abs(
        (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) -
        (data[idxDown] * 0.299 + data[idxDown + 1] * 0.587 + data[idxDown + 2] * 0.114)
      );
      
      edgeIntensity += grayH + grayV;
    }
  }
  
  return edgeIntensity;
}

/**
 * Analyze color consistency across the image
 * Edited regions often have slightly different color balance
 */
function analyzeColorConsistency(imageData: ImageData, width: number, height: number): { 
  hasInconsistencies: boolean; 
  suspiciousRegions: string[] 
} {
  const { data } = imageData;
  const regionSize = Math.min(50, Math.floor(width / 10));
  const regions: Array<{ x: number; y: number; colorBalance: { r: number; g: number; b: number } }> = [];
  const suspiciousRegions: string[] = [];
  
  // Sample regions across the image
  for (let y = 0; y < height - regionSize; y += regionSize) {
    for (let x = 0; x < width - regionSize; x += regionSize) {
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let dy = 0; dy < regionSize; dy++) {
        for (let dx = 0; dx < regionSize; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          // Only analyze mid-tone regions (not pure white or black)
          if (brightness > 50 && brightness < 200) {
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
      }
      
      if (count > regionSize * regionSize * 0.3) {
        const total = r + g + b;
        regions.push({
          x, y,
          colorBalance: { r: r / total, g: g / total, b: b / total }
        });
      }
    }
  }
  
  if (regions.length < 4) {
    return { hasInconsistencies: false, suspiciousRegions: [] };
  }
  
  // Calculate mean color balance
  const meanBalance = {
    r: regions.reduce((acc, reg) => acc + reg.colorBalance.r, 0) / regions.length,
    g: regions.reduce((acc, reg) => acc + reg.colorBalance.g, 0) / regions.length,
    b: regions.reduce((acc, reg) => acc + reg.colorBalance.b, 0) / regions.length,
  };
  
  // Find regions with significantly different color balance
  const threshold = 0.03; // 3% deviation
  let hasInconsistencies = false;
  
  for (const region of regions) {
    const deviation = Math.sqrt(
      Math.pow(region.colorBalance.r - meanBalance.r, 2) +
      Math.pow(region.colorBalance.g - meanBalance.g, 2) +
      Math.pow(region.colorBalance.b - meanBalance.b, 2)
    );
    
    if (deviation > threshold) {
      hasInconsistencies = true;
      suspiciousRegions.push(`Region at (${region.x}, ${region.y}) has unusual color balance`);
    }
  }
  
  return { hasInconsistencies, suspiciousRegions };
}

/**
 * Analyze edge anomalies that might indicate pasted elements
 * When text is pasted/edited, there are often sharp unnatural edges
 */
function analyzeEdgeAnomalies(imageData: ImageData, width: number, height: number): {
  hasAnomalies: boolean;
  suspiciousRegions: string[];
} {
  const { data } = imageData;
  const suspiciousRegions: string[] = [];
  let anomalyCount = 0;
  
  // Use Sobel edge detection and look for rectangular patterns
  const edgeStrengths: number[][] = [];
  
  for (let y = 1; y < height - 1; y++) {
    edgeStrengths[y] = [];
    for (let x = 1; x < width - 1; x++) {
      // Simple gradient calculation
      const idx = (y * width + x) * 4;
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      
      const idxLeft = (y * width + x - 1) * 4;
      const idxRight = (y * width + x + 1) * 4;
      const idxUp = ((y - 1) * width + x) * 4;
      const idxDown = ((y + 1) * width + x) * 4;
      
      const grayLeft = data[idxLeft] * 0.299 + data[idxLeft + 1] * 0.587 + data[idxLeft + 2] * 0.114;
      const grayRight = data[idxRight] * 0.299 + data[idxRight + 1] * 0.587 + data[idxRight + 2] * 0.114;
      const grayUp = data[idxUp] * 0.299 + data[idxUp + 1] * 0.587 + data[idxUp + 2] * 0.114;
      const grayDown = data[idxDown] * 0.299 + data[idxDown + 1] * 0.587 + data[idxDown + 2] * 0.114;
      
      const gx = grayRight - grayLeft;
      const gy = grayDown - grayUp;
      const edgeStrength = Math.sqrt(gx * gx + gy * gy);
      
      edgeStrengths[y][x] = edgeStrength;
    }
  }
  
  // Look for suspicious rectangular edge patterns
  // (edited regions often have rectangular boundaries)
  const blockSize = 20;
  for (let y = blockSize; y < height - blockSize; y += blockSize) {
    for (let x = blockSize; x < width - blockSize; x += blockSize) {
      let horizontalEdgeSum = 0;
      let verticalEdgeSum = 0;
      
      // Check horizontal edges at top and bottom of block
      for (let dx = 0; dx < blockSize; dx++) {
        if (edgeStrengths[y] && edgeStrengths[y][x + dx]) {
          horizontalEdgeSum += edgeStrengths[y][x + dx];
        }
        if (edgeStrengths[y + blockSize - 1] && edgeStrengths[y + blockSize - 1][x + dx]) {
          horizontalEdgeSum += edgeStrengths[y + blockSize - 1][x + dx];
        }
      }
      
      // Check vertical edges at left and right of block
      for (let dy = 0; dy < blockSize; dy++) {
        if (edgeStrengths[y + dy] && edgeStrengths[y + dy][x]) {
          verticalEdgeSum += edgeStrengths[y + dy][x];
        }
        if (edgeStrengths[y + dy] && edgeStrengths[y + dy][x + blockSize - 1]) {
          verticalEdgeSum += edgeStrengths[y + dy][x + blockSize - 1];
        }
      }
      
      // Calculate average edge strength for the block boundary
      const avgBoundaryEdge = (horizontalEdgeSum + verticalEdgeSum) / (blockSize * 4);
      
      // Compare with interior edges
      let interiorEdgeSum = 0;
      let interiorCount = 0;
      for (let dy = 2; dy < blockSize - 2; dy++) {
        for (let dx = 2; dx < blockSize - 2; dx++) {
          if (edgeStrengths[y + dy] && edgeStrengths[y + dy][x + dx]) {
            interiorEdgeSum += edgeStrengths[y + dy][x + dx];
            interiorCount++;
          }
        }
      }
      const avgInteriorEdge = interiorCount > 0 ? interiorEdgeSum / interiorCount : 0;
      
      // If boundary edges are much stronger than interior, might be a pasted region
      if (avgBoundaryEdge > avgInteriorEdge * 2.5 && avgBoundaryEdge > 30) {
        anomalyCount++;
        if (suspiciousRegions.length < 5) {
          suspiciousRegions.push(`Rectangular edge pattern at (${x}, ${y}) may indicate pasted content`);
        }
      }
    }
  }
  
  return {
    hasAnomalies: anomalyCount > 2,
    suspiciousRegions,
  };
}

/**
 * Analyze OCR confidence variance per word
 * Edited text often has different quality than original text
 */
export function analyzeOcrConfidenceVariance(
  words: Array<{ text: string; confidence: number; bbox: any }>
): { variance: number; suspiciousWords: string[] } {
  if (words.length < 5) {
    return { variance: 0, suspiciousWords: [] };
  }
  
  // Filter valid words (at least 3 characters)
  const validWords = words.filter(w => w.text.length >= 3);
  
  if (validWords.length < 3) {
    return { variance: 0, suspiciousWords: [] };
  }
  
  // Calculate mean confidence
  const mean = validWords.reduce((acc, w) => acc + w.confidence, 0) / validWords.length;
  
  // Calculate variance
  const variance = validWords.reduce((acc, w) => acc + Math.pow(w.confidence - mean, 2), 0) / validWords.length;
  
  // Find words with significantly lower confidence
  const suspiciousWords: string[] = [];
  const stdDev = Math.sqrt(variance);
  
  for (const word of validWords) {
    // Words with confidence more than 1.5 standard deviations below mean
    if (word.confidence < mean - stdDev * 1.5 && word.confidence < 70) {
      suspiciousWords.push(word.text);
    }
  }
  
  return { variance: variance / 500, suspiciousWords }; // Normalize variance
}

// ========================================
// NAME EXTRACTION & MATCHING
// ========================================

// Common words to exclude from name extraction
const COMMON_WORDS = [
  'certificate', 'completion', 'participation', 'achievement', 'excellence',
  'the', 'this', 'that', 'with', 'for', 'and', 'has', 'been', 'from',
  'course', 'program', 'training', 'workshop', 'seminar', 'conference',
  'successfully', 'completed', 'awarded', 'presented', 'certified',
  'hereby', 'certify', 'given', 'recognition', 'appreciation',
  'date', 'place', 'organization', 'institution', 'university', 'college',
  'dear', 'sir', 'madam', 'regards', 'thank', 'you', 'sincerely'
];

const COMMON_PHRASES = [
  'Dear Sir', 'Best Regards', 'Thank You', 'Your Name', 'Date Of', 
  'Place Of', 'This Is To', 'Has Been', 'On The', 'In The'
];

/**
 * Normalize a name for comparison (handle ALL CAPS, extra spaces, etc.)
 */
function normalizeName(name: string): string {
  // Remove extra whitespace
  let normalized = name.replace(/\s+/g, ' ').trim();
  
  // Convert to title case if ALL CAPS
  if (normalized === normalized.toUpperCase() && normalized.length > 3) {
    normalized = normalized.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  
  // Remove common titles
  normalized = normalized.replace(/^(mr\.?|ms\.?|mrs\.?|dr\.?|shri|smt\.?|kumari|miss)\s+/i, '');
  
  return normalized;
}

/**
 * Check if text looks like a valid name
 */
function isValidName(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Must have at least 2 characters
  if (text.length < 3) return false;
  
  // Must have at least some alphabetic characters
  if (!/[a-zA-Z]{2,}/.test(text)) return false;
  
  // Should not be mostly numbers
  if (/\d{3,}/.test(text)) return false;
  
  // Check if any word is a common non-name word
  const hasCommonWord = words.some(w => COMMON_WORDS.includes(w));
  if (hasCommonWord && words.length <= 2) return false;
  
  // Check for common phrases
  if (COMMON_PHRASES.some(p => text.toLowerCase().includes(p.toLowerCase()))) return false;
  
  // Name should typically be 2-40 characters
  if (text.length > 50) return false;
  
  return true;
}

/**
 * Extract potential names from certificate text
 * Handles ALL CAPS, mixed case, and various certificate formats
 */
export function extractNamesFromText(text: string): string[] {
  const names: Set<string> = new Set();
  
  // Try each pattern
  for (const pattern of NAME_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const rawName = match[1].trim();
        const normalized = normalizeName(rawName);
        if (isValidName(normalized) && normalized.length >= 3) {
          names.add(normalized);
        }
      }
    }
  }
  
  // Look for ALL CAPS word sequences (common in certificates)
  const allCapsPattern = /\b([A-Z][A-Z\s]{3,40})\b/g;
  const allCapsMatches = text.matchAll(allCapsPattern);
  for (const match of allCapsMatches) {
    const potential = normalizeName(match[1].trim());
    if (isValidName(potential) && potential.split(' ').length >= 2 && potential.split(' ').length <= 4) {
      names.add(potential);
    }
  }
  
  // Also look for Title Case word sequences (potential names)
  const titleCasePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
  const titleCaseMatches = text.matchAll(titleCasePattern);
  for (const match of titleCaseMatches) {
    const potential = match[1].trim();
    if (isValidName(potential) && potential.split(' ').length >= 2) {
      names.add(potential);
    }
  }
  
  return Array.from(names);
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate string similarity as a percentage (0-100)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Check if all parts of one name exist in another (handles reordering)
 */
function checkNamePartsMatch(name1Parts: string[], name2Parts: string[]): { matched: boolean; matchedParts: number } {
  let matchedParts = 0;
  
  for (const part1 of name1Parts) {
    // Skip very short parts (initials like "A" or "K")
    if (part1.length <= 1) continue;
    
    for (const part2 of name2Parts) {
      if (part2.length <= 1) continue;
      
      // Check for exact match or high similarity (allows for typos)
      const similarity = stringSimilarity(part1, part2);
      if (similarity >= 85) {
        matchedParts++;
        break;
      }
      
      // Also check if one is abbreviation of another (e.g., "Ram" matches "Ramesh")
      if (part1.startsWith(part2) || part2.startsWith(part1)) {
        if (Math.min(part1.length, part2.length) >= 3) {
          matchedParts++;
          break;
        }
      }
    }
  }
  
  // Consider matched if at least 2 parts match (typically first and last name)
  const minPartsToMatch = Math.min(2, Math.max(name1Parts.length, name2Parts.length));
  return {
    matched: matchedParts >= minPartsToMatch,
    matchedParts
  };
}

/**
 * Prepare name for comparison - handles ALL CAPS, extra spaces, titles
 */
function prepareNameForComparison(name: string): string {
  let prepared = name.trim();
  
  // Remove common titles
  prepared = prepared.replace(/^(mr\.?|ms\.?|mrs\.?|dr\.?|shri|smt\.?|kumari|miss|sri|srimati)\s+/i, '');
  
  // Normalize whitespace
  prepared = prepared.replace(/\s+/g, ' ');
  
  // Convert to lowercase for comparison
  return prepared.toLowerCase();
}

/**
 * Generate all possible name variations for matching
 */
function generateNameVariations(name: string): string[] {
  const parts = name.toLowerCase().split(/\s+/).filter(p => p.length > 0);
  const variations: Set<string> = new Set();
  
  // Original order
  variations.add(parts.join(' '));
  
  // Without spaces (OCR often merges words)
  variations.add(parts.join(''));
  
  // Individual parts (for partial matching)
  parts.forEach(p => variations.add(p));
  
  // First + Last (skip middle names)
  if (parts.length > 2) {
    variations.add(`${parts[0]} ${parts[parts.length - 1]}`);
    variations.add(`${parts[0]}${parts[parts.length - 1]}`);
  }
  
  // All permutations of 2-3 parts (handles "Last, First" formats)
  if (parts.length >= 2) {
    variations.add(`${parts[parts.length - 1]} ${parts[0]}`);
    variations.add(`${parts[parts.length - 1]}${parts[0]}`);
    if (parts.length === 3) {
      variations.add(`${parts[0]} ${parts[2]}`);
      variations.add(`${parts[2]} ${parts[0]} ${parts[1]}`);
    }
  }
  
  return Array.from(variations);
}

/**
 * Check if a name part appears in text with fuzzy matching
 * Handles OCR errors like character substitutions
 */
function fuzzyFindInText(needle: string, haystack: string): boolean {
  if (needle.length < 3) return false;
  
  // Direct match
  if (haystack.includes(needle)) return true;
  
  // Try with common OCR substitutions
  const ocrSubstitutions: [string, string][] = [
    ['0', 'o'], ['o', '0'],
    ['1', 'l'], ['l', '1'], ['1', 'i'], ['i', '1'],
    ['5', 's'], ['s', '5'],
    ['8', 'b'], ['b', '8'],
    ['rn', 'm'], ['m', 'rn'],
    ['vv', 'w'], ['w', 'vv'],
    ['cl', 'd'], ['d', 'cl'],
    ['ii', 'u'], ['u', 'ii'],
  ];
  
  for (const [from, to] of ocrSubstitutions) {
    const variant = needle.replace(new RegExp(from, 'g'), to);
    if (variant !== needle && haystack.includes(variant)) return true;
  }
  
  // Try without vowels (handles many OCR errors)
  const needleNoVowels = needle.replace(/[aeiou]/g, '');
  if (needleNoVowels.length >= 3) {
    // Find all sequences in haystack without vowels
    const words = haystack.split(/\s+/);
    for (const word of words) {
      const wordNoVowels = word.replace(/[aeiou]/g, '');
      if (wordNoVowels.length >= 3 && wordNoVowels.includes(needleNoVowels)) {
        return true;
      }
    }
  }
  
  // Sliding window fuzzy match - find best match in haystack
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    const window = haystack.substring(i, i + needle.length);
    let matches = 0;
    for (let j = 0; j < needle.length; j++) {
      if (needle[j] === window[j]) matches++;
    }
    // 80% character match = good enough
    if (matches >= needle.length * 0.8) {
      return true;
    }
  }
  
  return false;
}

/**
 * Match extracted names against expected student name
 * Handles various formats: First Last, Last First, with/without middle names
 * Also performs direct text search as fallback
 * Returns 100% confidence for genuine exact matches
 */
export function matchNameWithStudent(
  extractedNames: string[],
  studentName: string,
  fullText?: string
): NameMatchResult {
  if (!studentName) {
    return {
      matched: true, // Don't flag as mismatch if no student name to compare
      confidence: 100,
      extracted_name: extractedNames[0] || '',
      expected_name: '',
      match_type: 'exact',
      discrepancies: [],
    };
  }
  
  // Prepare student name for matching
  const preparedStudentName = prepareNameForComparison(studentName);
  const normalizedStudentName = normalizeName(studentName).toLowerCase();
  const studentNameParts = preparedStudentName.split(/\s+/).filter(p => p.length > 1);
  const studentNameVariations = generateNameVariations(preparedStudentName);
  
  // Log for debugging
  console.log('[Name Matching] Student name:', studentName);
  console.log('[Name Matching] Name parts:', studentNameParts);
  console.log('[Name Matching] Extracted text length:', fullText?.length || 0);
  console.log('[Name Matching] Extracted names:', extractedNames);
  
  // ============================================
  // STAGE 1: DIRECT TEXT SEARCH (Most Reliable)
  // ============================================
  if (fullText && fullText.length > 10) {
    const textLower = fullText.toLowerCase();
    // Normalize OCR artifacts: multiple spaces, newlines, special chars
    const textNormalized = textLower
      .replace(/[\s\n\r]+/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('[Name Matching] Normalized text preview:', textNormalized.substring(0, 200));
    
    // Check if any variation of student name appears in text
    for (const variation of studentNameVariations) {
      if (variation.length < 3) continue;
      
      // Direct inclusion check (handles merged/split words)
      if (textNormalized.includes(variation)) {
        console.log('[Name Matching] Found exact variation:', variation);
        return {
          matched: true,
          confidence: 100,
          extracted_name: studentName,
          expected_name: studentName,
          match_type: 'exact',
          discrepancies: [],
        };
      }
    }
    
    // Check if ALL student name parts appear individually in text (with fuzzy)
    let partsFoundCount = 0;
    const foundParts: string[] = [];
    for (const part of studentNameParts) {
      // Direct check first
      if (textNormalized.includes(part)) {
        partsFoundCount++;
        foundParts.push(part);
        console.log('[Name Matching] Found part directly:', part);
      }
      // Fuzzy check as fallback
      else if (fuzzyFindInText(part, textNormalized)) {
        partsFoundCount++;
        foundParts.push(part);
        console.log('[Name Matching] Found part via fuzzy:', part);
      }
    }
    
    console.log('[Name Matching] Parts found:', partsFoundCount, '/', studentNameParts.length);
    
    // If ALL name parts found - 100% match
    if (partsFoundCount === studentNameParts.length) {
      return {
        matched: true,
        confidence: 100,
        extracted_name: studentName,
        expected_name: studentName,
        match_type: 'exact',
        discrepancies: [],
      };
    }
    
    // If at least first AND last name found (or 2+ parts) - verified
    if (partsFoundCount >= 2 || (partsFoundCount >= 1 && studentNameParts.length === 2)) {
      return {
        matched: true,
        confidence: partsFoundCount === studentNameParts.length - 1 ? 95 : 90,
        extracted_name: studentName,
        expected_name: studentName,
        match_type: 'exact',
        discrepancies: [],
      };
    }
    
    // Even 1 part found with decent length is a good sign
    if (partsFoundCount >= 1 && foundParts.some(p => p.length >= 4)) {
      return {
        matched: true,
        confidence: 85,
        extracted_name: foundParts.join(' '),
        expected_name: studentName,
        match_type: 'partial',
        discrepancies: [`Found ${partsFoundCount}/${studentNameParts.length} name parts`],
      };
    }
  }
  
  // ============================================
  // STAGE 2: EXTRACTED NAMES COMPARISON
  // ============================================
  if (extractedNames.length === 0) {
    // If we have text but couldn't extract names, be lenient
    // The certificate has text, OCR worked, just name extraction patterns failed
    if (fullText && fullText.length > 30) {
      console.log('[Name Matching] No names extracted but text exists - being lenient');
      
      // Final attempt: check if ANY part of name appears
      const textLower = fullText.toLowerCase().replace(/\s+/g, ' ');
      for (const part of studentNameParts) {
        if (part.length >= 3 && textLower.includes(part)) {
          console.log('[Name Matching] Found part in final check:', part);
          return {
            matched: true,
            confidence: 85,
            extracted_name: part,
            expected_name: studentName,
            match_type: 'partial',
            discrepancies: [],
          };
        }
      }
      
      // Even if no match found - if we have substantial text, don't penalize heavily
      // OCR quality/formatting issues shouldn't flag as fraud
      return {
        matched: true,
        confidence: 80, // Changed from 60 - be generous when we have text
        extracted_name: '',
        expected_name: studentName,
        match_type: 'partial',
        discrepancies: ['Certificate text present but name pattern not recognized'],
      };
    }
    
    // No text at all - OCR completely failed
    return {
      matched: true,
      confidence: 70, // Changed from 50 - don't penalize OCR failures
      extracted_name: '',
      expected_name: studentName,
      match_type: 'fuzzy',
      discrepancies: ['Could not extract text from certificate image'],
    };
  }
  
  let bestMatch = {
    name: '',
    similarity: 0,
    type: 'no_match' as 'exact' | 'partial' | 'fuzzy' | 'no_match',
    matchedParts: 0,
  };
  
  for (const extractedName of extractedNames) {
    const normalizedExtracted = normalizeName(extractedName).toLowerCase();
    const extractedParts = normalizedExtracted.split(/\s+/).filter(p => p.length > 1);
    
    // Check for exact match (case insensitive)
    if (normalizedExtracted === normalizedStudentName) {
      bestMatch = { name: extractedName, similarity: 100, type: 'exact', matchedParts: studentNameParts.length };
      break;
    }
    
    // Calculate overall string similarity
    const similarity = stringSimilarity(normalizedExtracted, normalizedStudentName);
    
    // Check name parts matching (handles reordering and missing middle names)
    const partsMatch = checkNamePartsMatch(studentNameParts, extractedParts);
    
    // If most name parts match, consider it a good match even if overall similarity is lower
    if (partsMatch.matched && partsMatch.matchedParts >= 2) {
      const adjustedSimilarity = Math.max(similarity, 70 + (partsMatch.matchedParts * 10));
      if (adjustedSimilarity > bestMatch.similarity) {
        bestMatch = { 
          name: extractedName, 
          similarity: Math.min(100, adjustedSimilarity), 
          type: adjustedSimilarity >= 90 ? 'exact' : 'partial',
          matchedParts: partsMatch.matchedParts
        };
      }
    }
    // Check if student name parts are found in extracted name
    else if (partsMatch.matchedParts >= 1) {
      const adjustedSimilarity = Math.max(similarity, 50 + (partsMatch.matchedParts * 15));
      if (adjustedSimilarity > bestMatch.similarity) {
        bestMatch = { 
          name: extractedName, 
          similarity: adjustedSimilarity, 
          type: 'partial',
          matchedParts: partsMatch.matchedParts
        };
      }
    }
    // High overall similarity
    else if (similarity >= 80 && similarity > bestMatch.similarity) {
      bestMatch = { name: extractedName, similarity, type: 'partial', matchedParts: partsMatch.matchedParts };
    }
    // Lower but still reasonable similarity
    else if (similarity >= 60 && similarity > bestMatch.similarity) {
      bestMatch = { name: extractedName, similarity, type: 'fuzzy', matchedParts: partsMatch.matchedParts };
    }
    // Track best match even if low
    else if (similarity > bestMatch.similarity) {
      bestMatch = { name: extractedName, similarity, type: 'no_match', matchedParts: partsMatch.matchedParts };
    }
  }
  
  const discrepancies: string[] = [];
  
  // Determine match type with improved thresholds
  let finalMatchType = bestMatch.type;
  let finalConfidence = bestMatch.similarity;
  
  if (bestMatch.similarity >= 95 || (bestMatch.matchedParts >= 2 && bestMatch.similarity >= 85)) {
    finalMatchType = 'exact';
    finalConfidence = 100; // Boost to 100% for confident matches
  } else if (bestMatch.similarity >= 85 || (bestMatch.matchedParts >= 2 && bestMatch.similarity >= 70)) {
    finalMatchType = 'exact';
    finalConfidence = Math.max(finalConfidence, 95);
  } else if (bestMatch.similarity >= 70 || bestMatch.matchedParts >= 2) {
    finalMatchType = 'partial';
    finalConfidence = Math.max(finalConfidence, 85);
  } else if (bestMatch.similarity >= 50 || bestMatch.matchedParts >= 1) {
    finalMatchType = 'fuzzy';
  }
  
  if (finalMatchType === 'no_match') {
    discrepancies.push(`Name mismatch detected. Expected: "${studentName}"`);
    discrepancies.push(`Certificate shows: "${bestMatch.name}" (${bestMatch.similarity}% match)`);
  } else if (finalMatchType === 'fuzzy') {
    discrepancies.push(`Approximate name match (${bestMatch.similarity}%)`);
  }
  
  return {
    matched: finalMatchType !== 'no_match',
    confidence: finalConfidence,
    extracted_name: bestMatch.name,
    expected_name: studentName,
    match_type: finalMatchType,
    discrepancies,
  };
}

// ========================================
// TEXT ANOMALY DETECTION
// ========================================

/**
 * Detect text anomalies that might indicate editing
 */
export function detectTextAnomalies(
  text: string,
  words?: Array<{ text: string; confidence: number; bbox: any }>
): TextAnomaly[] {
  const anomalies: TextAnomaly[] = [];
  
  // Check for excessive spacing
  const spacingMatches = text.match(/\s{3,}/g);
  if (spacingMatches && spacingMatches.length > 0) {
    anomalies.push({
      type: 'spacing',
      description: `Unusual spacing detected (${spacingMatches.length} instances) - may indicate text insertion`,
      severity: 'medium',
    });
  }
  
  // Check for character repetition (possible fill/covering)
  const repeatedChars = text.match(/(.)\1{4,}/g);
  if (repeatedChars) {
    anomalies.push({
      type: 'character',
      description: `Repeated characters detected - possible text covering or fill`,
      severity: 'medium',
    });
  }
  
  // Check for inconsistent casing that might indicate editing
  const mixedCaseWords = text.match(/\b[A-Z][a-z]+[A-Z]+[a-z]*\b/g);
  if (mixedCaseWords && mixedCaseWords.length > 2) {
    anomalies.push({
      type: 'case',
      description: `Inconsistent capitalization detected in ${mixedCaseWords.length} words`,
      severity: 'low',
    });
  }
  
  // Check OCR confidence for words if available
  if (words && words.length > 0) {
    const lowConfidenceWords = words.filter(w => w.confidence < 60);
    const avgConfidence = words.reduce((acc, w) => acc + w.confidence, 0) / words.length;
    
    // If specific words have much lower confidence than average, might indicate editing
    const suspiciousWords = words.filter(w => 
      w.confidence < avgConfidence - 30 && w.text.length > 2
    );
    
    if (suspiciousWords.length > 0) {
      anomalies.push({
        type: 'editing_artifact',
        description: `${suspiciousWords.length} word(s) have significantly lower OCR confidence - possible editing artifacts`,
        severity: 'high',
        location: suspiciousWords.map(w => w.text).join(', '),
      });
    }
    
    // Check for inconsistent font rendering (different confidence clusters)
    if (lowConfidenceWords.length > words.length * 0.3) {
      anomalies.push({
        type: 'font',
        description: 'Significant portion of text has low recognition confidence - possible font inconsistency',
        severity: 'medium',
      });
    }
  }
  
  // Check for special Unicode characters that might be used to substitute letters
  const unicodeSubstitutes = text.match(/[^\x00-\x7F]/g);
  if (unicodeSubstitutes && unicodeSubstitutes.length > 5) {
    anomalies.push({
      type: 'character',
      description: `Non-standard characters detected (${unicodeSubstitutes.length}) - possible character substitution`,
      severity: 'high',
    });
  }
  
  return anomalies;
}

// ========================================
// MAIN TEXT ANALYSIS FUNCTION
// ========================================

/**
 * Perform comprehensive text analysis on a certificate
 * @param file - The certificate file
 * @param studentName - The expected student name to verify against
 * @returns Promise<TextAnalysisResult>
 */
export async function analyzeCertificateText(
  file: File,
  studentName?: string
): Promise<TextAnalysisResult> {
  console.log('%c[TEXT] ========== STARTING TEXT ANALYSIS ==========', 'background: orange; color: black; font-size: 18px;');
  console.log('[TEXT] File:', file.name, '| Type:', file.type, '| Size:', file.size);
  console.log('[TEXT] Student name to match:', studentName);
  
  let extractedText = '';
  let confidence = 0;
  let words: Array<{ text: string; confidence: number; bbox: any }> = [];
  let extractionMethod: 'pdf_native' | 'ocr' | 'hybrid' = 'ocr';
  
  console.log('[TEXT] File type check:');
  console.log('[TEXT] - file.type:', JSON.stringify(file.type));
  console.log('[TEXT] - Is PDF?:', file.type === 'application/pdf');
  console.log('[TEXT] - Starts with image/?:', file.type.startsWith('image/'));
  console.log('[TEXT] - file.name:', file.name);
  
  try {
    if (file.type === 'application/pdf') {
      console.log('[TEXT] -> Detected as PDF, extracting text...');
      // First try PDF native text extraction
      const pdfResult = await extractTextFromPdf(file);
      console.log('[TextAnalysis] PDF text extracted, length:', pdfResult.text.length);
      
      if (pdfResult.hasSelectionText && pdfResult.text.length > 50) {
        extractedText = pdfResult.text;
        confidence = 95; // High confidence for native text
        extractionMethod = 'pdf_native';
        console.log('[TEXT] PDF has native text, using it directly');
      } else {
        // PDF is likely scanned, needs OCR
        console.log('[TEXT] PDF has no selectable text, running OCR on pages...');
        const ocrResult = await extractTextFromScannedPdf(file);
        extractedText = ocrResult.text;
        confidence = ocrResult.confidence;
        extractionMethod = 'ocr';
        console.log('[TEXT] OCR on scanned PDF completed, text length:', extractedText.length);
      }
    } else if (file.type.startsWith('image/')) {
      console.log('[TEXT] -> Detected as IMAGE, running OCR...');
      // Use OCR for images
      const ocrResult = await extractTextFromImage(file);
      extractedText = ocrResult.text;
      confidence = ocrResult.confidence;
      words = ocrResult.words;
      extractionMethod = 'ocr';
      console.log('[TextAnalysis] OCR completed. Text length:', extractedText.length, 'Confidence:', confidence);
    } else {
      console.log('[TEXT] -> UNKNOWN FILE TYPE - not PDF or image!');
      console.log('[TEXT] -> Will skip text extraction');
    }
  } catch (error) {
    console.error('[TextAnalysis] Text extraction error:', error);
  }
  
  console.log('[TextAnalysis] Extraction method:', extractionMethod);
  console.log('[TextAnalysis] Final extracted text length:', extractedText.length);
  console.log('[TextAnalysis] ===== EXTRACTED TEXT START =====');
  console.log(extractedText.substring(0, 1000));
  console.log('[TextAnalysis] ===== EXTRACTED TEXT END =====');
  
  // Extract names from the text
  const namesFound = extractNamesFromText(extractedText);
  console.log('[TextAnalysis] Names found by extraction:', namesFound);
  
  // Match names with student if provided
  // Now with direct text search as fallback, we always try matching
  let nameMatchScore = 0;
  let nameVerificationStatus: 'verified' | 'suspicious' | 'mismatch' | 'not_found' = 'not_found';
  
  if (studentName) {
    console.log('[TextAnalysis] Calling matchNameWithStudent...');
    console.log('[TextAnalysis] - studentName:', studentName);
    console.log('[TextAnalysis] - namesFound:', namesFound);
    console.log('[TextAnalysis] - extractedText length:', extractedText.length);
    
    // Pass full text for direct search fallback
    const matchResult = matchNameWithStudent(namesFound, studentName, extractedText);
    nameMatchScore = matchResult.confidence;
    
    console.log('[TextAnalysis] Match result:', matchResult.match_type, matchResult.confidence + '%');
    console.log('[TextAnalysis] Match discrepancies:', matchResult.discrepancies);
    
    // Determine verification status based on confidence and match type
    if (matchResult.match_type === 'exact' || matchResult.confidence >= 95) {
      nameVerificationStatus = 'verified'; // 100% or 95%+ = VERIFIED
    } else if (matchResult.match_type === 'partial' || matchResult.confidence >= 80) {
      nameVerificationStatus = 'verified'; // 80%+ partial match = still verified
    } else if (matchResult.match_type === 'fuzzy' || matchResult.confidence >= 60) {
      nameVerificationStatus = 'suspicious'; // 60-79% = suspicious but not fraud
    } else if (matchResult.matched) {
      nameVerificationStatus = 'suspicious'; // Any match = don't flag as mismatch
    } else {
      nameVerificationStatus = 'mismatch'; // Clear mismatch - possible fraud
    }
  } else if (extractedText.length < 20) {
    // No text extracted at all - can't verify
    nameVerificationStatus = 'not_found';
  }
  
  // Detect text anomalies
  const textAnomalies = detectTextAnomalies(extractedText, words);
  
  // Analyze image for pixel-level manipulation (temporarily disabled for PDFs)
  let imageEditAnalysis: ImageEditAnalysis | undefined;
  if (file.type.startsWith('image/')) {
    console.log('[TEXT] Running image edit analysis on image file...');
    imageEditAnalysis = await analyzeImageForEdits(file);
  } else if (file.type === 'application/pdf') {
    console.log('[TEXT] Skipping PDF image edit analysis (causing false positives)');
    // Temporarily disabled - PDFs often have natural artifacts that trigger false positives
    // imageEditAnalysis = await analyzePdfForEdits(file);
  }

  // Detect and analyze QR codes
  console.log('[TEXT] Running QR code analysis...');
  const qrCodeAnalysis = await detectAndAnalyzeQRCodes(file);
  console.log('[TEXT] QR code analysis completed:', qrCodeAnalysis.verification_status);

  // Add OCR confidence variance to the analysis
  if (words.length > 0) {
    const ocrVarianceResult = analyzeOcrConfidenceVariance(words);
    imageEditAnalysis.ocr_confidence_variance = ocrVarianceResult.variance;

    // Add suspicious words as potential edit indicators
    if (ocrVarianceResult.suspiciousWords.length > 0) {
      textAnomalies.push({
        type: 'pixel_anomaly',
        description: `Words with inconsistent OCR quality: ${ocrVarianceResult.suspiciousWords.slice(0, 5).join(', ')}`,
        severity: 'high',
        location: ocrVarianceResult.suspiciousWords.join(', '),
      });
    }
  }

  // Add pixel-level anomalies to text anomalies
  if (imageEditAnalysis.likely_edited) {
    textAnomalies.push({
      type: 'pixel_anomaly',
      description: `Image appears edited (${imageEditAnalysis.edit_confidence}% confidence) - possible certificate manipulation`,
      severity: 'high',
    });
  }

  if (imageEditAnalysis.compression_quality_variance > 0.2) {
    textAnomalies.push({
      type: 'compression_artifact',
      description: 'Inconsistent compression quality detected - parts of image may have been edited and re-saved',
      severity: imageEditAnalysis.compression_quality_variance > 0.35 ? 'high' : 'medium',
    });
  }

  if (imageEditAnalysis.edge_anomalies) {
    textAnomalies.push({
      type: 'pixel_anomaly',
      description: 'Rectangular edge patterns detected - may indicate pasted or edited content',
      severity: 'high',
    });
  }

  if (imageEditAnalysis.color_inconsistencies) {
    textAnomalies.push({
      type: 'pixel_anomaly',
      description: 'Color inconsistencies detected across image regions',
      severity: 'medium',
    });
  }

  // Check for font inconsistencies based on anomalies
  const fontInconsistencies = textAnomalies.some(a =>
    a.type === 'font' ||
    (a.type === 'editing_artifact' && a.severity === 'high')
  );

  return {
    extracted_text: extractedText.substring(0, 2000), // Limit stored text
    confidence,
    names_found: namesFound,
    name_match_score: nameMatchScore,
    name_verification_status: nameVerificationStatus,
    text_anomalies: textAnomalies,
    font_inconsistencies: fontInconsistencies,
    text_extraction_method: extractionMethod,
    image_edit_analysis: imageEditAnalysis,
    qr_code_analysis: qrCodeAnalysis,
  };
}

/**
 * Calculate additional fraud score based on text analysis
 */
export function calculateTextFraudScore(textAnalysis: TextAnalysisResult, fileType?: string): number {
  let score = 0;
  const isPdf = fileType === 'application/pdf';
  
  console.log('[FraudScore] Calculating text fraud score for', fileType);
  
  // QR Code verification
  if (textAnalysis.qr_code_analysis) {
    const qrAnalysis = textAnalysis.qr_code_analysis;

    switch (qrAnalysis.verification_status) {
      case 'verified':
        score -= 10; // Strong verification bonus
        console.log('[FraudScore] QR code verified: -10');
        break;
      case 'invalid':
        score += 25; // Major red flag - QR code present but invalid
        console.log('[FraudScore] QR code invalid: +25');
        break;
      case 'suspicious':
        score += 15; // QR code present but suspicious
        console.log('[FraudScore] QR code suspicious: +15');
        break;
      case 'not_found':
        // No penalty for missing QR code - many legitimate certificates don't have them
        console.log('[FraudScore] No QR code found: +0');
        break;
    }

    // Extra penalty if QR codes found but all invalid
    if (qrAnalysis.qr_codes_found > 0 && qrAnalysis.qr_codes.every(qr => !qr.is_valid)) {
      score += 10;
      console.log('[FraudScore] All QR codes invalid: +10');
    }
  }
  
  // Text anomalies
  for (const anomaly of textAnalysis.text_anomalies) {
    switch (anomaly.severity) {
      case 'high':
        score += 8; // Reduced from 15
        console.log(`[FraudScore] Text anomaly (${anomaly.type}): +8`);
        break;
      case 'medium':
        score += 4; // Reduced from 8
        console.log(`[FraudScore] Text anomaly (${anomaly.type}): +4`);
        break;
      case 'low':
        score += 2; // Reduced from 3
        console.log(`[FraudScore] Text anomaly (${anomaly.type}): +2`);
        break;
    }
  }
  
  // Font inconsistencies
  if (textAnalysis.font_inconsistencies) {
    score += 5; // Reduced from 10
    console.log('[FraudScore] Font inconsistencies: +5');
  }
  
  // Low OCR confidence might indicate tampering
  if (textAnalysis.confidence < 50 && textAnalysis.confidence > 0) {
    score += 3; // Reduced from 5
    console.log('[FraudScore] Low OCR confidence: +3');
  }
  
  // Image edit analysis (only for images, disabled for PDFs)
  if (textAnalysis.image_edit_analysis) {
    const editAnalysis = textAnalysis.image_edit_analysis;
    const isPdf = fileType === 'application/pdf';
    
    console.log('[FraudScore] Image edit analysis present, likely_edited:', editAnalysis.likely_edited);
    
    // Only apply penalties for actual image files, not PDFs
    if (!isPdf) {
      // Direct editing score based on confidence
      if (editAnalysis.likely_edited) {
        const penalty = Math.min(10, Math.floor(editAnalysis.edit_confidence * 0.1));
        score += penalty;
        console.log(`[FraudScore] Direct editing detected (${editAnalysis.edit_confidence}%): +${penalty}`);
      }
      
      // Compression variance
      if (editAnalysis.compression_quality_variance > 0.7) {
        score += 5;
        console.log(`[FraudScore] High compression variance: +5`);
      } else if (editAnalysis.compression_quality_variance > 0.4) {
        score += 3;
        console.log(`[FraudScore] Medium compression variance: +3`);
      }
      
      // OCR confidence variance
      if (editAnalysis.ocr_confidence_variance > 0.8) {
        score += 5;
        console.log(`[FraudScore] High OCR variance: +5`);
      } else if (editAnalysis.ocr_confidence_variance > 0.5) {
        score += 3;
        console.log(`[FraudScore] Medium OCR variance: +3`);
      }
    } else {
      console.log('[FraudScore] Skipping image edit penalties for PDF');
    }
  }

  // Additional PDF-specific fraud detection methods
  if (isPdf && textAnalysis.extracted_text) {
    // Check for text layer inconsistencies
    const text = textAnalysis.extracted_text;
    
    // Look for suspicious patterns that might indicate editing
    const suspiciousPatterns = [
      /[^\x20-\x7E\n\r\t]/g, // Non-printable characters
      /\u0000/g, // Null characters
      /\ufffd/g, // Replacement character (often from encoding issues)
    ];
    
    let suspiciousChars = 0;
    suspiciousPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        suspiciousChars += matches.length;
      }
    });
    
    if (suspiciousChars > 10) {
      score += 3;
      console.log(`[FraudScore] High suspicious characters (${suspiciousChars}): +3`);
    } else if (suspiciousChars > 5) {
      score += 2;
      console.log(`[FraudScore] Medium suspicious characters (${suspiciousChars}): +2`);
    }
    
    // Check for inconsistent line endings (mix of \r\n and \n)
    const crlfCount = (text.match(/\r\n/g) || []).length;
    const lfCount = (text.match(/\n(?!\r)/g) || []).length;
    
    if (crlfCount > 0 && lfCount > 0 && Math.abs(crlfCount - lfCount) > 5) {
      score += 2;
      console.log(`[FraudScore] Inconsistent line endings (CRLF: ${crlfCount}, LF: ${lfCount}): +2`);
    }
    
    // Check for very short text (might indicate OCR failure or minimal content)
    if (text.length < 100) {
      score += 3;
      console.log(`[FraudScore] Very short extracted text (${text.length} chars): +3`);
    }

    // Check for text that looks like it was added to a scanned document
    // Look for common certificate phrases that might be OCR artifacts vs clean text
    const certificatePhrases = [
      'this is to certify',
      'certificate of',
      'awarded to',
      'presented to',
      'successfully completed'
    ];
    
    let foundPhrases = 0;
    certificatePhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) {
        foundPhrases++;
      }
    });
    
    // If we found certificate phrases but text confidence is low, might be edited
    if (foundPhrases > 0 && textAnalysis.confidence < 60) { // Lower threshold
      score += 4; // Lower penalty
      console.log(`[FraudScore] Certificate phrases found but low confidence (${textAnalysis.confidence}%): +4`);
    }
    
    // Check for unusual spacing patterns that might indicate text overlay
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    if (avgWordLength > 20 && words.length > 20) { // Higher thresholds
      score += 3; // Lower penalty
      console.log(`[FraudScore] Unusual word lengths (avg: ${avgWordLength.toFixed(1)}): +3`);
    }
    
    // Check for repeated words or phrases that might indicate copy-paste editing
    const repeatedWords = words.filter((word, index) => 
      words.indexOf(word) !== index && word.length > 4 // Longer words only
    );
    
    if (repeatedWords.length > words.length * 0.15) { // Higher threshold
      score += 4; // Lower penalty
      console.log(`[FraudScore] High word repetition (${repeatedWords.length}/${words.length}): +4`);
    }

    // Check for font inconsistencies in PDF structure (if we can detect them)
    const fontDeclarations = (text.match(/\/F\d+/g) || []).length;
    if (fontDeclarations > 15) { // Higher threshold
      score += 2; // Lower penalty
      console.log(`[FraudScore] Multiple fonts detected (${fontDeclarations}): +2`);
    }

    // Check for text rendering mode changes (might indicate overlaid text)
    const textRenderingModes = (text.match(/Tr/g) || []).length;
    if (textRenderingModes > 10) { // Higher threshold
      score += 2; // Lower penalty
      console.log(`[FraudScore] Text rendering mode changes (${textRenderingModes}): +2`);
    }
  }
  
  const finalScore = Math.max(0, Math.min(50, score)); // Cap at 50 instead of 60
  console.log(`[FraudScore] Final text fraud score: ${finalScore}`);
  return finalScore;
}
