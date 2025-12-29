'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Loader2, Trash2, Edit2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const calendarRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    is_public: false,
    allDay: true
  });

  useEffect(() => {
    fetchUser();
    fetchEvents();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchEvents = async (start, end) => {
    try {
      let url = '/api/calendar';
      if (start && end) {
        // Format dates as YYYY-MM-DD
        const startDate = typeof start === 'string' ? start.split('T')[0] : start.toISOString().split('T')[0];
        const endDate = typeof end === 'string' ? end.split('T')[0] : end.toISOString().split('T')[0];
        url += `?start=${startDate}&end=${endDate}`;
      }
      
      const res = await authenticatedFetch(url);
      
      // Check if response has content before parsing JSON
      const text = await res.text();
      if (!text) {
        console.error('Empty response from calendar API');
        setEvents([]);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr, 'Response text:', text);
        setEvents([]);
        return;
      }
      
      if (res.ok) {
        const eventsList = data.events || [];
        setEvents(eventsList);
      } else {
        console.error('Calendar API error:', data.error || 'Unknown error');
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (selectInfo) => {
    setSelectedDate(selectInfo.startStr.split('T')[0]);
    setFormData({
      title: '',
      description: '',
      event_date: selectInfo.startStr.split('T')[0],
      event_time: selectInfo.allDay ? '' : selectInfo.startStr.split('T')[1]?.substring(0, 5) || '',
      is_public: false,
      allDay: selectInfo.allDay
    });
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const extendedProps = event.extendedProps;
    
    setSelectedEvent({
      id: event.id,
      title: event.title,
      description: extendedProps.description || '',
      event_date: event.startStr.split('T')[0],
      event_time: event.allDay ? '' : event.startStr.split('T')[1]?.substring(0, 5) || '',
      is_public: extendedProps.isPublic || false,
      allDay: event.allDay,
      canEdit: extendedProps.canEdit,
      createdBy: extendedProps.createdBy || 'Unknown User',
      createdByRole: extendedProps.createdByRole || ''
    });
    
    setFormData({
      title: event.title,
      description: extendedProps.description || '',
      event_date: event.startStr.split('T')[0],
      event_time: event.allDay ? '' : event.startStr.split('T')[1]?.substring(0, 5) || '',
      is_public: extendedProps.isPublic || false,
      allDay: event.allDay
    });
    
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.event_date) {
      alert('Please fill in title and event date');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = selectedEvent ? `/api/calendar/${selectedEvent.id}` : '/api/calendar';
      const method = selectedEvent ? 'PUT' : 'POST';

      const payload = {
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        event_time: formData.allDay ? null : (formData.event_time || null),
        is_public: formData.is_public
      };

      const res = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Check if response has content before parsing JSON
      const text = await res.text();
      if (!text) {
        alert('Empty response from server');
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr, 'Response text:', text);
        alert('Invalid response from server');
        return;
      }

      if (res.ok && data.success) {
        // Refresh events - get current calendar view dates
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          const view = calendarApi.view;
          await fetchEvents(view.activeStart, view.activeEnd);
        } else {
          await fetchEvents();
        }
        
        setIsDialogOpen(false);
        setSelectedEvent(null);
        setFormData({
          title: '',
          description: '',
          event_date: '',
          event_time: '',
          is_public: false,
          allDay: true
        });
      } else {
        alert(data.error || 'Failed to save calendar item');
      }
    } catch (err) {
      console.error('Failed to save calendar item:', err);
      alert('Failed to save calendar item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    setIsSubmitting(true);
    try {
      const res = await authenticatedFetch(`/api/calendar/${selectedEvent.id}`, {
        method: 'DELETE',
      });

      // Check if response has content before parsing JSON
      const text = await res.text();
      if (!text) {
        alert('Empty response from server');
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr, 'Response text:', text);
        alert('Invalid response from server');
        return;
      }

      if (res.ok && data.success) {
        // Refresh events - get current calendar view dates
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          const view = calendarApi.view;
          await fetchEvents(view.activeStart, view.activeEnd);
        } else {
          await fetchEvents();
        }
        
        setIsDeleteDialogOpen(false);
        setIsDialogOpen(false);
        setSelectedEvent(null);
      } else {
        alert(data.error || 'Failed to delete calendar item');
      }
    } catch (err) {
      console.error('Failed to delete calendar item:', err);
      alert('Failed to delete calendar item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDatesSet = (dateInfo) => {
    fetchEvents(
      dateInfo.start,
      dateInfo.end
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage your calendar events and view public events from your team
          </p>
        </div>
        <Button
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setSelectedDate(today);
            setFormData({
              title: '',
              description: '',
              event_date: today,
              event_time: '',
              is_public: false,
              allDay: true
            });
            setSelectedEvent(null);
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span>Public Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500"></div>
              <span>Private Events</span>
            </div>
          </div>
          
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            events={events}
            select={handleDateSelect}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            height="auto"
            eventDisplay="block"
            timeZone="Asia/Kolkata" 
            displayEventTime={true}
            allDayText="All Day"
          />
        </CardContent>
      </Card>

      {/* Add/Edit Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent
                ? 'Update your calendar event details'
                : 'Add a new event to your calendar'}
            </DialogDescription>
            {selectedEvent && (
              <div className="text-sm text-muted-foreground pt-2">
                Created by: <span className="font-medium">{selectedEvent.createdBy || 'Unknown User'}</span>
                {selectedEvent.createdByRole && (
                  <span className="ml-2 text-xs">({selectedEvent.createdByRole})</span>
                )}
              </div>
            )}
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter event title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter event description (optional)"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Date *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_time">Time</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  disabled={formData.allDay}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={formData.allDay}
                onCheckedChange={(checked) => {
                  setFormData({ ...formData, allDay: checked, event_time: checked ? '' : formData.event_time });
                }}
              />
              <Label htmlFor="allDay" className="cursor-pointer">
                All Day Event
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label htmlFor="is_public" className="cursor-pointer">
                Public Event (visible to all users)
              </Label>
            </div>

            {selectedEvent && selectedEvent.canEdit && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Event
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedEvent(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {selectedEvent ? <Edit2 className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {selectedEvent ? 'Update' : 'Create'} Event
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedEvent?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

