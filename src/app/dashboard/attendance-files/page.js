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
  X
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
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function AttendanceFilesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [user, setUser] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    period_type: 'month',
    period_value: '',
    description: ''
  });
  const [filters, setFilters] = useState({
    period_type: '',
    period_value: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUser();
    fetchFiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [files, filters]);

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

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/attendance-files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch attendance files',
        });
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch attendance files',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...files];

    if (filters.period_type && filters.period_type !== 'all') {
      filtered = filtered.filter(f => f.period_type === filters.period_type);
    }

    if (filters.period_value) {
      filtered = filtered.filter(f => f.period_value === filters.period_value);
    }

    setFilteredFiles(filtered);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!['xls', 'xlsx'].includes(fileExtension)) {
        setErrors({ ...errors, file: 'Only XLS and XLSX files are allowed' });
        e.target.value = '';
        return;
      }
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

  const generatePeriodValue = (periodType) => {
    const now = new Date();

    if (periodType === 'day') {
      return now.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (periodType === 'week') {
      // Calculate ISO week number
      const date = new Date(now.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    } else if (periodType === 'month') {
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    return '';
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    // Validate form
    const newErrors = {};
    if (!uploadForm.file) {
      newErrors.file = 'Please select a file';
    }
    if (!uploadForm.period_type) {
      newErrors.period_type = 'Please select period type';
    }
    if (!uploadForm.period_value) {
      newErrors.period_value = 'Please enter period value';
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
      formData.append('period_type', uploadForm.period_type);
      formData.append('period_value', uploadForm.period_value);
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      const token = getAuthToken();
      const res = await fetch('/api/attendance-files', {
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
          description: 'File uploaded successfully',
        });
        setUploadForm({
          file: null,
          period_type: 'month',
          period_value: '',
          description: ''
        });
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        fetchFiles();
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: data.error || 'Failed to upload file',
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'An error occurred while uploading the file',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/attendance-files/${fileId}/download`, {
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
          description: 'File downloaded successfully',
        });
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: data.error || 'Failed to download file',
        });
      }
    } catch (err) {
      console.error('Download error:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'An error occurred while downloading the file',
      });
    }
  };

  const handleDelete = async (fileId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/attendance-files?id=${fileId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'File deleted successfully',
        });
        fetchFiles();
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: data.error || 'Failed to delete file',
        });
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'An error occurred while deleting the file',
      });
    }
  };

  const canUpload = user && ['Super Admin', 'Admin', 'HR', 'Manager'].includes(user.role);
  const canDelete = user && ['Super Admin', 'Admin', 'HR'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Files</h1>
          <p className="text-gray-600 mt-1">Upload and manage attendance XLS files</p>
        </div>
      </div>

      {/* Upload Form */}
      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Attendance File</CardTitle>
            <CardDescription>Upload XLS/XLSX files with attendance data</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="file-input">File (XLS/XLSX)</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".xls,.xlsx"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period_type">Period Type</Label>
                  <Select
                    value={uploadForm.period_type}
                    onValueChange={(value) => {
                      handleInputChange('period_type', value);
                      // Auto-generate period value
                      const autoValue = generatePeriodValue(value);
                      handleInputChange('period_value', autoValue);
                    }}
                  >
                    <SelectTrigger id="period_type" className="mt-1">
                      <SelectValue placeholder="Select period type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.period_type && (
                    <p className="text-sm text-red-600 mt-1">{errors.period_type}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="period_value">Period Value</Label>
                  <Input
                    id="period_value"
                    type="text"
                    value={uploadForm.period_value}
                    onChange={(e) => handleInputChange('period_value', e.target.value)}
                    placeholder={
                      uploadForm.period_type === 'day' 
                        ? 'YYYY-MM-DD' 
                        : uploadForm.period_type === 'week'
                        ? 'YYYY-WW'
                        : 'YYYY-MM'
                    }
                    className="mt-1"
                  />
                  {errors.period_value && (
                    <p className="text-sm text-red-600 mt-1">{errors.period_value}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadForm.period_type === 'day' 
                      ? 'Format: YYYY-MM-DD (e.g., 2024-01-15)' 
                      : uploadForm.period_type === 'week'
                      ? 'Format: YYYY-WW (e.g., 2024-W03)'
                      : 'Format: YYYY-MM (e.g., 2024-01)'}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add a description for this file"
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
                    Upload File
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter_period_type">Period Type</Label>
              <Select
                value={filters.period_type || 'all'}
                onValueChange={(value) => handleFilterChange('period_type', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="filter_period_type" className="mt-1">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter_period_value">Period Value</Label>
              <Input
                id="filter_period_value"
                type="text"
                value={filters.period_value}
                onChange={(e) => handleFilterChange('period_value', e.target.value)}
                placeholder="Filter by period value"
                className="mt-1"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ period_type: '', period_value: '' });
                }}
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>
            {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No attendance files found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {file.original_file_name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {file.period_type}: {file.period_value}
                        </span>
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                      {file.description && (
                        <p className="text-sm text-gray-500 mt-1">{file.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded by {file.uploaded_by_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.id, file.original_file_name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(file.id, file.original_file_name)}
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

