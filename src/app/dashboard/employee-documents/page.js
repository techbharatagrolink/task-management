'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileText, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Trash2,
  Calendar,
  Filter,
  X,
  User
} from 'lucide-react';
import { authenticatedFetch, getAuthToken } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function EmployeeDocumentsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [user, setUser] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    employee_id: '',
    document_name: '',
    document_date: '',
    description: ''
  });
  const [filters, setFilters] = useState({
    employee_id: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUser();
    fetchDocuments();
    fetchEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, filters]);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/employee-documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch employee documents',
        });
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch employee documents',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    if (filters.employee_id) {
      filtered = filtered.filter(d => d.employee_id === parseInt(filters.employee_id));
    }

    setFilteredDocuments(filtered);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
      setErrors({ ...errors, file: '' });
    }
  };

  const handleInputChange = (field, value) => {
    setUploadForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    // Validate form
    const newErrors = {};
    if (!uploadForm.file) {
      newErrors.file = 'Please select a file';
    }
    if (!uploadForm.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }
    if (!uploadForm.document_name) {
      newErrors.document_name = 'Please enter document name';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    setUploading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('employee_id', uploadForm.employee_id);
      formData.append('document_name', uploadForm.document_name);
      if (uploadForm.document_date) {
        formData.append('document_date', uploadForm.document_date);
      }
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      const token = getAuthToken();
      const res = await fetch('/api/employee-documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Document uploaded successfully',
        });
        setUploadForm({
          file: null,
          employee_id: '',
          document_name: '',
          document_date: '',
          description: ''
        });
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        fetchDocuments();
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: data.error || 'Failed to upload document',
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'An error occurred while uploading the document',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/employee-documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Success',
          description: 'Document downloaded successfully',
        });
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: data.error || 'Failed to download document',
        });
      }
    } catch (err) {
      console.error('Download error:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'An error occurred while downloading the document',
      });
    }
  };

  const handleDelete = async (documentId, documentName) => {
    if (!confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/employee-documents?id=${documentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Document deleted successfully',
        });
        fetchDocuments();
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: data.error || 'Failed to delete document',
        });
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'An error occurred while deleting the document',
      });
    }
  };

  const canUpload = user && ['Super Admin', 'Admin', 'HR'].includes(user.role);
  const canDelete = user && ['Super Admin', 'Admin', 'HR'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Documents</h1>
          <p className="text-gray-600 mt-1">Upload and manage employee documents</p>
        </div>
      </div>

      {/* Upload Form */}
      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Employee Document</CardTitle>
            <CardDescription>Upload documents for employees</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="employee_id">Employee <span className="text-destructive">*</span></Label>
                <Select
                  value={uploadForm.employee_id}
                  onValueChange={(value) => handleInputChange('employee_id', value)}
                >
                  <SelectTrigger id="employee_id" className="mt-1">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} - {emp.email} {emp.department ? `(${emp.department})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employee_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.employee_id}</p>
                )}
              </div>

              <div>
                <Label htmlFor="file-input">File</Label>
                <Input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {errors.file && (
                  <p className="text-sm text-red-600 mt-1">{errors.file}</p>
                )}
                {uploadForm.file && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="document_name">Document Name <span className="text-destructive">*</span></Label>
                <Input
                  id="document_name"
                  type="text"
                  value={uploadForm.document_name}
                  onChange={(e) => handleInputChange('document_name', e.target.value)}
                  placeholder="e.g., Employment Contract, ID Proof, etc."
                  className="mt-1"
                />
                {errors.document_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.document_name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="document_date">Document Date</Label>
                  <Input
                    id="document_date"
                    type="date"
                    value={uploadForm.document_date}
                    onChange={(e) => handleInputChange('document_date', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add a description for this document"
                  className="mt-1"
                />
              </div>

              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filter_employee_id">Employee</Label>
              <Select
                value={filters.employee_id || 'all'}
                onValueChange={(value) => handleFilterChange('employee_id', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="filter_employee_id" className="mt-1">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} - {emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ employee_id: '' })}
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No employee documents found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {doc.document_name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {doc.employee_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(doc.document_date)}
                        </span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded by {doc.uploaded_by_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.id, doc.original_file_name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.document_name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

