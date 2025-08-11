import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../../lib/supabase';
import type { CompanySettings } from '../../../types/database';

interface Customer {
  id: string;
  company_name: string | null;
  customer_name: string;
}

interface Project {
  id: string;
  name: string;
  customer_id: string;
}

interface SiteSurvey {
  id: string;
  survey_id?: string;
  created_at: string;
  customer_id: string;
  project_id: string;
  customer?: Customer;
  project?: Project;
  location_what3words?: string;
  site_contact?: string;
  full_address?: string;
  site_access_description?: string;
  water_handling?: string;
  manholes_description?: string;
  services_present?: boolean;
  services_description?: string;
  services_images?: string[];
  number_of_courts?: number;
  court_dimensions?: string;
  court_height?: number;
  suitable_for_lorry?: boolean;
  site_access_images?: string[];
  site_access_videos?: string[];
  shuttering_required?: boolean;
  court_enclosure_type?: string;
  court_floor_material?: string;
  court_features?: string;
  tarmac_required?: boolean;
  tarmac_location?: string;
  tarmac_wagon_space?: string;
  muckaway_required?: string;
  surface_type?: string;
  lighting_required?: boolean;
  lighting_description?: string;
  canopies_required?: boolean;
  number_of_canopies?: number;
  drawings_images?: string[];
  drawings_videos?: string[];
  notes_comments?: string;
}

interface GeneratePDFOptions {
  siteSurvey: SiteSurvey;
}

// Field labels for each section
const fieldLabels = {
  // Site Survey Details
  customer: 'Customer:',
  project: 'Project:',
  fullAddress: 'Full Address:',
  what3words: 'What3Words:',
  siteContact: 'Site Contact:',

  // Site Access
  siteAccessDescription: 'Describe Site Access:',
  suitableForLorry: 'Is the site access suitable for a 3.5m lorry?',
  siteAccessImages: 'Site Access Images:',

  // Land
  waterHandling: 'How does the ground deal with water?',
  manholesDescription: 'Is there any man holes or inspection service chambers in the padel court area?',
  servicesPresent: 'Is there any electrical, gas, utility services cables or pipes?',
  servicesDescription: 'Services description:',

  // Work Required
  numberOfCourts: 'How many courts?',
  shutteringRequired: 'Shuttering required?',
  tarmacRequired: 'Tarmac Required?',
  tarmacLocation: 'Where is tarmac required:',
  tarmacWagonSpace: 'Is there space to hold the tarmac waggon to tip, or keep feeding it out?',
  muckawayRequired: 'Muckaway required or lose muck on site?',
  surfaceType: 'Type of surface required:',
  lightingRequired: 'Lighting required?',
  lightingDescription: 'Lighting requirements:',
  canopiesRequired: 'Canopies required?',
  numberOfCanopies: 'Number of canopies:',

  // Court Features
  courtDimensions: 'Padel court dimensions:',
  courtHeight: 'Padel court height:',
  courtEnclosureType: 'Padel court enclosures:',
  courtFloorMaterial: 'Padel court floor materials:',
  courtFeatures: 'Court Features:',
  
  // Notes
  notesComments: 'Notes/Comments:'
};

export async function generateSiteSurveyPDF({
  siteSurvey
}: GeneratePDFOptions): Promise<string> {
  try {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Define theme colors and styles
    const themeColor = '#000000';
    const headerColor = '#edeaea';
    const cellBackgroundColor = '#f7f7f7';
    const borderColor = [211, 211, 211]; // Light gray border
    
    // Set default font
    doc.setFont('helvetica');

    // Fetch complete site survey data including customer and project
    const { data: surveyData, error: surveyError } = await supabase
      .from('site_survey')
      .select(`
        *,
        customer:customers(company_name, customer_name),
        project:projects(name)
      `)
      .eq('id', siteSurvey.id)
      .single();

    if (surveyError) throw new Error(`Failed to load site survey: ${surveyError.message}`);
    if (!surveyData) throw new Error('Site survey not found');

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
    doc.text('SITE SURVEY REPORT', 195, 25, { align: 'right' });
    
    // Reset text color and font
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let yPos = 45;

    const pageWidth = doc.internal.pageSize.width;
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

    // Site Survey Information (Right Side)
    (doc as any).autoTable({
      startY: yPos,
      head: [[{ content: 'SITE SURVEY DETAILS', colSpan: 2 }]],
      body: [
        [{ content: fieldLabels.customer, styles: { fontStyle: 'bold' } }, 
         surveyData.customer?.company_name || surveyData.customer?.customer_name || 'N/A'],
        [{ content: fieldLabels.project, styles: { fontStyle: 'bold' } }, 
         surveyData.project?.name || 'N/A'],
        [{ content: fieldLabels.fullAddress, styles: { fontStyle: 'bold' } }, 
         surveyData.full_address || 'N/A'],
        [{ content: fieldLabels.what3words, styles: { fontStyle: 'bold' } }, 
         surveyData.location_what3words || 'N/A'],
        [{ content: fieldLabels.siteContact, styles: { fontStyle: 'bold' } }, 
         surveyData.site_contact || 'N/A']
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

    yPos = 125;

    // Site Access Section
    (doc as any).autoTable({
      startY: yPos,
      head: [
        [{
          content: 'SITE ACCESS',
          colSpan: 6,
          styles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold'
          }
        }]
      ],
      body: [
        [
          {
            content: fieldLabels.siteAccessDescription,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.site_access_description || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.suitableForLorry,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.suitable_for_lorry ? 'Yes' : 'No',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ]
      ],
      headStyles: {
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 }
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Site Access Images
    if (surveyData.site_access_images && Array.isArray(surveyData.site_access_images) && surveyData.site_access_images.length > 0) {
      (doc as any).autoTable({
        startY: yPos,
        head: [
          [{
            content: 'SITE ACCESS IMAGES',
            colSpan: 6,
            styles: {
              fillColor: headerColor,
              textColor: 'black',
              fontStyle: 'bold'
            }
          }]
        ],
        body: [], // Remove empty body
        headStyles: {
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineWidth: 0.1,
          lineColor: borderColor
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
      });

      let imageYPos = (doc as any).lastAutoTable.finalY + 5;
      
      // Add images sequentially
      for (let i = 0; i < surveyData.site_access_images.length; i++) {
        const imageUrl = surveyData.site_access_images[i];
        
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            
            // Process each image and wait for completion
            await new Promise<void>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  if (reader.result) {
                    // Create an image element to get natural dimensions
                    const img = new Image();
                    img.onload = () => {
                      try {
                        // Calculate proper dimensions maintaining aspect ratio
                        const maxWidth = 180; // Max width in mm
                        const maxHeight = 120; // Max height in mm
                        const pageWidth = doc.internal.pageSize.width - 30; // Page width minus margins
                        
                        let { width, height } = img;
                        const aspectRatio = width / height;
                        
                        // Scale to fit within max dimensions while maintaining aspect ratio
                        if (width > height) {
                          // Landscape orientation
                          width = Math.min(maxWidth, pageWidth - 30);
                          height = width / aspectRatio;
                          if (height > maxHeight) {
                            height = maxHeight;
                            width = height * aspectRatio;
                          }
                        } else {
                          // Portrait orientation
                          height = maxHeight;
                          width = height * aspectRatio;
                          if (width > Math.min(maxWidth, pageWidth - 30)) {
                            width = Math.min(maxWidth, pageWidth - 30);
                            height = width / aspectRatio;
                          }
                        }
                        
                        // Check if we need a new page
                        if (imageYPos + height > doc.internal.pageSize.height - 20) {
                          doc.addPage();
                          imageYPos = 20;
                        }
                        
                        // Add image to PDF
                        doc.addImage(
                          reader.result as string,
                          'JPEG',
                          15,
                          imageYPos,
                          width,
                          height,
                          undefined,
                          'FAST'
                        );
                        
                        // Add image caption
                        doc.setFontSize(8);
                        doc.setTextColor(100);
                        doc.text(`Site Access Image ${i + 1}`, 15, imageYPos + height + 5);
                        doc.setTextColor(0);
                        
                        imageYPos += height + 15; // Extra space for caption
                        resolve();
                      } catch (error) {
                        reject(error);
                      }
                    };
                    img.onerror = () => reject(new Error('Failed to load image for sizing'));
                    img.src = reader.result as string;
                  } else {
                    reject(new Error('No image data'));
                  }
                } catch (error) {
                  reject(error);
                }
              };
              reader.onerror = () => reject(new Error('Failed to read image'));
              reader.readAsDataURL(blob);
            });
          } else {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`Error loading site access image ${i + 1}:`, error);
          // Add error text instead of image
          doc.setFontSize(10);
          doc.setTextColor(200, 0, 0);
          doc.text(`Site Access Image ${i + 1}: Could not be loaded`, 15, imageYPos);
          doc.setTextColor(0);
          imageYPos += 15;
        }
      }
      
      yPos = imageYPos + 10;
    }

    // Site Access Videos
    (doc as any).autoTable({
      startY: yPos,
      head: [
        [{
          content: 'SITE ACCESS VIDEOS',
          colSpan: 6,
          styles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold'
          }
        }]
      ],
      body: [
        [
          {
            content: 'Site Access Videos:',
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: (surveyData.site_access_videos && Array.isArray(surveyData.site_access_videos) && surveyData.site_access_videos.length > 0) 
              ? 'Video is in the CRM' 
              : 'No Video Added',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ]
      ],
      headStyles: {
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 }
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Land Section
    (doc as any).autoTable({
      startY: yPos,
      head: [
        [{
          content: 'LAND',
          colSpan: 6,
          styles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold'
          }
        }]
      ],
      body: [
        [
          {
            content: fieldLabels.waterHandling,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.water_handling || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.manholesDescription,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.manholes_description || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.servicesPresent,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.services_present ? 'Yes' : 'No',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.servicesDescription,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.services_description || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ]
      ],
      headStyles: {
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 }
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Services Images (if services are present)
    if (surveyData.services_present && surveyData.services_images && Array.isArray(surveyData.services_images) && surveyData.services_images.length > 0) {
      (doc as any).autoTable({
        startY: yPos,
        head: [
          [{
            content: 'SERVICES IMAGES',
            colSpan: 6,
            styles: {
              fillColor: headerColor,
              textColor: 'black',
              fontStyle: 'bold'
            }
          }]
        ],
        body: [], // Remove empty body
        headStyles: {
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineWidth: 0.1,
          lineColor: borderColor
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
      });

      let imageYPos = (doc as any).lastAutoTable.finalY + 5;
      
      // Add images sequentially
      for (let i = 0; i < surveyData.services_images.length; i++) {
        const imageUrl = surveyData.services_images[i];
        
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            
            // Process each image and wait for completion
            await new Promise<void>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = function() {
                try {
                  // Check if we need a new page
                  if (imageYPos > 250) {
                    doc.addPage();
                    imageYPos = 20;
                  }
                  
                  const imgData = reader.result;
                  if (imgData) {
                    // Add image to PDF
                    const imgWidth = 80;
                    const imgHeight = 60;
                    
                    doc.addImage(
                      imgData as string,
                      'JPEG',
                      15,
                      imageYPos,
                      imgWidth,
                      imgHeight,
                      undefined,
                      'FAST'
                    );
                    
                    // Add image label
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Service Image ${i + 1}`, 15, imageYPos + imgHeight + 8);
                    
                    imageYPos += imgHeight + 15;
                  }
                  resolve();
                } catch (error) {
                  console.error(`Error adding service image ${i + 1}:`, error);
                  resolve(); // Continue with next image
                }
              };
              
              reader.onerror = function() {
                console.error(`Error reading service image ${i + 1}`);
                resolve(); // Continue with next image
              };
              
              reader.readAsDataURL(blob);
            });
          } else {
            console.error(`Failed to fetch service image ${i + 1}: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`Error loading service image ${i + 1}:`, error);
        }
      }
      
      yPos = imageYPos + 10;
    }

    // Work Required Section
    (doc as any).autoTable({
      startY: yPos,
      head: [
        [{
          content: 'WORK REQUIRED',
          colSpan: 6,
          styles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold'
          }
        }]
      ],
      body: [
        [
          {
            content: fieldLabels.numberOfCourts,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.number_of_courts?.toString() || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.shutteringRequired,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.shuttering_required ? 'Yes' : 'No',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.tarmacRequired,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.tarmac_required ? 'Yes' : 'No',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.tarmacLocation,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.tarmac_location || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.tarmacWagonSpace,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.tarmac_wagon_space || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.muckawayRequired,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.muckaway_required || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.surfaceType,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.surface_type || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.lightingRequired,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.lighting_required ? 'Yes' : 'No',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.lightingDescription,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.lighting_description || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.canopiesRequired,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.canopies_required ? 'Yes' : 'No',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.numberOfCanopies,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.number_of_canopies?.toString() || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ]
      ],
      headStyles: {
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 }
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Court Features Section
    (doc as any).autoTable({
      startY: yPos,
      head: [
        [{
          content: 'COURT FEATURES',
          colSpan: 6,
          styles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold'
          }
        }]
      ],
      body: [
        [
          {
            content: fieldLabels.courtDimensions,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.court_dimensions || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.courtHeight,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.court_height ? `${surveyData.court_height}m` : 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.courtEnclosureType,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.court_enclosure_type || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.courtFloorMaterial,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.court_floor_material || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ],
        [
          {
            content: fieldLabels.courtFeatures,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: surveyData.court_features || 'N/A',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ]
      ],
      headStyles: {
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 }
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Enclosure Type Details
    if (surveyData.court_enclosure_type === 'Option 1') {
      (doc as any).autoTable({
        startY: yPos,
        head: [['ENCLOSURE TYPE DETAILS']],
        body: [[
          'Option 1 is the most common type of padel court in the UK and uses stepped walls at each end of the court. ' +
          'The first 2m wide step at each end of the court is 3m high from the floor and the second 2m wide step is 2m high. ' +
          'These steps are typically made from glass panels but can be fiberglass, concrete, rendered bricks/blocks or other materials. ' +
          'Each step then has 1m of metallic mesh fence added to take the total height of the first step to 4m and the height of the second step to 3m. ' +
          'Where the two different parts of the wall meet it should be flush to avoid any irregular bounces. ' +
          'The remaining 12m length of the court (6m either side of the net) is made up of 3m high metallic mesh fence, with doors often located by the net on one or both sides of the court.'
        ]],
        headStyles: {
          fillColor: headerColor,
          textColor: '#000000',
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
        columnStyles: {
          0: { cellWidth: 'auto' }
        }
      });
    } else if (surveyData.court_enclosure_type === 'Option 2') {
      (doc as any).autoTable({
        startY: yPos,
        head: [['ENCLOSURE TYPE DETAILS']],
        body: [[
          'Option 2 has the same stepped walls, but the metallic mesh fence is 2m high on the second step meaning both steps are 4m high. ' +
          'The 12m length of court in the middle uses 4m high metallic mesh fence, meaning the court enclosure is 4m high all the way round the court. ' +
          'As with option 1 the materials are the same and the two parts of the wall must be flush with neither material protruding to cause irregular bounces.'
        ]],
        headStyles: {
          fillColor: headerColor,
          textColor: '#000000',
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
        columnStyles: {
          0: { cellWidth: 'auto' }
        }
      });
    }

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Drawings & Plans Section
    (doc as any).autoTable({
      startY: yPos,
      head: [
        [{
          content: 'DRAWINGS & PLANS',
          colSpan: 6,
          styles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold'
          }
        }]
      ],
      body: [], // Remove empty body
      headStyles: {
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    let drawingsYPos = (doc as any).lastAutoTable.finalY + 5;

    // Add drawings/plans images sequentially
    if (surveyData.drawings_images && Array.isArray(surveyData.drawings_images) && surveyData.drawings_images.length > 0) {
      for (let i = 0; i < surveyData.drawings_images.length; i++) {
        const imageUrl = surveyData.drawings_images[i];
        
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            
            // Process each image and wait for completion
            await new Promise<void>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  if (reader.result) {
                    // Create an image element to get natural dimensions
                    const img = new Image();
                    img.onload = () => {
                      try {
                        // Calculate proper dimensions maintaining aspect ratio
                        const maxWidth = 180; // Max width in mm
                        const maxHeight = 120; // Max height in mm
                        const pageWidth = doc.internal.pageSize.width - 30; // Page width minus margins
                        
                        let { width, height } = img;
                        const aspectRatio = width / height;
                        
                        // Scale to fit within max dimensions while maintaining aspect ratio
                        if (width > height) {
                          // Landscape orientation
                          width = Math.min(maxWidth, pageWidth - 30);
                          height = width / aspectRatio;
                          if (height > maxHeight) {
                            height = maxHeight;
                            width = height * aspectRatio;
                          }
                        } else {
                          // Portrait orientation
                          height = maxHeight;
                          width = height * aspectRatio;
                          if (width > Math.min(maxWidth, pageWidth - 30)) {
                            width = Math.min(maxWidth, pageWidth - 30);
                            height = width / aspectRatio;
                          }
                        }
                        
                        // Check if we need a new page
                        if (drawingsYPos + height > doc.internal.pageSize.height - 20) {
                          doc.addPage();
                          drawingsYPos = 20;
                        }
                        
                        // Add image to PDF
                        doc.addImage(
                          reader.result as string,
                          'JPEG',
                          15,
                          drawingsYPos,
                          width,
                          height,
                          undefined,
                          'FAST'
                        );
                        
                        // Add image caption
                        doc.setFontSize(8);
                        doc.setTextColor(100);
                        doc.text(`Drawing/Plan ${i + 1}`, 15, drawingsYPos + height + 5);
                        doc.setTextColor(0);
                        
                        drawingsYPos += height + 15; // Extra space for caption
                        resolve();
                      } catch (error) {
                        reject(error);
                      }
                    };
                    img.onerror = () => reject(new Error('Failed to load drawing image for sizing'));
                    img.src = reader.result as string;
                  } else {
                    reject(new Error('No image data'));
                  }
                } catch (error) {
                  reject(error);
                }
              };
              reader.onerror = () => reject(new Error('Failed to read drawing image'));
              reader.readAsDataURL(blob);
            });
          } else {
            throw new Error(`Failed to fetch drawing: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`Error loading drawing image ${i + 1}:`, error);
          // Add error text instead of image
          doc.setFontSize(10);
          doc.setTextColor(200, 0, 0);
          doc.text(`Drawing/Plan ${i + 1}: Could not be loaded`, 15, drawingsYPos);
          doc.setTextColor(0);
          drawingsYPos += 15;
        }
      }
    } else {
      // No drawings available
      doc.setFontSize(10);
      doc.text('No drawings or plans uploaded', 15, drawingsYPos);
      drawingsYPos += 15;
    }

    // Drawings Videos
    (doc as any).autoTable({
      startY: drawingsYPos + 10,
      head: [
        [{
          content: 'DRAWINGS & PLANS VIDEOS',
          colSpan: 6,
          styles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold'
          }
        }]
      ],
      body: [
        [
          {
            content: 'Drawings & Plans Videos:',
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              fillColor: '#EDEDED'
            }
          },
          {
            content: (surveyData.drawings_videos && Array.isArray(surveyData.drawings_videos) && surveyData.drawings_videos.length > 0) 
              ? 'Video is in the CRM' 
              : 'No Video Added',
            colSpan: 4,
            styles: {
              fillColor: '#ffffff'
            }
          }
        ]
      ],
      headStyles: {
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 }
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    // Notes/Comments Section
    if (surveyData.notes_comments) {
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [
          [{
            content: 'NOTES/COMMENTS',
            colSpan: 6,
            styles: {
              fillColor: headerColor,
              textColor: 'black',
              fontStyle: 'bold'
            }
          }]
        ],
        body: [
          [
            {
              content: fieldLabels.notesComments,
              colSpan: 2,
              styles: {
                fontStyle: 'bold',
                fillColor: '#EDEDED'
              }
            },
            {
              content: surveyData.notes_comments,
              colSpan: 4,
              styles: {
                fillColor: '#ffffff'
              }
            }
          ]
        ],
        headStyles: {
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 20 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 20 },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 20 }
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 4
        },
        styles: {
          fontSize: 10,
          cellPadding: 4,
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
     const footerWidth = doc.getTextWidth(footerText);
     const pageNumberWidth = doc.getTextWidth(pageNumberText);
     
     // Draw footer text on the left and page number on the right
     doc.text(footerText, 15, pageHeight - 10); // Left margin of 15px
     doc.text(pageNumberText, pageWidth - pageNumberWidth - 15, pageHeight - 10); // Right margin of 15px
   }
 }

 // Convert the PDF to base64
    const pdfBase64 = doc.output('datauristring');
    return pdfBase64;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}
