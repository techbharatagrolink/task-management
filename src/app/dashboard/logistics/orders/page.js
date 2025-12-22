'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';
import { authenticatedFetch } from '@/lib/auth-client';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchOrders();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        if (!hasRoleAccess(data.user.role, ['Logistics', 'Super Admin', 'Admin'])) {
          setLoading(false);
          return;
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await authenticatedFetch('/api/logistics/orders');
      const data = await res.json();
      
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !hasRoleAccess(user.role, ['Logistics', 'Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to Logistics team, Admin, and Super Admin." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Orders
          </h1>
          <p className="text-muted-foreground mt-1">Manage logistics orders</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <NoData 
          title="No Orders" 
          description="There are no orders to display."
          actionLabel="Refresh"
          onAction={fetchOrders}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name} • {order.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{order.total_amount || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


