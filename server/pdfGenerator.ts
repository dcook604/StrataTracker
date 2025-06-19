import PDFDocument from 'pdfkit';
import express from 'express';
import { Violation, PropertyUnit, ViolationCategory } from '@shared/schema';
import { format } from 'date-fns';

interface ReportStats {
  totalViolations: number;
  resolvedViolations: number;
  averageResolutionTimeDays: number | null;
}

interface FilterCriteria {
  fromDate?: Date;
  toDate?: Date;
  categoryName?: string;
}

export function generateViolationsPdf( 
  stats: ReportStats,
  violations: (Violation & { unit: PropertyUnit, category?: ViolationCategory })[],
  filters: FilterCriteria,
  res: express.Response // Express Response object
): void {
  const doc = new PDFDocument({ margin: 50, layout: 'portrait', size: 'A4' });

  // Helper to get margin values safely
  const getMargin = (side: 'left' | 'right' | 'top' | 'bottom'): number => {
    const defaultMargin = 50; // Matches the initialization
    if (doc.options.margins) {
      return doc.options.margins[side] ?? defaultMargin;
    }
    return defaultMargin;
  };

  // Pipe the PDF to the response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=violations_report.pdf');
  doc.pipe(res);

  // Title
  doc.fontSize(20).text('Violations Report', { align: 'center' });
  doc.moveDown();

  // Filters Applied
  doc.fontSize(10).text('Filters Applied:', { underline: true });
  doc.text(`Date Range: ${filters.fromDate ? format(filters.fromDate, 'MMM dd, yyyy') : 'N/A'} - ${filters.toDate ? format(filters.toDate, 'MMM dd, yyyy') : 'N/A'}`);
  doc.text(`Category: ${filters.categoryName || 'All Categories'}`);
  doc.moveDown();

  // Summary Statistics
  doc.fontSize(12).text('Summary Statistics:', { underline: true });
  doc.text(`Total Violations: ${stats.totalViolations}`);
  doc.text(`Resolved Violations: ${stats.resolvedViolations}`);
  const resolutionRate = stats.totalViolations > 0 ? ((stats.resolvedViolations / stats.totalViolations) * 100).toFixed(1) : '0';
  doc.text(`Resolution Rate: ${resolutionRate} %`);
  doc.text(`Average Resolution Time: ${stats.averageResolutionTimeDays !== null ? stats.averageResolutionTimeDays + ' days' : 'N/A'}`);
  doc.moveDown(2);

  // Violations Table
  doc.fontSize(14).text('Detailed Violations List:', { underline: true });
  doc.moveDown();

  // const itemMargin = 20; // itemMargin is not used if we base everything on page margins

  const colWidthId = 40;
  const colWidthUnit = 60;
  const colWidthDate = 70;
  const colWidthType = 100; // Category column
  const colWidthStatus = 70;
  const colWidthFine = 50;
  
  // Refined calculation for Description column width
  const usableWidth = doc.page.width - getMargin('left') - getMargin('right');
  const sumOfOtherCols = colWidthId + colWidthUnit + colWidthDate + colWidthType + colWidthStatus + colWidthFine;
  const colWidthDesc = usableWidth - sumOfOtherCols;

  function drawTableHeader() {
    doc.fontSize(8).font('Helvetica-Bold');
    let currentX = getMargin('left'); // Start at left page margin
    doc.text('ID', currentX, doc.y, { width: colWidthId, lineBreak: false });
    currentX += colWidthId;
    doc.text('Unit', currentX, doc.y, { width: colWidthUnit, lineBreak: false });
    currentX += colWidthUnit;
    doc.text('Date', currentX, doc.y, { width: colWidthDate, lineBreak: false });
    currentX += colWidthDate;
    doc.text('Category', currentX, doc.y, { width: colWidthType, lineBreak: false });
    currentX += colWidthType;
    doc.text('Status', currentX, doc.y, { width: colWidthStatus, lineBreak: false });
    currentX += colWidthStatus;
    doc.text('Fine', currentX, doc.y, { width: colWidthFine, align: 'right', lineBreak: false });
    currentX += colWidthFine;
    doc.text('Description', currentX, doc.y, { width: colWidthDesc, lineBreak: false });
    doc.moveDown();
    doc.font('Helvetica');
  }

  drawTableHeader();

  violations.forEach(v => {
    if (doc.y > doc.page.height - getMargin('bottom') - 50) { // Check for page break, ensuring space for a few lines + bottom margin
      doc.addPage();
      drawTableHeader();
    }
    doc.fontSize(8);
    let currentX = getMargin('left'); // Start each row at the left page margin
    const idText = `VIO-${v.id}`;
    const unitText = v.unit.unitNumber;
    const dateText = format(new Date(v.createdAt), 'yyyy-MM-dd');
    const typeText = v.category?.name || v.violationType || 'N/A';
    const statusText = v.status;
    const fineText = v.fineAmount ? `$${v.fineAmount.toFixed(2)}` : 'N/A';
    const descText = v.description || 'No description';
    
    const rowHeight = Math.max(
        doc.heightOfString(idText, { width: colWidthId }),
        doc.heightOfString(unitText, { width: colWidthUnit }),
        doc.heightOfString(dateText, { width: colWidthDate }),
        doc.heightOfString(typeText, { width: colWidthType }),
        doc.heightOfString(statusText, { width: colWidthStatus }),
        doc.heightOfString(fineText, { width: colWidthFine }),
        doc.heightOfString(descText, { width: colWidthDesc })
    );

    doc.text(idText, currentX, doc.y, { width: colWidthId, height: rowHeight, lineBreak: false });
    currentX += colWidthId;
    doc.text(unitText, currentX, doc.y, { width: colWidthUnit, height: rowHeight, lineBreak: false });
    currentX += colWidthUnit;
    doc.text(dateText, currentX, doc.y, { width: colWidthDate, height: rowHeight, lineBreak: false });
    currentX += colWidthDate;
    doc.text(typeText, currentX, doc.y, { width: colWidthType, height: rowHeight, lineBreak: false });
    currentX += colWidthType;
    doc.text(statusText, currentX, doc.y, { width: colWidthStatus, height: rowHeight, lineBreak: false });
    currentX += colWidthStatus;
    doc.text(fineText, currentX, doc.y, { width: colWidthFine, height: rowHeight, align: 'right', lineBreak: false });
    currentX += colWidthFine;
    doc.text(descText, currentX, doc.y, { width: colWidthDesc, height: rowHeight }); // Last item can wrap
    doc.y += rowHeight + 5; // Move y down after the row ensuring space
    doc.x = getMargin('left'); // Correctly reset x to the left page margin for the next row/content
  });

  // Finalize the PDF and end the stream
  doc.end();
} 