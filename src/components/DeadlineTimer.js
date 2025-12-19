'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DeadlineTimer({ deadline, className }) {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (!deadline) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate - now;

      if (diff <= 0) {
        setTimeRemaining({ overdue: true, days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ overdue: false, days, hours, minutes });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || !timeRemaining) {
    return null;
  }

  const isUrgent = timeRemaining.overdue || timeRemaining.days === 0;
  const isWarning = !timeRemaining.overdue && timeRemaining.days <= 3;

  return (
    <Badge
      variant={timeRemaining.overdue ? 'destructive' : isUrgent ? 'destructive' : isWarning ? 'default' : 'secondary'}
      className={cn(
        "gap-1.5 font-medium",
        timeRemaining.overdue && "bg-red-500 hover:bg-red-600",
        !timeRemaining.overdue && isUrgent && "bg-orange-500 hover:bg-orange-600",
        !timeRemaining.overdue && isWarning && "bg-yellow-500 hover:bg-yellow-600",
        className
      )}
    >
      {timeRemaining.overdue ? (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>Overdue</span>
        </>
      ) : timeRemaining.days === 0 && timeRemaining.hours === 0 ? (
        <>
          <Clock className="h-3 w-3" />
          <span>{timeRemaining.minutes}m left</span>
        </>
      ) : timeRemaining.days === 0 ? (
        <>
          <Clock className="h-3 w-3" />
          <span>{timeRemaining.hours}h {timeRemaining.minutes}m left</span>
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          <span>{timeRemaining.days}d {timeRemaining.hours}h left</span>
        </>
      )}
    </Badge>
  );
}


