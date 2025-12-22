import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

const md = new MarkdownIt();

export class DocumentProcessor {
  constructor() {
    this.supportedTypes = {
      'application/pdf': this.processPDF.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.processDocx.bind(this),
      'text/plain': this.processText.bind(this),
      'text/csv': this.processCSV.bind(this),
      'application/json': this.processJSON.bind(this),
      'text/markdown': this.processMarkdown.bind(this),
      'text/html': this.processHTML.bind(this)
    };
  }

  async processFile(filePath, mimeType) {
    try {
      const processor = this.supportedTypes[mimeType];
      if (!processor) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const result = await processor(filePath);
      logger.info(`Successfully processed file: ${filePath}`);
      return result;
    } catch (error) {
      logger.error(`Failed to process file ${filePath}:`, error);
      throw error;
    }
  }

  async processPDF(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      
      return {
        content: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info
        }
      };
    } catch (error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  async processDocx(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      
      return {
        content: result.value,
        metadata: {
          warnings: result.messages
        }
      };
    } catch (error) {
      throw new Error(`Failed to process DOCX: ${error.message}`);
    }
  }

  async processText(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        content,
        metadata: {
          encoding: 'utf-8'
        }
      };
    } catch (error) {
      throw new Error(`Failed to process text file: ${error.message}`);
    }
  }

  async processMarkdown(filePath) {
    try {
      const markdownContent = await fs.readFile(filePath, 'utf-8');
      
      // Convert markdown to HTML then extract text
      const htmlContent = md.render(markdownContent);
      const textContent = htmlContent
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      return {
        content: textContent,
        metadata: {
          originalFormat: 'markdown',
          encoding: 'utf-8',
          rawMarkdown: markdownContent
        }
      };
    } catch (error) {
      throw new Error(`Failed to process markdown file: ${error.message}`);
    }
  }

  async processCSV(filePath) {
    try {
      const rows = [];
      
      return new Promise((resolve, reject) => {
        createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', () => {
            // Convert CSV rows to readable text
            const content = rows
              .map(row => Object.entries(row)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')
              )
              .join('\n');
            
            resolve({
              content,
              metadata: {
                rowCount: rows.length,
                columns: Object.keys(rows[0] || {})
              }
            });
          })
          .on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to process CSV: ${error.message}`);
    }
  }

  async processJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert JSON to readable text
      const readableContent = this.jsonToText(data);
      
      return {
        content: readableContent,
        metadata: {
          originalFormat: 'json',
          keys: Object.keys(data)
        }
      };
    } catch (error) {
      throw new Error(`Failed to process JSON: ${error.message}`);
    }
  }

  async processHTML(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Simple HTML tag removal (for basic HTML)
      const textContent = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      return {
        content: textContent,
        metadata: {
          originalFormat: 'html'
        }
      };
    } catch (error) {
      throw new Error(`Failed to process HTML: ${error.message}`);
    }
  }

  jsonToText(obj, prefix = '') {
    let text = '';
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        text += this.jsonToText(value, fullKey);
      } else if (Array.isArray(value)) {
        text += `${fullKey}: ${value.join(', ')}\n`;
      } else {
        text += `${fullKey}: ${value}\n`;
      }
    }
    
    return text;
  }

  isSupported(mimeType) {
    return mimeType in this.supportedTypes;
  }

  getSupportedTypes() {
    return Object.keys(this.supportedTypes);
  }
}

export default DocumentProcessor;