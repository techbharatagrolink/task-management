'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Award, 
  Star, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { authenticatedFetch } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';

function EmployeeRatingsPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    workplace_behaviour: '',
    discipline: '',
    innovations: '',
    punctuality: '',
    critical_task_delivery: '',
    comments: '',
    rating_period: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      const canSubmit = ['Super Admin', 'Admin', 'Manager', 'HR'].includes(user.role);
      console.log('User role:', user.role, 'Can submit:', canSubmit);
      if (canSubmit) {
        fetchEmployees();
      } else {
        // Employee viewing their own ratings
        console.log('Fetching ratings for employee ID:', user.id);
        fetchRatings();
      }
    }
    
    // Pre-fill employee_id from URL if provided
    const employeeId = searchParams.get('employee_id');
    if (employeeId) {
      setFormData(prev => ({ ...prev, employee_id: employeeId }));
    }
  }, [user, searchParams]);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchRatings = async () => {
    try {
      setRatingsLoading(true);
      setLoading(true);
      const res = await authenticatedFetch('/api/employee-ratings');
      const text = await res.text();
      console.log('Ratings API response:', text);
      
      if (!text) {
        console.log('Empty response from API');
        setRatings([]);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr, 'Response text:', text);
        setRatings([]);
        return;
      }
      
      // Check for error response
      if (!res.ok) {
        console.error('API error:', data.error || 'Unknown error', 'Status:', res.status);
        if (data.error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: data.error || 'Failed to fetch ratings',
          });
        }
        setRatings([]);
        return;
      }
      
      // Check if ratings array exists
      if (data.ratings && Array.isArray(data.ratings)) {
        console.log('Ratings fetched successfully:', data.ratings.length);
        setRatings(data.ratings);
      } else {
        console.log('No ratings in response or invalid format:', data);
        setRatings([]);
      }
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch ratings. Please try again.',
      });
      setRatings([]);
    } finally {
      setRatingsLoading(false);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/employees');
      const text = await res.text();
      if (!text) {
        setEmployees([]);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr);
        setEmployees([]);
        return;
      }
      
      if (res.ok && data.employees) {
        // Filter out Super Admin and the current user (can't rate yourself)
        const filtered = data.employees.filter(emp => 
          emp.role !== 'Super Admin' && emp.id !== user?.id
        );
        setEmployees(filtered);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }

    const ratingFields = [
      'workplace_behaviour',
      'discipline',
      'innovations',
      'punctuality',
      'critical_task_delivery'
    ];

    ratingFields.forEach(field => {
      const value = formData[field];
      if (!value || value === '') {
        newErrors[field] = 'Rating is required';
      } else {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1 || numValue > 5) {
          newErrors[field] = 'Rating must be between 1 and 5';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
      });
      return;
    }

    setSubmitting(true);
    setSuccess(false);

    try {
      const payload = {
        employee_id: parseInt(formData.employee_id),
        workplace_behaviour: parseInt(formData.workplace_behaviour),
        discipline: parseInt(formData.discipline),
        innovations: parseInt(formData.innovations),
        punctuality: parseInt(formData.punctuality),
        critical_task_delivery: parseInt(formData.critical_task_delivery),
        comments: formData.comments || null,
        rating_period: formData.rating_period || null
      };

      const res = await authenticatedFetch('/api/employee-ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr);
        throw new Error('Invalid response from server');
      }

      if (res.ok && data.success) {
        setSuccess(true);
        toast({
          title: 'Rating Submitted',
          description: 'Employee rating has been successfully submitted.',
        });
        
        // Reset form
        setFormData({
          employee_id: '',
          workplace_behaviour: '',
          discipline: '',
          innovations: '',
          punctuality: '',
          critical_task_delivery: '',
          comments: '',
          rating_period: ''
        });
        
        // Clear URL params if present
        if (searchParams.get('employee_id')) {
          window.history.replaceState({}, '', '/dashboard/employee-ratings');
        }
      } else {
        throw new Error(data.error || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err.message || 'Failed to submit employee rating. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmployee = employees.find(emp => emp.id === parseInt(formData.employee_id));
  const canSubmit = user && ['Super Admin', 'Admin', 'Manager', 'HR'].includes(user.role);
  const isEmployee = user && !canSubmit;
  
  // Debug logging
  if (user) {
    console.log('Render - User:', user.role, 'Can submit:', canSubmit, 'Is employee:', isEmployee, 'Ratings count:', ratings.length);
  }

  const calculateAverageRating = (rating) => {
    const ratings = [
      rating.workplace_behaviour,
      rating.discipline,
      rating.innovations,
      rating.punctuality,
      rating.critical_task_delivery
    ];
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / ratings.length).toFixed(2);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Show loading only if we're still fetching initial data
  if ((loading && !user) || (ratingsLoading && isEmployee)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Employee Ratings
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEmployee ? 'View your performance ratings' : 'Submit performance ratings for employees'}
          </p>
        </div>
        {canSubmit && (
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/dashboard/top-employees'}
          >
            View Top Employees
          </Button>
        )}
      </div>

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Rating submitted successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Employee View - Display Ratings */}
      {isEmployee && user && (
        <>
          {ratings.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No ratings available yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your performance ratings will appear here once they are submitted by your manager or HR.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => {
                const avgRating = parseFloat(calculateAverageRating(rating));
                return (
                  <Card key={rating.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Performance Rating
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {rating.rating_period 
                              ? `Rating Period: ${new Date(rating.rating_period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                              : `Submitted on ${new Date(rating.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                            }
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getRatingColor(avgRating)}`}>
                            {avgRating}
                          </div>
                          <div className="text-sm text-muted-foreground">Average</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'workplace_behaviour', label: 'Workplace Behaviour', value: rating.workplace_behaviour },
                          { key: 'discipline', label: 'Discipline', value: rating.discipline },
                          { key: 'innovations', label: 'Innovations', value: rating.innovations },
                          { key: 'punctuality', label: 'Punctuality', value: rating.punctuality },
                          { key: 'critical_task_delivery', label: 'Critical Task Delivery', value: rating.critical_task_delivery }
                        ].map(field => (
                          <div key={field.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">{field.label}</Label>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= field.value
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-semibold w-8 text-right">{field.value}/5</span>
                              </div>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${(field.value / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {rating.comments && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <MessageSquare className="h-4 w-4" />
                              Comments
                            </div>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                              {rating.comments}
                            </p>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Rated by: {rating.rated_by_name} ({rating.rated_by_role})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(rating.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Admin/Manager/HR View - Submit Rating Form */}
      {canSubmit && user && (
        <Card>
        <CardHeader>
          <CardTitle>Submit Employee Rating</CardTitle>
          <CardDescription>
            Rate an employee on various performance criteria (1-5 scale)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee_id">
                Employee <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => handleChange('employee_id', value)}
              >
                <SelectTrigger id="employee_id" className={errors.employee_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <SelectItem value="" disabled>No employees available</SelectItem>
                  ) : (
                    employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} - {emp.role} {emp.department ? `(${emp.department})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-sm text-red-500">{errors.employee_id}</p>
              )}
              {selectedEmployee && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="h-4 w-4" />
                  <span>{selectedEmployee.email}</span>
                  {selectedEmployee.designation && (
                    <>
                      <span>•</span>
                      <span>{selectedEmployee.designation}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Rating Period (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="rating_period">
                Rating Period (Optional)
              </Label>
              <Input
                id="rating_period"
                type="month"
                value={formData.rating_period}
                onChange={(e) => handleChange('rating_period', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Specify the month/year this rating is for (e.g., December 2025)
              </p>
            </div>

            {/* Rating Fields */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Performance Ratings (1-5 Scale)</h3>
              
              {[
                { key: 'workplace_behaviour', label: 'Workplace Behaviour', description: 'Professional conduct and team collaboration' },
                { key: 'discipline', label: 'Discipline', description: 'Adherence to rules and policies' },
                { key: 'innovations', label: 'Innovations', description: 'Creative problem-solving and new ideas' },
                { key: 'punctuality', label: 'Punctuality', description: 'Timeliness and meeting deadlines' },
                { key: 'critical_task_delivery', label: 'Critical Task Delivery', description: 'Quality and timeliness of important tasks' }
              ].map(field => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.key}>
                      {field.label} <span className="text-red-500">*</span>
                    </Label>
                    {formData[field.key] && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= parseInt(formData[field.key])
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <Select
                    value={formData[field.key]}
                    onValueChange={(value) => handleChange(field.key, value)}
                  >
                    <SelectTrigger id={field.key} className={errors[field.key] ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select rating (1-5)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                      <SelectItem value="4">4 - Very Good</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="2">2 - Needs Improvement</SelectItem>
                      <SelectItem value="1">1 - Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  {errors[field.key] && (
                    <p className="text-sm text-red-500">{errors[field.key]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => handleChange('comments', e.target.value)}
                placeholder="Add any additional feedback or comments about this employee's performance..."
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex-1 border-2 border-primary bg-primary  hover:bg-black/2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Submit Rating
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setFormData({
                    employee_id: '',
                    workplace_behaviour: '',
                    discipline: '',
                    innovations: '',
                    punctuality: '',
                    critical_task_delivery: '',
                    comments: '',
                    rating_period: ''
                  });
                  setErrors({});
                  setSuccess(false);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

export default function EmployeeRatingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <EmployeeRatingsPageContent />
    </Suspense>
  );
}

