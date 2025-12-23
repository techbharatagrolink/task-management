'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KPICard({ kpi, metric, showTarget = true }) {
  if (!kpi || !metric) return null;

  const { name, description, metric_type, target_value } = kpi;
  const { calculated_value, status, period_type, period_start } = metric || {};

  // Ensure values are numbers
  const value = Number(calculated_value) || 0;
  const target = target_value ? Number(target_value) : null;

  // Format value based on metric type
  const formatValue = (val, type) => {
    const numVal = Number(val) || 0;
    if (type === 'percentage') {
      return `${numVal.toFixed(1)}%`;
    } else if (type === 'average') {
      return numVal.toFixed(2);
    } else {
      return numVal.toLocaleString();
    }
  };

  // Determine trend (simplified - would need historical data for real trends)
  const getStatusColor = (status) => {
    switch (status) {
      case 'above_target':
        return 'text-green-600';
      case 'below_target':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'above_target':
        return <Badge className="bg-green-100 text-green-800">Above Target</Badge>;
      case 'below_target':
        return <Badge className="bg-red-100 text-red-800">Below Target</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">On Target</Badge>;
    }
  };

  // Calculate percentage of target if target exists
  const targetPercentage = target && target > 0 
    ? parseFloat(((value / target) * 100).toFixed(1))
    : null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{name}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {status && getStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Value */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", getStatusColor(status))}>
                {formatValue(value, metric_type)}
              </span>
              {target && (
                <span className="text-sm text-muted-foreground">
                  of {formatValue(target, metric_type)}
                </span>
              )}
            </div>
              {targetPercentage !== null && (
              <div className="mt-1 text-xs text-muted-foreground">
                {targetPercentage}% of target
              </div>
            )}
          </div>

          {/* Target Progress Bar */}
          {showTarget && target && target > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress to Target</span>
                <span>{Math.min(targetPercentage || 0, 100)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    status === 'above_target' && "bg-green-500",
                    status === 'below_target' && "bg-red-500",
                    status === 'on_target' && "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(targetPercentage || 0, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Period Info */}
          {period_start && (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              {period_type && (
                <span className="capitalize">{period_type}</span>
              )}
              {' '}
              {period_start && (
                <span>{new Date(period_start).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

