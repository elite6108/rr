import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../../lib/supabase';
import type { CompanySettings } from '../../../types/database';
import { formatCurrency } from '../../../utils/formatters';

interface SignOffPDFOptions {
  projectName: string;
  date: string;
  projectId: string;
  signoffId: string;
}

export async function generateSignOffPDF({
  projectName,
  date,
  projectId,
  signoffId
}: SignOffPDFOptions): Promise<string> {
  try {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Define theme colors and styles
    const themeColor = '#000000';
    const headerColor = '#edeaea';
    const cellBackgroundColor = '#f7f7f7';
    const detailsHeaderColor = '#edeaea';
    const borderColor = [211, 211, 211]; // Light gray border
    
    // Set default font
    doc.setFont('helvetica');

    // Get user's full name from local storage
    const selectedName = localStorage.getItem('selectedName') || 'Not Set';

    // Fetch contract first
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        contract_id,
        quotes:quote_id (
          quote_number
        )
      `)
      .eq('project_id', projectId)
      .single();

    if (contractError) throw new Error(`Failed to load contract: ${contractError.message}`);
    if (!contract) throw new Error('Contract not found');

    // Then fetch all other data
    const [
      { data: companySettings, error: companyError },
      { data: project, error: projectError },
      { data: signoff, error: signoffError },
      { data: customer, error: customerError }
    ] = await Promise.all([
      supabase.from('company_settings').select('*').limit(1).maybeSingle(),
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('project_signoff').select('*').eq('id', signoffId).single(),
      supabase.from('customers').select('company_name, customer_name').eq('id', contract.customer_id).single()
    ]);

    if (companyError) throw new Error(`Failed to load company settings: ${companyError.message}`);
    if (!companySettings) throw new Error('Company settings not found');
    if (projectError) throw new Error(`Failed to load project: ${projectError.message}`);
    if (signoffError) throw new Error(`Failed to load signoff: ${signoffError.message}`);
    if (customerError) throw new Error(`Failed to load customer: ${customerError.message}`);

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
    doc.text('PROJECT SIGN OFF', 195, 25, { align: 'right' });
    
    // Reset text color and font
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const pageWidth = doc.internal.pageSize.width;
    const leftColumnX = 15; // Left margin
    const rightColumnX = pageWidth / 2 + 5; // Adjusted for proper spacing
    const boxWidth = pageWidth / 2 - 20; // Box width for equal spacing

    let yPos = 45;

    // Company Information (Left Box)
    (doc as any).autoTable({
      startY: yPos,
      head: [[{ content: 'COMPANY INFORMATION', styles: { fillColor: detailsHeaderColor } }]],
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

    // Project Details (Right Box)
    (doc as any).autoTable({
      startY: yPos,
      head: [[{ content: 'PROJECT DETAILS', colSpan: 2, styles: { fillColor: detailsHeaderColor } }]],
      body: [
        [{ content: 'Customer:', styles: { fontStyle: 'bold' } }, customer.company_name || customer.customer_name || 'Unknown Customer'],
        [{ content: 'Project:', styles: { fontStyle: 'bold' } }, projectName],
        [{ content: 'Project Manager:', styles: { fontStyle: 'bold' } }, project.project_manager],
        [{ content: 'Quote:', styles: { fontStyle: 'bold' } }, contract.quotes ? `${contract.quotes.quote_number}` : 'N/A'],
        [{ content: 'Contract:', styles: { fontStyle: 'bold' } }, contract.contract_id || 'N/A'],
        [{ content: 'Project Amount:', styles: { fontStyle: 'bold' } }, formatCurrency(contract.payment_amount)],
        [{ content: 'Project Start:', styles: { fontStyle: 'bold' } }, new Date(contract.project_start_date).toLocaleDateString()],
        //[{ content: 'Sign Off:', styles: { fontStyle: 'bold' } }, new Date(signoff.created_at).toLocaleDateString()]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: headerColor,
        textColor: 'black',
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        fillColor: cellBackgroundColor,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      columnStyles: { 
        0: { cellWidth: boxWidth * 0.4 },
        1: { cellWidth: boxWidth * 0.6 }
      },
      margin: { left: rightColumnX, right: 15 },
      tableWidth: boxWidth
    });

    // Ensure we start after both boxes
    yPos = Math.max(
      (doc as any).lastAutoTable.finalY + 10,
      (doc as any).previousAutoTable.finalY + 10
    );

    // Project Information Section
    (doc as any).autoTable({
      startY: yPos,
      head: [[{ content: 'PROJECT INFORMATION', styles: { fillColor: detailsHeaderColor } }]],
      body: [[
        { content: `I hereby confirm that the construction work described in this document has been completed to the agreed specifications, standards, and satisfaction in accordance to the ${contract.quotes ? `quote ${contract.quotes.quote_number}` : 'contract'} and subsequent contract ${contract.contract_id} dated ${new Date(contract.created_at).toLocaleDateString()}. All necessary inspections have been carried out.\n\nBy signing below, I acknowledge that I have reviewed the completed works and approve for handover.` }
      ]],
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
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Signatures Section
    (doc as any).autoTable({
      startY: yPos,
      head: [[{ content: 'SIGNATURES', colSpan: 2, styles: { fillColor: detailsHeaderColor } }]],
      body: [[
        { content: `To be signed by: ${customer.company_name || customer.customer_name || 'Unknown Customer'}\n\nPrint Name: ____________________________\n\nSignature: ______________________________\n\nDate: _________________________________` },
        { content: `To be signed by: ${project.project_manager}\n\nPrint Name: ____________________________\n\nSignature: ______________________________\n\nDate: _________________________________` }
      ]],
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
      margin: { left: 15, right: 15 }
    });

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
