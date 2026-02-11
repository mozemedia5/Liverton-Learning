import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc as firestoreDoc, Timestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { FileText, Sheet, Presentation, Download, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

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

export default function DocumentManagement() {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'text' | 'spreadsheet' | 'presentation'>('text');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadDocuments();
    }
  }, [currentUser]);

  const loadDocuments = async () => {
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
  };

  const handleCreateDocument = async () => {
    if (!currentUser || !formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      let fileUrl = '';

      if (file) {
        const storageRef = ref(storage, `documents/${currentUser.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
      }

      const docRef = await addDoc(collection(db, 'documents'), {
        userId: currentUser.uid,
        title: formData.title,
        content: formData.content,
        type: activeTab,
        fileUrl,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

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

      setFormData({ title: '', content: '' });
      setFile(null);
      setIsCreating(false);
      toast.success('Document created successfully');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!currentUser) return;

    try {
      const docItem = documents.find(d => d.id === docId);
      if (docItem?.fileUrl) {
        const fileRef = ref(storage, docItem.fileUrl);
        await deleteObject(fileRef);
      }

      await deleteDoc(firestoreDoc(db, 'documents', docId));
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setDeleteConfirm(null);
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (documentItem: DocumentItem) => {
    if (documentItem.fileUrl) {
      const link = documentItem.fileUrl;
      window.open(link, '_blank');
    } else {
      // Download as text file
      const element = document.createElement('a');
      const fileBlob = new Blob([documentItem.content], { type: 'text/plain' });
      element.href = URL.createObjectURL(fileBlob);
      element.download = `${documentItem.title}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const filteredDocuments = documents.filter(doc => doc.type === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'spreadsheet':
        return <Sheet className="w-5 h-5" />;
      case 'presentation':
        return <Presentation className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Document Management</h1>
            <p className="text-gray-600">Create and manage your documents</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Document
          </Button>
        </div>

        {/* Create Document Modal */}
        {isCreating && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Document</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ title: '', content: '' });
                    setFile(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="text" className="gap-2">
                      <FileText className="w-4 h-4" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="spreadsheet" className="gap-2">
                      <Sheet className="w-4 h-4" />
                      Spreadsheet
                    </TabsTrigger>
                    <TabsTrigger value="presentation" className="gap-2">
                      <Presentation className="w-4 h-4" />
                      Presentation
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter document content"
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateDocument} className="flex-1">
                  Create Document
                </Button>
                <Button
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ title: '', content: '' });
                    setFile(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="text" className="gap-2">
              <FileText className="w-4 h-4" />
              Text Documents
            </TabsTrigger>
            <TabsTrigger value="spreadsheet" className="gap-2">
              <Sheet className="w-4 h-4" />
              Spreadsheets
            </TabsTrigger>
            <TabsTrigger value="presentation" className="gap-2">
              <Presentation className="w-4 h-4" />
              Presentations
            </TabsTrigger>
          </TabsList>

          {['text', 'spreadsheet', 'presentation'].map((type) => (
            <TabsContent key={type} value={type}>
              {filteredDocuments.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <div className="flex justify-center mb-4">
                      {getIcon(type)}
                    </div>
                    <p className="text-gray-500 mb-4">No documents yet</p>
                    <Button onClick={() => setIsCreating(true)}>Create First Document</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((documentItem) => (
                    <Card key={documentItem.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {getIcon(documentItem.type)}
                            <CardTitle className="text-lg truncate">{documentItem.title}</CardTitle>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(documentItem.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardDescription>
                          {new Date(documentItem.createdAt.toMillis()).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 line-clamp-3">{documentItem.content}</p>
                        <Button
                          onClick={() => handleDownloadDocument(documentItem)}
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this document? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirm && handleDeleteDocument(deleteConfirm)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
