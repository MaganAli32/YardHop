
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { cartApi } from '../lib/api';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    image: string;
    location: string;
  };
}

const CartPage: React.FC = () => {
  const { authToken } = usePersistence();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchCart = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await cartApi.list(authToken);
        setCartItems(data || []);
      } catch (err: any) {
        // Check if backend is unavailable (silently handle this case)
        if (err?.message?.includes('Cannot connect to server')) {
          // Backend API not available - silently use empty array
          setCartItems([]);
          // Don't show error message for unavailable backend
        } else {
          // Only log/show errors for actual API errors
          console.error('Failed to fetch cart:', err);
          setError(err.message || 'Failed to load cart');
          setCartItems([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [authToken]);

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1 || !authToken) return;
    
    try {
      await cartApi.add(productId, newQuantity, authToken);
      setCartItems(prev => prev.map(item => 
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      ));
    } catch (err: any) {
      console.error('Failed to update quantity:', err);
      alert(err.message || 'Failed to update quantity');
    }
  };

  const removeItem = async (productId: string) => {
    if (!authToken) return;
    
    try {
      await cartApi.remove(productId, authToken);
      setCartItems(prev => prev.filter(item => item.productId !== productId));
    } catch (err: any) {
      console.error('Failed to remove item:', err);
      alert(err.message || 'Failed to remove item');
    }
  };

  if (!authToken) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Please log in to view your cart</h2>
          <Link to="/login" className="text-primary">Log In</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">Loading cart...</div>
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

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalShipping = 0; // Free local pickup/dropoff for neighborhood marketplace
  const taxRate = 0.0825; // 8.25% local tax
  const tax = subtotal * taxRate;
  const total = subtotal + totalShipping + tax;

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-base text-slate-500 font-medium">
            {cartItems.length} {cartItems.length === 1 ? 'treasure' : 'treasures'} ready for pickup or shipping
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {cartItems.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Your cart is lonely
            </h3>
            <p className="text-slate-500 font-medium mb-10">
              Browse Unique Finds to add shippable treasures to your cart.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-3 bg-primary hover:bg-orange-600 text-white font-black px-10 py-5 rounded-2xl transition-all shadow-xl shadow-primary/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
              <span className="uppercase tracking-[0.1em] text-sm">Find Treasures</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fadeIn">
            
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item) => (
                <article 
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200 p-8 hover:border-slate-300 transition-all shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row gap-8">
                    
                    {/* Image */}
                    <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                      <div className="w-full sm:w-40 aspect-square bg-slate-50 rounded-2xl overflow-hidden shadow-inner">
                        <img 
                          src={item.product.image}
                          alt={item.product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </Link>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${item.productId}`}>
                            <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight group-hover:text-primary transition-colors truncate">
                              {item.product.title}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>{item.product.location}</span>
                          </div>
                        </div>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-3 hover:bg-red-50 rounded-xl transition-all text-slate-300 hover:text-red-500 active:scale-90"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      
                      {/* Price & Quantity */}
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-6 border-t border-slate-50">
                        <div>
                          <p className="text-3xl font-black text-slate-900 tracking-tighter">
                            ${item.product.price}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Local pickup
                          </p>
                        </div>
                        
                        {/* Quantity Selector */}
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                          <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="px-4 py-2 hover:bg-white hover:text-primary transition-all text-slate-400 font-bold"
                            >
                              −
                            </button>
                            <span className="px-5 py-2 font-black text-slate-900 border-x border-slate-100 bg-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="px-4 py-2 hover:bg-white hover:text-primary transition-all text-slate-400 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 text-white rounded-[40px] p-10 sticky top-28 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10"></div>
                
                <h2 className="text-xl font-black mb-8 relative z-10">
                  Order Summary
                </h2>
                
                <div className="space-y-5 mb-10 relative z-10">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-400">Subtotal ({cartItems.length} items)</span>
                    <span className="font-bold text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-400">Neighborhood Shipping</span>
                    <span className="font-bold text-white">${totalShipping.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-400">Local Tax (8.25%)</span>
                    <span className="font-bold text-white">${tax.toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-6 border-t border-white/10">
                    <div className="flex justify-between items-end">
                      <div>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Grand Total</span>
                         <p className="text-4xl font-black text-white tracking-tighter">${total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Link
                  to="/checkout"
                  className="relative z-10 block w-full text-center bg-primary hover:bg-orange-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase tracking-widest text-sm mb-4"
                >
                  Proceed to Checkout
                </Link>
                
                <Link
                  to="/search"
                  className="relative z-10 block w-full text-center text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] py-2 transition-colors"
                >
                  Continue Browsing
                </Link>
                
                <div className="mt-10 pt-8 border-t border-white/5 relative z-10">
                  <div className="flex items-start gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-300 mb-1">Neighbor Secure Checkout</p>
                      <p className="leading-relaxed opacity-60">Verified payments held in escrow until item is received.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
