'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, AlertOctagon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KRIAlert({ kri, metric }) {
  if (!kri || !metric) return null;

  const { name, description, threshold_warning, threshold_critical } = kri;
  const { calculated_value, risk_level, period_type, period_start } = metric || {};

  // Ensure values are numbers
  const value = Number(calculated_value) || 0;
  const warningThreshold = threshold_warning ? Number(threshold_warning) : null;
  const criticalThreshold = threshold_critical ? Number(threshold_critical) : null;

  // Get risk level styling
  const getRiskConfig = (level) => {
    switch (level) {
      case 'critical':
        return {
          icon: AlertOctagon,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeColor: 'bg-red-600',
          badgeText: 'Critical',
          textColor: 'text-red-900'
        };
      case 'high':
        return {
          icon: AlertCircle,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeColor: 'bg-orange-600',
          badgeText: 'High',
          textColor: 'text-orange-900'
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeColor: 'bg-yellow-600',
          badgeText: 'Medium',
          textColor: 'text-yellow-900'
        };
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeColor: 'bg-blue-600',
          badgeText: 'Low',
          textColor: 'text-blue-900'
        };
    }
  };

  const riskConfig = getRiskConfig(risk_level || 'low');
  const Icon = riskConfig.icon;

  // Determine if thresholds are exceeded
  const isExceedingCritical = criticalThreshold !== null && value >= criticalThreshold;
  const isExceedingWarning = warningThreshold !== null && value >= warningThreshold;

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", riskConfig.borderColor, "border-2")}>
      <CardHeader className={cn("pb-3", riskConfig.bgColor)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={cn("h-5 w-5 mt-0.5", riskConfig.iconColor)} />
            <div className="flex-1">
              <CardTitle className={cn("text-lg font-semibold", riskConfig.textColor)}>
                {name}
              </CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          <Badge className={cn(riskConfig.badgeColor, "text-white")}>
            {riskConfig.badgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(riskConfig.bgColor)}>
        <div className="space-y-4">
          {/* Current Value */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", riskConfig.textColor)}>
                {value.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Thresholds */}
          {(warningThreshold !== null || criticalThreshold !== null) && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="text-xs font-medium text-muted-foreground">
                Thresholds:
              </div>
              {warningThreshold !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Warning</span>
                  <span className={cn(
                    "font-medium",
                    isExceedingWarning && !isExceedingCritical && riskConfig.textColor
                  )}>
                    {warningThreshold.toLocaleString()}
                    {isExceedingWarning && !isExceedingCritical && " ⚠️"}
                  </span>
                </div>
              )}
              {criticalThreshold !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Critical</span>
                  <span className={cn(
                    "font-medium",
                    isExceedingCritical && riskConfig.textColor
                  )}>
                    {criticalThreshold.toLocaleString()}
                    {isExceedingCritical && " 🚨"}
                  </span>
                </div>
              )}

              {/* Visual indicator */}
              <div className="relative pt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  {criticalThreshold !== null && (
                    <div
                      className="absolute h-2 bg-red-400 rounded-full"
                      style={{ 
                        width: `${Math.min((value / Math.max(criticalThreshold, warningThreshold || 1)) * 100, 100)}%` 
                      }}
                    />
                  )}
                  {warningThreshold !== null && (
                    <div
                      className="absolute h-2 bg-yellow-400 rounded-full"
                      style={{ 
                        width: `${Math.min((value / (warningThreshold || 1)) * 100, 100)}%`,
                        zIndex: 1
                      }}
                    />
                  )}
                </div>
                <div className="absolute top-0 left-0 w-full h-2">
                  {warningThreshold !== null && (
                    <div
                      className="absolute h-2 w-0.5 bg-yellow-600"
                      style={{ left: `${(warningThreshold / Math.max(criticalThreshold || warningThreshold, warningThreshold)) * 100}%` }}
                    />
                  )}
                  {criticalThreshold !== null && (
                    <div
                      className="absolute h-2 w-0.5 bg-red-600"
                      style={{ left: `${(criticalThreshold / Math.max(criticalThreshold, warningThreshold || 1)) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Period Info */}
          {period_start && (
            <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
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

