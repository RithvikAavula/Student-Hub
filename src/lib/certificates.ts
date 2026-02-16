import { supabase } from './supabase';
import { 
  CertificateSubmission, 
  CertificateValidationStatus,
  CertificateApprovalStatus,
  CertificateStats,
  CertificateValidationLog,
  FraudulentCertificateReport,
  VerifiedCertificate,
  CertificateValidationResult,
  TextAnomaly
} from '@/types';
import { analyzeCertificateText, calculateTextFraudScore, TextAnalysisResult } from './textAnalysis';

// Re-export types for convenience
export type {
  CertificateSubmission,
  CertificateValidationStatus,
  CertificateApprovalStatus,
  CertificateStats,
  CertificateValidationLog,
  FraudulentCertificateReport,
  VerifiedCertificate,
  CertificateValidationResult
};

// ========================================
// FRAUD ANALYSIS TYPES
// ========================================

export interface FraudIndicators {
  creation_software?: string;
  modification_software?: string;
  creation_date?: string;
  modification_date?: string;
  has_digital_signature: boolean;
  signature_valid?: boolean;
  author?: string;
  producer?: string;
  suspicious_indicators: string[];
  metadata_stripped: boolean;
  multiple_modifications: boolean;
  pdf_version?: string;
  page_count?: number;
  is_scanned?: boolean;
  has_layers?: boolean;
  exif_data?: Record<string, any>;
  // Text analysis fields
  extracted_text?: string;
  text_confidence?: number;
  names_found?: string[];
  name_match_score?: number;
  name_verification_status?: 'verified' | 'suspicious' | 'mismatch' | 'not_found';
  text_anomalies?: TextAnomaly[];
  font_inconsistencies?: boolean;
  text_extraction_method?: 'pdf_native' | 'ocr' | 'hybrid';
  // Image edit detection fields
  image_edit_detected?: boolean;
  image_edit_confidence?: number;
  image_suspicious_regions?: string[];
  // QR code analysis fields
  qr_codes_found?: number;
  qr_codes_verified?: boolean;
  qr_code_status?: 'verified' | 'suspicious' | 'invalid' | 'not_found';
}

export interface FraudAnalysisResult {
  fraud_indicators: FraudIndicators;
  fraud_score: number;
  risk_level: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  warnings: string[];
  analysis_completed: boolean;
  text_analysis?: TextAnalysisResult;
}

// Suspicious software patterns that indicate potential manipulation
const SUSPICIOUS_SOFTWARE = [
  'photoshop',
  'gimp',
  'paint',
  'canva',
  'illustrator',
  'corel',
  'inkscape',
  'affinity',
  'pixlr',
  'fotor',
  'befunky',
];

const LEGITIMATE_PDF_PRODUCERS = [
  'adobe acrobat',
  'microsoft',
  'google docs',
  'libreoffice',
  'openoffice',
  'wps office',
  'apple',
  'preview',
  'quartz',
  'cups',
  'ghostscript',
  'pdflib',
  'itext',
  'reportlab',
  'fpdf',
  'mpdf',
  'prince',
  'wkhtmltopdf',
  'puppeteer',
  'chromium',
  'chrome',
  'firefox',
  'edge',
  'safari',
];

/**
 * Generate SHA-256 hash of a file
 * @param file - The file to hash
 * @returns Promise<string> - The hex-encoded SHA-256 hash
 */
export async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ========================================
// FRAUD ANALYSIS FUNCTIONS
// ========================================

/**
 * Extract metadata from PDF file
 * @param file - PDF file to analyze
 * @returns Promise<Partial<FraudIndicators>>
 */
async function analyzePdfMetadata(file: File): Promise<Partial<FraudIndicators>> {
  const indicators: Partial<FraudIndicators> = {
    suspicious_indicators: [],
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const text = new TextDecoder('latin1').decode(bytes);

    // Check PDF signature
    if (!text.startsWith('%PDF-')) {
      indicators.suspicious_indicators?.push('Invalid PDF structure');
      return indicators;
    }

    // Extract PDF version
    const versionMatch = text.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      indicators.pdf_version = versionMatch[1];
    }

    // Extract metadata from PDF info dictionary
    // Look for /Creator, /Producer, /CreationDate, /ModDate, /Author
    
    const creatorMatch = text.match(/\/Creator\s*\(([^)]+)\)/i) || 
                         text.match(/\/Creator\s*<([^>]+)>/i);
    if (creatorMatch) {
      indicators.creation_software = decodeMetadataString(creatorMatch[1]);
    }

    const producerMatch = text.match(/\/Producer\s*\(([^)]+)\)/i) ||
                          text.match(/\/Producer\s*<([^>]+)>/i);
    if (producerMatch) {
      indicators.producer = decodeMetadataString(producerMatch[1]);
    }

    const authorMatch = text.match(/\/Author\s*\(([^)]+)\)/i) ||
                        text.match(/\/Author\s*<([^>]+)>/i);
    if (authorMatch) {
      indicators.author = decodeMetadataString(authorMatch[1]);
    }

    const creationDateMatch = text.match(/\/CreationDate\s*\(([^)]+)\)/i);
    if (creationDateMatch) {
      indicators.creation_date = parsePdfDate(creationDateMatch[1]);
    }

    const modDateMatch = text.match(/\/ModDate\s*\(([^)]+)\)/i);
    if (modDateMatch) {
      indicators.modification_date = parsePdfDate(modDateMatch[1]);
    }

    // Check for digital signature
    indicators.has_digital_signature = text.includes('/Sig') || 
                                        text.includes('/ByteRange') ||
                                        text.includes('/SigFlags');

    // Check for multiple modifications (multiple incremental updates)
    const eofCount = (text.match(/%%EOF/g) || []).length;
    indicators.multiple_modifications = eofCount > 1;

    // Check if metadata was stripped (no info dictionary or XMP)
    indicators.metadata_stripped = !text.includes('/Info') && !text.includes('xmp');

    // Check for image-based PDF (scanned document)
    indicators.is_scanned = text.includes('/Image') && 
                            !text.includes('/Font') && 
                            !text.includes('/Text');

    // Check for layers (could indicate editing)
    indicators.has_layers = text.includes('/OCG') || text.includes('/OCProperties');

    // Check for mixed content (text + images) which might indicate editing
    // Only flag if it's predominantly image-based with minimal text (scanned + overlaid)
    const hasTextContent = text.includes('/Font') || text.includes('/Text') || text.includes('/TJ') || text.includes('/Tj');
    const hasImageContent = text.includes('/Image');
    const hasMixedContent = hasTextContent && hasImageContent;
    const isScannedWithText = hasMixedContent && !text.includes('/Font'); // Image with TJ/Tj but no fonts
    
    if (isScannedWithText) {
      indicators.suspicious_indicators?.push('Scanned document with overlaid text - may have been edited');
    }

    // Check for object streams (only flag excessive amounts)
    const objectStreamCount = (text.match(/\/ObjStm/g) || []).length;
    if (objectStreamCount > 20) { // Much higher threshold
      indicators.suspicious_indicators?.push(`Excessive compressed object streams (${objectStreamCount})`);
    }

    // Check for XRef streams (normal in modern PDFs, only flag if suspicious pattern)
    const xrefStreamCount = (text.match(/\/XRef/g) || []).length;
    // Don't flag XRef streams as they're normal

    // Check for embedded files or attachments (legitimate use exists)
    if (text.includes('/EmbeddedFile') || text.includes('/EF')) {
      indicators.suspicious_indicators?.push('Contains embedded files');
    }

    // Check for annotations (only flag excessive amounts)
    const annotationCount = (text.match(/\/Annot/g) || []).length;
    if (annotationCount > 10) { // Much higher threshold
      indicators.suspicious_indicators?.push(`Excessive annotations (${annotationCount})`);
    }

    // Check for form fields (might indicate template editing)
    if (text.includes('/AcroForm') || text.includes('/Fields')) {
      indicators.suspicious_indicators?.push('Contains form fields');
    }

    // Count pages
    const pageCountMatch = text.match(/\/Count\s+(\d+)/);
    if (pageCountMatch) {
      indicators.page_count = parseInt(pageCountMatch[1], 10);
    }

  // Check for unusual PDF structure that might indicate editing
    const streamCount = (text.match(/stream[\r\n]/g) || []).length;
    const endstreamCount = (text.match(/endstream[\r\n]/g) || []).length;
    
    if (streamCount !== endstreamCount) {
      indicators.suspicious_indicators?.push('Unbalanced stream/endstream pairs');
    }

    // Check for very large number of objects (might indicate complex editing)
    const objectCount = (text.match(/\d+\s+\d+\s+obj/g) || []).length;
    if (objectCount > 500) { // Increased from 100
      indicators.suspicious_indicators?.push(`Very high object count (${objectCount})`);
    }

    // Analyze content structure for editing indicators
    const contentAnalysis = analyzePdfContentStructure(text);
    indicators.suspicious_indicators?.push(...contentAnalysis.suspicious_indicators);

  } catch (error) {
    console.error('Error analyzing PDF:', error);
    // Don't add analysis errors to suspicious indicators - they're not fraud indicators
    // indicators.suspicious_indicators?.push('Could not fully analyze PDF structure');
  }

  return indicators;
}

/**
 * Analyze PDF content structure for editing indicators
 */
function analyzePdfContentStructure(pdfText: string): { suspicious_indicators: string[] } {
  const indicators: string[] = [];

  // Check for text positioning commands that might indicate overlay text
  const textPositioningCommands = (pdfText.match(/Tm|Td|TD|T\*/g) || []).length;
  if (textPositioningCommands > 1000) { // Increased from 200
    indicators.push(`Excessive text positioning commands (${textPositioningCommands}) - may indicate text overlay`);
  }

  // Check for clipping paths (might indicate content masking/editing)
  const clippingCommands = (pdfText.match(/W|W\*/g) || []).length;
  if (clippingCommands > 500) { // Increased from 100
    indicators.push(`Excessive clipping operations (${clippingCommands}) - may indicate content editing`);
  }

  // Check for transformation matrices (rotation, scaling, etc.)
  const transformMatrices = (pdfText.match(/cm/g) || []).length;
  if (transformMatrices > 200) { // Increased from 50
    indicators.push(`Excessive transformation operations (${transformMatrices}) - may indicate content manipulation`);
  }

  // Check for graphics state operations that might indicate editing
  const graphicsStateOps = (pdfText.match(/q|Q/g) || []).length;
  if (graphicsStateOps > 2000) { // Increased from 500
    indicators.push(`Excessive graphics state operations (${graphicsStateOps}) - may indicate complex editing`);
  }

  // Check for color changes that might indicate touched-up areas
  const colorOps = (pdfText.match(/RG|rg|K|k/g) || []).length;
  if (colorOps > 5000) { // Increased from 1000
    indicators.push(`Excessive color operations (${colorOps}) - may indicate color corrections`);
  }

  return { suspicious_indicators: indicators };
}

/**
 * Extract EXIF metadata from image file
 * @param file - Image file to analyze
 * @returns Promise<Partial<FraudIndicators>>
 */
async function analyzeImageMetadata(file: File): Promise<Partial<FraudIndicators>> {
  const indicators: Partial<FraudIndicators> = {
    suspicious_indicators: [],
    exif_data: {},
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check for JPEG
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      // Parse JPEG EXIF data
      let offset = 2;
      while (offset < bytes.length - 2) {
        if (bytes[offset] !== 0xFF) break;
        
        const marker = bytes[offset + 1];
        
        // APP1 marker (EXIF)
        if (marker === 0xE1) {
          const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
          const exifData = bytes.slice(offset + 4, offset + 2 + length);
          const exifString = new TextDecoder('latin1').decode(exifData);
          
          // Look for software info
          if (exifString.toLowerCase().includes('photoshop')) {
            indicators.modification_software = 'Adobe Photoshop';
            indicators.suspicious_indicators?.push('Image edited with Photoshop');
          }
          if (exifString.toLowerCase().includes('gimp')) {
            indicators.modification_software = 'GIMP';
            indicators.suspicious_indicators?.push('Image edited with GIMP');
          }
          
          // Extract creation date if present
          const dateMatch = exifString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
          if (dateMatch) {
            indicators.creation_date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${dateMatch[4]}:${dateMatch[5]}:${dateMatch[6]}`;
          }

          indicators.exif_data = {
            has_exif: true,
            raw_preview: exifString.substring(0, 200),
          };
          break;
        }
        
        // Move to next marker
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        offset += 2 + length;
      }

      // Check for no EXIF data (metadata stripped)
      if (!indicators.exif_data?.has_exif) {
        indicators.metadata_stripped = true;
        indicators.suspicious_indicators?.push('Image metadata has been stripped');
      }
    }

    // Check for PNG
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      const text = new TextDecoder('latin1').decode(bytes);
      
      // Look for tEXt chunks with software info
      if (text.toLowerCase().includes('photoshop')) {
        indicators.modification_software = 'Adobe Photoshop';
        indicators.suspicious_indicators?.push('Image edited with Photoshop');
      }
      
      // Check for iTXt or tEXt chunks
      indicators.metadata_stripped = !text.includes('tEXt') && !text.includes('iTXt');
    }

    indicators.has_digital_signature = false; // Images typically don't have digital signatures

  } catch (error) {
    console.error('Error analyzing image:', error);
    // Don't add analysis errors to suspicious indicators - they're not fraud indicators
    // indicators.suspicious_indicators?.push('Could not fully analyze image metadata');
  }

  return indicators;
}

/**
 * Decode PDF metadata string (handles hex encoding)
 */
function decodeMetadataString(str: string): string {
  if (!str) return '';
  
  // Handle hex-encoded strings
  if (/^[0-9A-Fa-f]+$/.test(str)) {
    try {
      let result = '';
      for (let i = 0; i < str.length; i += 2) {
        result += String.fromCharCode(parseInt(str.substring(i, i + 2), 16));
      }
      return result.replace(/\0/g, '');
    } catch {
      return str;
    }
  }
  
  return str;
}

/**
 * Parse PDF date format (D:YYYYMMDDHHmmSS)
 */
function parsePdfDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (match) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }
  
  return dateStr;
}

/**
 * Calculate fraud score based on indicators
 */
function calculateFraudScore(indicators: FraudIndicators): number {
  let score = 0;
  console.log('[BaseFraudScore] Calculating base fraud score...');

  // Check creation/modification software
  const software = (indicators.creation_software || '').toLowerCase() + 
                   (indicators.modification_software || '').toLowerCase() +
                   (indicators.producer || '').toLowerCase();
  
  for (const suspicious of SUSPICIOUS_SOFTWARE) {
    if (software.includes(suspicious)) {
      score += 25;
      console.log(`[BaseFraudScore] Suspicious software detected (${suspicious}): +25`);
      break;
    }
  }

  // Check if producer is legitimate (less aggressive)
  let isLegitimateProducer = false;
  for (const legitimate of LEGITIMATE_PDF_PRODUCERS) {
    if (software.includes(legitimate)) {
      isLegitimateProducer = true;
      break;
    }
  }
  if (!isLegitimateProducer && indicators.producer) {
    // Only penalize if it's clearly suspicious software
    const isSuspicious = SUSPICIOUS_SOFTWARE.some(s => software.includes(s));
    if (isSuspicious) {
      score += 8; // Lower penalty
      console.log(`[BaseFraudScore] Suspicious producer (${indicators.producer}): +8`);
    } else {
      score += 2; // Very low penalty for unknown producers
      console.log(`[BaseFraudScore] Unknown producer (${indicators.producer}): +2`);
    }
  }

  // Check modification dates
  if (indicators.creation_date && indicators.modification_date) {
    const creationTime = new Date(indicators.creation_date).getTime();
    const modificationTime = new Date(indicators.modification_date).getTime();
    
    // If modified significantly after creation
    if (modificationTime - creationTime > 24 * 60 * 60 * 1000) { // More than 24 hours
      score += 15;
      console.log('[BaseFraudScore] Modified >24h after creation: +15');
    }
  }

  // Check for multiple modifications
  if (indicators.multiple_modifications) {
    score += 20;
    console.log('[BaseFraudScore] Multiple modifications: +20');
  }

  // Check for stripped metadata
  if (indicators.metadata_stripped) {
    score += 15;
    console.log('[BaseFraudScore] Metadata stripped: +15');
  }

  // Check for layers (common in edited documents)
  if (indicators.has_layers) {
    score += 10;
    console.log('[BaseFraudScore] Has layers: +10');
  }

  // Check for suspicious timing patterns
  if (indicators.creation_date && indicators.modification_date) {
    const creationTime = new Date(indicators.creation_date).getTime();
    const modificationTime = new Date(indicators.modification_date).getTime();
    const now = Date.now();
    
    // Document created in the future (clock tampering)
    if (creationTime > now + 1000 * 60 * 60) { // More than 1 hour in future
      score += 30;
      console.log('[BaseFraudScore] Creation date in future: +30');
    }
    
    // Document modified in the future
    if (modificationTime > now + 1000 * 60 * 60) { // More than 1 hour in future
      score += 25;
      console.log('[BaseFraudScore] Modification date in future: +25');
    }
    
    // Very recent creation/modification (just uploaded, might be freshly edited)
    const oneHourAgo = now - 1000 * 60 * 60;
    const oneDayAgo = now - 1000 * 60 * 60 * 24;
    const oneWeekAgo = now - 1000 * 60 * 60 * 24 * 7;
    
    if (creationTime > oneHourAgo) {
      score += 2; // Much lower penalty
      console.log('[BaseFraudScore] Very recent creation (< 1 hour): +2');
    } else if (creationTime > oneDayAgo) {
      score += 1; // Much lower penalty
      console.log('[BaseFraudScore] Recent creation (< 24 hours): +1');
    }
    
    if (modificationTime > oneHourAgo) {
      score += 3; // Much lower penalty for recent modifications
      console.log('[BaseFraudScore] Very recent modification (< 1 hour): +3');
    } else if (modificationTime > oneDayAgo) {
      score += 2; // Much lower penalty
      console.log('[BaseFraudScore] Recent modification (< 24 hours): +2');
    } else if (modificationTime > oneWeekAgo) {
      score += 1; // Much lower penalty
      console.log('[BaseFraudScore] Recent modification (< 1 week): +1');
    }
  }

  // Check for suspicious author field
  if (indicators.author) {
    const author = indicators.author.toLowerCase();
    if (author.includes('unknown') || author.includes('anonymous') || author === '') {
      score += 10;
      console.log('[BaseFraudScore] Suspicious author field: +10');
    }
  }

  // Bonus for having digital signature
  if (indicators.has_digital_signature) {
    score = Math.max(0, score - 20);
    console.log('[BaseFraudScore] Has digital signature: -20');
  }

  // Count suspicious indicators (more conservative scoring)
  const suspiciousCount = indicators.suspicious_indicators?.length || 0;
  if (suspiciousCount > 0) {
    // Only penalize if there are multiple suspicious indicators
    if (suspiciousCount >= 3) {
      score += Math.min(suspiciousCount * 2, 15); // Max 15 points, 2 points each
      console.log(`[BaseFraudScore] ${suspiciousCount} suspicious indicators: +${Math.min(suspiciousCount * 2, 15)}`);
    } else if (suspiciousCount >= 2) {
      score += 3;
      console.log(`[BaseFraudScore] ${suspiciousCount} suspicious indicators: +3`);
    } else {
      score += 1;
      console.log(`[BaseFraudScore] ${suspiciousCount} suspicious indicator: +1`);
    }
  }

  console.log(`[BaseFraudScore] Final base fraud score: ${score}`);
  // Cap at 100
  return Math.min(100, Math.max(0, score));
}

/**
 * Get risk level based on fraud score
 */
function getRiskLevel(score: number): 'low' | 'moderate' | 'elevated' | 'high' | 'critical' {
  if (score <= 20) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 60) return 'elevated';
  if (score <= 80) return 'high';
  return 'critical';
}

/**
 * Main function to analyze a certificate file for potential fraud
 * @param file - The certificate file to analyze
 * @param studentName - Optional student name for name verification
 * @returns Promise<FraudAnalysisResult>
 */
export async function analyzeCertificateForFraud(
  file: File, 
  studentName?: string
): Promise<FraudAnalysisResult> {
  console.log('%c[FRAUD] ========== STARTING FRAUD ANALYSIS ==========', 'background: purple; color: white; font-size: 18px;');
  console.log('[FRAUD] File:', file.name, '| Type:', file.type, '| Size:', file.size);
  console.log('[FRAUD] Student name:', studentName);
  
  const warnings: string[] = [];
  let indicators: FraudIndicators = {
    has_digital_signature: false,
    suspicious_indicators: [],
    metadata_stripped: false,
    multiple_modifications: false,
  };
  let textAnalysis: TextAnalysisResult | undefined;

  try {
    // Determine file type and analyze accordingly
    if (file.type === 'application/pdf') {
      const pdfIndicators = await analyzePdfMetadata(file);
      indicators = { ...indicators, ...pdfIndicators };
    } else if (file.type.startsWith('image/')) {
      const imageIndicators = await analyzeImageMetadata(file);
      indicators = { ...indicators, ...imageIndicators };
    } else {
      warnings.push('Unsupported file type for deep analysis');
    }

    // Perform text analysis for name verification and anomaly detection
    try {
      textAnalysis = await analyzeCertificateText(file, studentName);
      
      console.log('[FraudAnalysis] Text analysis completed');
      console.log('[FraudAnalysis] Name match score:', textAnalysis.name_match_score);
      console.log('[FraudAnalysis] Name verification status:', textAnalysis.name_verification_status);
      
      // Merge text analysis results into indicators
      indicators.extracted_text = textAnalysis.extracted_text;
      indicators.text_confidence = textAnalysis.confidence;
      indicators.names_found = textAnalysis.names_found;
      indicators.name_match_score = textAnalysis.name_match_score;
      indicators.name_verification_status = textAnalysis.name_verification_status;
      indicators.text_anomalies = textAnalysis.text_anomalies.filter(
        anomaly => ['spacing', 'font', 'alignment', 'case', 'character', 'editing_artifact'].includes(anomaly.type)
      ) as TextAnomaly[];
      indicators.font_inconsistencies = textAnalysis.font_inconsistencies;
      indicators.text_extraction_method = textAnalysis.text_extraction_method;
      
      // Store image edit analysis results
      if (textAnalysis.image_edit_analysis) {
        indicators.image_edit_detected = textAnalysis.image_edit_analysis.likely_edited;
        indicators.image_edit_confidence = textAnalysis.image_edit_analysis.edit_confidence;
        indicators.image_suspicious_regions = textAnalysis.image_edit_analysis.suspicious_regions;
        
        console.log('[FraudAnalysis] Image edit detected:', indicators.image_edit_detected);
        console.log('[FraudAnalysis] Image edit confidence:', indicators.image_edit_confidence);
        
        if (textAnalysis.image_edit_analysis.likely_edited) {
          warnings.push(`⚠️ IMAGE EDITING DETECTED (${textAnalysis.image_edit_analysis.edit_confidence}% confidence) - Certificate may have been manipulated`);
        }
      }

      // Store QR code analysis results
      if (textAnalysis.qr_code_analysis) {
        const qrAnalysis = textAnalysis.qr_code_analysis;
        indicators.qr_codes_found = qrAnalysis.qr_codes_found;
        indicators.qr_codes_verified = qrAnalysis.verification_status === 'verified';
        indicators.qr_code_status = qrAnalysis.verification_status;

        console.log('[FraudAnalysis] QR codes found:', indicators.qr_codes_found);
        console.log('[FraudAnalysis] QR code status:', indicators.qr_code_status);

        // Add warnings based on QR code analysis
        if (qrAnalysis.verification_status === 'invalid') {
          warnings.push(`🚫 INVALID QR CODE: ${qrAnalysis.verification_details.join(', ')}`);
        } else if (qrAnalysis.verification_status === 'suspicious') {
          warnings.push(`⚠️ SUSPICIOUS QR CODE: ${qrAnalysis.verification_details.join(', ')}`);
        } else if (qrAnalysis.verification_status === 'verified') {
          warnings.push(`✅ QR CODE VERIFIED: ${qrAnalysis.verification_details.join(', ')}`);
        } else if (qrAnalysis.verification_status === 'not_found') {
          warnings.push('ℹ️ No QR codes found in certificate');
        }
      }
      
      // Add warnings based on text analysis
      if (textAnalysis.name_verification_status === 'mismatch') {
        warnings.push(`NAME MISMATCH: Certificate name does not match student name`);
        if (textAnalysis.names_found.length > 0) {
          warnings.push(`Names found in certificate: ${textAnalysis.names_found.join(', ')}`);
        }
      } else if (textAnalysis.name_verification_status === 'suspicious') {
        warnings.push(`Name match is suspicious (${textAnalysis.name_match_score}% confidence)`);
      } else if (textAnalysis.name_verification_status === 'not_found') {
        warnings.push('Could not extract name from certificate for verification');
      }
      
      // Add warnings for text anomalies
      for (const anomaly of textAnalysis.text_anomalies) {
        if (anomaly.severity === 'high') {
          warnings.push(`Text anomaly detected: ${anomaly.description}`);
        }
      }
      
      if (textAnalysis.font_inconsistencies) {
        warnings.push('Font inconsistencies detected - possible text editing');
      }
      
    } catch (textError) {
      console.error('Text analysis error:', textError);
      warnings.push('Text analysis could not be completed');
    }

    // Generate warnings based on metadata indicators
    if (indicators.modification_software) {
      const sw = indicators.modification_software.toLowerCase();
      if (SUSPICIOUS_SOFTWARE.some(s => sw.includes(s))) {
        warnings.push(`Edited with ${indicators.modification_software} - commonly used for document manipulation`);
      }
    }

    if (indicators.multiple_modifications) {
      warnings.push('Document has been modified multiple times');
    }

    if (indicators.metadata_stripped) {
      warnings.push('Document metadata has been stripped - possible attempt to hide editing history');
    }

    if (indicators.has_layers) {
      warnings.push('Document contains layers - may have been assembled from multiple sources');
    }

    if (!indicators.has_digital_signature) {
      warnings.push('No digital signature present');
    }

    if (indicators.creation_date && indicators.modification_date) {
      const creationTime = new Date(indicators.creation_date).getTime();
      const modificationTime = new Date(indicators.modification_date).getTime();
      if (modificationTime > creationTime) {
        warnings.push('Document was modified after initial creation');
      }
    }

  } catch (error) {
    console.error('Error during fraud analysis:', error);
    warnings.push('Could not complete full fraud analysis');
  }

  // Calculate combined fraud score (metadata + text analysis)
  let fraudScore = calculateFraudScore(indicators);
  
  // Add text analysis score
  if (textAnalysis) {
    const textScore = calculateTextFraudScore(textAnalysis, file.type);
    fraudScore = Math.min(100, fraudScore + textScore);
  }
  
  const riskLevel = getRiskLevel(fraudScore);

  return {
    fraud_indicators: indicators,
    fraud_score: fraudScore,
    risk_level: riskLevel,
    warnings,
    analysis_completed: true,
    text_analysis: textAnalysis,
  };
}

/**
 * Validate certificate code and hash against verified certificates
 * @param certificateCode - The certificate code
 * @param fileHash - The file hash
 * @returns Promise<CertificateValidationStatus>
 */
export async function validateCertificateCode(
  certificateCode: string,
  fileHash: string
): Promise<CertificateValidationStatus> {
  const { data, error } = await supabase.rpc('validate_certificate_submission', {
    p_certificate_code: certificateCode,
    p_file_hash: fileHash,
  });

  if (error) {
    console.error('Validation error:', error);
    return 'fake'; // Default to fake if validation fails
  }

  return data as CertificateValidationStatus;
}

/**
 * Submit a certificate for validation (Student)
 * @param params - Certificate submission parameters
 * @returns Promise<CertificateSubmission>
 */
export interface SubmitCertificateParams {
  studentId: string;
  certificateCode: string;
  title: string;
  description?: string;
  issuingOrganization: string;
  issueDate: string;
  file: File;
}

export async function submitCertificate(params: SubmitCertificateParams): Promise<CertificateSubmission> {
  const { studentId, certificateCode, title, description, issuingOrganization, issueDate, file } = params;

  // Step 1: Generate SHA-256 hash of the file
  const fileHash = await generateFileHash(file);

  // Step 2: Perform fraud analysis on the certificate
  const fraudAnalysis = await analyzeCertificateForFraud(file);

  // Step 3: Upload the certificate file
  const fileExt = file.name.split('.').pop();
  const fileName = `submissions/${studentId}/${Date.now()}-${certificateCode.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('certificates')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload certificate file: ${uploadError.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('certificates')
    .getPublicUrl(fileName);

  const fileUrl = urlData.publicUrl;

  // Step 4: Determine initial validation status based on fraud score
  // High fraud scores indicate potential fake/tampered documents
  let validationStatus: CertificateValidationStatus = 'valid';
  if (fraudAnalysis.fraud_score >= 60) {
    validationStatus = 'fake';
  } else if (fraudAnalysis.fraud_score >= 40) {
    validationStatus = 'tampered';
  }

  // Step 5: Save submission record with fraud analysis
  const { data, error } = await supabase
    .from('certificate_submissions')
    .insert({
      student_id: studentId,
      certificate_code: certificateCode,
      title: title,
      description: description || null,
      issuing_organization: issuingOrganization,
      issue_date: issueDate,
      file_url: fileUrl,
      file_hash: fileHash,
      validation_status: validationStatus,
      approval_status: 'pending',
      fraud_indicators: fraudAnalysis.fraud_indicators,
      fraud_score: fraudAnalysis.fraud_score,
      analysis_completed: fraudAnalysis.analysis_completed,
    })
    .select()
    .single();

  if (error) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('certificates').remove([fileName]);
    throw new Error(`Failed to submit certificate: ${error.message}`);
  }

  // Step 6: Log the validation
  await supabase.from('certificate_validation_logs').insert({
    submission_id: data.id,
    certificate_code: certificateCode,
    uploaded_file_hash: fileHash,
    validation_status: validationStatus,
    validated_by: studentId,
    user_agent: navigator.userAgent,
  });

  return data as CertificateSubmission;
}

/**
 * Get student's certificate submissions
 * @param studentId - The student ID
 * @returns Promise<CertificateSubmission[]>
 */
export async function getStudentSubmissions(studentId: string): Promise<CertificateSubmission[]> {
  const { data, error } = await supabase
    .from('certificate_submissions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return data as CertificateSubmission[];
}

// Alias for backwards compatibility
export const getStudentCertificates = getStudentSubmissions;

/**
 * Get all pending certificate submissions (Faculty)
 * @param options - Query options
 * @returns Promise<CertificateSubmission[]>
 */
interface GetSubmissionsOptions {
  approvalStatus?: CertificateApprovalStatus;
  validationStatus?: CertificateValidationStatus;
  limit?: number;
  offset?: number;
}

export async function getPendingSubmissions(
  options: GetSubmissionsOptions = {}
): Promise<CertificateSubmission[]> {
  const { approvalStatus = 'pending', validationStatus, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('certificate_submissions')
    .select(`
      *,
      student:profiles!certificate_submissions_student_id_fkey(id, full_name, email, student_id, department)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (approvalStatus) {
    query = query.eq('approval_status', approvalStatus);
  }

  if (validationStatus) {
    query = query.eq('validation_status', validationStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return data as CertificateSubmission[];
}

/**
 * Get pending certificates for faculty review
 * This function fetches only pending submissions
 * @param facultyId - The faculty ID (for future filtering by assigned students)
 * @returns Promise<CertificateSubmission[]>
 */
export async function getPendingCertificates(facultyId?: string): Promise<CertificateSubmission[]> {
  return getPendingSubmissions({ approvalStatus: 'pending' });
}

/**
 * Get a signed URL for a certificate file
 * @param filePath - The file path in storage
 * @returns Promise<string | null>
 */
export async function getCertificateFileUrl(filePath: string): Promise<string | null> {
  // If it's already a full URL, return it
  if (filePath.startsWith('http')) {
    return filePath;
  }

  // Extract the path after 'certificates/' if present
  const pathParts = filePath.split('/certificates/');
  const storagePath = pathParts.length > 1 ? pathParts[1] : filePath;

  const { data, error } = await supabase.storage
    .from('certificates')
    .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry

  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Approve a certificate submission (Faculty)
 * @param submissionId - The submission ID
 * @param reviewerId - The faculty ID
 */
export async function approveCertificate(submissionId: string, reviewerId: string): Promise<void> {
  const { error } = await supabase
    .from('certificate_submissions')
    .update({
      approval_status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) {
    throw new Error(`Failed to approve certificate: ${error.message}`);
  }
}

/**
 * Reject a certificate submission (Faculty)
 * @param submissionId - The submission ID
 * @param reviewerId - The faculty ID
 * @param reason - Rejection reason
 */
export async function rejectCertificate(
  submissionId: string, 
  reviewerId: string, 
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('certificate_submissions')
    .update({
      approval_status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', submissionId);

  if (error) {
    throw new Error(`Failed to reject certificate: ${error.message}`);
  }
}

/**
 * Get certificate statistics
 * @returns Promise<CertificateStats>
 */
export async function getCertificateStats(): Promise<CertificateStats> {
  const { data, error } = await supabase.rpc('get_certificate_stats');

  if (error) {
    throw new Error(`Failed to get certificate stats: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      total_submissions: 0,
      pending_submissions: 0,
      approved_submissions: 0,
      rejected_submissions: 0,
      valid_certificates: 0,
      fake_certificates: 0,
      tampered_certificates: 0,
      recent_submissions: 0,
    };
  }

  return data[0] as CertificateStats;
}

/**
 * Get fraudulent certificates report (Admin)
 * @returns Promise<FraudulentCertificateReport[]>
 */
export async function getFraudulentCertificatesReport(): Promise<FraudulentCertificateReport[]> {
  const { data, error } = await supabase.rpc('get_fraudulent_certificates_report');

  if (error) {
    throw new Error(`Failed to get fraudulent certificates report: ${error.message}`);
  }

  return (data || []) as FraudulentCertificateReport[];
}

/**
 * Get all certificate submissions (Admin)
 * @param options - Query options
 * @returns Promise<CertificateSubmission[]>
 */
export async function getAllSubmissions(
  options: GetSubmissionsOptions = {}
): Promise<CertificateSubmission[]> {
  const { approvalStatus, validationStatus, limit = 100, offset = 0 } = options;

  let query = supabase
    .from('certificate_submissions')
    .select(`
      *,
      student:profiles!certificate_submissions_student_id_fkey(id, full_name, email, student_id, department)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (approvalStatus) {
    query = query.eq('approval_status', approvalStatus);
  }

  if (validationStatus) {
    query = query.eq('validation_status', validationStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return data as CertificateSubmission[];
}

/**
 * Get validation logs
 * @param options - Query options
 * @returns Promise<CertificateValidationLog[]>
 */
interface GetValidationLogsOptions {
  limit?: number;
  offset?: number;
  status?: CertificateValidationStatus;
}

export async function getValidationLogs(
  options: GetValidationLogsOptions = {}
): Promise<CertificateValidationLog[]> {
  const { limit = 100, offset = 0, status } = options;

  let query = supabase
    .from('certificate_validation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('validation_status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch validation logs: ${error.message}`);
  }

  return data as CertificateValidationLog[];
}

/**
 * Delete a certificate submission (Admin)
 * @param submissionId - The submission ID
 * @param fileUrl - The file URL to delete from storage
 */
export async function deleteSubmission(submissionId: string, fileUrl: string): Promise<void> {
  // Extract file path from URL
  const urlParts = fileUrl.split('/certificates/');
  const filePath = urlParts.length > 1 ? urlParts[1] : null;

  // Delete from database first
  const { error: dbError } = await supabase
    .from('certificate_submissions')
    .delete()
    .eq('id', submissionId);

  if (dbError) {
    throw new Error(`Failed to delete submission: ${dbError.message}`);
  }

  // Delete from storage
  if (filePath) {
    await supabase.storage.from('certificates').remove([filePath]);
  }
}

/**
 * Add a verified certificate (Admin only)
 * @param params - Verified certificate parameters
 * @returns Promise<VerifiedCertificate>
 */
export interface AddVerifiedCertificateParams {
  certificateCode: string;
  issuingOrganization: string;
  fileHash: string;
  metadata?: Record<string, any>;
  addedBy: string;
}

export async function addVerifiedCertificate(
  params: AddVerifiedCertificateParams
): Promise<VerifiedCertificate> {
  const { data, error } = await supabase
    .from('verified_certificates')
    .insert({
      certificate_code: params.certificateCode,
      issuing_organization: params.issuingOrganization,
      file_hash: params.fileHash,
      metadata: params.metadata || null,
      added_by: params.addedBy,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add verified certificate: ${error.message}`);
  }

  return data as VerifiedCertificate;
}

/**
 * Get validation status display properties
 * @param status - The validation status
 * @returns Object with color, bgColor, label, and variant for Badge component
 */
export function getValidationStatusDisplay(status: CertificateValidationStatus) {
  switch (status) {
    case 'valid':
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-300 dark:border-green-700',
        label: 'VALID',
        variant: 'default' as const,
        icon: 'check-circle',
        description: 'This certificate is authentic and verified.',
      };
    case 'fake':
      return {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-300 dark:border-red-700',
        label: 'FAKE',
        variant: 'destructive' as const,
        icon: 'x-circle',
        description: 'This certificate code does not exist in our verified database.',
      };
    case 'tampered':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        borderColor: 'border-amber-300 dark:border-amber-700',
        label: 'TAMPERED',
        variant: 'secondary' as const,
        icon: 'alert-triangle',
        description: 'This certificate has been modified or altered.',
      };
  }
}

/**
 * Get approval status display properties
 * @param status - The approval status
 * @returns Object with color, bgColor, label, and variant for Badge component
 */
export function getApprovalStatusDisplay(status: CertificateApprovalStatus) {
  switch (status) {
    case 'pending':
      return {
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        borderColor: 'border-yellow-300 dark:border-yellow-700',
        label: 'Pending',
        variant: 'secondary' as const,
      };
    case 'approved':
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-300 dark:border-green-700',
        label: 'Approved',
        variant: 'default' as const,
      };
    case 'rejected':
      return {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-300 dark:border-red-700',
        label: 'Rejected',
        variant: 'destructive' as const,
      };
  }
}

// ========================================
// PUBLIC VERIFICATION FUNCTIONS
// ========================================

/**
 * Validate a certificate by uploading the file only (no code required)
 * Automatically identifies the certificate by its file hash
 * @param file - The certificate file to verify
 * @param userId - Optional user ID for logging
 * @returns Promise<CertificateValidationResult>
 */
export async function validateCertificateByFile(
  file: File,
  userId?: string
): Promise<CertificateValidationResult> {
  // Generate hash of uploaded file
  const fileHash = await generateFileHash(file);
  const now = new Date().toISOString();

  // Look up the file hash in verified certificates database
  const { data: verified, error } = await supabase
    .from('verified_certificates')
    .select('*')
    .eq('file_hash', fileHash)
    .single();

  if (error || !verified) {
    // File hash not found - check if any certificate was tampered
    // by looking for certificates with matching organization patterns
    // For now, if hash not found, it's considered fake
    return {
      status: 'fake',
      message: 'This certificate file is not recognized. It may be fake or not yet registered in our system.',
      verified_at: now,
    };
  }

  // Certificate found by hash - it's valid!
  return {
    status: 'valid',
    certificate: {
      certificate_code: verified.certificate_code,
      issuing_organization: verified.issuing_organization,
    },
    message: 'This certificate is authentic and verified. The file matches our records.',
    verified_at: now,
  };
}

/**
 * Validate a certificate by its code (public portal)
 * Checks if the certificate code exists in the verified database
 * @param certificateCode - The certificate code to validate
 * @param userId - Optional user ID for logging
 * @returns Promise<CertificateValidationResult>
 */
export async function validateCertificateByCode(
  certificateCode: string,
  userId?: string
): Promise<CertificateValidationResult> {
  // Check if certificate exists in verified database
  const { data: verified, error } = await supabase
    .from('verified_certificates')
    .select('*')
    .eq('certificate_code', certificateCode)
    .single();

  const now = new Date().toISOString();

  if (error || !verified) {
    // Certificate code not found
    return {
      status: 'fake',
      message: 'This certificate code does not exist in our verified database.',
      verified_at: now,
    };
  }

  // Certificate exists
  return {
    status: 'valid',
    certificate: {
      certificate_code: verified.certificate_code,
      issuing_organization: verified.issuing_organization,
    },
    message: 'This certificate code is registered in our verified database.',
    verified_at: now,
  };
}

/**
 * Validate a certificate with both code and file (public portal)
 * Checks code existence AND file hash match
 * @param certificateCode - The certificate code to validate
 * @param file - The certificate file to hash and compare
 * @param userId - Optional user ID for logging
 * @returns Promise<CertificateValidationResult>
 */
export async function validateCertificateWithFile(
  certificateCode: string,
  file: File,
  userId?: string
): Promise<CertificateValidationResult> {
  // Generate hash of uploaded file
  const fileHash = await generateFileHash(file);

  // Use the database function to validate
  const status = await validateCertificateCode(certificateCode, fileHash);

  const now = new Date().toISOString();

  // Get certificate details if it exists
  const { data: verified } = await supabase
    .from('verified_certificates')
    .select('*')
    .eq('certificate_code', certificateCode)
    .single();

  let message: string;
  switch (status) {
    case 'valid':
      message = 'This certificate is authentic and verified. The file matches our records.';
      break;
    case 'tampered':
      message = 'Warning: This certificate code exists but the file has been modified or altered.';
      break;
    case 'fake':
    default:
      message = 'This certificate code does not exist in our verified database.';
      break;
  }

  return {
    status,
    certificate: verified ? {
      certificate_code: verified.certificate_code,
      issuing_organization: verified.issuing_organization,
    } : undefined,
    message,
    verified_at: now,
  };
}
