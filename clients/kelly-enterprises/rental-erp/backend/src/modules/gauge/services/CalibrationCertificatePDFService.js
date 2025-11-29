const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../infrastructure/utils/logger');

/**
 * Calibration Certificate PDF Generation Service
 * Generates internal calibration certificates for hand tools
 *
 * NOTE: Requires 'pdfkit' package to be installed
 * Install with: npm install pdfkit
 */
class CalibrationCertificatePDFService {
  constructor() {
    this.letterheadPath = path.join(__dirname, '../../../../../erp-core-docs/frontend-rebuild/7d Letterhead.jpg');
    this.tempDir = path.join(__dirname, '../../../../../temp/certificates');
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating temp directory:', error);
      throw error;
    }
  }

  /**
   * Generate internal calibration certificate PDF
   * @param {Object} calibrationData - Calibration data with measurements
   * @param {Object} gaugeData - Gauge information
   * @returns {Promise<Object>} Generated PDF file information
   */
  async generateCertificate(calibrationData, gaugeData) {
    try {
      // Ensure temp directory exists
      await this.ensureTempDirectory();

      // Check if pdfkit is available
      let PDFDocument;
      try {
        PDFDocument = require('pdfkit');
      } catch (error) {
        throw new Error(
          'PDFKit is not installed. Please run: npm install pdfkit\n' +
          'This package is required for PDF certificate generation.'
        );
      }

      const fileName = `${calibrationData.certificate_number}.pdf`;
      const filePath = path.join(this.tempDir, fileName);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 100, bottom: 50, left: 50, right: 50 }
      });

      // Pipe to file
      const stream = doc.pipe(require('fs').createWriteStream(filePath));

      // Add letterhead if available
      try {
        const stats = await fs.stat(this.letterheadPath);
        if (stats.isFile()) {
          doc.image(this.letterheadPath, 50, 20, { width: 512 });
        }
      } catch (error) {
        logger.warn('Letterhead not found, using text header', { path: this.letterheadPath });
        doc.fontSize(20).text('7D Manufacturing', 50, 40);
      }

      // Certificate title
      doc.moveDown(3);
      doc.fontSize(18).font('Helvetica-Bold').text('CALIBRATION CERTIFICATE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Certificate No: ${calibrationData.certificate_number}`, { align: 'center' });
      doc.moveDown(2);

      // Gauge information section
      doc.fontSize(14).font('Helvetica-Bold').text('Instrument Information');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Gauge ID: ${gaugeData.gauge_id}`);
      doc.text(`Description: ${gaugeData.name || 'Hand Tool'}`);
      doc.text(`Tool Type: ${gaugeData.tool_type || 'N/A'}`);
      doc.text(`Range: ${gaugeData.range_min} - ${gaugeData.range_max} ${gaugeData.range_unit || 'inches'}`);
      doc.text(`Tolerance: ±${gaugeData.tolerance || '0.001'} ${gaugeData.range_unit || 'inches'}`);
      doc.moveDown(1);

      // Calibration details section
      doc.fontSize(14).font('Helvetica-Bold').text('Calibration Details');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Calibration Date: ${new Date(calibrationData.calibration_date).toLocaleDateString()}`);
      doc.text(`Calibrated By: ${calibrationData.technician_name}`);
      doc.text(`Calibration Type: Internal`);
      doc.text(`Temperature: ${calibrationData.temperature || 68}°F`);
      doc.text(`Humidity: ${calibrationData.humidity || 45}%`);
      if (calibrationData.gauge_blocks_used) {
        doc.text(`Reference Standards Used: ${calibrationData.gauge_blocks_used}`);
      }
      doc.moveDown(1);

      // Measurement data table
      doc.fontSize(14).font('Helvetica-Bold').text('Measurement Results');
      doc.moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 150;
      const col3X = 250;
      const col4X = 350;
      const col5X = 450;

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Point', col1X, tableTop);
      doc.text('Reference', col2X, tableTop);
      doc.text('Actual', col3X, tableTop);
      doc.text('Deviation', col4X, tableTop);
      doc.text('Result', col5X, tableTop);

      // Table rows
      doc.font('Helvetica');
      let currentY = tableTop + 20;

      calibrationData.measurement_points.forEach(point => {
        doc.text(point.label, col1X, currentY);
        doc.text(point.reference.toFixed(4), col2X, currentY);
        doc.text(point.actual.toFixed(4), col3X, currentY);
        doc.text(point.deviation.toFixed(4), col4X, currentY);
        doc.text(point.pass ? 'PASS' : 'FAIL', col5X, currentY);
        currentY += 20;
      });

      doc.moveDown(2);

      // Visual inspection
      if (calibrationData.visual_inspection) {
        doc.fontSize(14).font('Helvetica-Bold').text('Visual Inspection');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        Object.entries(calibrationData.visual_inspection).forEach(([key, value]) => {
          if (key !== 'notes') {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            doc.text(`${label}: ${value === true ? 'Pass' : value === false ? 'Fail' : value}`);
          }
        });

        if (calibrationData.visual_inspection.notes) {
          doc.moveDown(0.5);
          doc.text('Notes:', { continued: false });
          doc.text(calibrationData.visual_inspection.notes);
        }
        doc.moveDown(1);
      }

      // Overall result
      const overallPass = calibrationData.passed;
      doc.fontSize(16).font('Helvetica-Bold');
      doc.fillColor(overallPass ? 'green' : 'red');
      doc.text(`Overall Result: ${overallPass ? 'PASS' : 'FAIL'}`, { align: 'center' });
      doc.fillColor('black');
      doc.moveDown(1);

      // Next calibration due date
      doc.fontSize(10).font('Helvetica');
      doc.text(`Next Calibration Due: ${new Date(calibrationData.due_date).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Signature line
      doc.moveTo(100, doc.y).lineTo(300, doc.y).stroke();
      doc.text('Technician Signature', 100, doc.y + 5);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 350, doc.y - 10);

      // Footer
      doc.fontSize(8).text(
        'This certificate is traceable to NIST standards and is valid for internal calibration purposes only.',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );

      // Finalize PDF
      doc.end();

      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const stats = await fs.stat(filePath);

      logger.info('PDF certificate generated', {
        certificateNumber: calibrationData.certificate_number,
        filePath,
        fileSize: stats.size
      });

      return {
        filePath,
        fileName,
        fileSize: stats.size
      };
    } catch (error) {
      logger.error('Error generating PDF certificate:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary PDF file
   * @param {string} filePath - Path to the PDF file
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info('Temp PDF file cleaned up', { filePath });
    } catch (error) {
      logger.warn('Error cleaning up temp PDF file', { filePath, error: error.message });
    }
  }
}

module.exports = new CalibrationCertificatePDFService();
