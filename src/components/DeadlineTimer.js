'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DeadlineTimer({ deadline, status, className }) {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (!deadline) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      
      // Parse deadline - handle UTC ISO strings (from database) and datetime-local format
      let deadlineDate;
      
      if (typeof deadline === 'string') {
        // If it's a UTC ISO string (ends with Z), parse it directly
        if (deadline.endsWith('Z') || deadline.includes('+') || deadline.match(/-\d{2}:\d{2}$/)) {
          // It's an ISO string with timezone info - parse as UTC
          deadlineDate = new Date(deadline);
        } else if (deadline.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?$/)) {
          // It's a datetime format without timezone (datetime-local format)
          // Parse as local time by creating date components manually
          const [datePart, timePart] = deadline.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const timeParts = timePart.split(':');
          const hours = Number(timeParts[0]);
          const minutes = Number(timeParts[1]);
          const seconds = timeParts[2] ? Number(timeParts[2].split('.')[0]) : 0;
          
          // Create date in local timezone
          deadlineDate = new Date(year, month - 1, day, hours, minutes, seconds);
        } else {
          // Fallback: try parsing as-is
          deadlineDate = new Date(deadline);
        }
      } else {
        deadlineDate = new Date(deadline);
      }

      // Validate the date
      if (isNaN(deadlineDate.getTime())) {
        setTimeRemaining(null);
        return;
      }

      // Get current time and deadline time in milliseconds
      // JavaScript Date objects store time as UTC milliseconds, so comparison is correct
      const nowTime = now.getTime();
      const deadlineTime = deadlineDate.getTime();

      // Calculate difference in milliseconds
      const diff = deadlineTime - nowTime;

      // Only mark as overdue if the deadline has actually passed
      // Use a small buffer (5 seconds) to account for timing/rounding issues
      if (diff < -5000) {
        // Calculate how much time has passed since deadline
        const overdueDiff = Math.abs(diff);
        const overdueDays = Math.floor(overdueDiff / (1000 * 60 * 60 * 24));
        const overdueHours = Math.floor((overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const overdueMinutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
        const overdueSeconds = Math.floor((overdueDiff % (1000 * 60)) / 1000);
        
        setTimeRemaining({ 
          overdue: true, 
          days: overdueDays, 
          hours: overdueHours, 
          minutes: overdueMinutes, 
          seconds: overdueSeconds 
        });
        return;
      }

      // Calculate time remaining (only if not overdue)
      const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
      const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

      setTimeRemaining({ overdue: false, days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000); // Update every second for real-time

    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || !timeRemaining) {
    return null;
  }

  // Don't show overdue if task is completed
  const isCompleted = status === 'completed';
  const isOverdue = timeRemaining.overdue && !isCompleted;
  const isUrgent = !isOverdue && timeRemaining.days === 0 && timeRemaining.hours < 3;
  const isWarning = !isOverdue && !isUrgent && timeRemaining.days <= 3;

  // If completed, show completed badge
  if (isCompleted) {
    return (
      <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200", className)}>
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-green-700">Completed</span>
          <span className="text-xs text-green-600">Task finished</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all",
      isOverdue && "bg-red-50 border-red-300 shadow-md",
      !isOverdue && isUrgent && "bg-orange-50 border-orange-300 shadow-md",
      !isOverdue && isWarning && "bg-yellow-50 border-yellow-300",
      !isOverdue && !isUrgent && !isWarning && "bg-blue-50 border-blue-200",
      className
    )}>
      {isOverdue ? (
        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
      ) : (
        <Clock className={cn(
          "h-6 w-6 flex-shrink-0",
          isUrgent && "text-orange-600",
          isWarning && "text-yellow-600",
          !isUrgent && !isWarning && "text-blue-600"
        )} />
      )}
      <div className="flex flex-col min-w-0">
        {isOverdue ? (
          <>
            <span className="text-base font-bold text-red-700">Overdue</span>
            <span className="text-xs text-red-600">
              {Math.abs(timeRemaining.days)}d {Math.abs(timeRemaining.hours)}h {Math.abs(timeRemaining.minutes)}m ago
            </span>
          </>
        ) : timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 ? (
          <>
            <span className={cn(
              "text-base font-bold",
              isUrgent ? "text-orange-700" : "text-blue-700"
            )}>
              {timeRemaining.seconds}s left
            </span>
            <span className={cn(
              "text-xs",
              isUrgent ? "text-orange-600" : "text-blue-600"
            )}>
              Less than a minute remaining
            </span>
          </>
        ) : timeRemaining.days === 0 && timeRemaining.hours === 0 ? (
          <>
            <span className={cn(
              "text-base font-bold",
              isUrgent ? "text-orange-700" : "text-blue-700"
            )}>
              {timeRemaining.minutes}m {timeRemaining.seconds}s left
            </span>
            <span className={cn(
              "text-xs",
              isUrgent ? "text-orange-600" : "text-blue-600"
            )}>
              Less than an hour remaining
            </span>
          </>
        ) : timeRemaining.days === 0 ? (
          <>
            <span className={cn(
              "text-base font-bold",
              isUrgent ? "text-orange-700" : "text-blue-700"
            )}>
              {timeRemaining.hours}h {timeRemaining.minutes}m left
            </span>
            <span className={cn(
              "text-xs",
              isUrgent ? "text-orange-600" : "text-blue-600"
            )}>
              {timeRemaining.seconds}s remaining
            </span>
          </>
        ) : (
          <>
            <span className={cn(
              "text-base font-bold",
              isWarning ? "text-yellow-700" : "text-blue-700"
            )}>
              {timeRemaining.days}d {timeRemaining.hours}h left
            </span>
            <span className={cn(
              "text-xs",
              isWarning ? "text-yellow-600" : "text-blue-600"
            )}>
              {timeRemaining.minutes}m {timeRemaining.seconds}s remaining
            </span>
          </>
        )}
      </div>
    </div>
  );
}


