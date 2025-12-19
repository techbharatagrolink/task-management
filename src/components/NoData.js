'use client';

import { Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NoData({ 
  title = 'No Data Available', 
  description = 'There is no data to display at this time.',
  actionLabel,
  onAction,
  icon: Icon = Inbox
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md border-dashed">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-muted rounded-full">
              <Icon className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-2">
            {description}
          </CardDescription>
        </CardHeader>
        {(actionLabel || onAction) && (
          <CardContent className="text-center">
            <Button
              variant="outline"
              onClick={onAction}
              className="gap-2"
            >
              {onAction && <RefreshCw className="h-4 w-4" />}
              {actionLabel || 'Refresh'}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}


