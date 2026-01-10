
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { ordersApi } from '../lib/api';

const OrdersPage: React.FC = () => {
  const { authToken } = usePersistence();
  const [filter, setFilter] = useState<'all' | 'processing' | 'shipped' | 'delivered'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await ordersApi.list(authToken);
        // Transform API response to match frontend structure
        const transformedOrders = (data || []).map((order: any) => ({
          id: order.id,
          orderNumber: `YF-${order.id}`,
          date: new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: order.status || 'processing',
          items: (order.order_items || []).map((item: any) => ({
            id: item.product?.id || item.id,
            image: item.product?.images?.[0]?.url || '',
            title: item.product?.title || 'Product',
            price: item.price_at_purchase || 0,
            quantity: item.quantity || 1,
            seller: 'Seller',
          })),
          subtotal: (order.order_items || []).reduce((sum: number, item: any) => sum + ((item.price_at_purchase || 0) * (item.quantity || 1)), 0),
          shipping: 0,
          tax: 0,
          total: parseFloat(order.total_amount || 0),
          shippingAddress: {
            name: 'Recipient',
            address: order.meetup_location || '',
            city: '',
            state: '',
            zipCode: '',
          },
          trackingNumber: order.tracking_number,
          estimatedDelivery: order.meetup_time ? new Date(order.meetup_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined,
        }));
        setOrders(transformedOrders);
      } catch (err: any) {
        console.error('Failed to fetch orders:', err);
        setError(err.message || 'Failed to load orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [authToken]);

  if (!authToken) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Please log in to view orders</h2>
          <Link to="/login" className="text-primary">Log In</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20 text-red-500">{error}</div>
      </div>
    );
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusBadge = (status: Order['status']) => {
    const badges = {
      processing: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Processing', icon: 'pending' },
      shipped: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'In Transit', icon: 'local_shipping' },
      delivered: { bg: 'bg-green-50', text: 'text-green-600', label: 'Delivered', icon: 'check_circle' },
      cancelled: { bg: 'bg-slate-50', text: 'text-slate-400', label: 'Cancelled', icon: 'cancel' }
    };
    const badge = badges[status];
    return (
      <span className={`inline-flex items-center gap-1.5 ${badge.bg} ${badge.text} text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${status === 'delivered' ? 'border-green-100' : status === 'shipped' ? 'border-orange-100' : 'border-blue-100'}`}>
        <span className="material-symbols-outlined !text-sm">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">My Orders</h1>
              <p className="text-base text-slate-500 font-medium">
                Review your neighborhood treasure history
              </p>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {(['all', 'processing', 'shipped', 'delivered'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    filter === t ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
            <div className="size-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <span className="material-symbols-outlined !text-4xl text-slate-300">receipt_long</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No orders found</h3>
            <p className="text-slate-500 font-medium mb-10">You haven't discovered any treasures yet this season.</p>
            <Link to="/search" className="inline-flex items-center gap-3 bg-primary hover:bg-orange-600 text-white font-black px-10 py-5 rounded-2xl transition-all shadow-xl shadow-primary/20">
              <span className="uppercase tracking-[0.1em] text-sm">Find Something New</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn">
            {filteredOrders.map((order) => (
              <article key={order.id} className="bg-white rounded-[32px] border border-slate-200 overflow-hidden hover:border-slate-300 transition-all shadow-sm group">
                {/* Order Header */}
                <div className="p-8 border-b border-slate-50 bg-white">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Order #{order.orderNumber}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Placed on {order.date}
                      </p>
                    </div>
                    
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tighter">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
                    <button
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline transition-all flex items-center gap-2"
                    >
                      {expandedOrder === order.id ? 'Hide Details' : 'View Breakdown'}
                      <span className={`material-symbols-outlined !text-sm transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {order.trackingNumber && (
                      <button className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2">
                         <span className="material-symbols-outlined !text-sm">location_searching</span>
                         Track Package
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Items Preview List (Always Visible) */}
                <div className="p-8 bg-slate-50/30">
                  <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
                    {order.items.map((item) => (
                      <Link key={item.id} to={`/product/${item.id}`} className="size-24 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group-hover:border-primary/20 transition-all relative">
                         <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" />
                         <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-black p-1 text-center truncate">{item.title}</div>
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedOrder === order.id && (
                  <div className="bg-white p-8 border-t border-slate-100 animate-fadeIn space-y-10">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Line Items</h4>
                      <div className="space-y-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                             <div className="size-16 rounded-xl overflow-hidden shadow-sm shrink-0">
                               <img src={item.image} className="w-full h-full object-cover" />
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="font-bold text-slate-900 truncate">{item.title}</p>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Sold by {item.seller}</p>
                             </div>
                             <div className="text-right">
                               <p className="font-black text-slate-900">${item.price}</p>
                               <p className="text-[9px] font-black text-slate-400 uppercase">Qty: {item.quantity}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Destination</h4>
                        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-1 relative overflow-hidden">
                           <div className="absolute top-0 right-0 size-24 bg-primary/20 blur-3xl"></div>
                           <p className="font-bold">{order.shippingAddress.name}</p>
                           <p className="text-sm opacity-60">{order.shippingAddress.address}</p>
                           <p className="text-sm opacity-60">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Summary</h4>
                        <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50 space-y-3">
                           <div className="flex justify-between text-xs font-bold text-slate-500">
                              <span>Subtotal</span>
                              <span>${order.subtotal.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-xs font-bold text-slate-500">
                              <span>Local Delivery</span>
                              <span>${order.shipping.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-xs font-bold text-slate-500">
                              <span>Neighborhood Tax</span>
                              <span>${order.tax.toFixed(2)}</span>
                           </div>
                           <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                              <span className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Grand Total</span>
                              <span className="text-xl font-black text-primary">${order.total.toFixed(2)}</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    {order.trackingNumber && (
                      <div className="pt-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Real-time Signal</h4>
                        <div className="p-8 rounded-[32px] border-2 border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-6">
                           <div className="flex items-center gap-6">
                              <div className="size-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                                <span className="material-symbols-outlined !text-3xl">radar</span>
                              </div>
                              <div>
                                 <p className="font-black text-slate-900 uppercase text-[10px] tracking-[0.2em] mb-1">Status: {order.status === 'delivered' ? 'Successful Drop' : 'En Route'}</p>
                                 <p className="text-sm font-bold text-slate-600">Tracking: {order.trackingNumber}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Hand-off</p>
                              <p className="text-lg font-black text-primary">{order.estimatedDelivery}</p>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
