import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc as firestoreDoc, 
  Timestamp, 
  orderBy,
  
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '../../components/ui/alert-dialog';
import { FileText, Sheet, Presentation, Download, Trash2, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Document interface
 * Defines the structure of a document in the system
 */
interface DocumentItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'text' | 'spreadsheet' | 'presentation';
  fileUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * DocumentManagement Component
 * 
 * Features:
 * - Create, read, update, delete documents
 * - Support for multiple document types (text, spreadsheet, presentation)
 * - File upload capability
 * - Confirmation dialogs for destructive actions
 * - Loading states and error handling
 * - Responsive design
 * - Production-ready state management
 */
export default function DocumentManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State management
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'text' | 'spreadsheet' | 'presentation'>('text');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  const [file, setFile] = useState<File | null>(null);

  /**
   * Load documents from Firestore
   * Fetches all documents for the current user
   * Handles errors gracefully with user feedback
   */
  const loadDocuments = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as DocumentItem[];
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Load documents on component mount or when user changes
   */
  useEffect(() => {
    if (currentUser) {
      loadDocuments();
    }
  }, [currentUser, loadDocuments]);

  /**
   * Handle document creation
   * Validates input, uploads file if provided, creates document in Firestore
   */
  const handleCreateDocument = async () => {
    if (!currentUser || !formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      setIsSubmitting(true);
      let fileUrl = '';

      // Upload file if provided
      if (file) {
        const storageRef = ref(storage, `documents/${currentUser.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
      }

      // Create document in Firestore
      const docRef = await addDoc(collection(db, 'documents'), {
        userId: currentUser.uid,
        title: formData.title,
        content: formData.content,
        type: activeTab,
        fileUrl,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setDocuments(prev => [{
        id: docRef.id,
        userId: currentUser.uid,
        title: formData.title,
        content: formData.content,
        type: activeTab,
        fileUrl,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, ...prev]);

      // Reset form
      setFormData({ title: '', content: '' });
      setFile(null);
      setIsCreating(false);
      toast.success('Document created successfully');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle document deletion
   * Removes document from Firestore and Storage
   * Requires confirmation before deletion
   */
  const handleDeleteDocument = async (docId: string) => {
    if (!currentUser) return;
    
    try {
      setIsSubmitting(true);
      const docToDelete = documents.find(d => d.id === docId);
      
      // Delete file from storage if it exists
      if (docToDelete?.fileUrl) {
        try {
          const fileRef = ref(storage, docToDelete.fileUrl);
          await deleteObject(fileRef);
        } catch (error) {
          console.warn('Error deleting file from storage:', error);
        }
      }

      // Delete document from Firestore
      await deleteDoc(firestoreDoc(db, 'documents', docId));

      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setDeleteConfirm(null);
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle file download
   */
  const handleDownload = (fileUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Filter documents by type
   */
  const filteredDocuments = documents.filter(doc => doc.type === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Documents</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {/* Sub-Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Document Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create, manage, and organize your documents
          </p>
        </div>

        {/* Create Document Button */}
        <div className="mb-6">
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? 'Cancel' : 'Create Document'}
          </Button>
        </div>

        {/* Create Document Form */}
        {isCreating && (
          <Card className="mb-8 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Create New Document</CardTitle>
              <CardDescription>
                Add a new document to your collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Document Type Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Document Type
                  </label>
                  <div className="flex gap-2">
                    {(['text', 'spreadsheet', 'presentation'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        className={`px-4 py-2 rounded-lg transition-all ${
                          activeTab === type
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Input */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Title
                  </label>
                  <Input
                    placeholder="Enter document title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="border-gray-300 dark:border-gray-700"
                  />
                </div>

                {/* Content Input */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Content
                  </label>
                  <Textarea
                    placeholder="Enter document content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="border-gray-300 dark:border-gray-700"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Attach File (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-black dark:file:bg-white
                      file:text-white dark:file:text-black
                      hover:file:bg-gray-800 dark:hover:file:bg-gray-200"
                  />
                  {file && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Selected: {file.name}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateDocument}
                    disabled={isSubmitting || !formData.title.trim()}
                    className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Document'
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreating(false);
                      setFormData({ title: '', content: '' });
                      setFile(null);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Text</span>
              </TabsTrigger>
              <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
                <Sheet className="w-4 h-4" />
                <span className="hidden sm:inline">Spreadsheet</span>
              </TabsTrigger>
              <TabsTrigger value="presentation" className="flex items-center gap-2">
                <Presentation className="w-4 h-4" />
                <span className="hidden sm:inline">Presentation</span>
              </TabsTrigger>
            </TabsList>

            {['text', 'spreadsheet', 'presentation'].map(type => (
              <TabsContent key={type} value={type}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <Card className="border-gray-200 dark:border-gray-800">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        No {type} documents yet. Create one to get started!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDocuments.map(doc => (
                      <Card key={doc.id} className="border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg truncate">{doc.title}</CardTitle>
                          <CardDescription>
                            {doc.createdAt?.toDate?.().toLocaleDateString?.() || 'Unknown date'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                            {doc.content || 'No content'}
                          </p>
                          <div className="flex gap-2">
                            {doc.fileUrl && (
                              <Button
                                onClick={() => handleDownload(doc.fileUrl!, doc.title)}
                                size="sm"
                                variant="outline"
                                className="flex-1"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            )}
                            <Button
                              onClick={() => setDeleteConfirm(doc.id)}
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteDocument(deleteConfirm)}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
