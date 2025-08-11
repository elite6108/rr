import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../../lib/supabase';

interface CoshhSubstance {
  id: string;
  substance_name: string;
  manufacturer: string;
  category: string;
  storage_location: string;
  hazard_sheet_location: string;
  added_date: string;
  review_date: string;
  reviewed_date?: string;
  auditor: string;
  created_at: string;
  updated_at: string;
}

interface CompanySettings {
  name: string;
  address_line1: string;
  address_line2?: string;
  town: string;
  county: string;
  post_code: string;
  phone: string;
  email: string;
  logo_url?: string;
  company_number?: string;
  vat_number?: string;
}

export async function generateCoshhRegisterPDF(substances: CoshhSubstance[]): Promise<string> {
  try {
    // Create new PDF document in landscape orientation (A4 landscape = 297mm x 210mm)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Define theme colors and styles
    const themeColor = '#000000';
    const headerColor = '#edeaea';
    const cellBackgroundColor = '#f7f7f7';
    const borderColor = [211, 211, 211]; // Light gray border
    
    // Set default font
    doc.setFont('helvetica');

    // Fetch company settings for logo
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (companyError) throw new Error(`Failed to load company settings: ${companyError.message}`);
    if (!companySettings) throw new Error('Company settings not found');

    // Add company logo if exists
    if (companySettings.logo_url) {
      try {
        const response = await fetch(companySettings.logo_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch logo: ${response.statusText}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            try {
              if (reader.result) {
                // Calculate dimensions to maintain aspect ratio
                const maxWidth = 40;
                const maxHeight = 20;
                const aspectRatio = 300/91; // Default aspect ratio
                let width = maxWidth;
                let height = width / aspectRatio;
                
                if (height > maxHeight) {
                  height = maxHeight;
                  width = height * aspectRatio;
                }

                doc.addImage(
                  reader.result as string,
                  'PNG',
                  15,
                  15,
                  width,
                  height,
                  undefined,
                  'FAST'
                );
              }
              resolve(null);
            } catch (error) {
              reject(new Error(`Failed to add logo to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read logo file'));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error loading company logo:', error);
        // Continue without logo
      }
    }

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(themeColor);
    doc.text('COSHH REGISTER', 280, 25, { align: 'right' }); // Adjusted for landscape
    
    // Reset text color and font
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let yPos = 45;

    const pageWidth = doc.internal.pageSize.width; // This will be larger in landscape
    const leftColumnX = 15; // Left margin
    const rightColumnX = pageWidth / 2 + 5; // Adjusted for proper spacing
    const boxWidth = pageWidth / 2 - 20; // Box width for equal spacing

    // Company Information (Left Side)
    (doc as any).autoTable({
      startY: yPos,
      head: [['COMPANY INFORMATION']],
      body: [
        [{
          content: [
            { text: companySettings.name, styles: { fontStyle: 'bold' } },
            { text: '\n' + companySettings.address_line1 }, 
            { text: companySettings.address_line2 ? '\n' + companySettings.address_line2 : '' },
            { text: `\n${companySettings.town}, ${companySettings.county}` },
            { text: '\n' + companySettings.post_code },
            { text: '\n\n'+ companySettings.phone },  
            { text: '\n' + companySettings.email }
          ].map(item => item.text).join(''),
          styles: { cellWidth: 'auto', halign: 'left' }
        }]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: headerColor,
        textColor: 'black',
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        fillColor: cellBackgroundColor,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      margin: { left: leftColumnX, right: rightColumnX },
      tableWidth: boxWidth
    });

    // Register Information (Right Side)
    (doc as any).autoTable({
      startY: yPos,
      head: [['REGISTER DETAILS']],
      body: [
        [{ 
          content: [
            `Generated: ${new Date().toLocaleDateString()}`,
            `\nTotal Substances: ${substances.length}`,
            `\nLast Updated: ${substances.length > 0 ? new Date(Math.max(...substances.map(s => new Date(s.updated_at).getTime()))).toLocaleDateString() : 'N/A'}`,
            '\n\nThis register contains all COSHH substances currently stored and managed by the organisation.'
          ].join(''),
          styles: { cellWidth: 'auto', halign: 'left' }
        }]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: headerColor,
        textColor: 'black',
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        fillColor: cellBackgroundColor,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      margin: { left: rightColumnX, right: 15 },
      tableWidth: boxWidth
    });

    yPos = 110; // Adjusted for landscape

    // COSHH Substances Table with 8 columns - full width table
    (doc as any).autoTable({
      startY: yPos,
      head: [['SUBSTANCE NAME', 'MANUFACTURER', 'CATEGORY', 'STORAGE LOCATION', 'HAZARD SHEET LOCATION', 'DATE ADDED', 'REVIEWED ON', 'NEXT REVIEW']],
      body: substances.map(substance => [
        substance.substance_name,
        substance.manufacturer,
        substance.category,
        substance.storage_location,
        substance.hazard_sheet_location,
        substance.added_date ? new Date(substance.added_date).toLocaleDateString() : '-',
        substance.reviewed_date ? new Date(substance.reviewed_date).toLocaleDateString() : '-',
        substance.review_date ? new Date(substance.review_date).toLocaleDateString() : '-'
      ]),
      headStyles: {
        fillColor: headerColor,
        textColor: themeColor,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 2,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 40 }, // Substance Name - increased slightly
        1: { cellWidth: 36 }, // Manufacturer - increased slightly
        2: { cellWidth: 42 }, // Category - increased slightly
        3: { cellWidth: 34 }, // Storage Location - increased slightly
        4: { cellWidth: 40 }, // Hazard Sheet Location - increased slightly
        5: { cellWidth: 25 }, // Date Added - increased slightly
        6: { cellWidth: 25 }, // Reviewed On - increased slightly
        7: { cellWidth: 25 }  // Next Review - increased slightly
      },
      bodyStyles: {
        fillColor: cellBackgroundColor,
        fontSize: 8,
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: '#ffffff'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: borderColor,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        halign: 'left'
      },
      theme: 'grid',
      margin: { left: leftColumnX, right: 15 },
      tableWidth: pageWidth - leftColumnX - 15
    });

    // Add summary information if substances exist
    if (substances.length > 0) {
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Category breakdown
      const categoryCount = substances.reduce((acc, substance) => {
        acc[substance.category] = (acc[substance.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryData = Object.entries(categoryCount).map(([category, count]) => [
        category,
        count.toString()
      ]);

      (doc as any).autoTable({
        startY: yPos,
        head: [['CATEGORY BREAKDOWN', 'COUNT']],
        body: categoryData,
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: cellBackgroundColor
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: borderColor
        },
        theme: 'plain',
        margin: { left: 15, right: 15 },
        tableWidth: 'auto'
      });
    }

    // Add page numbers and footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      // Add company details and page number in footer
      const footerParts = [];
      if (companySettings.company_number) {
        footerParts.push(`Company Number: ${companySettings.company_number}`);
      }
      if (companySettings.vat_number) {
        footerParts.push(`VAT Number: ${companySettings.vat_number}`);
      }
      
      if (footerParts.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        
        const footerText = footerParts.join('   ');
        const pageNumberText = `Page ${i} of ${pageCount}`;
        
        // Calculate positions
        const footerWidth = doc.getTextWidth(footerText);
        const pageNumberWidth = doc.getTextWidth(pageNumberText);
        
        // Draw footer text on the left and page number on the right
        doc.text(footerText, 15, pageHeight - 10); // Left margin of 15px
        doc.text(pageNumberText, pageWidth - pageNumberWidth - 15, pageHeight - 10); // Right margin of 15px
      }
    }

    // Return the PDF as a data URL
    return doc.output('dataurlstring');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
