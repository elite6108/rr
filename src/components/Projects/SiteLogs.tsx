import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import {
  ChevronLeft as ChevronLeftIcon,
  Plus,
  X,
  Check,
  AlertCircle,
  MapPin,
  Pencil,
  Trash2,
  QrCode,
  Search,
} from 'lucide-react';

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

// Add type declaration for What3Words
declare global {
  interface Window {
    what3words?: {
      api: {
        convertToCoordinates: (options: {
          words: string;
          format: string;
        }) => Promise<{ coordinates: { lat: number; lng: number } }>;
        convertTo3wa: (options: {
          coordinates: { lat: number; lng: number };
          format: string;
        }) => Promise<{ words: string }>;
        autosuggest: (options: {
          input: string;
          format: string;
        }) => Promise<{ suggestions: Array<{ words: string }> }>;
      };
    };
  }
}

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
  project_id?: string;
}

interface SiteLog {
  id: string;
  full_name: string;
  phone: string;
  company: string;
  email: string;
  fit_to_work: boolean;
  logged_in_at: string;
  logged_out_at?: string;
}

interface SiteListsProps {
  setShowCustomerProjectsDashboard: (show: boolean) => void;
  setActiveSection: (section: string | null) => void;
}

interface Project {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export function SiteLists({
  setShowCustomerProjectsDashboard,
  setActiveSection,
}: SiteListsProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteLogs, setSiteLogs] = useState<SiteLog[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<Site | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [showSiteLogs, setShowSiteLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [newSite, setNewSite] = useState({
    name: '',
    address: '',
    town: '',
    county: '',
    postcode: '',
    site_manager: '',
    phone: '',
    what3words: '',
    project_id: '',
  });
  const [w3wValidation, setW3wValidation] = useState<{
    isValid: boolean;
    message: string;
    isChecking: boolean;
  }>({
    isValid: false,
    message: '',
    isChecking: false,
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [currentView, setCurrentView] = useState<'list' | 'logs'>('list');
  const [currentStep, setCurrentStep] = useState(1);
  const [showW3WModal, setShowW3WModal] = useState(false);

  useEffect(() => {
    fetchSites();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      fetchSiteLogs(selectedSiteId);
    }
  }, [selectedSiteId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showAddModal || showEditModal || showDeleteModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showDeleteModal]);

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchSiteLogs = async (siteId: string) => {
    try {
      const { data, error } = await supabase
        .from('site_logs')
        .select('*')
        .eq('site_id', siteId)
        .order('logged_in_at', { ascending: false });

      if (error) throw error;
      setSiteLogs(data || []);
    } catch (error) {
      console.error('Error fetching site logs:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

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
      const { error } = await supabase.from('sites').insert([newSite]);

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
        project_id: '',
      });
      setCurrentStep(1);
      fetchSites();
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
          project_id: newSite.project_id,
        })
        .eq('id', siteToEdit.id);

      if (error) throw error;

      setShowEditModal(false);
      setSiteToEdit(null);
      setCurrentStep(1);
      fetchSites();
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
      if (selectedSiteId === siteToDelete.id) {
        setSelectedSiteId(null);
        setShowSiteLogs(false);
      }
      fetchSites();
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
      project_id: site.project_id || '',
    });
    setShowEditModal(true);
    
    // Scroll to top on mobile when modal opens
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openDeleteModal = (site: Site) => {
    setSiteToDelete(site);
    setShowDeleteModal(true);
    
    // Scroll to top on mobile when modal opens
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSiteClick = (site: Site) => {
    setSelectedSiteId(site.id);
    setCurrentView('logs');
    
    // Scroll to top on mobile when modal opens
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSiteId(null);
  };

  // Add downloadQRCode function to generate and download QR code
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
          console.error(
            'Error loading company logo, using placeholder instead'
          );
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
    const query = searchQuery.toLowerCase();
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

  const renderStepIndicator = () => {
    const stepLabels = ['Info', 'Address', 'Contact'];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600">
            {stepLabels[currentStep - 1]}
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
  };

  // Function to handle opening the What3Words modal
  const openW3WModal = () => {
    setShowW3WModal(true);
    
    // Scroll to top on mobile when modal opens
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Function to handle closing the What3Words modal
  const closeW3WModal = () => {
    setShowW3WModal(false);
  };

  if (currentView === 'logs' && selectedSiteId) {
    const site = sites.find((s) => s.id === selectedSiteId);
    if (!site) return null;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <button
              onClick={handleBackToList}
              className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-2" />
              Back to Sitess
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {site.name} - Site Logs
              </h1>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Address
                </h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {site.address}, {site.town}, {site.county}, {site.postcode}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Site Manager
                </h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {site.site_manager}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Contact
                </h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {site.phone}
                </p>
              </div>
              {site.what3words && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    What3Words
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="mt-1 text-base text-gray-900 dark:text-white">
                      {site.what3words}
                    </p>
                    <button
                      onClick={() => window.open('https://what3words.com/', 'w3w_popup', 'width=800,height=600,scrollbars=yes,resizable=yes')}
                      className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                    >
                      Open W3W
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Logged In
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {siteLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                      >
                        No logs found for this site
                      </td>
                    </tr>
                  ) : (
                    siteLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {log.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {log.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <div>{log.phone}</div>
                          <div className="text-xs">{log.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.fit_to_work
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}
                          >
                            {log.fit_to_work
                              ? 'Fit to Work'
                              : 'Not Fit to Work'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {new Date(log.logged_in_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={() => {
            setShowCustomerProjectsDashboard(true);
            setActiveSection('customers');
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Customers & Projects
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Sites Management
        </h2>
      </div>

      {/* Search Box with Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, address, town, county, postcode, site manager or phone..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => {
              setShowAddModal(true);
              
              // Scroll to top on mobile when modal opens
              if (window.innerWidth < 640) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Site
          </button>
        </div>
      </div>

      {/* Sites Table with responsive wrapper */}
      <div className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden sm:rounded-lg">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Site Name
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Address
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Site Manager
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Phone
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Created
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSites.map((site) => (
                    <tr
                      key={site.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
                        onClick={() => handleSiteClick(site)}
                      >
                        {site.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {site.address}, {site.town}, {site.county},{' '}
                        {site.postcode}
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
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            openEditModal(site);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            downloadQRCode(site);
                          }}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                          title="Download QR Code"
                        >
                          <QrCode className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            openDeleteModal(site);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden">
          {filteredSites.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No sites found
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filteredSites.map((site) => (
                <div 
                  key={site.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => handleSiteClick(site)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {site.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {site.address}, {site.town}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(site);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadQRCode(site);
                        }}
                        className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                        title="Download QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(site);
                        }}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Site Manager:</span>
                      <span className="text-gray-900 dark:text-white">{site.site_manager}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                      <span className="text-gray-900 dark:text-white">{site.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Location:</span>
                      <span className="text-gray-900 dark:text-white text-right">
                        {site.county}, {site.postcode}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(site.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {site.what3words && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">What3Words:</span>
                        <span className="text-gray-900 dark:text-white">{site.what3words}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Site Logs Modal */}
      {showSiteLogs && selectedSiteId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-4xl w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Site Logs - {sites.find((s) => s.id === selectedSiteId)?.name}
              </h3>
              <button
                onClick={() => {
                  setShowSiteLogs(false);
                  setSelectedSiteId(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fit to Work
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Logged In
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {siteLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {log.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {log.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {log.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {log.fit_to_work ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(log.logged_in_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && siteToDelete && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-md w-full m-4">
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

      {/* Edit Site Modal */}
      {showEditModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-hidden flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-md w-full m-4 max-h-[70vh] flex flex-col">
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
                        value={newSite.name}
                        onChange={(e) =>
                          setNewSite({ ...newSite, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Project
                      </label>
                      <select
                        value={newSite.project_id}
                        onChange={(e) =>
                          setNewSite({ ...newSite, project_id: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select a project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        What3Words
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={newSite.what3words}
                          onChange={(e) =>
                            setNewSite({ ...newSite, what3words: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g. filled.count.soap"
                        />
                        <button
                          type="button"
                          onClick={openW3WModal}
                          className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                        >
                          Click to open W3W and copy the words and paste back into this box
                        </button>
                      </div>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
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
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left h-4 w-4 mr-1 inline" style={{ marginTop: '-2px' }}><path d="m15 18-6-6 6-6"></path></svg>
                      Previous
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {currentStep === 3 ? 'Update Site' : 'Next'}
                    {currentStep !== 3 && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }}><path d="m9 18 6-6-6-6"></path></svg>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Site Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-hidden flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-md w-full m-4 max-h-[70vh] flex flex-col">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Project
                      </label>
                      <select
                        value={newSite.project_id}
                        onChange={(e) =>
                          setNewSite({ ...newSite, project_id: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select a project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        What3Words
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={newSite.what3words}
                          onChange={(e) =>
                            setNewSite({ ...newSite, what3words: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g. filled.count.soap"
                        />
                        <button
                          type="button"
                          onClick={openW3WModal}
                          className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                        >
                          Click to open W3W and copy the words and paste back into this box
                        </button>
                      </div>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
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
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left h-4 w-4 mr-1 inline" style={{ marginTop: '-2px' }}><path d="m15 18-6-6 6-6"></path></svg>
                      Previous
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {currentStep === 3 ? 'Add Site' : 'Next'}
                    {currentStep !== 3 && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }}><path d="m9 18 6-6-6-6"></path></svg>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* What3Words Modal */}
      {showW3WModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black bg-opacity-50 h-screen w-screen">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">What3Words Location</h3>
              <button
                type="button"
                onClick={closeW3WModal}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-grow overflow-auto p-0">
              <iframe
                src="https://what3words.com"
                title="What3Words Map"
                className="w-full h-[70vh]"
                allow="geolocation"
              ></iframe>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Find your location on the map, copy the three words, and paste them back into the form.
              </p>
              <button
                type="button"
                onClick={closeW3WModal}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
