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
  FileIcon,
  ChevronRight,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronDown,
  Menu,
  ChevronLeft,
  Edit2
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface ProjectFile {
  id: string;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_folder: boolean;
  parent_folder_id?: string;
  storage_path?: string;
  created_at: string;
}

interface FilesTabProps {
  project: {
    id: string;
    name: string;
  };
  files: any[];
  isLoading: boolean;
  onFilesChange: () => void;
}

type ViewMode = 'list' | 'grid';

// Folder Tree Item Component
interface FolderTreeItemProps {
  folder: ProjectFile | null;
  currentFolder: string | null;
  onFolderClick: (folderId: string | null) => void;
  level: number;
  allFolders: ProjectFile[];
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

export function FilesTab({ project, files, isLoading, onFilesChange }: FilesTabProps) {
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [allFolders, setAllFolders] = useState<ProjectFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid'); // Default to grid on mobile
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, name: string}>>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar closed by default on mobile
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());
  const [draggedItem, setDraggedItem] = useState<ProjectFile | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectFile | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
    fetchAllFolders();
  }, [project.id, currentFolder]);

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
        .from('project_files')
        .select('*')
        .eq('project_id', project.id);
      
      // Handle NULL parent_folder_id properly
      if (currentFolder) {
        query = query.eq('parent_folder_id', currentFolder);
      } else {
        query = query.is('parent_folder_id', null);
      }
      
      const { data, error } = await query
        .order('is_folder', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setProjectFiles(data || []);
      
      // Update breadcrumbs
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
        .from('project_files')
        .select('*')
        .eq('project_id', project.id)
        .eq('is_folder', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setAllFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const updateBreadcrumbs = async (folderId: string) => {
    const crumbs = [];
    let currentId = folderId;
    
    while (currentId) {
      const { data } = await supabase
        .from('project_files')
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${project.id}/${currentFolder || 'root'}/${Date.now()}_${file.name}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save file metadata to database
        const { error: dbError } = await supabase
          .from('project_files')
          .insert({
            project_id: project.id,
            name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            is_folder: false,
            parent_folder_id: currentFolder,
            storage_path: uploadData.path
          });

        if (dbError) throw dbError;
      }
      
      await fetchFiles();
      onFilesChange();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from('project_files')
        .insert({
          project_id: project.id,
          name: newFolderName.trim(),
          file_path: `${currentFolder || 'root'}/${newFolderName.trim()}`,
          is_folder: true,
          parent_folder_id: currentFolder
        });

      if (error) throw error;
      
      setNewFolderName('');
      setShowNewFolderModal(false);
      await fetchFiles();
      await fetchAllFolders();
      onFilesChange();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const confirmDelete = async () => {
    if (filesToDelete.size === 0) return;
    
    try {
      setLoading(true);
      
      for (const fileId of filesToDelete) {
        const file = projectFiles.find(f => f.id === fileId);
        if (!file) continue;

        // Delete from storage if it's a file
        if (!file.is_folder && file.storage_path) {
          await supabase.storage
            .from('project-files')
            .remove([file.storage_path]);
        }

        // Delete from database
        await supabase
          .from('project_files')
          .delete()
          .eq('id', fileId);
      }
      
      setSelectedFiles(new Set());
      setFilesToDelete(new Set());
      setShowDeleteModal(false);
      await fetchFiles();
      await fetchAllFolders();
      onFilesChange();
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
    handleDeleteClick(selectedFiles);
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
    if (selectedFiles.size === projectFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(projectFiles.map(f => f.id)));
    }
  };

  const goToFolder = (folderId: string | null) => {
    setCurrentFolder(folderId);
    setSelectedFiles(new Set());
  };

  const openFileModal = async (file: ProjectFile) => {
    setSelectedFile(file);
    setShowFileModal(true);
    setFilePreviewUrl(null); // Reset preview URL
    
    console.log('Opening file modal for:', file.name, 'Storage path:', file.storage_path, 'MIME type:', file.mime_type);
    
    // Generate signed URL for private storage
    if (file.storage_path) {
      try {
        console.log('Generating signed URL for:', file.storage_path);
        const { data, error } = await supabase.storage
          .from('project-files')
          .createSignedUrl(file.storage_path, 3600); // 1 hour expiry
        
        if (error) {
          console.error('Error creating signed URL:', error);
          setFilePreviewUrl(null);
        } else if (data?.signedUrl) {
          console.log('Successfully generated signed URL:', data.signedUrl);
          setFilePreviewUrl(data.signedUrl);
        } else {
          console.error('No signed URL returned:', data);
          setFilePreviewUrl(null);
        }
      } catch (error) {
        console.error('Exception generating preview URL:', error);
        setFilePreviewUrl(null);
      }
    } else {
      console.log('No storage path found for file');
      setFilePreviewUrl(null);
    }
  };

  const downloadFile = async (file: ProjectFile) => {
    if (!file.storage_path) {
      console.error('No storage path for download');
      return;
    }
    
    try {
      console.log('Downloading file:', file.name);
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 60); // 1 minute expiry for download
      
      if (error) {
        console.error('Error creating download URL:', error);
        return;
      }
      
      if (data?.signedUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = file.name;
        link.target = '_blank'; // Open in new tab as fallback
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('Download initiated for:', file.name);
      } else {
        console.error('No download URL returned');
      }
    } catch (error) {
      console.error('Exception downloading file:', error);
    }
  };

  const getFileTypeCategory = (file: ProjectFile) => {
    if (!file.mime_type) {
      console.log('No MIME type for file:', file.name);
      // Try to determine from file extension
      const ext = file.name.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
      if (ext === 'pdf') return 'pdf';
      if (['doc', 'docx'].includes(ext || '')) return 'document';
      if (['xls', 'xlsx'].includes(ext || '')) return 'spreadsheet';
      if (['ppt', 'pptx'].includes(ext || '')) return 'presentation';
      if (['txt', 'csv', 'md'].includes(ext || '')) return 'text';
      return 'unknown';
    }
    
    const mimeType = file.mime_type.toLowerCase();
    console.log('Detecting file type for MIME:', mimeType);
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('msword')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('sheet')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.startsWith('text/') || mimeType.includes('csv')) return 'text';
    
    return 'other';
  };

  const renderFilePreview = () => {
    if (!selectedFile) {
      console.log('No selected file for preview');
      return null;
    }

    const fileType = getFileTypeCategory(selectedFile);
    console.log('Rendering preview for file type:', fileType, 'File:', selectedFile.name);
    console.log('Preview URL available:', !!filePreviewUrl);
    
    if (!filePreviewUrl) {
      return (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-4">
            Unable to load preview
          </p>
          <p className="text-xs text-gray-400 mb-4">
            File type: {fileType} | MIME: {selectedFile.mime_type || 'unknown'}
          </p>
          <button
            onClick={() => downloadFile(selectedFile)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </button>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        console.log('Rendering image preview');
        return (
          <div className="text-center">
            <img
              src={filePreviewUrl}
              alt={selectedFile.name}
              className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
              onError={(e) => {
                console.error('Image failed to load:', filePreviewUrl);
                setFilePreviewUrl(null);
              }}
              onLoad={() => console.log('Image loaded successfully')}
            />
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={() => downloadFile(selectedFile)}
                className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        );
        
      case 'pdf':
        console.log('Rendering PDF preview');
        return (
          <div className="w-full">
            <div className="w-full h-[70vh] mb-4">
              <iframe
                src={`${filePreviewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg"
                title={selectedFile.name}
                onError={() => {
                  console.error('PDF iframe failed to load');
                }}
              />
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => downloadFile(selectedFile)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        );
        
      case 'document':
      case 'spreadsheet':
      case 'presentation':
        console.log('Rendering Office document preview');
        return (
          <div className="text-center py-8">
            <div className="mb-6">
              {fileType === 'document' && <FileText className="mx-auto h-16 w-16 text-blue-500 mb-4" />}
              {fileType === 'spreadsheet' && <FileText className="mx-auto h-16 w-16 text-green-500 mb-4" />}
              {fileType === 'presentation' && <FileText className="mx-auto h-16 w-16 text-orange-500 mb-4" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {selectedFile.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {fileType === 'document' && 'Microsoft Word Document'}
              {fileType === 'spreadsheet' && 'Microsoft Excel Spreadsheet'}
              {fileType === 'presentation' && 'Microsoft PowerPoint Presentation'}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Preview Options
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Office documents need to be downloaded to view. You can also try opening in Microsoft Office Online.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Size: {formatFileSize(selectedFile.file_size)} • {new Date(selectedFile.created_at).toLocaleDateString()}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => downloadFile(selectedFile)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download & Open
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Create a temporary signed URL for Office Online viewer
                      const { data, error } = await supabase.storage
                        .from('project-files')
                        .createSignedUrl(selectedFile.storage_path!, 3600);
                      
                      if (data?.signedUrl) {
                        // Try Microsoft Office Online viewer
                        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.signedUrl)}`;
                        window.open(officeViewerUrl, '_blank');
                      } else {
                        console.error('Could not generate URL for Office viewer');
                        // Fallback to download
                        downloadFile(selectedFile);
                      }
                    } catch (error) {
                      console.error('Error opening in Office viewer:', error);
                      // Fallback to download
                      downloadFile(selectedFile);
                    }
                  }}
                  className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Try Office Online
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                💡 Tip: Office Online viewer works best with publicly accessible files. Download is recommended for private files.
              </p>
            </div>
          </div>
        );
        
      case 'text':
        console.log('Rendering text file preview');
        return (
          <div>
            <div className="w-full h-[60vh] mb-4">
              <iframe
                src={filePreviewUrl}
                className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg"
                title={selectedFile.name}
              />
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => downloadFile(selectedFile)}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        );
        
      default:
        console.log('Rendering default file preview');
        return (
          <div className="text-center py-8">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {selectedFile.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              Preview not available for this file type
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Type: {fileType} | MIME: {selectedFile.mime_type || 'unknown'}
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Size: {formatFileSize(selectedFile.file_size)}
              </p>
              <button
                onClick={() => downloadFile(selectedFile)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                <Download className="h-5 w-5 mr-2" />
                Download File
              </button>
            </div>
          </div>
        );
    }
  };

  // Thumbnail component for images
  const ImageThumbnail = ({ file, className = "", size = "md" }: { 
    file: ProjectFile; 
    className?: string; 
    size?: "sm" | "md" | "lg" 
  }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const sizeClasses = {
      sm: "h-5 w-5",
      md: "h-8 w-8", 
      lg: "h-16 w-16"
    };

    useEffect(() => {
      const generateThumbnail = async () => {
        if (!file.storage_path || !file.mime_type?.startsWith('image/')) {
          setIsLoading(false);
          return;
        }

        // Check cache first
        if (thumbnailCache.has(file.id)) {
          setThumbnailUrl(thumbnailCache.get(file.id)!);
          setIsLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase.storage
            .from('project-files')
            .createSignedUrl(file.storage_path, 3600);

          if (error) {
            console.error('Error creating thumbnail URL:', error);
            setHasError(true);
          } else if (data?.signedUrl) {
            setThumbnailUrl(data.signedUrl);
            // Cache the URL
            setThumbnailCache(prev => new Map(prev).set(file.id, data.signedUrl));
          } else {
            setHasError(true);
          }
        } catch (error) {
          console.error('Exception generating thumbnail:', error);
          setHasError(true);
        } finally {
          setIsLoading(false);
        }
      };

      generateThumbnail();
    }, [file.id, file.storage_path, file.mime_type, thumbnailCache]);

    if (!file.mime_type?.startsWith('image/') || hasError) {
      return <Image className={`${sizeClasses[size]} text-green-500 ${className}`} />;
    }

    if (isLoading) {
      return (
        <div className={`${sizeClasses[size]} ${className} bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center`}>
          <Image className="h-3 w-3 text-gray-400" />
        </div>
      );
    }

    if (thumbnailUrl) {
      return (
        <img
          src={thumbnailUrl}
          alt={file.name}
          className={`${sizeClasses[size]} ${className} object-cover rounded border border-gray-200 dark:border-gray-600`}
          onError={() => {
            setHasError(true);
            setThumbnailUrl(null);
          }}
        />
      );
    }

    return <Image className={`${sizeClasses[size]} text-green-500 ${className}`} />;
  };

  const getFileIcon = (file: ProjectFile, size: "sm" | "md" | "lg" = "md") => {
    if (file.is_folder) {
      const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-8 w-8"
      };
      return <Folder className={`${sizeClasses[size]} text-blue-500`} />;
    }
    
    if (file.mime_type?.startsWith('image/')) {
      return <ImageThumbnail file={file} size={size} />;
    }
    
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-5 w-5", 
      lg: "h-8 w-8"
    };
    return <FileText className={`${sizeClasses[size]} text-gray-500`} />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCurrentFolderName = () => {
    if (!currentFolder) return 'Root';
    return breadcrumbs[breadcrumbs.length - 1]?.name || 'Unknown folder';
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, file: ProjectFile) => {
    setDraggedItem(file);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', file.id);
    
    // Add some visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    setDragOverItem(null);
    
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, targetFile?: ProjectFile) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only allow dropping on folders or in empty space (current folder)
    if (!targetFile || targetFile.is_folder) {
      setDragOverItem(targetFile?.id || 'current-folder');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverItem(null);
    }
  };

  const validateMove = (draggedFile: ProjectFile, targetFolderId: string | null): boolean => {
    // Can't move to the same location
    if (draggedFile.parent_folder_id === targetFolderId) {
      return false;
    }

    // If dragging a folder, make sure we're not moving it into itself or its children
    if (draggedFile.is_folder && targetFolderId) {
      // Check if target is the dragged folder itself
      if (targetFolderId === draggedFile.id) {
        return false;
      }

      // Check if target is a child of the dragged folder
      const isChildOfDragged = (folderId: string): boolean => {
        const folder = allFolders.find(f => f.id === folderId);
        if (!folder) return false;
        if (folder.parent_folder_id === draggedFile.id) return true;
        if (folder.parent_folder_id) return isChildOfDragged(folder.parent_folder_id);
        return false;
      };

      if (isChildOfDragged(targetFolderId)) {
        return false;
      }
    }

    return true;
  };

  const handleDrop = async (e: React.DragEvent, targetFile?: ProjectFile) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem) return;

    const targetFolderId = targetFile?.id || currentFolder;
    
    // Validate the move
    if (!validateMove(draggedItem, targetFolderId)) {
      console.log('Invalid move operation');
      return;
    }

    // Only allow dropping on folders or in current folder space
    if (targetFile && !targetFile.is_folder) {
      return;
    }

    try {
      setLoading(true);
      
      // Update the database
      const { error } = await supabase
        .from('project_files')
        .update({ 
          parent_folder_id: targetFolderId 
        })
        .eq('id', draggedItem.id);

      if (error) {
        console.error('Error moving file:', error);
        return;
      }

      // Refresh the file list
      await fetchFiles();
      await fetchAllFolders();
      onFilesChange();
      
      console.log(`Moved ${draggedItem.name} to ${targetFile?.name || 'current folder'}`);
    } catch (error) {
      console.error('Error moving file:', error);
    } finally {
      setLoading(false);
      setDraggedItem(null);
    }
  };

  const handleEditClick = (item: ProjectFile) => {
    setEditingItem(item);
    setEditName(item.name);
    if (item.is_folder) {
      setShowEditFolderModal(true);
    } else {
      setShowEditFileModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('project_files')
        .update({ name: editName.trim() })
        .eq('id', editingItem.id);

      if (error) throw error;
      
      setShowEditFolderModal(false);
      setShowEditFileModal(false);
      setEditingItem(null);
      setEditName('');
      await fetchFiles();
      await fetchAllFolders();
      onFilesChange();
    } catch (error) {
      console.error('Error updating name:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderListView = () => (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
        dragOverItem === 'current-folder' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onDragOver={(e) => handleDragOver(e)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-750">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left w-8">
                <button
                  onClick={selectAll}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 touch-manipulation"
                >
                  {selectedFiles.size === projectFiles.length && projectFiles.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Size
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Modified
              </th>
              <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16 sm:w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {projectFiles.map((file) => (
              <tr 
                key={file.id} 
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  dragOverItem === file.id && file.is_folder ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => file.is_folder ? handleDragOver(e, file) : e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={(e) => file.is_folder ? handleDrop(e, file) : e.preventDefault()}
              >
                <td className="px-3 sm:px-4 py-3">
                  <button
                    onClick={() => toggleFileSelection(file.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 touch-manipulation"
                  >
                    {selectedFiles.has(file.id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="px-3 sm:px-4 py-3">
                  <div className="flex items-center min-w-0">
                    {getFileIcon(file)}
                    <button
                      onClick={() => file.is_folder ? goToFolder(file.id) : openFileModal(file)}
                      className="ml-2 sm:ml-3 text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate touch-manipulation"
                      title={file.is_folder ? 'Click to open folder' : 'Click to view file'}
                    >
                      {file.name}
                    </button>
                    {file.is_folder && (
                      <span className="ml-2 text-xs text-gray-400">📂 Drop zone</span>
                    )}
                  </div>
                  {/* Mobile-only size display */}
                  <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {file.is_folder ? '—' : formatFileSize(file.file_size)}
                  </div>
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                  {file.is_folder ? '—' : formatFileSize(file.file_size)}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                  {new Date(file.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 sm:px-4 py-3 text-right">
                  <div className="flex justify-end space-x-1 sm:space-x-2">
                    <button
                      onClick={() => handleEditClick(file)}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 p-1 touch-manipulation"
                      title="Edit name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!file.is_folder && (
                      <button
                        onClick={() => openFileModal(file)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 touch-manipulation"
                        title="View file"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleSingleDelete(file.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 touch-manipulation"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div 
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 p-2 sm:p-4 min-h-32 ${
        dragOverItem === 'current-folder' ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-500 rounded-lg' : ''
      }`}
      onDragOver={(e) => handleDragOver(e)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
    >
      {projectFiles.map((file) => (
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
            <div className="flex justify-center mb-1 sm:mb-2">
              {file.is_folder ? (
                <div className="relative">
                  <Folder className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                  {dragOverItem === file.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              ) : file.mime_type?.startsWith('image/') ? (
                <div className="h-8 w-8 sm:h-10 sm:w-10">
                  <ImageThumbnail file={file} size="lg" className="h-full w-full" />
                </div>
              ) : (
                <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center">
                  {getFileIcon(file, "lg")}
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
              {file.name}
            </p>
            {!file.is_folder && (
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
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : projectFiles.length === 0 ? (
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
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ppt,.pptx"
      />

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
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose files to upload to {getCurrentFolderName()}
              </p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </button>
              
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Folder
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white touch-manipulation text-base"
              onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && createFolder()}
              autoFocus
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
              >
                Create
              </button>
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
            <input
              type="text"
              value={editName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              placeholder="File name"
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white touch-manipulation text-base"
              onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditFileModal(false);
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
    </div>
  );
}
