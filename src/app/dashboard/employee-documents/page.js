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
  User,
  ChevronDown,
  ChevronRight
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
    files: [], // Array of { file: File, document_name: string, document_date: string, description: string }
    employee_id: '',
  });
  const [filters, setFilters] = useState({
    employee_id: ''
  });
  const [errors, setErrors] = useState({});
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());

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
    
    // Auto-expand employee groups if filtered to a single employee
    if (filters.employee_id && filtered.length > 0) {
      const employeeId = filtered[0].employee_id;
      setExpandedEmployees(new Set([employeeId.toString()]));
    }
  };

  const toggleEmployeeGroup = (employeeId) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId.toString())) {
        newSet.delete(employeeId.toString());
      } else {
        newSet.add(employeeId.toString());
      }
      return newSet;
    });
  };

  const groupDocumentsByEmployee = (docs) => {
    const grouped = {};
    docs.forEach(doc => {
      const key = doc.employee_id;
      if (!grouped[key]) {
        grouped[key] = {
          employee_id: doc.employee_id,
          employee_name: doc.employee_name,
          employee_email: doc.employee_email,
          documents: []
        };
      }
      grouped[key].documents.push(doc);
    });
    return Object.values(grouped).sort((a, b) => 
      a.employee_name.localeCompare(b.employee_name)
    );
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      const newFiles = selectedFiles.map((file, index) => ({
        file,
        document_name: file.name.replace(/\.[^/.]+$/, ''), // Default to filename without extension
        document_date: '',
        description: '',
        id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}` // Unique ID for each file entry
      }));
      setUploadForm({ 
        ...uploadForm, 
        files: [...uploadForm.files, ...newFiles]
      });
      setErrors({ ...errors, files: '' });
      // Reset file input
      e.target.value = '';
    }
  };

  const handleFileRemove = (fileId) => {
    setUploadForm({
      ...uploadForm,
      files: uploadForm.files.filter(f => f.id !== fileId)
    });
  };

  const handleFileFieldChange = (fileId, field, value) => {
    setUploadForm({
      ...uploadForm,
      files: uploadForm.files.map(f => 
        f.id === fileId ? { ...f, [field]: value } : f
      )
    });
    if (errors[`file_${fileId}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`file_${fileId}_${field}`];
        return newErrors;
      });
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
    if (uploadForm.files.length === 0) {
      newErrors.files = 'Please select at least one file';
    }
    if (!uploadForm.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }
    
    // Validate each file has a document name
    uploadForm.files.forEach((fileEntry, index) => {
      if (!fileEntry.document_name || fileEntry.document_name.trim() === '') {
        newErrors[`file_${fileEntry.id}_document_name`] = 'Document name is required';
      }
    });

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
      formData.append('employee_id', uploadForm.employee_id);
      
      // Append all files with their metadata
      uploadForm.files.forEach((fileEntry, index) => {
        formData.append(`files`, fileEntry.file);
        formData.append(`document_names`, fileEntry.document_name);
        if (fileEntry.document_date) {
          formData.append(`document_dates`, fileEntry.document_date);
        } else {
          formData.append(`document_dates`, '');
        }
        if (fileEntry.description) {
          formData.append(`descriptions`, fileEntry.description);
        } else {
          formData.append(`descriptions`, '');
        }
      });

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
        const successCount = data.documents?.length || uploadForm.files.length;
        toast({
          title: 'Success',
          description: `${successCount} document${successCount !== 1 ? 's' : ''} uploaded successfully`,
        });
        setUploadForm({
          files: [],
          employee_id: '',
        });
        fetchDocuments();
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: data.error || 'Failed to upload documents',
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'An error occurred while uploading the documents',
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
                <Label htmlFor="file-input">Files <span className="text-destructive">*</span></Label>
                <Input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  className="mt-1"
                />
                {errors.files && (
                  <p className="text-sm text-red-600 mt-1">{errors.files}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  You can select multiple files at once. Each file will need a label.
                </p>
              </div>

              {/* Selected Files List */}
              {uploadForm.files.length > 0 && (
                <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Selected Files ({uploadForm.files.length})
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadForm({ ...uploadForm, files: [] })}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                  
                  {uploadForm.files.map((fileEntry, index) => (
                    <div
                      key={fileEntry.id}
                      className="border rounded-lg p-4 bg-white space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {fileEntry.file.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({formatFileSize(fileEntry.file.size)})
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileRemove(fileEntry.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label htmlFor={`doc_name_${fileEntry.id}`}>
                          Document Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`doc_name_${fileEntry.id}`}
                          type="text"
                          value={fileEntry.document_name}
                          onChange={(e) => handleFileFieldChange(fileEntry.id, 'document_name', e.target.value)}
                          placeholder="e.g., Employment Contract, ID Proof, etc."
                          className="mt-1"
                        />
                        {errors[`file_${fileEntry.id}_document_name`] && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors[`file_${fileEntry.id}_document_name`]}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`doc_date_${fileEntry.id}`}>Document Date</Label>
                          <Input
                            id={`doc_date_${fileEntry.id}`}
                            type="date"
                            value={fileEntry.document_date}
                            onChange={(e) => handleFileFieldChange(fileEntry.id, 'document_date', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`doc_desc_${fileEntry.id}`}>Description (Optional)</Label>
                          <Input
                            id={`doc_desc_${fileEntry.id}`}
                            type="text"
                            value={fileEntry.description}
                            onChange={(e) => handleFileFieldChange(fileEntry.id, 'description', e.target.value)}
                            placeholder="Add a description"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
          {(() => {
            const grouped = groupDocumentsByEmployee(filteredDocuments);
            const allExpanded = grouped.length > 0 && grouped.every(g => expandedEmployees.has(g.employee_id.toString()));
            
            return (
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Uploaded Documents</CardTitle>
                  <CardDescription>
                    {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                    {grouped.length > 0 && (
                      <span className="ml-2">
                        across {grouped.length} employee{grouped.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </CardDescription>
                </div>
                {filteredDocuments.length > 0 && grouped.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (allExpanded) {
                        setExpandedEmployees(new Set());
                      } else {
                        setExpandedEmployees(new Set(grouped.map(g => g.employee_id.toString())));
                      }
                    }}
                  >
                    {allExpanded ? (
                      <>
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Expand All
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })()}
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
              {groupDocumentsByEmployee(filteredDocuments).map((group) => {
                const isExpanded = expandedEmployees.has(group.employee_id.toString());
                const documentCount = group.documents.length;
                
                return (
                  <div
                    key={group.employee_id}
                    className="border rounded-lg overflow-hidden bg-white"
                  >
                    {/* Employee Header - Collapsible */}
                    <button
                      onClick={() => toggleEmployeeGroup(group.employee_id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-blue-100 rounded-lg p-2">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {group.employee_name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {group.employee_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                            {documentCount} document{documentCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* Documents List - Collapsible */}
                    {isExpanded && (
                      <div className="divide-y">
                        {group.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="bg-blue-100 rounded-lg p-3">
                                <FileText className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {doc.document_name}
                                </h4>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(doc.document_date)}
                                  </span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  <span>Uploaded: {formatDate(doc.created_at)}</span>
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


