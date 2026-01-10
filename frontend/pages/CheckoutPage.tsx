
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { cartApi, ordersApi } from '../lib/api';

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

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { authToken } = usePersistence();
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchCart = async () => {
      if (!authToken) {
        navigate('/login');
        return;
      }

      setLoading(true);
      try {
        const data = await cartApi.list(authToken);
        setCartItems(data || []);
        if (!data || data.length === 0) {
          navigate('/cart');
        }
      } catch (err: any) {
        console.error('Failed to fetch cart:', err);
        setError(err.message || 'Failed to load cart');
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [authToken, navigate]);

  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    billingAddressSame: true
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const total = subtotal;

  const handlePlaceOrder = async () => {
    if (!authToken) {
      navigate('/login');
      return;
    }

    try {
      const totalAmount = total;
      const meetupLocation = `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}`;
      const meetupTime = new Date().toISOString(); // In real app, user would select a time
      const notes = `Shipping to: ${shippingInfo.fullName}, ${shippingInfo.phone}`;

      await ordersApi.create({
        items: cartItems,
        totalAmount,
        meetupLocation,
        meetupTime,
        notes,
      }, authToken);

      setOrderPlaced(true);
      setTimeout(() => {
        navigate('/orders');
      }, 3000);
    } catch (err: any) {
      console.error('Failed to place order:', err);
      setError(err.message || 'Failed to place order');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">Loading checkout...</div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-[48px] border border-slate-200 p-12 text-center shadow-2xl animate-fadeIn">
          <div className="size-24 bg-green-100 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-100/50">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
            Order Confirmed!
          </h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed">
            Your neighborhood treasure is on its way. You'll receive a local pickup or shipping confirmation shortly.
          </p>
          <div className="flex flex-col items-center gap-4">
             <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Redirecting to Profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link to="/cart" className="size-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
               <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Checkout
            </h1>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-4 flex-1 max-w-lg md:ml-12">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                step === 'shipping' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-green-500 text-white'
              }`}>
                {step === 'shipping' ? '1' : '✓'}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                step === 'shipping' ? 'text-slate-900' : 'text-slate-400'
              }`}>
                Shipping
              </span>
            </div>
            
            <div className="flex-1 h-0.5 bg-slate-100 rounded-full"></div>
            
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                step === 'payment' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 
                step === 'review' ? 'bg-green-500 text-white' : 
                'bg-slate-200 text-slate-400'
              }`}>
                {step === 'review' ? '✓' : '2'}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                step === 'payment' ? 'text-slate-900' : 'text-slate-400'
              }`}>
                Payment
              </span>
            </div>
            
            <div className="flex-1 h-0.5 bg-slate-100 rounded-full"></div>
            
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                step === 'review' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-slate-200 text-slate-400'
              }`}>
                3
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                step === 'review' ? 'text-slate-900' : 'text-slate-400'
              }`}>
                Review
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-8">
            
            {/* STEP 1: SHIPPING INFO */}
            {step === 'shipping' && (
              <div className="bg-white rounded-[40px] border border-slate-200 p-10 md:p-12 shadow-sm animate-fadeIn">
                <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">
                  Shipping Destination
                </h2>
                
                <form className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Neighbor Name</label>
                    <input 
                      type="text"
                      value={shippingInfo.fullName}
                      onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                      placeholder="e.g. John Miller"
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                      <input 
                        type="email"
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                        placeholder="neighbor@email.com"
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</label>
                      <input 
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                        placeholder="(555) 000-0000"
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Street Address</label>
                    <input 
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      placeholder="123 Local Lane, Apt 4"
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City</label>
                      <input 
                        type="text"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        placeholder="Austin"
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">State</label>
                      <input 
                        type="text"
                        value={shippingInfo.state}
                        onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                        placeholder="TX"
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ZIP</label>
                      <input 
                        type="text"
                        value={shippingInfo.zipCode}
                        onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                        placeholder="78704"
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setStep('payment')}
                    className="w-full bg-primary hover:bg-orange-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase tracking-widest text-sm mt-4"
                  >
                    Proceed to Payment
                  </button>
                </form>
              </div>
            )}
            
            {/* STEP 2: PAYMENT INFO */}
            {step === 'payment' && (
              <div className="bg-white rounded-[40px] border border-slate-200 p-10 md:p-12 shadow-sm animate-fadeIn">
                <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">
                  Payment Method
                </h2>
                
                <form className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card Number</label>
                    <div className="relative">
                       <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">credit_card</span>
                       <input 
                         type="text"
                         value={paymentInfo.cardNumber}
                         onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                         placeholder="0000 0000 0000 0000"
                         maxLength={19}
                         className="w-full px-16 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                       />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cardholder Name</label>
                    <input 
                      type="text"
                      value={paymentInfo.cardName}
                      onChange={(e) => setPaymentInfo({...paymentInfo, cardName: e.target.value})}
                      placeholder="Name on Card"
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiry</label>
                      <input 
                        type="text"
                        value={paymentInfo.expiryDate}
                        onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CVV</label>
                      <input 
                        type="text"
                        value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-50">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={paymentInfo.billingAddressSame}
                        onChange={(e) => setPaymentInfo({...paymentInfo, billingAddressSame: e.target.checked})}
                        className="size-5 rounded-lg border-slate-200 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-slate-500 group-hover:text-slate-900 transition-colors">
                        Billing address same as shipping
                      </span>
                    </label>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep('shipping')}
                      className="flex-1 py-5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('review')}
                      className="flex-[2] bg-primary hover:bg-orange-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase tracking-widest text-sm"
                    >
                      Review Order
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* STEP 3: REVIEW ORDER */}
            {step === 'review' && (
              <div className="space-y-8 animate-fadeIn">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Summary Cards */}
                   <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Shipping To</h3>
                        <button onClick={() => setStep('shipping')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Change</button>
                      </div>
                      <div className="text-sm font-bold text-slate-700 space-y-1">
                        <p className="text-slate-900">{shippingInfo.fullName || 'John Miller'}</p>
                        <p className="opacity-60 font-medium">{shippingInfo.address || '123 Local Lane, Apt 4'}</p>
                        <p className="opacity-60 font-medium">{shippingInfo.city || 'Austin'}, {shippingInfo.state || 'TX'} {shippingInfo.zipCode || '78704'}</p>
                      </div>
                   </div>

                   <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Info</h3>
                        <button onClick={() => setStep('payment')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Edit</button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                           <span className="material-symbols-outlined !text-xl">credit_card</span>
                        </div>
                        <div className="text-sm font-bold">
                          <p className="text-slate-900">Ending in {paymentInfo.cardNumber.slice(-4) || '0000'}</p>
                          <p className="text-slate-400 text-[10px] uppercase tracking-widest">Expires {paymentInfo.expiryDate || '00/00'}</p>
                        </div>
                      </div>
                   </div>
                </div>
                
                {/* Items Review */}
                <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 mb-8 tracking-tight">
                    Review Treasures
                  </h3>
                  <div className="space-y-6">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-6 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="size-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                          <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 line-clamp-1">{item.product.title}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">${item.product.price}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Free Local Drop</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('payment')}
                    className="flex-1 py-5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                  >
                    Back to Payment
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    className="flex-[2] bg-primary hover:bg-orange-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase tracking-widest text-sm"
                  >
                    Confirm & Buy Treasures
                  </button>
                </div>
              </div>
            )}
            
          </div>
          
          {/* Order Summary Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 text-white rounded-[40px] p-10 sticky top-28 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-primary rounded-full blur-[80px] opacity-10"></div>
               
               <h2 className="text-xl font-black mb-8 relative z-10 tracking-tight">
                 Order Summary
               </h2>
               
               <div className="space-y-4 mb-10 relative z-10">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-medium">Subtotal</span>
                   <span className="font-black text-white">${subtotal.toFixed(2)}</span>
                 </div>
                 
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-medium">Neighborhood Fee</span>
                   <span className="font-black text-white">${totalShipping.toFixed(2)}</span>
                 </div>
                 
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-medium">Local Tax (8.25%)</span>
                   <span className="font-black text-white">${tax.toFixed(2)}</span>
                 </div>
                 
                 <div className="pt-6 mt-2 border-t border-white/10 flex justify-between items-end">
                   <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Total Pay</span>
                      <p className="text-4xl font-black text-white tracking-tighter">${total.toFixed(2)}</p>
                   </div>
                 </div>
               </div>
               
               <div className="pt-8 border-t border-white/5 space-y-6 relative z-10">
                 <div className="flex items-start gap-4">
                   <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-primary shrink-0">
                     <span className="material-symbols-outlined !text-lg">verified_user</span>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Neighbor Trust</p>
                      <p className="text-[10px] leading-relaxed text-slate-500 font-medium mt-1">Encrypted local checkout powered by YardFront Escrow.</p>
                   </div>
                 </div>
                 
                 <div className="flex items-start gap-4">
                   <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-primary shrink-0">
                     <span className="material-symbols-outlined !text-lg">local_shipping</span>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Fast Hand-off</p>
                      <p className="text-[10px] leading-relaxed text-slate-500 font-medium mt-1">Expected pickup availability within 24-48 hours.</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
