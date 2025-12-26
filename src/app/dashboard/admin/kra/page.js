'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { authenticatedFetch } from '@/lib/auth-client';
import { 
  Target, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminKRAPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [kraDefinitions, setKraDefinitions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingKra, setEditingKra] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    role: '',
    kra_number: '',
    kra_name: '',
    weight_percentage: '',
    kpi_1_name: '',
    kpi_1_target: '',
    kpi_1_scale: '',
    kpi_1_rating_labels: {
      '5': '',
      '4': '',
      '3': '',
      '2': '',
      '1': ''
    },
    kpi_2_name: '',
    kpi_2_target: '',
    kpi_2_scale: '',
    kpi_2_rating_labels: {
      '5': '',
      '4': '',
      '3': '',
      '2': '',
      '1': ''
    },
    is_active: true
  });

  useEffect(() => {
    fetchKRADefinitions();
    fetchRoles();
  }, []);

  const fetchKRADefinitions = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/kra/definitions?include_inactive=true');
      const data = await res.json();
      setKraDefinitions(data.definitions || []);
    } catch (err) {
      console.error('Failed to fetch KRA definitions:', err);
      setError('Failed to load KRA definitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      const uniqueRoles = [...new Set(data.employees?.map(emp => emp.role) || [])].sort();
      setRoles(uniqueRoles);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleEdit = (kra) => {
    // Parse rating labels if they're JSON strings
    let kpi1Labels = { '5': '', '4': '', '3': '', '2': '', '1': '' };
    let kpi2Labels = { '5': '', '4': '', '3': '', '2': '', '1': '' };

    if (kra.kpi_1_rating_labels) {
      try {
        kpi1Labels = typeof kra.kpi_1_rating_labels === 'string' 
          ? JSON.parse(kra.kpi_1_rating_labels) 
          : kra.kpi_1_rating_labels;
      } catch (e) {
        // If parsing fails, use empty object
      }
    }

    if (kra.kpi_2_rating_labels) {
      try {
        kpi2Labels = typeof kra.kpi_2_rating_labels === 'string' 
          ? JSON.parse(kra.kpi_2_rating_labels) 
          : kra.kpi_2_rating_labels;
      } catch (e) {
        // If parsing fails, use empty object
      }
    }

    setFormData({
      id: kra.id,
      role: kra.role || '',
      kra_number: kra.kra_number || '',
      kra_name: kra.kra_name || '',
      weight_percentage: kra.weight_percentage || '',
      kpi_1_name: kra.kpi_1_name || '',
      kpi_1_target: kra.kpi_1_target || '',
      kpi_1_scale: kra.kpi_1_scale || '',
      kpi_1_rating_labels: kpi1Labels,
      kpi_2_name: kra.kpi_2_name || '',
      kpi_2_target: kra.kpi_2_target || '',
      kpi_2_scale: kra.kpi_2_scale || '',
      kpi_2_rating_labels: kpi2Labels,
      is_active: kra.is_active === 1 || kra.is_active === true
    });
    setEditingKra(kra.id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setFormData({
      role: '',
      kra_number: '',
      kra_name: '',
      weight_percentage: '',
      kpi_1_name: '',
      kpi_1_target: '',
      kpi_1_scale: '',
      kpi_1_rating_labels: { '5': '', '4': '', '3': '', '2': '', '1': '' },
      kpi_2_name: '',
      kpi_2_target: '',
      kpi_2_scale: '',
      kpi_2_rating_labels: { '5': '', '4': '', '3': '', '2': '', '1': '' },
      is_active: true
    });
    setEditingKra(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await authenticatedFetch('/api/kra/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('KRA definition saved successfully!');
        setDialogOpen(false);
        fetchKRADefinitions();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save KRA definition');
      }
    } catch (err) {
      console.error('Failed to save KRA:', err);
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this KRA definition?')) {
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/kra/definitions?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSuccess('KRA definition deleted successfully!');
        fetchKRADefinitions();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete KRA definition');
      }
    } catch (err) {
      console.error('Failed to delete KRA:', err);
      setError('Network error. Please try again.');
    }
  };

  const handleRatingLabelChange = (kpi, rating, value) => {
    setFormData(prev => ({
      ...prev,
      [`kpi_${kpi}_rating_labels`]: {
        ...prev[`kpi_${kpi}_rating_labels`],
        [rating]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Manage KRA Definitions
          </h1>
          <p className="text-muted-foreground mt-1">Configure KRA definitions, targets, and rating labels</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New KRA Definition
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {kraDefinitions.map((kra) => (
          <Card key={kra.id} className={kra.is_active === 0 ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle>
                      {kra.role} - KRA {kra.kra_number}: {kra.kra_name}
                    </CardTitle>
                    {kra.is_active === 0 && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    Weight: {kra.weight_percentage}%
                  </Badge>
                  {kra.kpi_1_name && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium">• {kra.kpi_1_name}</p>
                      {kra.kpi_1_target && (
                        <p className="text-xs text-muted-foreground">Target: {kra.kpi_1_target}</p>
                      )}
                      {kra.kpi_1_scale && (
                        <p className="text-xs text-muted-foreground">{kra.kpi_1_scale}</p>
                      )}
                    </div>
                  )}
                  {kra.kpi_2_name && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-medium">• {kra.kpi_2_name}</p>
                      {kra.kpi_2_target && (
                        <p className="text-xs text-muted-foreground">Target: {kra.kpi_2_target}</p>
                      )}
                      {kra.kpi_2_scale && (
                        <p className="text-xs text-muted-foreground">{kra.kpi_2_scale}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(kra)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(kra.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKra ? 'Edit KRA Definition' : 'New KRA Definition'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kra_number">KRA Number <span className="text-destructive">*</span></Label>
                <Input
                  id="kra_number"
                  type="number"
                  value={formData.kra_number}
                  onChange={(e) => setFormData({ ...formData, kra_number: e.target.value })}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kra_name">KRA Name <span className="text-destructive">*</span></Label>
              <Input
                id="kra_name"
                value={formData.kra_name}
                onChange={(e) => setFormData({ ...formData, kra_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_percentage">Weight Percentage <span className="text-destructive">*</span></Label>
              <Input
                id="weight_percentage"
                type="number"
                step="0.01"
                value={formData.weight_percentage}
                onChange={(e) => setFormData({ ...formData, weight_percentage: e.target.value })}
              />
            </div>

            {/* KPI 1 Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">KPI 1</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kpi_1_name">KPI 1 Name</Label>
                  <Input
                    id="kpi_1_name"
                    value={formData.kpi_1_name}
                    onChange={(e) => setFormData({ ...formData, kpi_1_name: e.target.value })}
                    placeholder="e.g., Order Dispatch TAT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi_1_target">KPI 1 Target</Label>
                  <Input
                    id="kpi_1_target"
                    value={formData.kpi_1_target}
                    onChange={(e) => setFormData({ ...formData, kpi_1_target: e.target.value })}
                    placeholder="e.g., 24-48 hours"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi_1_scale">KPI 1 Scale/Description</Label>
                  <Textarea
                    id="kpi_1_scale"
                    value={formData.kpi_1_scale}
                    onChange={(e) => setFormData({ ...formData, kpi_1_scale: e.target.value })}
                    placeholder="e.g., 5=95%+ orders dispatched within TAT, 4=90-94%, 3=80-89%, 2=70-79%, 1=Below 70%"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rating Labels for KPI 1</Label>
                  <div className="space-y-2">
                    {['5', '4', '3', '2', '1'].map(rating => (
                      <div key={rating} className="flex items-center gap-2">
                        <Label className="w-8">{rating}:</Label>
                        <Input
                          value={formData.kpi_1_rating_labels[rating] || ''}
                          onChange={(e) => handleRatingLabelChange(1, rating, e.target.value)}
                          placeholder={`Label for rating ${rating}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2 Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">KPI 2</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kpi_2_name">KPI 2 Name</Label>
                  <Input
                    id="kpi_2_name"
                    value={formData.kpi_2_name}
                    onChange={(e) => setFormData({ ...formData, kpi_2_name: e.target.value })}
                    placeholder="e.g., NDR Resolution Time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi_2_target">KPI 2 Target</Label>
                  <Input
                    id="kpi_2_target"
                    value={formData.kpi_2_target}
                    onChange={(e) => setFormData({ ...formData, kpi_2_target: e.target.value })}
                    placeholder="e.g., 1-2 working days"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi_2_scale">KPI 2 Scale/Description</Label>
                  <Textarea
                    id="kpi_2_scale"
                    value={formData.kpi_2_scale}
                    onChange={(e) => setFormData({ ...formData, kpi_2_scale: e.target.value })}
                    placeholder="e.g., 5=95% resolved within time, 4=90-94%, 3=80-89%, 2=70-79%, 1=Below 70%"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rating Labels for KPI 2</Label>
                  <div className="space-y-2">
                    {['5', '4', '3', '2', '1'].map(rating => (
                      <div key={rating} className="flex items-center gap-2">
                        <Label className="w-8">{rating}:</Label>
                        <Input
                          value={formData.kpi_2_rating_labels[rating] || ''}
                          onChange={(e) => handleRatingLabelChange(2, rating, e.target.value)}
                          placeholder={`Label for rating ${rating}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


