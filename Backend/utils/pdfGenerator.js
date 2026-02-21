const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const generateCertificatePDF = async (data) => {
  try {
    const { 
      studentName, 
      courseName, 
      awardDate, 
      certificateCode, 
      template, 
      qrCode,
      instituteId 
    } = data;

    // Create uploads directory
    const uploadsDir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate PDF filename
    const fileName = `${certificateCode.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const pdfPath = path.join(uploadsDir, fileName);

    // Create a new PDF document (landscape, A4)
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50
    });

    // Pipe the PDF to a file
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Set background color
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill(template?.design?.backgroundColor || '#ffffff');

    // Draw border
    const borderColor = template?.design?.borderStyle?.match(/#[a-f0-9]{6}/i)?.[0] || '#2563eb';
    const borderWidth = parseInt(template?.design?.borderStyle) || 3;
    
    doc.lineWidth(borderWidth)
       .strokeColor(borderColor)
       .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .stroke();

    // Add logo if exists
    if (template?.design?.logo) {
      try {
        const logoBuffer = await fetch(template.design.logo).then(res => res.buffer());
        doc.image(logoBuffer, doc.page.width - 150, 50, { width: 80, height: 80 });
      } catch (error) {
        console.log('Logo could not be loaded:', error.message);
      }
    }

    // Add title
    doc.fontSize(template?.layout === 'premium' ? 36 : 30)
       .font('Helvetica-Bold')
       .fillColor('#2563eb')
       .text('CERTIFICATE OF COMPLETION', 0, 150, { align: 'center' });

    // Add subtitle
    doc.fontSize(18)
       .font('Helvetica')
       .fillColor('#4b5563')
       .text('This is to certify that', 0, 220, { align: 'center' });

    // Add student name
    doc.fontSize(template?.layout === 'premium' ? 36 : 32)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text(studentName, 0, 270, { align: 'center' });

    // Add completion text
    doc.fontSize(18)
       .font('Helvetica')
       .fillColor('#4b5563')
       .text('has successfully completed', 0, 340, { align: 'center' });

    // Add course name
    doc.fontSize(template?.layout === 'premium' ? 28 : 24)
       .font('Helvetica-Bold')
       .fillColor('#2563eb')
       .text(courseName, 0, 380, { align: 'center' });

    // Add award date
    const formattedDate = new Date(awardDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text(`Awarded on ${formattedDate}`, 0, 440, { align: 'center' });

    // Add certificate code
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#9ca3af')
       .text(`Certificate ID: ${certificateCode}`, 0, 470, { align: 'center' });

    // Add QR Code
    if (qrCode) {
      try {
        // Convert base64 QR to buffer
        const base64Data = qrCode.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');
        
        // Add QR code to PDF
        doc.image(qrBuffer, doc.page.width / 2 - 60, 500, { 
          width: 120, 
          height: 120,
          align: 'center'
        });
      } catch (error) {
        console.log('QR code could not be added:', error.message);
      }
    }

    // Add signature if exists
    if (template?.design?.signature) {
      try {
        const signatureBuffer = await fetch(template.design.signature).then(res => res.buffer());
        doc.image(signatureBuffer, 100, doc.page.height - 150, { 
          width: 150, 
          height: 60 
        });
      } catch (error) {
        console.log('Signature could not be loaded:', error.message);
      }
    }

    // Add verification text
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#9ca3af')
       .text(
         `Verify at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificateCode}`,
         doc.page.width - 300,
         doc.page.height - 50,
         { width: 250, align: 'right' }
       );

    // Finalize PDF
    doc.end();

    // Return promise that resolves when stream is finished
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        const baseUrl = process.env.API_URL || 'http://localhost:5000';
        const pdfUrl = `${baseUrl}/uploads/certificates/${fileName}`;
        console.log(`✅ PDF generated successfully: ${pdfUrl}`);
        resolve(pdfUrl);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

module.exports = { generateCertificatePDF };