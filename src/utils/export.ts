/**
 * Export & Share Utilities
 * Export fax history, share receipts, and generate reports
 */

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { FaxJob } from '../state/fax-store';

/**
 * Export fax history to CSV
 */
export async function exportHistoryToCSV(faxHistory: FaxJob[]): Promise<string | null> {
  try {
    // Create CSV header
    const headers = ['Date', 'Recipient', 'Status', 'Pages', 'Documents', 'Has Cover Page'];
    
    // Create CSV rows
    const rows = faxHistory.map(fax => [
      new Date(fax.timestamp).toLocaleString(),
      fax.recipient,
      fax.status,
      fax.totalPages.toString(),
      fax.documents.length.toString(),
      fax.coverPage ? 'Yes' : 'No',
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Save to file
    const fileName = `fax-history-${Date.now()}.csv`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return filePath;
  } catch (error) {
    console.error('Error exporting history to CSV:', error);
    return null;
  }
}

/**
 * Share CSV file
 */
export async function shareFaxHistory(faxHistory: FaxJob[]): Promise<boolean> {
  try {
    const filePath = await exportHistoryToCSV(faxHistory);
    
    if (!filePath) {
      throw new Error('Failed to create CSV file');
    }

    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Fax History',
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    } else {
      console.log('Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('Error sharing fax history:', error);
    return false;
  }
}

/**
 * Generate fax receipt text
 */
export function generateFaxReceipt(fax: FaxJob): string {
  const date = new Date(fax.timestamp).toLocaleString();
  const status = fax.status.toUpperCase();
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FAX RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fax ID: ${fax.id}
Date: ${date}
Status: ${status}

Recipient: ${fax.recipient}
Pages: ${fax.totalPages}
Documents: ${fax.documents.length}
Cover Page: ${fax.coverPage ? 'Yes' : 'No'}

${fax.coverPage ? `
Cover Page Details:
To: ${fax.coverPage.to}
From: ${fax.coverPage.from}
Subject: ${fax.coverPage.subject || 'N/A'}

Message:
${fax.coverPage.message || 'N/A'}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

/**
 * Share fax receipt
 */
export async function shareFaxReceipt(fax: FaxJob): Promise<boolean> {
  try {
    const receipt = generateFaxReceipt(fax);
    const fileName = `fax-receipt-${fax.id}.txt`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, receipt, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Fax Receipt',
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sharing fax receipt:', error);
    return false;
  }
}

/**
 * Generate monthly report
 */
export function generateMonthlyReport(
  faxHistory: FaxJob[],
  month: number,
  year: number
): string {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  const monthlyFaxes = faxHistory.filter(fax => {
    const faxDate = new Date(fax.timestamp);
    return faxDate >= monthStart && faxDate <= monthEnd;
  });

  const totalFaxes = monthlyFaxes.length;
  const successfulFaxes = monthlyFaxes.filter(f => f.status === 'sent').length;
  const failedFaxes = monthlyFaxes.filter(f => f.status === 'failed').length;
  const totalPages = monthlyFaxes.reduce((sum, f) => sum + f.totalPages, 0);
  const costPerPage = 0.10;
  const totalCost = totalPages * costPerPage;

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      MONTHLY FAX REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Period: ${monthStart.toLocaleDateString()} - ${monthEnd.toLocaleDateString()}

SUMMARY
───────────────────────────────
Total Faxes Sent: ${totalFaxes}
Successful: ${successfulFaxes}
Failed: ${failedFaxes}
Success Rate: ${totalFaxes > 0 ? ((successfulFaxes / totalFaxes) * 100).toFixed(1) : 0}%

Total Pages: ${totalPages}
Estimated Cost: $${totalCost.toFixed(2)}
Cost per Page: $${costPerPage.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

/**
 * Export monthly report
 */
export async function shareMonthlyReport(
  faxHistory: FaxJob[],
  month: number,
  year: number
): Promise<boolean> {
  try {
    const report = generateMonthlyReport(faxHistory, month, year);
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    const fileName = `fax-report-${monthName}-${year}.txt`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, report, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Monthly Report',
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sharing monthly report:', error);
    return false;
  }
}
