import { notify } from '../../services/notifications';
import { formatDisplayDate } from './verificationData';
export default function printCertificate({
  certificateRef,
  verificationResult
}) {
  if (!certificateRef.current) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    notify('Please allow pop-ups to print');
    return;
  }
  const awardDate = formatDisplayDate(verificationResult.awardDate);
  const escapePrint = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[character]
    );
  printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${escapePrint(verificationResult.certificateCode)}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              max-width: 1000px;
              margin: 0 auto;
            }
            h1 { 
              color: #2563eb; 
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .certificate-container {
              margin: 30px 0;
              text-align: center;
            }
            .certificate-image { 
              max-width: 100%; 
              height: auto; 
              margin: 20px 0; 
              border: 1px solid #ddd;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .certificate-details { 
              margin: 30px auto; 
              max-width: 600px; 
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
            }
            .detail-row { 
              display: flex; 
              margin: 10px 0; 
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            .label { 
              font-weight: bold; 
              width: 150px; 
              color: #4b5563;
            }
            .value { 
              flex: 1; 
              color: #111827;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 14px;
              font-weight: 500;
              background: ${verificationResult.status === 'issued' ? '#d1fae5' : '#fee2e2'};
              color: ${verificationResult.status === 'issued' ? '#065f46' : '#991b1b'};
            }
          </style>
        </head>
        <body>
          <h1>Certificate Verification</h1>
          
          <div class="certificate-container">
            <img src="${escapePrint(verificationResult.certificateImage)}" class="certificate-image" />
          </div>
          
          <div class="certificate-details">
            <div class="detail-row">
              <span class="label">Certificate Code:</span>
              <span class="value">${escapePrint(verificationResult.certificateCode)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Student Name:</span>
              <span class="value">${escapePrint(verificationResult.studentName)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Course Name:</span>
              <span class="value">${escapePrint(verificationResult.courseName)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Award Date:</span>
              <span class="value">${awardDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Institute:</span>
              <span class="value">${escapePrint(verificationResult.instituteName)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value"><span class="status-badge">${verificationResult.status?.toUpperCase()}</span></span>
            </div>
          </div>
          
          <div class="footer">
            <p>Verified on ${new Date().toLocaleString()}</p>
            <p>This is an official verification from the Certificate Verification System</p>
          </div>
        </body>
      </html>
    `);
  printWindow.document.close();
  printWindow.print();
}
