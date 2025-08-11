import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Trash2, Pencil, QrCode as QrCodeIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import type { Project } from '../../../../types/database';

// UK Counties list
const UK_COUNTIES = [
  'Aberdeen',
  'Aberdeenshire',
  'Anglesey',
  'Angus',
  'Argyll and Bute',
  'Armagh',
  'Bath and North East Somerset',
  'Bedfordshire',
  'Belfast',
  'Berkshire',
  'Birmingham',
  'Blaenau Gwent',
  'Bradford',
  'Bridgend',
  'Brighton and Hove',
  'Bristol',
  'Buckinghamshire',
  'Canterbury',
  'Carlisle',
  'Caerphilly',
  'Cambridgeshire',
  'Cardiff',
  'Carmarthenshire',
  'Ceredigion',
  'Chelmsford',
  'Cheshire',
  'Chester',
  'Chichester',
  'Clackmannanshire',
  'Conwy',
  'Cornwall',
  'Coventry',
  'Cumbria',
  'Denbighshire',
  'Derbyshire',
  'Devon',
  'Dorset',
  'Dumfries and Galloway',
  'Dundee',
  'Durham',
  'East Ayrshire',
  'East Dunbartonshire',
  'East Lothian',
  'East Renfrewshire',
  'East Riding of Yorkshire',
  'East Sussex',
  'Edinburgh',
  'Essex',
  'Exeter',
  'Falkirk',
  'Fife',
  'Flintshire',
  'Glasgow',
  'Gloucestershire',
  'Greater London',
  'Greater Manchester',
  'Gwynedd',
  'Hampshire',
  'Herefordshire',
  'Hertfordshire',
  'Highlands',
  'Inverclyde',
  'Isle of Wight',
  'Kent',
  'Lancashire',
  'Leicestershire',
  'Lincolnshire',
  'Liverpool',
  'Londonderry',
  'Merseyside',
  'Merthyr Tydfil',
  'Midlothian',
  'Monmouthshire',
  'Moray',
  'Neath Port Talbot',
  'Newcastle upon Tyne',
  'Newport',
  'Newry',
  'Norfolk',
  'North Ayrshire',
  'North Lanarkshire',
  'North Yorkshire',
  'Northamptonshire',
  'Northumberland',
  'Nottinghamshire',
  'Orkney Islands',
  'Oxfordshire',
  'Pembrokeshire',
  'Perth and Kinross',
  'Powys',
  'Renfrewshire',
  'Rhondda Cynon Taff',
  'Rutland',
  'Salford',
  'Scottish Borders',
  'Shetland Islands',
  'Shropshire',
  'Somerset',
  'South Ayrshire',
  'South Lanarkshire',
  'South Yorkshire',
  'Staffordshire',
  'Stirling',
  'Sunderland',
  'Suffolk',
  'Surrey',
  'Swansea',
  'Torfaen',
  'Tyne and Wear',
  'Vale of Glamorgan',
  'Warwickshire',
  'West Dunbartonshire',
  'West Lothian',
  'West Midlands',
  'West Sussex',
  'West Yorkshire',
  'Western Isles',
  'Wiltshire',
  'Worcestershire',
  'Wrexham',
].sort();

// Define Site interface
interface Site {
  id: string;
  name: string;
  address: string;
  town: string;
  county: string;
  postcode: string;
  site_manager: string;
  phone: string;
  what3words?: string;
  created_at: string;
  project_id: string;
}

interface SitesTabProps {
  project: Project;
  sites: Site[];
  isLoading: boolean;
  onSitesChange?: () => void;
}

export function SitesTab({ project, sites, isLoading, onSitesChange }: SitesTabProps) {
  const [sitesSearchQuery, setSitesSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<Site | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [newSite, setNewSite] = useState({
    name: '',
    address: '',
    town: '',
    county: '',
    postcode: '',
    site_manager: '',
    phone: '',
    what3words: '',
    project_id: project.id,
  });
  const [currentStep, setCurrentStep] = useState(1);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showAddModal || showEditModal || showDeleteModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      // Scroll to top of viewport when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showDeleteModal]);

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) {
      nextStep();
      return;
    }

    try {
      const { error } = await supabase.from('sites').insert([
        {
          ...newSite,
          project_id: project.id,
        },
      ]);

      if (error) throw error;

      setShowAddModal(false);
      setNewSite({
        name: '',
        address: '',
        town: '',
        county: '',
        postcode: '',
        site_manager: '',
        phone: '',
        what3words: '',
        project_id: project.id,
      });
      setCurrentStep(1);
      
      if (onSitesChange) {
        onSitesChange();
      }
    } catch (error) {
      console.error('Error adding site:', error);
    }
  };

  const handleEditSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) {
      nextStep();
      return;
    }

    if (!siteToEdit) return;

    try {
      const { error } = await supabase
        .from('sites')
        .update({
          name: newSite.name,
          address: newSite.address,
          town: newSite.town,
          county: newSite.county,
          postcode: newSite.postcode,
          site_manager: newSite.site_manager,
          phone: newSite.phone,
          what3words: newSite.what3words,
          project_id: project.id,
        })
        .eq('id', siteToEdit.id);

      if (error) throw error;

      setShowEditModal(false);
      setSiteToEdit(null);
      setCurrentStep(1);
      
      if (onSitesChange) {
        onSitesChange();
      }
    } catch (error) {
      console.error('Error updating site:', error);
    }
  };

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;

    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteToDelete.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSiteToDelete(null);
      
      if (onSitesChange) {
        onSitesChange();
      }
    } catch (error) {
      console.error('Error deleting site:', error);
    }
  };

  const openEditModal = (site: Site) => {
    setSiteToEdit(site);
    setNewSite({
      name: site.name,
      address: site.address,
      town: site.town,
      county: site.county,
      postcode: site.postcode,
      site_manager: site.site_manager,
      phone: site.phone,
      what3words: site.what3words || '',
      project_id: site.project_id,
    });
    setShowEditModal(true);
    setCurrentStep(1);
  };

  const openDeleteModal = (site: Site) => {
    setSiteToDelete(site);
    setShowDeleteModal(true);
  };

  // QR Code generation and download
  const downloadQRCode = async (site: Site) => {
    try {
      // Fetch company logo from company settings
      const { data: companySettings, error: companyError } = await supabase
        .from('company_settings')
        .select('name, logo_url')
        .limit(1)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company settings:', companyError);
      }

      const companyName = companySettings?.name || 'Company Name';
      const logoUrl = companySettings?.logo_url || null;

      // Create a canvas for the A7 page (74 × 105 mm)
      // A7 at 300 DPI is approximately 874 × 1240 pixels
      const canvas = document.createElement('canvas');
      canvas.width = 874;
      canvas.height = 1240;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set background to white
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw company logo or placeholder
      if (logoUrl) {
        // Create an image element and load the logo
        const logoImg = new Image();
        logoImg.crossOrigin = 'Anonymous';

        // Wait for the logo to load before drawing it
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = logoUrl;
        }).catch(() => {
          console.error('Error loading company logo, using placeholder instead');
          // If logo fails to load, draw a placeholder
          ctx.fillStyle = '#f3f4f6'; // Light gray background
          ctx.fillRect(50, 50, canvas.width - 100, 120); // smaller logo area

          ctx.font = 'bold 32px Arial'; // smaller font
          ctx.fillStyle = '#4b5563'; // Gray text
          ctx.textAlign = 'center';
          ctx.fillText(companyName, canvas.width / 2, 120);
        });

        // If logo loaded successfully, draw it
        if (logoImg.complete && logoImg.naturalHeight !== 0) {
          // Calculate dimensions to maintain aspect ratio and fit within area
          const logoArea = {
            width: canvas.width - 100,
            height: 120, // smaller height
            x: 50,
            y: 50,
          };

          const logoRatio = logoImg.width / logoImg.height;
          let drawWidth, drawHeight;

          if (logoRatio > logoArea.width / logoArea.height) {
            // Logo is wider than area
            drawWidth = logoArea.width;
            drawHeight = drawWidth / logoRatio;
          } else {
            // Logo is taller than area
            drawHeight = logoArea.height;
            drawWidth = drawHeight * logoRatio;
          }

          // Center the logo
          const x = logoArea.x + (logoArea.width - drawWidth) / 2;
          const y = logoArea.y + (logoArea.height - drawHeight) / 2;

          ctx.drawImage(logoImg, x, y, drawWidth, drawHeight);
        }
      } else {
        // No logo available, draw placeholder
        ctx.fillStyle = '#f3f4f6'; // Light gray background
        ctx.fillRect(50, 50, canvas.width - 100, 120); // smaller logo area

        ctx.font = 'bold 32px Arial'; // smaller font
        ctx.fillStyle = '#4b5563'; // Gray text
        ctx.textAlign = 'center';
        ctx.fillText(companyName, canvas.width / 2, 120);
      }

      // Add site information
      ctx.font = 'bold 24px Arial'; // smaller font
      ctx.fillStyle = '#1f2937'; // Dark gray
      ctx.textAlign = 'center';
      ctx.fillText(site.name, canvas.width / 2, 220);

      ctx.font = '16px Arial'; // smaller font
      ctx.fillStyle = '#4b5563'; // Gray text
      ctx.fillText(`${site.address}, ${site.town}`, canvas.width / 2, 250);
      ctx.fillText(`${site.county}, ${site.postcode}`, canvas.width / 2, 270);

      // Create QR code data URL
      // QR code will contain a URL to the site check-in page
      // We're using window.location.origin to get the base URL of the current app
      const baseUrl = window.location.origin;
      const appURL = `${baseUrl}/site-checkin/${site.id}`;

      const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        appURL
      )}`;

      // Create an image element and load the QR code
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      // Wait for the image to load before drawing it on the canvas
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = qrCodeURL;
      });

      // Draw QR code
      const qrSize = 450; // smaller QR code
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 350;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // Add scan instructions
      ctx.font = '20px Arial'; // smaller font
      ctx.fillStyle = '#1f2937'; // Dark gray
      ctx.fillText(
        'Scan QR Code to log in/out of this site',
        canvas.width / 2,
        qrY + qrSize + 50
      );

      // Convert canvas to data URL and download
      const dataURL = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `${site.name
        .replace(/\s+/g, '-')
        .toLowerCase()}-qr-code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const filteredSites = sites.filter((site) => {
    const query = sitesSearchQuery.toLowerCase();
    return (
      site.name?.toLowerCase().includes(query) ||
      site.address?.toLowerCase().includes(query) ||
      site.town?.toLowerCase().includes(query) ||
      site.county?.toLowerCase().includes(query) ||
      site.postcode?.toLowerCase().includes(query) ||
      site.site_manager?.toLowerCase().includes(query) ||
      site.phone?.toLowerCase().includes(query)
    );
  });

  const renderStepIndicator = () => (
    <div className="mb-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-medium text-indigo-600">
          {currentStep === 1 ? 'Site Info' : currentStep === 2 ? 'Address' : 'Contact Details'}
        </div>
        <div className="text-sm text-gray-500">
          Step {currentStep} of 3
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Sites</h2>

      {/* Search and Add button row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={sitesSearchQuery}
            onChange={(e) => setSitesSearchQuery(e.target.value)}
            placeholder="Search by name, address, town, county, postcode, site manager or phone..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setNewSite({
              name: '',
              address: '',
              town: '',
              county: '',
              postcode: '',
              site_manager: '',
              phone: '',
              what3words: '',
              project_id: project.id,
            });
            setCurrentStep(1);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Site
        </button>
      </div>

      {/* Sites Table/Cards */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Site Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Site Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {sitesSearchQuery ? 'No sites match your search criteria' : 'No sites found for this project'}
                    </td>
                  </tr>
                ) : (
                  filteredSites.map((site) => (
                    <tr key={site.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {site.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {site.address}, {site.town}, {site.county}, {site.postcode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {site.site_manager}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {site.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(site.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(site);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadQRCode(site);
                          }}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                          title="Download QR Code"
                        >
                          <QrCodeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(site);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="md:hidden">
          {filteredSites.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
              {sitesSearchQuery ? 'No sites match your search criteria' : 'No sites found for this project'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSites.map((site) => (
                <div key={site.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {site.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {site.address}, {site.town}, {site.county}, {site.postcode}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(site)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => downloadQRCode(site)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="Download QR Code"
                      >
                        <QrCodeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(site)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Site Manager:</span>
                      <p className="text-gray-900 dark:text-white">{site.site_manager}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Phone:</span>
                      <p className="text-gray-900 dark:text-white">{site.phone}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Created:</span>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(site.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Site Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full m-4 max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Add New Site
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setCurrentStep(1);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {renderStepIndicator()}

            <form
              onSubmit={handleAddSite}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="space-y-4 overflow-y-auto overflow-x-hidden flex-1 pr-2">
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={newSite.name}
                        onChange={(e) =>
                          setNewSite({ ...newSite, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Address
                      </label>
                      <input
                        type="text"
                        value={newSite.address}
                        onChange={(e) =>
                          setNewSite({ ...newSite, address: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Town
                      </label>
                      <input
                        type="text"
                        value={newSite.town}
                        onChange={(e) =>
                          setNewSite({ ...newSite, town: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        County
                      </label>
                      <select
                        value={newSite.county}
                        onChange={(e) =>
                          setNewSite({ ...newSite, county: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select a county...</option>
                        {UK_COUNTIES.map((county) => (
                          <option key={county} value={county}>
                            {county}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Postcode
                      </label>
                      <input
                        type="text"
                        value={newSite.postcode}
                        onChange={(e) =>
                          setNewSite({ ...newSite, postcode: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        What3Words
                      </label>
                      <input
                        type="text"
                        value={newSite.what3words}
                        onChange={(e) =>
                          setNewSite({ ...newSite, what3words: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter What3Words address (e.g., filled.count.soap)"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Format: three words separated by dots (e.g.,
                        filled.count.soap)
                      </p>
                    </div>
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Site Manager
                      </label>
                      <input
                        type="text"
                        value={newSite.site_manager}
                        onChange={(e) =>
                          setNewSite({
                            ...newSite,
                            site_manager: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={newSite.phone}
                        onChange={(e) =>
                          setNewSite({ ...newSite, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setCurrentStep(1);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
                >
                  Cancel
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="w-full sm:w-auto inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {currentStep === 3 ? 'Add Site' : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Site Modal */}
      {showEditModal && siteToEdit && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full m-4 max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Edit Site
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setCurrentStep(1);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {renderStepIndicator()}

            <form
              onSubmit={handleEditSite}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="space-y-4 overflow-y-auto overflow-x-hidden flex-1 pr-2">
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={siteToEdit.name}
                        onChange={(e) =>
                          setSiteToEdit({ ...siteToEdit, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Address
                      </label>
                      <input
                        type="text"
                        value={siteToEdit.address}
                        onChange={(e) =>
                          setSiteToEdit({ ...siteToEdit, address: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Town
                      </label>
                      <input
                        type="text"
                        value={siteToEdit.town}
                        onChange={(e) =>
                          setSiteToEdit({ ...siteToEdit, town: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        County
                      </label>
                      <select
                        value={siteToEdit.county}
                        onChange={(e) =>
                          setSiteToEdit({ ...siteToEdit, county: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select a county...</option>
                        {UK_COUNTIES.map((county) => (
                          <option key={county} value={county}>
                            {county}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Postcode
                      </label>
                      <input
                        type="text"
                        value={siteToEdit.postcode}
                        onChange={(e) =>
                          setSiteToEdit({ ...siteToEdit, postcode: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        What3Words
                      </label>
                      <input
                        type="text"
                        value={siteToEdit.what3words}
                        onChange={(e) =>
                          setSiteToEdit({ ...siteToEdit, what3words: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter What3Words address (e.g., filled.count.soap)"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Format: three words separated by dots (e.g.,
                        filled.count.soap)
                      </p>
                    </div>
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Site Manager
                      </label>
                      <input
                        type="text"
                        value={siteToEdit.site_manager}
                        onChange={(e) =>
                          setSiteToEdit({
                            ...siteToEdit,
                            site_manager: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={siteToEdit.phone}
                        onChange={(e) =>
                          setSiteToEdit({ ...siteToEdit, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentStep(1);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
                >
                  Cancel
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="w-full sm:w-auto inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {currentStep === 3 ? 'Update Site' : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && siteToDelete && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full m-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Confirm Delete
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete the site "{siteToDelete.name}"?
                This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 