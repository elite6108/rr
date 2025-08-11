import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../../lib/supabase';

interface CoshhAssessment {
  id: string;
  substance_name: string;
  coshh_reference: string;
  supplied_by: string;
  description_of_substance: string;
  form: string;
  odour: string;
  method_of_use: string;
  site_and_location: string;
  assessment_date: string;
  review_date: string;
  persons_at_risk: string[];
  routes_of_entry: string[];
  selected_ppe: string[];
  selected_hazards: string[];
  ppe_location: string;
  hazards_precautions: string;
  carcinogen: boolean;
  sk: boolean;
  sen: boolean;
  ingredient_items: Array<{
    ingredient_name: string;
    wel_twa_8_hrs: string;
    stel_15_mins: string;
  }>;
  occupational_exposure: string;
  maximum_exposure: string;
  workplace_exposure: string;
  stel: string;
  stability_reactivity: string;
  ecological_information: string;
  amount_used: string;
  times_per_day: string;
  duration: string;
  how_often_process: string;
  how_long_process: string;
  general_precautions: string;
  first_aid_measures: string;
  accidental_release_measures: string;
  ventilation: string;
  handling: string;
  storage: string;
  further_controls: string;
  respiratory_protection: string;
  ppe_details: string;
  monitoring: string;
  health_surveillance: string;
  additional_control_items: string[];
  responsibility: string;
  by_when: string;
  spillage_procedure: string;
  fire_explosion: string;
  handling_storage: string;
  disposal_considerations: string;
  assessment_comments: string;
  q1_answer: boolean;
  q1_action: string;
  q2_answer: boolean;
  q2_action: string;
  q3_answer: boolean;
  q3_action: string;
  q4_answer: boolean;
  q4_action: string;
  q5_answer: boolean;
  q5_action: string;
  assessment_conclusion: string;
  hazard_level: string;
  assessor_name: string;
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

// PPE Constants - same as CoshhAssessments.tsx
const PRIORITY_PPE = [
  'Safety Gloves',
  'Safety Footwear',
  'Hi Vis Clothing',
  'Hard Hat',
  'Safety Goggles',
  'Hearing Protection',
  'Protective Clothing',
  'P3 Masks',
  'Face Shield',
  'Respirator Hoods'
];

const OTHER_PPE = [
  'Connect an earth terminal to the ground',
  'Disconnect before carrying out maintenance or repair',
  'Disconnect mains plug from electrical outlet',
  'Disinfect surface',
  'Disinfect your hands',
  'Ensure continuous ventilation',
  'Entry only with supervisor outside',
  'General mandatory action sign',
  'Install locks and keep locked',
  'Install or check guard',
  'Opaque eye protection must be worn',
  'Place trash in the bin',
  'Refer to instruction manual',
  'Secure gas cylinders',
  'Sound your horn',
  'Use barrier cream',
  'Use breathing equipment',
  'Use footbridge',
  'Use footwear with antistatic or antispark features',
  'Use gas detector',
  'Use guard to protect from injury from the table saw',
  'Use handrail',
  'Use protective apron',
  'Use this walkway',
  'Ventilate before and during entering',
  'Wash your hands',
  'Wear a safety harness',
  'Wear a welding mask',
  'Wear safety belts'
];

// Map of PPE names to their filenames - comprehensive mapping with variations
const PPE_FILENAMES: { [key: string]: string } = {
  // Standard PPE items
  'Safety Gloves': 'wear-protective-gloves.png',
  'Gloves': 'wear-protective-gloves.png',
  'Protective Gloves': 'wear-protective-gloves.png',
  'Safety Footwear': 'wear-foot-protection.png',
  'Hi Vis Clothing': 'wear-high-visibility-clothing.png',
  'Hard Hat': 'wear-head-protection.png',
  'Safety Goggles': 'wear-eye-protection.png',
  'Hearing Protection': 'wear-ear-protection.png',
  'Protective Clothing': 'wear-protective-clothing.png',
  'Protective clothing': 'wear-protective-clothing.png',
  'P3 Masks': 'wear-a-mask.png',
  'FFP3 respirators': 'wear-a-mask.png',
  'FFP3 Respirators': 'wear-a-mask.png',
  'Face Shield': 'wear-a-face-shield.png',
  'Respirator Hoods': 'wear-respiratory-protection.png',
  'Respiratory Protection': 'wear-respiratory-protection.png',
  // Additional PPE items
  'Connect an earth terminal to the ground': 'connect-an-earth-terminal-to-the-ground.png',
  'Disconnect before carrying out maintenance or repair': 'disconnect-before-carrying-out-maintenance-or-repair.png',
  'Disconnect mains plug from electrical outlet': 'disconnect-mains-plug-from-electrical-outlet.png',
  'Disinfect surface': 'disinfect-surface.png',
  'Disinfect your hands': 'disinfect-your-hands.png',
  'Ensure continuous ventilation': 'ensure-continuous-ventilation.png',
  'Entry only with supervisor outside': 'entry-only-with-supervisor-outside.png',
  'General mandatory action sign': 'general-mandatory-action-sign.png',
  'Install locks and keep locked': 'install-locks-and-keep-locked.png',
  'Install or check guard': 'install-or-check-guard.png',
  'Opaque eye protection must be worn': 'opaque-eye-protection-must-be-worn.png',
  'Place trash in the bin': 'place-trash-in-the-bin.png',
  'Refer to instruction manual': 'refer-to-instruction-manual.png',
  'Secure gas cylinders': 'secure-gas-cylinders.png',
  'Sound your horn': 'sound-your-horn.png',
  'Use barrier cream': 'use-barrier-cream.png',
  'Use breathing equipment': 'use-breathing-equipment.png',
  'Use footbridge': 'use-footbridge.png',
  'Use footwear with antistatic or antispark features': 'use-footwear-with-anti-static-or-anti-spark-features.png',
  'Use gas detector': 'use-gas-detector.png',
  'Use guard to protect from injury from the table saw': 'use-guard-to-protect-from-injury-from-the-table-saw.png',
  'Use handrail': 'use-handrail.png',
  'Use protective apron': 'use-protective-apron.png',
  'Use this walkway': 'use-this-walkway.png',
  'Ventilate before and during entering': 'ventilate-before-and-during-entering.png',
  'Wash your hands': 'wash-your-hands.png',
  'Wear a safety harness': 'wear-a-safety-harness.png',
  'Wear a welding mask': 'wear-a-welding-mask.png',
  'Wear safety belts': 'wear-safety-belts.png'
};

// Hazard Constants
const HAZARDS = [
  'Acute Toxicity',
  'Corrosive', 
  'Flammable',
  'Gas Under Pressure',
  'Hazardous to Environment',
  'Health Hazard',
  'Oxidising',
  'Serious Health Hazard'
];

// Map of hazard names to their filenames in signage-artwork bucket - comprehensive mapping
const HAZARD_FILENAMES: { [key: string]: string } = {
  // Standard GHS hazard symbols
  'Acute Toxicity': 'acute-toxicity.png',
  'Corrosive': 'corrosive.png',
  'Flammable': 'flammable.png',
  'Gas Under Pressure': 'gas-under-pressure.png',
  'Hazardous to Environment': 'hazardous-to-environment.png',
  'Health Hazard': 'health-hazard.png',
  'Oxidising': 'oxidising.png',
  'Serious Health Hazard': 'serious-health-hazard.png',
  // Additional hazard variations and synonyms
  'Lung Irritant': 'health-hazard.png',
  'Carcinogen': 'serious-health-hazard.png',
  'Respiratory Sensitizer': 'health-hazard.png',
  'Respiratory Sensitiser': 'health-hazard.png',
  'Skin Sensitizer': 'health-hazard.png',
  'Skin Sensitiser': 'health-hazard.png',
  'Toxic': 'acute-toxicity.png',
  'Highly Toxic': 'acute-toxicity.png',
  'Harmful': 'health-hazard.png',
  'Irritant': 'health-hazard.png',
  'Environmental Hazard': 'hazardous-to-environment.png',
  'Explosive': 'flammable.png',
  'Compressed Gas': 'gas-under-pressure.png'
};

// Function to get a signed URL for a PPE icon
const getSignedPPEImageUrl = async (filename: string) => {
  if (!filename) return null;
  
  try {
    const { data } = await supabase.storage
      .from('ppe-icons')
      .createSignedUrl(filename, 3600);
      
    return data?.signedUrl;
  } catch (error) {
    console.error('Error generating signed PPE URL:', error);
    return null;
  }
};

// Function to get a signed URL for a hazard icon
const getSignedHazardImageUrl = async (filename: string) => {
  if (!filename) return null;
  
  try {
    const { data } = await supabase.storage
      .from('signage-artwork')
      .createSignedUrl(filename, 3600);
      
    return data?.signedUrl;
  } catch (error) {
    console.error('Error generating signed hazard URL:', error);
    return null;
  }
};

export async function generateCoshhAssessmentPDF(assessment: CoshhAssessment): Promise<string> {
  try {
    console.log('Starting PDF generation process...');
    console.log('Assessment data received:', assessment);
    console.log('Assessment substance_name:', assessment.substance_name);
    console.log('Assessment coshh_reference:', assessment.coshh_reference);
    console.log('Assessment selected_ppe:', assessment.selected_ppe);
    console.log('Assessment selected_hazards:', assessment.selected_hazards);
    
    // Helper to safely parse array fields that might be stored as JSON strings
    const parseArrayField = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [field]; // If it's just a string, treat it as single item array
        }
      }
      return [];
    };
    
    // Helper to safely parse ingredient items
    const parseIngredientItems = (field: any): Array<{ingredient_name: string; wel_twa_8_hrs: string; stel_15_mins: string}> => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };
    
    // Parse array fields
    const personsAtRisk = parseArrayField(assessment.persons_at_risk);
    const routesOfEntry = parseArrayField(assessment.routes_of_entry);
    const selectedPPE = parseArrayField(assessment.selected_ppe);
    const selectedHazards = parseArrayField(assessment.selected_hazards);
    const additionalControlItems = parseArrayField(assessment.additional_control_items);
    const ingredientItems = parseIngredientItems(assessment.ingredient_items);

    console.log('Parsed personsAtRisk:', personsAtRisk);
    console.log('Parsed routesOfEntry:', routesOfEntry);
    console.log('Parsed selectedPPE:', selectedPPE);
    console.log('Parsed selectedHazards:', selectedHazards);
    console.log('Parsed ingredientItems:', ingredientItems);
    
    // Check if jsPDF is available
    if (typeof jsPDF === 'undefined') {
      throw new Error('jsPDF library is not available. Please ensure jsPDF is installed.');
    }
    
    console.log('jsPDF library detected, creating document...');
    
    // Create new PDF document in portrait orientation
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    console.log('PDF document created successfully');
    
    // Define theme colors and styles
    const themeColor = '#000000';
    const headerColor = '#edeaea';
    const cellBackgroundColor = '#f7f7f7';
    const borderColor = [211, 211, 211]; // Light gray border
    
    // Set default font
    doc.setFont('helvetica');

    console.log('Fetching company settings...');
    
    // Fetch company settings for logo
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (companyError) {
      console.error('Company settings error:', companyError);
      throw new Error(`Failed to load company settings: ${companyError.message}`);
    }
    if (!companySettings) {
      console.error('No company settings found');
      throw new Error('Company settings not found');
    }

    console.log('Company settings loaded:', companySettings.name);

    // Add company logo if exists
    if (companySettings.logo_url) {
      try {
        console.log('Loading company logo...');
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
                console.log('Logo added successfully');
              }
              resolve(null);
            } catch (error) {
              console.error('Error adding logo:', error);
              reject(new Error(`Failed to add logo to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          };
          reader.onerror = () => {
            console.error('Error reading logo file');
            reject(new Error('Failed to read logo file'));
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error loading company logo:', error);
        // Continue without logo
      }
    } else {
      console.log('No company logo URL found');
    }

    console.log('Building PDF content...');

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(themeColor);
    doc.text('COSHH ASSESSMENT', 190, 25, { align: 'right' });
    
    // Reset text color and font
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let yPos = 45;

    const pageWidth = doc.internal.pageSize.width;
    const leftColumnX = 15; // Left margin
    const rightColumnX = pageWidth / 2 + 5;
    const boxWidth = pageWidth / 2 - 20;

    // Company Information (Left Side)
    (doc as any).autoTable({
      startY: yPos,
      head: [['COMPANY INFORMATION']],
      body: [
        [{
          content: [
            companySettings.name,
            companySettings.address_line1,
            companySettings.address_line2 || '',
            `${companySettings.town}, ${companySettings.county}`,
            companySettings.post_code,
            '',
            companySettings.phone,
            companySettings.email
          ].filter(line => line).join('\n'),
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

    // Assessment Information (Right Side)
    (doc as any).autoTable({
      startY: yPos,
      head: [['ASSESSMENT DETAILS']],
      body: [
        [{
          content: [
            `Assessment Date: ${assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString() : 'N/A'}`,
            `Review Date: ${assessment.review_date ? new Date(assessment.review_date).toLocaleDateString() : 'N/A'}`,
            `Assessor: ${assessment.assessor_name || 'N/A'}`,
            `COSHH Reference: ${assessment.coshh_reference || 'N/A'}`,
            assessment.hazard_level ? `Hazard Level: ${assessment.hazard_level}` : '',
            '',
                    ].filter(line => line).join('\n'),
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

    yPos = 110;

    // Helper to build row with label and value ensuring value is string
    const buildRow = (label: string, value: any) => {
      const displayValue = (value === undefined || value === null || value === '') ? 'N/A' : String(value);
      return [
        { content: label, styles: { fontStyle: 'bold' } },
        { content: displayValue, styles: { halign: 'left' } }
      ];
    };

    const substanceDetailsData = [
      buildRow('Name of Substance', assessment.substance_name),
      buildRow('COSHH Reference', assessment.coshh_reference),
      buildRow('Supplied by', assessment.supplied_by),
      buildRow('Description of Substance', assessment.description_of_substance),
      buildRow('Form', assessment.form),
      buildRow('Odour', assessment.odour),
      buildRow('Method of Use', assessment.method_of_use),
      buildRow('Site and Location', assessment.site_and_location),
      buildRow('Persons at Risk', personsAtRisk.join(', ')),
      buildRow('Routes of Entry', routesOfEntry.join(', '))
    ];

    console.log('Substance details data (after buildRow):', substanceDetailsData);

    (doc as any).autoTable({
      startY: yPos,
      head: [['SUBSTANCE DETAILS', '']],
      body: substanceDetailsData,
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
        lineColor: borderColor,
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 130 }
      },
      theme: 'grid',
      margin: { left: 15, right: 15 },
      tableWidth: 180
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Chemical Properties Section
    const chemicalPropertiesData = [];
    if (assessment.carcinogen !== undefined) {
      chemicalPropertiesData.push(buildRow('Carcinogen', assessment.carcinogen ? 'Yes' : 'No'));
    }
    if (assessment.sk !== undefined) {
      chemicalPropertiesData.push(buildRow('Sk (Skin Notation)', assessment.sk ? 'Yes' : 'No'));
    }
    if (assessment.sen !== undefined) {
      chemicalPropertiesData.push(buildRow('Sen (Sensitiser)', assessment.sen ? 'Yes' : 'No'));
    }

    if (chemicalPropertiesData.length > 0) {
      (doc as any).autoTable({
        startY: yPos,
        head: [['CHEMICAL PROPERTIES', '']],
        body: chemicalPropertiesData,
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: cellBackgroundColor
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'left'
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Ingredient Items Section
    if (ingredientItems.length > 0) {
      const ingredientTableData = ingredientItems.map(item => [
        item.ingredient_name || 'N/A',
        item.wel_twa_8_hrs || 'N/A',
        item.stel_15_mins || 'N/A'
      ]);

      (doc as any).autoTable({
        startY: yPos,
        head: [['INGREDIENT NAME', 'WEL TWA 8 HRS', 'STEL (15 MINS)']],
        body: ingredientTableData,
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: cellBackgroundColor
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 }
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'left'
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // PPE Requirements Section with Images
    if (selectedPPE.length > 0) {
      console.log('Creating PPE Requirements section with images...');
      const maxColumns = 4;
      const tableBody = [];

      // Process PPE items in groups of 4
      for (let i = 0; i < selectedPPE.length; i += maxColumns) {
        const rowItems = selectedPPE.slice(i, i + maxColumns);
        const row = await Promise.all(rowItems.map(async (item: string) => {
          const filename = PPE_FILENAMES[item];
          if (!filename) {
            console.warn(`No filename found for PPE item: ${item} - displaying text only`);
            return {
              content: item,
              styles: {
                fillColor: cellBackgroundColor,
                halign: 'center',
                valign: 'middle',
                cellPadding: 5,
                cellWidth: (180) / maxColumns,
                fontSize: 9
              }
            };
          }

          try {
            const signedUrl = await getSignedPPEImageUrl(filename);
            if (!signedUrl) {
              console.warn(`Failed to get signed URL for PPE item: ${item} - displaying text only`);
              return {
                content: item,
                styles: {
                  fillColor: cellBackgroundColor,
                  halign: 'center',
                  valign: 'middle',
                  cellPadding: 5,
                  cellWidth: (180) / maxColumns,
                  fontSize: 9
                }
              };
            }

            const response = await fetch(signedUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

            const blob = await response.blob();
            const reader = new FileReader();
            const imageData = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            return {
              content: `\n\n\n${item}`,
              styles: {
                fillColor: cellBackgroundColor,
                halign: 'center',
                valign: 'middle',
                cellPadding: { top: 25, bottom: 5, left: 3, right: 3 },
                cellWidth: (180) / maxColumns,
                fontSize: 9
              },
              image: imageData,
              imageOptions: {
                imageData,
                x: 0,
                y: 0,
                width: 20,
                height: 20
              }
            };
          } catch (error) {
            console.warn(`Error loading PPE image for ${item}: ${error instanceof Error ? error.message : 'Unknown error'} - displaying text only`);
            return {
              content: item,
              styles: {
                fillColor: cellBackgroundColor,
                halign: 'center',
                valign: 'middle',
                cellPadding: 5,
                cellWidth: (180) / maxColumns,
                fontSize: 9
              }
            };
          }
        }));

        // Pad the row with empty cells if needed
        while (row.length < maxColumns) {
          row.push({
            content: '',
            styles: {
              fillColor: cellBackgroundColor,
              halign: 'center',
              valign: 'middle',
              cellPadding: 5,
              cellWidth: (180) / maxColumns
            }
          });
        }

        tableBody.push(row);
      }

      (doc as any).autoTable({
        startY: yPos,
        head: [[{ content: 'REQUIRED PPE', colSpan: maxColumns, styles: { halign: 'LEFT' } }]],
        body: tableBody,
        didDrawCell: function(data: any) {
          if (data.cell.raw.image && data.cell.raw.imageOptions) {
            const cell = data.cell;
            const opts = cell.raw.imageOptions;
            const x = cell.x + (cell.width - opts.width) / 2;
            const y = cell.y + 5;
            try {
              doc.addImage(opts.imageData, 'PNG', x, y, opts.width, opts.height);
            } catch (error) {
              console.warn(`Failed to add PPE image to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        },
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold',
          cellPadding: 3,
          minCellHeight: 12,
        },
        styles: {
          fontSize: 10,
          lineWidth: 0.1,
          lineColor: borderColor,
          minCellHeight: 40,
          cellWidth: (180) / maxColumns
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // PPE Location if provided
      if (assessment.ppe_location) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['PPE LOCATION', '']],
          body: [buildRow('Location', assessment.ppe_location)],
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
            lineColor: borderColor,
            halign: 'left'
          },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 130 }
          },
          theme: 'grid',
          margin: { left: 15, right: 15 },
          tableWidth: 180
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // Hazards Section with Images
    if (selectedHazards.length > 0) {
      console.log('Creating Hazards section with images...');
      const maxColumns = 4;
      const tableBody = [];

      // Process Hazard items in groups of 4
      for (let i = 0; i < selectedHazards.length; i += maxColumns) {
        const rowItems = selectedHazards.slice(i, i + maxColumns);
        const row = await Promise.all(rowItems.map(async (item: string) => {
          const filename = HAZARD_FILENAMES[item];
          if (!filename) {
            console.warn(`No filename found for Hazard item: ${item} - displaying text only`);
            return {
              content: item,
              styles: {
                fillColor: cellBackgroundColor,
                halign: 'center',
                valign: 'middle',
                cellPadding: 5,
                cellWidth: (180) / maxColumns,
                fontSize: 9
              }
            };
          }

          try {
            const signedUrl = await getSignedHazardImageUrl(filename);
            if (!signedUrl) {
              console.warn(`Failed to get signed URL for Hazard item: ${item} - displaying text only`);
              return {
                content: item,
                styles: {
                  fillColor: cellBackgroundColor,
                  halign: 'center',
                  valign: 'middle',
                  cellPadding: 5,
                  cellWidth: (180) / maxColumns,
                  fontSize: 9
                }
              };
            }

            const response = await fetch(signedUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

            const blob = await response.blob();
            const reader = new FileReader();
            const imageData = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            return {
              content: `\n\n\n${item}`,
              styles: {
                fillColor: cellBackgroundColor,
                halign: 'center',
                valign: 'middle',
                cellPadding: { top: 25, bottom: 5, left: 3, right: 3 },
                cellWidth: (180) / maxColumns,
                fontSize: 9
              },
              image: imageData,
              imageOptions: {
                imageData,
                x: 0,
                y: 0,
                width: 20,
                height: 20
              }
            };
          } catch (error) {
            console.warn(`Error loading Hazard image for ${item}: ${error instanceof Error ? error.message : 'Unknown error'} - displaying text only`);
            return {
              content: item,
              styles: {
                fillColor: cellBackgroundColor,
                halign: 'center',
                valign: 'middle',
                cellPadding: 5,
                cellWidth: (180) / maxColumns,
                fontSize: 9
              }
            };
          }
        }));

        // Pad the row with empty cells if needed
        while (row.length < maxColumns) {
          row.push({
            content: '',
            styles: {
              fillColor: cellBackgroundColor,
              halign: 'center',
              valign: 'middle',
              cellPadding: 5,
              cellWidth: (180) / maxColumns
            }
          });
        }

        tableBody.push(row);
      }

      (doc as any).autoTable({
        startY: yPos,
        head: [[{ content: 'IDENTIFIED HAZARDS', colSpan: maxColumns, styles: { halign: 'LEFT' } }]],
        body: tableBody,
        didDrawCell: function(data: any) {
          if (data.cell.raw.image && data.cell.raw.imageOptions) {
            const cell = data.cell;
            const opts = cell.raw.imageOptions;
            const x = cell.x + (cell.width - opts.width) / 2;
            const y = cell.y + 5;
            try {
              doc.addImage(opts.imageData, 'PNG', x, y, opts.width, opts.height);
            } catch (error) {
              console.warn(`Failed to add Hazard image to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        },
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold',
          cellPadding: 3,
          minCellHeight: 12,
        },
        styles: {
          fontSize: 10,
          lineWidth: 0.1,
          lineColor: borderColor,
          minCellHeight: 40,
          cellWidth: (180) / maxColumns
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Exposure Information Section
    const exposureData = [];
    if (assessment.hazards_precautions) {
      exposureData.push(buildRow('Hazards & Precautions', assessment.hazards_precautions));
    }
    if (assessment.occupational_exposure) {
      exposureData.push(buildRow('Occupational Exposure (OES)', assessment.occupational_exposure));
    }
    if (assessment.maximum_exposure) {
      exposureData.push(buildRow('Maximum Exposure Limits (MEL)', assessment.maximum_exposure));
    }
    if (assessment.workplace_exposure) {
      exposureData.push(buildRow('Workplace Exposure Limits (WEL)', assessment.workplace_exposure));
    }
    if (assessment.stel) {
      exposureData.push(buildRow('Short-Term Exposure Limit (STEL) 15 mins', assessment.stel));
    }
    if (assessment.stability_reactivity) {
      exposureData.push(buildRow('Stability and Reactivity', assessment.stability_reactivity));
    }
    if (assessment.ecological_information) {
      exposureData.push(buildRow('Ecological Information', assessment.ecological_information));
    }

    if (exposureData.length > 0) {
      (doc as any).autoTable({
        startY: yPos,
        head: [['EXPOSURE INFORMATION', '']],
        body: exposureData,
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: cellBackgroundColor
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'left'
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Usage Frequency Section
    const usageData = [];
    if (assessment.amount_used) {
      usageData.push(buildRow('Amount Used', assessment.amount_used));
    }
    if (assessment.times_per_day) {
      usageData.push(buildRow('Times per Day', assessment.times_per_day));
    }
    if (assessment.duration) {
      usageData.push(buildRow('Duration', assessment.duration));
    }
    if (assessment.how_often_process) {
      usageData.push(buildRow('How Often Process Done', assessment.how_often_process));
    }
    if (assessment.how_long_process) {
      usageData.push(buildRow('How Long Process Takes', assessment.how_long_process));
    }

    if (usageData.length > 0) {
      (doc as any).autoTable({
        startY: yPos,
        head: [['USAGE FREQUENCY', '']],
        body: usageData,
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: cellBackgroundColor
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'left'
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    // Control Measures Section
    const controlData = [];
    if (assessment.general_precautions) {
      controlData.push(buildRow('General Precautions', assessment.general_precautions));
    }
    if (assessment.first_aid_measures) {
      controlData.push(buildRow('First Aid Measures', assessment.first_aid_measures));
    }
    if (assessment.accidental_release_measures) {
      controlData.push(buildRow('Accidental Release Measures', assessment.accidental_release_measures));
    }
    if (assessment.ventilation) {
      controlData.push(buildRow('Ventilation', assessment.ventilation));
    }
    if (assessment.handling) {
      controlData.push(buildRow('Handling', assessment.handling));
    }
    if (assessment.storage) {
      controlData.push(buildRow('Storage', assessment.storage));
    }
    if (additionalControlItems.length > 0) {
      controlData.push(buildRow('Additional Control Items', additionalControlItems.join('\n• ')));
    }
    if (assessment.further_controls) {
      controlData.push(buildRow('Further Controls Required', assessment.further_controls));
    }
    if (assessment.respiratory_protection) {
      controlData.push(buildRow('Respiratory Protection', assessment.respiratory_protection));
    }
    if (assessment.ppe_details) {
      controlData.push(buildRow('PPE Details', assessment.ppe_details));
    }
    if (assessment.monitoring) {
      controlData.push(buildRow('Monitoring', assessment.monitoring));
    }
    if (assessment.health_surveillance) {
      controlData.push(buildRow('Health Surveillance', assessment.health_surveillance));
    }
    if (assessment.responsibility) {
      controlData.push(buildRow('Responsibility', assessment.responsibility));
    }
    if (assessment.by_when) {
      controlData.push(buildRow('By When', assessment.by_when ? new Date(assessment.by_when).toLocaleDateString() : 'N/A'));
    }

    if (controlData.length > 0) {
      (doc as any).autoTable({
        startY: yPos,
        head: [['CONTROL MEASURES', '']],
        body: controlData,
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: cellBackgroundColor
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'left'
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Emergency Procedures Section
    const emergencyData = [];
    if (assessment.spillage_procedure) {
      emergencyData.push(buildRow('Spillage Procedure', assessment.spillage_procedure));
    }
    if (assessment.fire_explosion) {
      emergencyData.push(buildRow('Fire & Explosion Prevention', assessment.fire_explosion));
    }
    if (assessment.handling_storage) {
      emergencyData.push(buildRow('Handling & Storage', assessment.handling_storage));
    }
    if (assessment.disposal_considerations) {
      emergencyData.push(buildRow('Disposal Considerations', assessment.disposal_considerations));
    }

    if (emergencyData.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      (doc as any).autoTable({
        startY: yPos,
        head: [['EMERGENCY PROCEDURES & STORAGE', '']],
        body: emergencyData,
        headStyles: {
          fillColor: headerColor,
          textColor: themeColor,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: cellBackgroundColor
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'left'
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Assessment Comments
    if (assessment.assessment_comments) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      (doc as any).autoTable({
        startY: yPos,
        head: [['ASSESSMENT COMMENTS']],
        body: [[assessment.assessment_comments]],
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
          cellPadding: 5,
          lineWidth: 0.1,
          lineColor: borderColor
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Assessment Questions Summary
    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
    }

    const questionData = [
      ['Has the assessment taken into account all relevant factors?', assessment.q1_answer ? 'Yes' : 'No', assessment.q1_action || 'N/A'],
      ['Has the feasibility of preventing exposure been considered?', assessment.q2_answer ? 'Yes' : 'No', assessment.q2_action || 'N/A'],
      ['Has the assessment addressed sufficient control measures?', assessment.q3_answer ? 'Yes' : 'No', assessment.q3_action || 'N/A'],
      ['Has the need for monitoring exposure been evaluated?', assessment.q4_answer ? 'Yes' : 'No', assessment.q4_action || 'N/A'],
      ['Has the assessment identified compliance requirements?', assessment.q5_answer ? 'Yes' : 'No', assessment.q5_action || 'N/A'],
    ];

    (doc as any).autoTable({
      startY: yPos,
      head: [['ASSESSOR SUMMARY', 'ANSWER', 'ACTION REQUIRED']],
      body: questionData,
      headStyles: {
        fillColor: headerColor,
        textColor: themeColor,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fillColor: cellBackgroundColor
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 60 }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Assessment Conclusion
    if (assessment.assessment_conclusion) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      (doc as any).autoTable({
        startY: yPos,
        head: [['ASSESSMENT CONCLUSION']],
        body: [[assessment.assessment_conclusion]],
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
          cellPadding: 5,
          lineWidth: 0.1,
          lineColor: borderColor
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
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
        const pageNumberWidth = doc.getTextWidth(pageNumberText);
        
        // Draw footer text on the left and page number on the right
        doc.text(footerText, 15, pageHeight - 10);
        doc.text(pageNumberText, pageWidth - pageNumberWidth - 15, pageHeight - 10);
      }
    }

    // Return the PDF as a data URL
    return doc.output('dataurlstring');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
