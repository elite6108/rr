import React, { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  Upload, 
  FolderPlus, 
  Grid3X3, 
  List, 
  Trash2, 
  Download,
  Eye,
  X,
  Folder,
  Image,
  File as FileIcon,
  ChevronRight,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronDown,
  Menu,
  ChevronLeft,
      Edit2,
    BookMarked,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CompanyFile {
  id: string;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_folder: boolean;
  parent_folder_id?: string;
  storage_path?: string;
  created_at: string;
  is_employee_handbook?: boolean;
  is_annual_training?: boolean;
}

interface FilesProps {
  onBack: () => void;
}

type ViewMode = 'list' | 'grid';

// Folder Tree Item Component
interface FolderTreeItemProps {
  folder: CompanyFile | null;
  currentFolder: string | null;
  onFolderClick: (folderId: string | null) => void;
  level: number;
  allFolders: CompanyFile[];
  onMobileClose?: () => void;
}

function FolderTreeItem({ folder, currentFolder, onFolderClick, level, allFolders, onMobileClose }: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = currentFolder === (folder?.id || null);
  const childFolders = allFolders.filter(f => f.parent_folder_id === folder?.id);
  const hasChildren = childFolders.length > 0;

  useEffect(() => {
    // Auto-expand if this folder is in the current path
    if (folder && currentFolder?.includes(folder.id)) {
      setIsExpanded(true);
    }
  }, [currentFolder, folder]);

  const handleClick = () => {
    onFolderClick(folder?.id || null);
    // Close mobile sidebar when folder is selected
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <div>
      <div
        className={`flex items-center px-2 py-2 cursor-pointer rounded text-sm transition-colors ${
          isSelected 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mr-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded touch-manipulation"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}
        {!hasChildren && <div className="w-5 mr-1" />}
        <Folder className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
        <span className="truncate">{folder ? folder.name : '📁 Root'}</span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {childFolders.map(childFolder => (
            <FolderTreeItem
              key={childFolder.id}
              folder={childFolder}
              currentFolder={currentFolder}
              onFolderClick={onFolderClick}
              level={level + 1}
              allFolders={allFolders}
              onMobileClose={onMobileClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Files({ onBack }: FilesProps) {
  const [companyFiles, setCompanyFiles] = useState<CompanyFile[]>([]);
  const [allFolders, setAllFolders] = useState<CompanyFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid'); // Default to grid on mobile
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CompanyFile | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, name: string}>>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar closed by default on mobile
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());
  const [draggedItem, setDraggedItem] = useState<CompanyFile | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CompanyFile | null>(null);
  const [editName, setEditName] = useState('');
  const [originalExtension, setOriginalExtension] = useState(''); // Add this new state
  // New states for upload functionality
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [isDragOverMainPane, setIsDragOverMainPane] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Assignment dropdown and modal states
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentAction, setAssignmentAction] = useState<{
    type: 'assign' | 'remove';
    category: 'handbook' | 'annual_training';
    file: CompanyFile;
  } | null>(null);
  const assignDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFiles();
    fetchAllFolders();
  }, [currentFolder]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(false);
      }
    };

    if (showAssignDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAssignDropdown]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.getElementById('mobile-sidebar');
        const target = event.target as Node;
        if (sidebar && !sidebar.contains(target)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('company_files')
        .select('*');
      
      if (currentFolder) {
        query = query.eq('parent_folder_id', currentFolder);
      } else {
        query = query.is('parent_folder_id', null);
      }
      
      const { data, error } = await query
        .order('is_folder', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanyFiles(data || []);
      
      if (currentFolder) {
        await updateBreadcrumbs(currentFolder);
      } else {
        setBreadcrumbs([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('company_files')
        .select('*')
        .eq('is_folder', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setAllFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const updateBreadcrumbs = async (folderId: string) => {
    const crumbs: Array<{ id: string, name: string }> = [];
    let currentId: string | null = folderId;
    
    while (currentId) {
      const { data } = await supabase
        .from('company_files')
        .select('id, name, parent_folder_id')
        .eq('id', currentId)
        .single();
      
      if (data) {
        crumbs.unshift({ id: data.id, name: data.name });
        currentId = data.parent_folder_id;
      } else {
        break;
      }
    }
    
    setBreadcrumbs(crumbs);
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    setIsUploading(true);
    const fileArray = Array.from(files);
    const progressMap: {[key: string]: number} = {};
    
    // Initialize progress for all files
    fileArray.forEach((file, index) => {
      progressMap[`${file.name}-${index}`] = 0;
    });
    setUploadProgress(progressMap);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const fileKey = `${file.name}-${i}`;
        const fileId = crypto.randomUUID();
        const timestamp = Date.now();
        const storagePath = `company-files/${fileId}-${timestamp}-${file.name}`;
        
        // Update progress to 25% when starting upload
        setUploadProgress(prev => ({ ...prev, [fileKey]: 25 }));
        
        const { error: uploadError } = await supabase.storage
          .from('company-files')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Update progress to 75% when upload complete
        setUploadProgress(prev => ({ ...prev, [fileKey]: 75 }));

        const { error: dbError } = await supabase
          .from('company_files')
          .insert({
            id: fileId,
            name: file.name,
            file_path: storagePath,
            file_size: file.size,
            mime_type: file.type,
            is_folder: false,
            parent_folder_id: currentFolder,
            storage_path: storagePath
          });

        if (dbError) throw dbError;

        // Update progress to 100% when database insert complete
        setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
      }

      fetchFiles();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setLoading(false);
      setIsUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress({}), 1000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileUpload(files);
    }
  };

  // Drag and drop handlers for upload
  const handleUploadDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUpload(true);
  };

  const handleUploadDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the upload area completely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOverUpload(false);
    }
  };

  const handleUploadDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUpload(true);
  };

  const handleUploadDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUpload(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Drag and drop handlers for main pane
  const handleMainPaneDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only handle external files, not internal drag operations
    if (!draggedItem && e.dataTransfer.types.includes('Files')) {
      setIsDragOverMainPane(true);
    }
  };

  const handleMainPaneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the main pane completely
    if (!draggedItem) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setIsDragOverMainPane(false);
      }
    }
  };

  const handleMainPaneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only handle external files, not internal drag operations
    if (!draggedItem && e.dataTransfer.types.includes('Files')) {
      setIsDragOverMainPane(true);
    }
  };

  const handleMainPaneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverMainPane(false);
    
    // Only handle external files, not internal drag operations
    if (!draggedItem && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      handleFileUpload(files);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderId = crypto.randomUUID();
      
      const { error } = await supabase
        .from('company_files')
        .insert({
          id: folderId,
          name: newFolderName.trim(),
          file_path: '',
          is_folder: true,
          parent_folder_id: currentFolder
        });

      if (error) throw error;

      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchFiles();
      fetchAllFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      
      const fileIds = Array.from(filesToDelete);
      const filesInfo = await supabase.from('company_files').select('id, storage_path, is_folder').in('id', fileIds);
      if (filesInfo.error) throw filesInfo.error;

      const toDelete = filesInfo.data;
      const filePaths = toDelete.filter(f => !f.is_folder && f.storage_path).map(f => f.storage_path);

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('company-files').remove(filePaths);
        if (storageError) console.warn('Partial delete: could not remove some files from storage', storageError);
      }
      
      const { error: dbError } = await supabase.from('company_files').delete().in('id', fileIds);
      if (dbError) throw dbError;

      setFilesToDelete(new Set());
      setSelectedFiles(new Set());
      setShowDeleteModal(false);
      fetchFiles();
      fetchAllFolders();
    } catch (error) {
      console.error('Error deleting files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (fileIds: Set<string>) => {
    setFilesToDelete(fileIds);
    setShowDeleteModal(true);
  };

  const handleSingleDelete = (fileId: string) => {
    handleDeleteClick(new Set([fileId]));
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size > 0) {
      handleDeleteClick(selectedFiles);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    if (selectedFiles.size === companyFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(companyFiles.map(f => f.id)));
    }
  };

  const goToFolder = (folderId: string | null) => {
    setCurrentFolder(folderId);
    setSelectedFiles(new Set());
  };

  const openFileModal = async (file: CompanyFile) => {
    if (file.is_folder) {
      goToFolder(file.id);
      return;
    }

    setSelectedFile(file);
    setShowFileModal(true);

    if (file.storage_path) {
      try {
        const { data } = await supabase.storage
          .from('company-files')
          .createSignedUrl(file.storage_path, 3600); 

        if (data?.signedUrl) {
          setFilePreviewUrl(data.signedUrl);
        } else {
          setFilePreviewUrl(null);
        }
      } catch (error) {
        console.error('Error generating preview URL:', error);
        setFilePreviewUrl(null);
      }
    } else {
      setFilePreviewUrl(null);
    }
  };

  const downloadFile = async (file: CompanyFile) => {
    if (file.is_folder || !file.storage_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('company-files')
        .download(file.storage_path);

      if (error) throw error;
      if (!data) return;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getFileTypeCategory = (file: CompanyFile) => {
    if (file.is_folder) return 'folder';
    const mimeType = file.mime_type || '';
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'file';
  };

  const renderFilePreview = () => {
    if (!selectedFile || !filePreviewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <FileIcon className="h-16 w-16 mx-auto mb-4" />
          <p>Preview not available</p>
          {selectedFile && (
             <button
                onClick={() => downloadFile(selectedFile)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </button>
          )}
        </div>
      );
    }

    const fileType = getFileTypeCategory(selectedFile);

    switch (fileType) {
      case 'image':
        return <img src={filePreviewUrl} alt={selectedFile.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" onError={() => setFilePreviewUrl(null)} />;
      case 'pdf':
        return <iframe src={filePreviewUrl} className="w-full h-[80vh] border-0 rounded-lg" title={selectedFile.name} />;
      case 'video':
        return <video src={filePreviewUrl} controls className="max-w-full max-h-[80vh] rounded-lg" onError={() => setFilePreviewUrl(null)}>Your browser does not support the video tag.</video>;
      case 'audio':
        return <audio src={filePreviewUrl} controls className="w-full max-w-md" onError={() => setFilePreviewUrl(null)}>Your browser does not support the audio tag.</audio>;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <FileIcon className="h-16 w-16 mx-auto mb-4" />
            <p>Preview not available for this file type</p>
            <button
              onClick={() => downloadFile(selectedFile)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </button>
          </div>
        );
    }
  };

  const ImageThumbnail = ({ file, className = "", size = "md" }: { 
    file: CompanyFile; 
    className?: string; 
    size?: "sm" | "md" | "lg" 
  }) => {
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);

    useEffect(() => {
      if (thumbnailCache.has(file.id)) {
        setThumbUrl(thumbnailCache.get(file.id)!);
        return;
      }
      
      const generateThumbnail = async () => {
        if (!file.storage_path) return;
        try {
          const { data, error } = await supabase.storage
            .from('company-files')
            .createSignedUrl(file.storage_path, 60 * 5); // 5-minute URL

          if (error) throw error;
          
          setThumbUrl(data.signedUrl);
          setThumbnailCache(prev => new Map(prev).set(file.id, data.signedUrl));
        } catch (err) {
          console.error('Error generating thumbnail:', err);
        }
      };
      
      generateThumbnail();

    }, [file.id, file.storage_path]);

    const sizeClasses = { sm: "h-16 w-16", md: "h-24 w-24", lg: "h-32 w-32" };
    
    if (thumbUrl) {
      return <img src={thumbUrl} alt={file.name} className={`${sizeClasses[size]} ${className} object-cover rounded-md`} />;
    }
    
    return <div className={`${sizeClasses[size]} ${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-md text-gray-400`}><Image className="h-1/2 w-1/2" /></div>;
  };

  const getFileIcon = (file: CompanyFile, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = { sm: "h-5 w-5", md: "h-12 w-12", lg: "h-20 w-20" };
    const className = `${sizeClasses[size]} flex-shrink-0`;

    if (file.is_folder) {
      return <Folder className={`${className} text-blue-500`} />;
    }
    
    const fileType = getFileTypeCategory(file);
    if (fileType === 'image') return <ImageThumbnail file={file} size={size} />;
    
    switch (fileType) {
      case 'pdf': return <FileText className={`${className} text-red-500`} />;
      case 'video': return <FileText className={`${className} text-purple-500`} />;
      case 'audio': return <FileText className={`${className} text-pink-500`} />;
      default: return <FileIcon className={`${className} text-gray-500`} />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '—';
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const truncateFileName = (fileName: string, maxLength: number = 30) => {
    if (fileName.length <= maxLength) return fileName;
    
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension, just truncate
      return fileName.substring(0, maxLength - 3) + '...';
    }
    
    const extension = fileName.substring(lastDotIndex);
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const availableLength = maxLength - extension.length - 3; // 3 for '...'
    
    if (availableLength <= 0) {
      // Extension is too long, just show extension
      return '...' + extension;
    }
    
    return nameWithoutExt.substring(0, availableLength) + '...' + extension;
  };

  const getCurrentFolderName = () => {
    if (!currentFolder) return 'Files Management';
    const folder = allFolders.find(f => f.id === currentFolder);
    return folder ? folder.name : 'Files Management';
  };

  const handleDragStart = (e: React.DragEvent, file: CompanyFile) => {
    e.dataTransfer.setData('application/json', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { // allows react to update state before DOM changes
        setDraggedItem(file);
    }, 0);
  };

  const handleSetHandbook = async (file: CompanyFile) => {
    if (file.is_folder || !file.storage_path) return;
  
    try {
      setLoading(true);
  
      // Clear all existing handbooks first
      const { error: clearError } = await supabase
        .from('company_files')
        .update({ is_employee_handbook: false })
        .eq('is_employee_handbook', true);
      
      if (clearError) throw clearError;
  
      // Set this file as the handbook
      const { error: setError } = await supabase
        .from('company_files')
        .update({ is_employee_handbook: true })
        .eq('id', file.id);
  
      if (setError) throw setError;
  
      fetchFiles();
      setShowAssignModal(false);
      setAssignmentAction(null);
    } catch (error) {
      console.error('Error setting employee handbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHandbook = async (file: CompanyFile) => {
    try {
      setLoading(true);
  
      const { error } = await supabase
        .from('company_files')
        .update({ is_employee_handbook: false })
        .eq('id', file.id);
  
      if (error) throw error;
  
      fetchFiles();
      setShowAssignModal(false);
      setAssignmentAction(null);
    } catch (error) {
      console.error('Error removing employee handbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAnnualTraining = async (file: CompanyFile) => {
    if (file.is_folder || !file.storage_path) return;
  
    try {
      setLoading(true);
  
      // Clear all existing annual training assignments first
      const { error: clearError } = await supabase
        .from('company_files')
        .update({ is_annual_training: false })
        .eq('is_annual_training', true);
      
      if (clearError) throw clearError;
  
      // Set this file as the annual training
      const { error: setError } = await supabase
        .from('company_files')
        .update({ is_annual_training: true })
        .eq('id', file.id);
  
      if (setError) throw setError;
  
      fetchFiles();
      setShowAssignModal(false);
      setAssignmentAction(null);
    } catch (error) {
      console.error('Error setting annual training:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAnnualTraining = async (file: CompanyFile) => {
    try {
      setLoading(true);
  
      const { error } = await supabase
        .from('company_files')
        .update({ is_annual_training: false })
        .eq('id', file.id);
  
      if (error) throw error;
  
      fetchFiles();
      setShowAssignModal(false);
      setAssignmentAction(null);
    } catch (error) {
      console.error('Error removing annual training:', error);
    } finally {
      setLoading(false);
    }
  };

  // New functions for dropdown actions
  const handleAssignmentAction = (type: 'assign' | 'remove', category: 'handbook' | 'annual_training', file: CompanyFile) => {
    setAssignmentAction({ type, category, file });
    setShowAssignDropdown(false);
    setShowAssignModal(true);
  };

  const confirmAssignmentAction = async () => {
    if (!assignmentAction) return;

    const { type, category, file } = assignmentAction;

    if (type === 'assign') {
      if (category === 'handbook') {
        await handleSetHandbook(file);
      } else {
        await handleSetAnnualTraining(file);
      }
    } else {
      if (category === 'handbook') {
        await handleRemoveHandbook(file);
      } else {
        await handleRemoveAnnualTraining(file);
      }
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (e: React.DragEvent, targetFile?: CompanyFile) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (targetFile && targetFile.is_folder && targetFile.id !== draggedItem.id) {
        setDragOverItem(targetFile.id);
    } else if (!targetFile) {
        setDragOverItem('background');
    } else {
        setDragOverItem(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverItem(null);
  };

  const validateMove = (draggedFile: CompanyFile, targetFolderId: string | null): boolean => {
      if(draggedFile.id === targetFolderId) return false;
      if(draggedFile.parent_folder_id === targetFolderId) return false;

      const isChildOfDragged = (folderId: string): boolean => {
        if (!folderId) return false;
        const folder = allFolders.find(f => f.id === folderId);
        if (!folder) return false;
        if(folder.parent_folder_id === draggedFile.id) return true;
        if(folder.parent_folder_id === null) return false;
        return isChildOfDragged(folder.parent_folder_id);
      }

      if (targetFolderId && isChildOfDragged(targetFolderId)) {
        console.error("Cannot move a folder into one of its own subfolders.");
        // You might want to show a toast notification here
        return false;
      }
      return true;
  }

  const handleDrop = async (e: React.DragEvent, targetFile?: CompanyFile) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedItem: CompanyFile = JSON.parse(e.dataTransfer.getData('application/json'));
    setDraggedItem(null);
    setDragOverItem(null);

    const targetFolderId = targetFile && targetFile.is_folder ? targetFile.id : (targetFile ? targetFile.parent_folder_id : currentFolder);
    
    if(!validateMove(droppedItem, targetFolderId || null)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('company_files')
        .update({ parent_folder_id: targetFolderId || null })
        .eq('id', droppedItem.id);

      if (error) throw error;
      
      fetchFiles();
      fetchAllFolders();
    } catch (error) {
      console.error('Error moving item:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditClick = (item: CompanyFile) => {
    setEditingItem(item);
    
    if (item.is_folder) {
      setEditName(item.name);
      setOriginalExtension('');
      setShowEditFolderModal(true);
    } else {
      // For files, separate name and extension
      const lastDotIndex = item.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        // File has extension
        const nameWithoutExtension = item.name.substring(0, lastDotIndex);
        const extension = item.name.substring(lastDotIndex);
        setEditName(nameWithoutExtension);
        setOriginalExtension(extension);
      } else {
        // File has no extension
        setEditName(item.name);
        setOriginalExtension('');
      }
      setShowEditFileModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return;
    try {
      setLoading(true);
      
      // For files, append the original extension back
      const finalName = editingItem.is_folder ? editName.trim() : editName.trim() + originalExtension;
      
      const { error } = await supabase
        .from('company_files')
        .update({ name: finalName })
        .eq('id', editingItem.id);

      if (error) throw error;

      setShowEditFolderModal(false);
      setShowEditFileModal(false);
      setEditingItem(null);
      setEditName('');
      setOriginalExtension('');
      fetchFiles();
      if (editingItem.is_folder) {
        fetchAllFolders();
      }
    } catch (error) {
      console.error('Error updating item name:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderListView = () => (
    <div 
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
    >
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th scope="col" className="p-4">
              <button onClick={selectAll} className="flex items-center">
                {selectedFiles.size === companyFiles.length && companyFiles.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/2">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">Size</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Modified</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {companyFiles.map((file) => (
            <tr
              key={file.id}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, file)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, file)}
              onClick={() => openFileModal(file)}
              onDoubleClick={() => openFileModal(file)}
              className={`transition-colors cursor-pointer group ${
                selectedFiles.has(file.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              } ${
                draggedItem?.id === file.id ? 'opacity-50' : ''
              } ${
                dragOverItem === file.id && file.is_folder ? 'outline outline-2 outline-blue-500 outline-offset-[-1px]' : ''
              }`}
            >
              <td className="p-4">
                <button onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.id); }} className="flex items-center">
                  {selectedFiles.has(file.id) ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  )}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center min-w-0">
                  {getFileIcon(file, 'sm')}
                  <span 
                    className="ml-4 text-sm font-medium text-gray-900 dark:text-white truncate"
                    title={file.name}
                  >
                    {truncateFileName(file.name, 35)}
                  </span>
                  {file.is_employee_handbook && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 flex-shrink-0">
                      <BookMarked className="h-3 w-3 mr-1" />
                      Employee Handbook
                    </span>
                  )}
                   {dragOverItem === file.id && file.is_folder && (
                     <span className="ml-2 text-xs text-blue-500 font-semibold flex-shrink-0">Drop zone</span>
                   )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {formatFileSize(file.file_size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(file.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEditClick(file); }} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white" title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {!file.is_folder && (
                    <button onClick={(e) => { e.stopPropagation(); openFileModal(file); }} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white" title="Preview">
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleSingleDelete(file.id); }} className="text-red-500 hover:text-red-700" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div 
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 p-2 sm:p-4 min-h-32 ${
        dragOverItem === 'current-folder' ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-500 rounded-lg' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
    >
      {companyFiles.map((file) => (
        <div
          key={file.id}
          className={`relative bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer group touch-manipulation ${
            selectedFiles.has(file.id) 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : dragOverItem === file.id && file.is_folder
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
          draggable
          onDragStart={(e) => handleDragStart(e, file)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => file.is_folder ? handleDragOver(e, file) : e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={(e) => file.is_folder ? handleDrop(e, file) : e.preventDefault()}
        >
          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex space-x-1">
            <button
              onClick={() => handleEditClick(file)}
              className="opacity-70 sm:opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity p-1 touch-manipulation"
              title="Edit name"
            >
              <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => toggleFileSelection(file.id)}
              className="opacity-70 sm:opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity p-1 touch-manipulation"
            >
              {selectedFiles.has(file.id) ? (
                <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Square className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </button>
          </div>
          
          <button
            onClick={() => file.is_folder ? goToFolder(file.id) : openFileModal(file)}
            className="w-full text-center touch-manipulation"
            title={file.is_folder ? 'Click to open folder' : 'Click to view file'}
          >
            <div className="flex justify-center mb-2 sm:mb-3">
              {file.is_folder ? (
                <div className="relative">
                  <Folder className="h-16 w-16 sm:h-20 sm:w-20 text-blue-500" />
                  {dragOverItem === file.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              ) : file.mime_type?.startsWith('image/') ? (
                <div className="h-16 w-16 sm:h-24 sm:w-24">
                  <ImageThumbnail file={file} size="lg" className="h-full w-full" />
                </div>
              ) : (
                <div className="h-16 w-16 sm:h-24 sm:w-24 flex items-center justify-center">
                  {getFileIcon(file, "lg")}
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
              {file.name}
            </p>
            {file.is_employee_handbook && (
              <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                <BookMarked className="h-2.5 w-2.5 mr-1" />
                Handbook
              </div>
            )}
            {file.is_annual_training && (
              <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                <BookMarked className="h-2.5 w-2.5 mr-1" />
                Annual Training
              </div>
            )}
            {!file.is_folder && !file.is_employee_handbook && !file.is_annual_training && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                {formatFileSize(file.file_size)}
              </p>
            )}
            {file.is_folder && dragOverItem === file.id && (
              <p className="text-xs text-blue-500 mt-1 leading-tight animate-pulse">
                Drop here
              </p>
            )}
          </button>
        </div>
      ))}
    </div>
  );
  
  return (
    <Fragment>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Company Section
        </button>
       </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">File Management</h2>
      </div>
      <br></br>
      
    <div className="h-[calc(100vh-200px)] flex bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative shadow-lg">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[60] md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Left Sidebar - Folder Navigation */}
      <div 
        id="mobile-sidebar"
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-[70] md:z-auto w-64 sm:w-72 md:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out h-full top-0 left-0`}
      >
        {/* Sidebar Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Folders</h3>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-manipulation"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="w-full inline-flex items-center justify-center px-3 py-2.5 border border-transparent text-sm font-medium rounded-md text-gray-900 dark:text-white bg-[#ffec66] dark:bg-[#2563eb] hover:bg-[#ffe033] dark:hover:bg-[#1d4ed8] transition-colors touch-manipulation shadow-sm"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </button>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          <FolderTreeItem
            folder={null}
            currentFolder={currentFolder}
            onFolderClick={goToFolder}
            level={0}
            allFolders={allFolders}
            onMobileClose={() => setSidebarOpen(false)}
          />
          {allFolders
            .filter(folder => !folder.parent_folder_id)
            .map(folder => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                currentFolder={currentFolder}
                onFolderClick={goToFolder}
                level={0}
                allFolders={allFolders}
                onMobileClose={() => setSidebarOpen(false)}
              />
            ))}
        </div>
      </div>

      {/* Right Content - Files */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-manipulation"
                >
                  <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                
                            
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {getCurrentFolderName()}
                  </h2>
                  {breadcrumbs.length > 0 && (
                    <nav className="flex items-center space-x-1 mt-1 overflow-x-auto">
                      <button
                        onClick={() => goToFolder(null)}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 whitespace-nowrap touch-manipulation"
                      >
                        Root
                      </button>
                      {breadcrumbs.map((crumb, index) => (
                        <Fragment key={crumb.id}>
                          <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <button
                            onClick={() => goToFolder(crumb.id)}
                            className={`text-xs sm:text-sm whitespace-nowrap touch-manipulation ${
                              index === breadcrumbs.length - 1
                                ? 'text-gray-500 dark:text-gray-400'
                                : 'text-blue-600 hover:text-blue-800 dark:text-blue-400'
                            }`}
                          >
                            {crumb.name}
                          </button>
                        </Fragment>
                      ))}
                    </nav>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {/* View Mode Toggle */}
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 sm:px-3 py-2 text-sm font-medium rounded-l-md border touch-manipulation ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 sm:px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b touch-manipulation ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors touch-manipulation"
              >
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              {/* Assignment Dropdown Button */}
              {selectedFiles.size === 1 && (() => {
                const selectedFile = companyFiles.find(f => selectedFiles.has(f.id));
                if (selectedFile && !selectedFile.is_folder && selectedFile.mime_type === 'application/pdf') {
                  const hasAssignment = selectedFile.is_employee_handbook || selectedFile.is_annual_training;
                  return (
                    <div className="relative" ref={assignDropdownRef}>
                      <button
                        onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                        className={`inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors touch-manipulation ${
                          hasAssignment 
                            ? 'bg-orange-600 hover:bg-orange-700' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        <BookMarked className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">
                          {hasAssignment ? 'Manage Assignment' : 'Assign'}
                        </span>
                        <span className="sm:hidden">
                          {hasAssignment ? 'Manage' : 'Assign'}
                        </span>
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </button>

                      {/* Dropdown Menu */}
                      {showAssignDropdown && (
                        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1">
                            {!selectedFile.is_employee_handbook && (
                              <button
                                onClick={() => handleAssignmentAction('assign', 'handbook', selectedFile)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <BookMarked className="inline h-4 w-4 mr-2 text-green-500" />
                                Assign as Employee Handbook
                              </button>
                            )}
                            {selectedFile.is_employee_handbook && (
                              <button
                                onClick={() => handleAssignmentAction('remove', 'handbook', selectedFile)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <X className="inline h-4 w-4 mr-2 text-red-500" />
                                Remove Employee Handbook
                              </button>
                            )}
                            {!selectedFile.is_annual_training && (
                              <button
                                onClick={() => handleAssignmentAction('assign', 'annual_training', selectedFile)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <BookMarked className="inline h-4 w-4 mr-2 text-blue-500" />
                                Assign as Annual Training
                              </button>
                            )}
                            {selectedFile.is_annual_training && (
                              <button
                                onClick={() => handleAssignmentAction('remove', 'annual_training', selectedFile)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <X className="inline h-4 w-4 mr-2 text-red-500" />
                                Remove Annual Training
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Delete Selected */}
              {selectedFiles.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors touch-manipulation"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete ({selectedFiles.size})</span>
                  <span className="sm:hidden">({selectedFiles.size})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* File Content Area */}
        <div 
          className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 relative ${
            isDragOverMainPane ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
          }`}
          onDragEnter={handleMainPaneDragEnter}
          onDragLeave={handleMainPaneDragLeave}
          onDragOver={handleMainPaneDragOver}
          onDrop={handleMainPaneDrop}
        >
          {/* Drag overlay for main pane */}
          {isDragOverMainPane && (
            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 border-4 border-dashed border-blue-500 z-10 flex items-center justify-center">
              <div className="text-center">
                <Upload className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                  Drop files here to upload
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Files will be uploaded to {getCurrentFolderName()}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : companyFiles.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No files</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No files have been uploaded to this folder yet.
              </p>
            </div>
          ) : (
            <div className={viewMode === 'list' ? 'p-2 sm:p-4' : ''}>
              {viewMode === 'list' ? renderListView() : renderGridView()}
            </div>
          )}

          {/* Upload Progress Overlay */}
          {isUploading && Object.keys(uploadProgress).length > 0 && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 z-20 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Uploading Files...
                </h3>
                <div className="space-y-3">
                  {Object.entries(uploadProgress).map(([fileKey, progress]) => {
                    const fileName = fileKey.split('-').slice(0, -1).join('-');
                    return (
                      <div key={fileKey}>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span className="truncate">{fileName}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ppt,.pptx"
      />

      <Fragment>
        {/* Upload Modal */}
        {showUploadModal && createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Upload Files
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  isDragOverUpload 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onDragEnter={handleUploadDragEnter}
                onDragLeave={handleUploadDragLeave}
                onDragOver={handleUploadDragOver}
                onDrop={handleUploadDrop}
              >
                <Upload className={`mx-auto h-12 w-12 mb-4 transition-colors ${
                  isDragOverUpload ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm mb-4 transition-colors ${
                  isDragOverUpload 
                    ? 'text-blue-700 dark:text-blue-300 font-semibold' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {isDragOverUpload 
                    ? 'Drop files here to upload' 
                    : `Drag and drop files here or click to browse`
                  }
                </p>
                
                {!isDragOverUpload && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Files
                  </button>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Supported: Images, PDFs, Documents, Spreadsheets
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* New Folder Modal */}
        {showNewFolderModal && createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Folder</h3>
              <input type="text" value={newFolderName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)} placeholder="Folder name" className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base" onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && createFolder()} autoFocus />
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={createFolder} disabled={!newFolderName.trim()} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">Create</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Edit Folder Name Modal */}
        {showEditFolderModal && createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit Folder Name
              </h3>
              <input
                type="text"
                value={editName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                placeholder="Folder name"
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white touch-manipulation text-base"
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveEdit()}
                autoFocus
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditFolderModal(false);
                    setEditingItem(null);
                    setEditName('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editName.trim() || loading}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 touch-manipulation flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Edit File Name Modal */}
        {showEditFileModal && createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit File Name
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    File name (without extension)
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                    placeholder="File name"
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white touch-manipulation text-base"
                    onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveEdit()}
                    autoFocus
                  />
                </div>
                {originalExtension && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      File extension (cannot be changed)
                    </label>
                    <input
                      type="text"
                      value={originalExtension}
                      readOnly
                      className="block w-full px-3 py-2.5 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-300 text-base cursor-not-allowed"
                    />
                  </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Final name: <span className="font-medium">{editName.trim()}{originalExtension}</span>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditFileModal(false);
                    setEditingItem(null);
                    setEditName('');
                    setOriginalExtension('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editName.trim() || loading}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 touch-manipulation flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* File View Modal */}
        {showFileModal && selectedFile && createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {getFileIcon(selectedFile)}
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">
                      {selectedFile.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(selectedFile.file_size)} • {new Date(selectedFile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadFile(selectedFile)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Download file"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setShowFileModal(false);
                      setFilePreviewUrl(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(95vh-5rem)]">
                {renderFilePreview()}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Assignment Confirmation Modal */}
        {showAssignModal && createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-purple-100 dark:bg-purple-900 rounded-full">
                <BookMarked className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {assignmentAction?.type === 'assign' ? 'Confirm Assignment' : 'Confirm Removal'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {assignmentAction?.type === 'assign' 
                  ? `Are you sure you want to assign "${assignmentAction?.file.name}" as the ${assignmentAction?.category === 'handbook' ? 'Employee Handbook' : 'Annual Training'}?`
                  : `Are you sure you want to remove "${assignmentAction?.file.name}" from being the ${assignmentAction?.category === 'handbook' ? 'Employee Handbook' : 'Annual Training'}?`
                }
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignmentAction(null);
                  }}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAssignmentAction}
                  disabled={loading}
                  className={`px-4 py-2.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center touch-manipulation ${
                    assignmentAction?.type === 'assign' 
                      ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' 
                      : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                  }`}
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {assignmentAction?.type === 'assign' ? 'Assign' : 'Remove'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full dark:bg-red-900/20">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {filesToDelete.size === 1 
                  ? 'Are you sure you want to delete this item? This action cannot be undone.'
                  : `Are you sure you want to delete these ${filesToDelete.size} items? This action cannot be undone.`
                }
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setFilesToDelete(new Set());
                  }}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center touch-manipulation"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </Fragment>
    </div>
  </Fragment>
  );
}
