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
  Calendar,
  Save
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function KRAPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [kraDefinitions, setKraDefinitions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [isManager, setIsManager] = useState(false);

  // Form state
  const [periodType, setPeriodType] = useState('monthly');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodQuarter, setPeriodQuarter] = useState(Math.floor((new Date().getMonth()) / 3) + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [submissions, setSubmissions] = useState({}); // { kra_id: { rating, comments } }
  const [existingSubmissions, setExistingSubmissions] = useState([]);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchKRADefinitions();
      fetchExistingSubmissions();
    }
  }, [userRole, periodType, periodMonth, periodQuarter, periodYear, selectedTeamMember]);

  const fetchUserInfo = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUserRole(data.user.role);
        setUserInfo(data.user);
        const managerCheck = data.user.role === 'Manager' && 
                           !['Super Admin', 'Admin', 'HR'].includes(data.user.role);
        setIsManager(managerCheck);
        
        // If not a manager, set selectedTeamMember to null
        if (!managerCheck) {
          setSelectedTeamMember(null);
        }
        
        // Fetch team members if manager
        if (managerCheck) {
          fetchTeamMembers();
        }
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      setTeamMembers(data.employees || []);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  const fetchKRADefinitions = async () => {
    setLoading(true);
    try {
      // For managers viewing team member, use team member's role, otherwise use manager's role
      const roleToFetch = isManager && selectedTeamMember 
        ? selectedTeamMember.role 
        : userRole;
      const res = await authenticatedFetch(`/api/kra/definitions?role=${encodeURIComponent(roleToFetch)}`);
      const data = await res.json();
      setKraDefinitions(data.definitions || []);

      // Initialize submissions object
      const initialSubmissions = {};
      data.definitions?.forEach(kra => {
        initialSubmissions[kra.id] = { rating: '', comments: '' };
      });
      setSubmissions(initialSubmissions);
    } catch (err) {
      console.error('Failed to fetch KRA definitions:', err);
      setError('Failed to load KRA definitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingSubmissions = async () => {
    try {
      const params = new URLSearchParams({
        period_type: periodType,
        period_year: periodYear.toString(),
        ...(periodType === 'monthly' && { period_month: periodMonth.toString() }),
        ...(periodType === 'quarterly' && { period_quarter: periodQuarter.toString() })
      });

      // For managers, add user_id to fetch team member's submissions
      if (isManager && selectedTeamMember) {
        params.append('user_id', selectedTeamMember.id.toString());
      }

      const res = await authenticatedFetch(`/api/kra/submissions?${params.toString()}`);
      const data = await res.json();

      if (data.submissions && data.submissions.length > 0) {
        const existing = {};
        data.submissions.forEach(sub => {
          existing[sub.kra_id] = { rating: sub.rating.toString(), comments: sub.comments || '' };
        });
        setSubmissions(prev => ({ ...prev, ...existing }));
        setExistingSubmissions(data.submissions);
      }
    } catch (err) {
      console.error('Failed to fetch existing submissions:', err);
    }
  };

  const handleRatingChange = (kraId, rating) => {
    setSubmissions(prev => ({
      ...prev,
      [kraId]: {
        ...prev[kraId],
        rating: rating
      }
    }));
  };

  const handleCommentsChange = (kraId, comments) => {
    setSubmissions(prev => ({
      ...prev,
      [kraId]: {
        ...prev[kraId],
        comments: comments
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Validate all KRAs have ratings
    const submissionArray = [];
    for (const kra of kraDefinitions) {
      const submission = submissions[kra.id];
      if (!submission || !submission.rating) {
        setError(`Please provide a rating for ${kra.kra_name}`);
        setSubmitting(false);
        return;
      }
      submissionArray.push({
        kra_id: kra.id,
        rating: parseInt(submission.rating),
        comments: submission.comments || null
      });
    }

    try {
      const body = {
        period_type: periodType,
        period_year: periodYear,
        ...(periodType === 'monthly' && { period_month: periodMonth }),
        ...(periodType === 'quarterly' && { period_quarter: periodQuarter }),
        ...(isManager && selectedTeamMember && { user_id: selectedTeamMember.id }),
        submissions: submissionArray
      };

      const res = await authenticatedFetch('/api/kra/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('KRA ratings submitted successfully!');
        fetchExistingSubmissions();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to submit KRA ratings');
      }
    } catch (err) {
      console.error('Failed to submit KRA:', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingColor = (rating) => {
    const numRating = parseInt(rating);
    if (numRating >= 4) return 'bg-green-100 text-green-800';
    if (numRating >= 3) return 'bg-blue-100 text-blue-800';
    if (numRating >= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (kraDefinitions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Key Result Areas (KRA)
          </h1>
          <p className="text-muted-foreground mt-1">Submit your KRA performance ratings</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No KRA definitions found for your role ({userRole}). 
                Please contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Target className="h-8 w-8" />
          Key Result Areas (KRA)
        </h1>
        <p className="text-muted-foreground mt-1">
          {isManager && selectedTeamMember 
            ? `Submit KRA performance ratings for ${selectedTeamMember.name}`
            : 'Submit your KRA performance ratings'}
        </p>
      </div>

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Select Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedTeamMember?.id?.toString() || ''}
              onValueChange={(value) => {
                const member = teamMembers.find(m => m.id.toString() === value);
                setSelectedTeamMember(member || null);
                setSubmissions({});
                setExistingSubmissions([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">My Own KRA</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.name} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

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

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Period Selection</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-type">Period Type</Label>
              <Select value={periodType} onValueChange={(value) => {
                setPeriodType(value);
                setSubmissions({});
                setExistingSubmissions([]);
              }}>
                <SelectTrigger id="period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="period-month">Month</Label>
                <Select value={periodMonth.toString()} onValueChange={(value) => {
                  setPeriodMonth(parseInt(value));
                  setSubmissions({});
                  setExistingSubmissions([]);
                }}>
                  <SelectTrigger id="period-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'quarterly' && (
              <div className="space-y-2">
                <Label htmlFor="period-quarter">Quarter</Label>
                <Select value={periodQuarter.toString()} onValueChange={(value) => {
                  setPeriodQuarter(parseInt(value));
                  setSubmissions({});
                  setExistingSubmissions([]);
                }}>
                  <SelectTrigger id="period-quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="period-year">Year</Label>
              <Input
                id="period-year"
                type="number"
                value={periodYear}
                onChange={(e) => {
                  setPeriodYear(parseInt(e.target.value) || new Date().getFullYear());
                  setSubmissions({});
                  setExistingSubmissions([]);
                }}
                min="2020"
                max="2030"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KRA Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {kraDefinitions.map((kra, index) => {
          const submission = submissions[kra.id] || { rating: '', comments: '' };
          const existing = existingSubmissions.find(s => s.kra_id === kra.id);
          const isSubmitted = existing && existing.status === 'submitted';

          return (
            <Card key={kra.id} className={isSubmitted ? 'border-green-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>
                        KRA {kra.kra_number}: {kra.kra_name}
                      </CardTitle>
                      {isSubmitted && (
                        <Badge className="bg-green-100 text-green-800">
                          Submitted
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      Weight: {kra.weight_percentage}%
                    </Badge>
                    {kra.kpi_1_name && (
                      <div className="mt-3 space-y-1">
                        <p className="text-sm font-medium">• {kra.kpi_1_name}</p>
                        {kra.kpi_1_target && (
                          <span className="text-xs text-muted-foreground font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md">Target: {kra.kpi_1_target}</span>
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
                          <span className="text-xs text-muted-foreground font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md">Target: {kra.kpi_2_target}</span>
                        )}
                        {kra.kpi_2_scale && (
                          <p className="text-xs text-muted-foreground">{kra.kpi_2_scale}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`rating-${kra.id}`}>
                    Rating (1-5) <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={submission.rating}
                    onValueChange={(value) => handleRatingChange(kra.id, value)}
                    required
                  >
                    <SelectTrigger id={`rating-${kra.id}`} className={submission.rating ? getRatingColor(submission.rating) : ''}>
                      <SelectValue placeholder="Select rating (1-5)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        // Try to get rating labels from KPI 1 first, then KPI 2, fallback to defaults
                        let ratingLabels = {
                          '5': '5 - Excellent',
                          '4': '4 - Very Good',
                          '3': '3 - Good',
                          '2': '2 - Needs Improvement',
                          '1': '1 - Poor'
                        };

                        // Parse rating labels if available
                        if (kra.kpi_1_rating_labels) {
                          try {
                            const parsed = typeof kra.kpi_1_rating_labels === 'string' 
                              ? JSON.parse(kra.kpi_1_rating_labels) 
                              : kra.kpi_1_rating_labels;
                            if (parsed && typeof parsed === 'object') {
                              ratingLabels = { ...ratingLabels, ...parsed };
                            }
                          } catch (e) {
                            // If parsing fails, try KPI 2
                            if (kra.kpi_2_rating_labels) {
                              try {
                                const parsed = typeof kra.kpi_2_rating_labels === 'string' 
                                  ? JSON.parse(kra.kpi_2_rating_labels) 
                                  : kra.kpi_2_rating_labels;
                                if (parsed && typeof parsed === 'object') {
                                  ratingLabels = { ...ratingLabels, ...parsed };
                                }
                              } catch (e2) {
                                // Use defaults
                              }
                            }
                          }
                        } else if (kra.kpi_2_rating_labels) {
                          try {
                            const parsed = typeof kra.kpi_2_rating_labels === 'string' 
                              ? JSON.parse(kra.kpi_2_rating_labels) 
                              : kra.kpi_2_rating_labels;
                            if (parsed && typeof parsed === 'object') {
                              ratingLabels = { ...ratingLabels, ...parsed };
                            }
                          } catch (e) {
                            // Use defaults
                          }
                        }

                        // Only show options that have labels (non-empty)
                        return ['5', '4', '3', '2', '1'].map(rating => {
                          const label = ratingLabels[rating] || `${rating} - ${rating === '5' ? 'Excellent' : rating === '4' ? 'Very Good' : rating === '3' ? 'Good' : rating === '2' ? 'Needs Improvement' : 'Poor'}`;
                          return (
                            <SelectItem key={rating} value={rating}>
                              {label}
                            </SelectItem>
                          );
                        });
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`comments-${kra.id}`}>Comments (Optional)</Label>
                  <Textarea
                    id={`comments-${kra.id}`}
                    value={submission.comments}
                    onChange={(e) => handleCommentsChange(kra.id, e.target.value)}
                    placeholder="Add any comments or notes about this KRA..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={submitting}
            className="gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit KRA Ratings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

