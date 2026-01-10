
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { productsApi, salesApi, uploadApi } from '../lib/api';
import { Product, GarageSale } from '../types';
import { MapPin, CheckCircle2, Shield, Settings, LogOut, Plus, Camera } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, authToken, updateUser, signOut } = usePersistence();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('My Garage');
  const [isEditing, setIsEditing] = useState(false);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [mySales, setMySales] = useState<GarageSale[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    avatar: user?.avatar || ''
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [safeMeetOnly, setSafeMeetOnly] = useState(user?.preferences?.safeMeetOnly ?? true);
  const [savingPreference, setSavingPreference] = useState(false);
  const [confirmMarkSold, setConfirmMarkSold] = useState<{ itemId: string; itemTitle: string } | null>(null);
  const [markingSold, setMarkingSold] = useState<string | null>(null);

  // Check if profile needs setup
  const needsSetup = user && (!user.bio || !user.location || !user.avatar);

  // Fetch user's listings from API
  useEffect(() => {
    const fetchMyListings = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get user ID from Supabase session
        const { supabase } = await import('../lib/supabase');
        if (!supabase) {
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setLoading(false);
          return;
        }

        const userId = session.user.id;
        
        // Fetch user's products using the user-specific endpoint (only active/reserved items)
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
          const productsResponse = await fetch(`${API_BASE}/products/user/${userId}?status=active`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (productsResponse.ok) {
            const products = await productsResponse.json();
            // Filter to only show active and reserved items
            const activeProducts = Array.isArray(products) 
              ? products.filter((p: Product) => p.status === 'active' || p.status === 'reserved')
              : [];
            setMyProducts(activeProducts);
          } else {
            setMyProducts([]);
          }
        } catch (err) {
          console.error('Failed to fetch products:', err);
          setMyProducts([]);
        }

        // Fetch user's garage sales using the user-specific endpoint
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
          const salesResponse = await fetch(`${API_BASE}/sales/user/${userId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (salesResponse.ok) {
            const sales = await salesResponse.json();
            // Filter out cancelled sales
            const activeSales = Array.isArray(sales) 
              ? sales.filter((s: GarageSale) => (s as any).status !== 'cancelled')
              : [];
            setMySales(activeSales);
          } else {
            setMySales([]);
          }
        } catch (err) {
          console.error('Failed to fetch sales:', err);
          setMySales([]);
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [authToken]);

  // Filter out sold and deleted items from "My Garage" view
  const activeProducts = myProducts.filter(item => item.status === 'active' || item.status === 'reserved');
  
  // Filter out cancelled garage sales
  const activeSales = mySales.filter(sale => sale.status !== 'cancelled');
  
  // Combine both for total count
  const totalListings = activeProducts.length + activeSales.length;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await uploadApi.uploadAvatar(file);
      setEditForm(prev => ({ ...prev, avatar: result.url }));
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    await updateUser(editForm);
    setIsEditing(false);
  };

  // Initialize edit form when user changes
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        avatar: user.avatar || ''
      });
      setSafeMeetOnly(user.preferences?.safeMeetOnly ?? true);
    }
  }, [user]);

  // Update edit form when editing starts
  useEffect(() => {
    if (isEditing && user) {
      setEditForm({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        avatar: user.avatar || ''
      });
    }
  }, [isEditing, user]);

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const handleToggleSafeMeetOnly = async (checked: boolean) => {
    const previousValue = safeMeetOnly;
    setSafeMeetOnly(checked);
    setSavingPreference(true);
    try {
      await updateUser({
        preferences: {
          safeMeetOnly: checked,
          notifications: user?.preferences?.notifications ?? true
        }
      });
    } catch (error) {
      console.error('Failed to update preference:', error);
      // Revert on error
      setSafeMeetOnly(previousValue);
      alert('Failed to update preference. Please try again.');
    } finally {
      setSavingPreference(false);
    }
  };

  const handleConfirmMarkSold = async () => {
    if (!confirmMarkSold) return;
    
    setMarkingSold(confirmMarkSold.itemId);
    try {
      await productsApi.update(confirmMarkSold.itemId, { status: 'sold' });
      // Remove from local state
      setMyProducts(prev => prev.filter(p => p.id !== confirmMarkSold.itemId));
      // Close confirmation dialog
      setConfirmMarkSold(null);
    } catch (err) {
      console.error('Failed to mark as sold:', err);
      alert('Failed to mark item as sold. Please try again.');
    } finally {
      setMarkingSold(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#121c32] font-sans">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 py-8 pb-20">
        
        {/* Profile Setup Prompt */}
        {needsSetup && (
          <div className="bg-white border border-slate-200 rounded-lg px-6 py-5 mb-6 shadow-[0_10px_28px_rgba(18,28,50,0.06)]">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h3 className="font-semibold text-base text-[#121c32] mb-2">Complete Your Profile</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">Add a photo, bio, and location to help neighbors get to know you.</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 bg-[#FF6B35] hover:bg-[#e85c2e] text-white rounded-md font-semibold text-sm transition-colors"
                >
                  Get Started
                </button>
              </div>
              <div className="shrink-0">
                <div className="size-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Camera size={20} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Info Header */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-[0_10px_28px_rgba(18,28,50,0.06)] p-8 mb-8">
           <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="relative shrink-0">
                 <div 
                   className="size-32 rounded-lg bg-cover bg-center border border-slate-200 shadow-[0_8px_24px_rgba(18,28,50,0.08)] bg-slate-100" 
                   style={{backgroundImage: user.avatar ? `url("${user.avatar}")` : 'none'}}
                 >
                   {!user.avatar && (
                     <div className="w-full h-full flex items-center justify-center">
                       <Camera size={32} className="text-slate-300" />
                     </div>
                   )}
                 </div>
              </div>
              <div className="flex-1 space-y-4">
                 <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h1 className="text-3xl font-bold text-[#121c32] tracking-tight">{user.name}</h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-200">
                       <CheckCircle2 size={12} className="text-emerald-600 fill-emerald-600" />
                       Verified Neighbor
                    </span>
                 </div>
                 {user.bio && (
                   <p className="text-slate-600 text-base leading-relaxed max-w-2xl">
                     {user.bio}
                   </p>
                 )}
                 <div className="flex items-center gap-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                 {user.location && (
                    <span className="flex items-center gap-1.5">
                       <MapPin size={14} className="text-[#FF6B35]" />
                       {user.location}
                    </span>
                 )}
                 </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="px-6 py-3 bg-[#121c32] text-white rounded-md font-semibold text-sm shadow-[0_10px_28px_rgba(18,28,50,0.06)] hover:bg-[#0f1728] transition-colors flex items-center justify-center gap-2"
                 >
                    <Settings size={16} />
                    Edit Profile
                 </button>
                 <button 
                  onClick={handleSignOut}
                  className="px-6 py-3 border border-slate-200 text-slate-600 rounded-md font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                 >
                    <LogOut size={16} />
                    Sign Out
                 </button>
              </div>
           </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="space-y-8">
           <div className="flex items-center border-b border-slate-200 pb-2">
              <div className="flex gap-8">
                 {['My Garage', 'Safety', 'Saved'].map(tab => (
                    <button 
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 relative ${activeTab === tab ? 'text-[#121c32] border-[#FF6B35]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                    >
                       {tab}
                       {tab === 'My Garage' && totalListings > 0 && (
                        <span className="absolute -top-1 -right-5 size-5 rounded-md bg-[#FF6B35] text-white text-[9px] flex items-center justify-center font-bold">
                          {totalListings}
                        </span>
                       )}
                    </button>
                 ))}
              </div>
           </div>

           {activeTab === 'My Garage' && (
              <div>
                 {loading ? (
                    <div className="text-center py-16">
                       <p className="text-slate-500 font-medium">Loading your listings...</p>
                    </div>
                 ) : totalListings > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {/* Display Products */}
                       {activeProducts.map(item => {
                         // Handle multiple image formats - use same logic as ProductCard
                         const getImageUrl = (): string => {
                           // If there's a direct image property (string)
                           if (typeof item.image === 'string' && item.image.trim() !== '') {
                             return item.image;
                           }
                           
                           // If images is an array
                           if (Array.isArray(item.images) && item.images.length > 0) {
                             const firstImage = item.images[0];
                             
                             // If it's an array of strings
                             if (typeof firstImage === 'string') {
                               return firstImage;
                             }
                             
                             // If it's an array of objects with url property
                             if (firstImage && typeof firstImage === 'object') {
                               // Try to find primary image first
                               const primaryImage = item.images.find((img: any) => img.is_primary);
                               if (primaryImage?.url) {
                                 return primaryImage.url;
                               }
                               // Otherwise use first image's url
                               return (firstImage as any).url || '';
                             }
                           }
                           
                           return '';
                         };
                         
                         const displayImage = getImageUrl() || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop';
                         
                         return (
                          <Link 
                            key={item.id} 
                            to={`/product/${item.id}`}
                            className="group bg-white rounded-lg overflow-hidden border border-slate-200 shadow-[0_8px_24px_rgba(18,28,50,0.08)] hover:shadow-[0_12px_32px_rgba(18,28,50,0.12)] transition-shadow relative"
                          >
                             <div className="aspect-[4/3] relative bg-slate-100">
                                <img src={displayImage} alt={item.title} className="w-full h-full object-cover" />
                                <div className="absolute top-3 right-3 z-10">
                                   <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setConfirmMarkSold({ itemId: item.id, itemTitle: item.title });
                                      }}
                                      disabled={markingSold === item.id}
                                      className="px-3 py-1.5 bg-[#121c32]/90 text-white text-[10px] font-semibold uppercase tracking-wider rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                      {markingSold === item.id ? 'Updating...' : 'Mark Sold'}
                                   </button>
                                </div>
                             </div>
                             <div className="p-5 flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                   <h4 className="font-bold text-base text-[#121c32] truncate mb-1">{item.title}</h4>
                                   <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Neighborhood Find</p>
                                </div>
                                <span className="text-xl font-extrabold text-[#121c32] ml-4">${item.price}</span>
                             </div>
                          </Link>
                         );
                       })}
                       
                       {/* Display Garage Sales */}
                       {activeSales.map(sale => {
                         // Extract image using the same logic as other pages
                         const getSaleImage = (): string => {
                           // If there's already an image field with a value
                           if (sale.image && typeof sale.image === 'string' && sale.image.trim() !== '') {
                             return sale.image;
                           }
                           
                           // If images is an array, extract from it
                           if (Array.isArray((sale as any).images) && (sale as any).images.length > 0) {
                             // Sort by is_primary first, then by order_index
                             const sorted = [...(sale as any).images].sort((a: any, b: any) => {
                               if (a?.is_primary && !b?.is_primary) return -1;
                               if (!a?.is_primary && b?.is_primary) return 1;
                               return (a?.order_index || 0) - (b?.order_index || 0);
                             });
                             
                             const first = sorted[0];
                             
                             // If it's a string
                             if (typeof first === 'string' && first.trim() !== '') {
                               return first;
                             }
                             
                             // If it's an object with url property
                             if (first && typeof first === 'object' && first.url) {
                               return first.url;
                             }
                           }
                           
                           // Check for image_url property
                           if ((sale as any).image_url && typeof (sale as any).image_url === 'string') {
                             return (sale as any).image_url;
                           }
                           
                           return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop';
                         };
                         
                         const displayImage = getSaleImage();
                         
                         // Format date and time
                         const formatDate = (dateStr: string) => {
                           if (!dateStr) return '';
                           const date = new Date(dateStr);
                           return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                         };
                         
                         const formatTime = (timeStr: string) => {
                           if (!timeStr) return '';
                           return timeStr.slice(0, 5); // HH:MM format
                         };
                         
                         const startDate = (sale as any).start_date ? formatDate((sale as any).start_date) : sale.date || '';
                         const startTime = (sale as any).start_time ? formatTime((sale as any).start_time) : sale.time || '';
                         const address = (sale as any).address || sale.display_text || '';
                         
                         return (
                          <Link key={sale.id} to={`/sales/${sale.id}`} className="group bg-white rounded-lg overflow-hidden border border-slate-200 shadow-[0_8px_24px_rgba(18,28,50,0.08)] hover:shadow-[0_12px_32px_rgba(18,28,50,0.12)] transition-shadow">
                             <div className="aspect-[4/3] relative bg-slate-100">
                                <img src={displayImage} alt={sale.title} className="w-full h-full object-cover" />
                                <div className="absolute top-3 left-3">
                                   <span className="px-2.5 py-1 bg-[#FF6B35] text-white text-[10px] font-semibold uppercase tracking-wider rounded-md">
                                      Garage Sale
                                   </span>
                                </div>
                             </div>
                             <div className="p-5">
                                <h4 className="font-bold text-base text-[#121c32] mb-2">{sale.title}</h4>
                                {startDate && (
                                   <p className="text-xs font-semibold text-slate-600 mb-1">
                                      {startDate} {startTime && `• ${startTime}`}
                                   </p>
                                )}
                                {address && (
                                   <p className="text-xs text-slate-500 truncate">{address}</p>
                                )}
                             </div>
                          </Link>
                         );
                       })}
                       
                       <Link to="/sell-hub" className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-slate-50 transition-colors group">
                          <div className="size-12 bg-slate-100 rounded-md flex items-center justify-center group-hover:bg-[#FF6B35]/10 transition-colors">
                            <Plus size={24} className="text-slate-400 group-hover:text-[#FF6B35]" />
                          </div>
                          <span className="font-semibold text-xs uppercase tracking-wider">List New Item</span>
                       </Link>
                    </div>
                 ) : (
                    <div className="max-w-md mx-auto py-16 text-center space-y-6">
                       <div className="size-24 bg-slate-100 rounded-lg flex items-center justify-center mx-auto">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-2xl font-bold text-[#121c32]">Your Garage is Empty</h3>
                          <p className="text-slate-600 text-sm leading-relaxed">Turn your clutter into neighborhood cash. Start by listing your first item or hosting a full yard sale.</p>
                       </div>
                       <Link to="/sell-hub" className="inline-block px-8 py-3.5 bg-[#FF6B35] hover:bg-[#e85c2e] text-white rounded-md font-semibold text-sm shadow-[0_10px_22px_rgba(255,107,53,0.22)] transition-colors">
                          Start Selling Today
                       </Link>
                    </div>
                 )}
              </div>
           )}

           {activeTab === 'Safety' && (
              <div className="max-w-2xl mx-auto space-y-6">
                 <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-[0_10px_28px_rgba(18,28,50,0.06)]">
                    <div className="space-y-1 mb-6">
                       <h3 className="text-xl font-bold text-[#121c32]">Safety & Privacy</h3>
                       <p className="text-sm text-slate-600">Control how you interact with neighbors and manage your safety preferences</p>
                    </div>
                    
                    <div className="space-y-6">
                       {/* Public Meetups Only Toggle */}
                       <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-start justify-between gap-4">
                             <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                   <div className="shrink-0 size-10 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center">
                                      <Shield size={18} className="text-[#FF6B35]" />
                                   </div>
                                   <div>
                                      <h4 className="font-semibold text-base text-[#121c32] mb-1">Public Meetups Only</h4>
                                      <p className="text-sm text-slate-600 leading-relaxed">
                                         When enabled, YardFront will only suggest public meeting locations (coffee shops, community centers, police stations) for item exchanges. This helps ensure safer transactions with neighbors.
                                      </p>
                                   </div>
                                </div>
                                <div className="ml-12 space-y-1">
                                   <p className="text-xs text-slate-500 font-medium">
                                      {safeMeetOnly 
                                         ? "Currently suggesting public locations only" 
                                         : "You may receive suggestions for private meetups"}
                                   </p>
                                </div>
                             </div>
                             <div className="relative shrink-0">
                                <label className="relative inline-flex items-center cursor-pointer">
                                   <input
                                      type="checkbox"
                                      checked={safeMeetOnly}
                                      onChange={(e) => handleToggleSafeMeetOnly(e.target.checked)}
                                      disabled={savingPreference}
                                      className="sr-only peer"
                                   />
                                   <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                                      safeMeetOnly ? 'bg-[#FF6B35]' : 'bg-slate-300'
                                   } ${savingPreference ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                      <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ${
                                         safeMeetOnly ? 'translate-x-5' : 'translate-x-0'
                                      }`}></div>
                                   </div>
                                </label>
                             </div>
                          </div>
                       </div>

                       {/* Profile Verification Info */}
                       <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-start gap-4">
                             <div className="shrink-0 size-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                <CheckCircle2 size={18} className="text-emerald-600 fill-emerald-600" />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-semibold text-base text-[#121c32] mb-1">Profile Verification</h4>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                   Your neighbor status is verified using local map data and community participation. Verified profiles help build trust in the YardFront community.
                                </p>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-200 rounded-md">
                                   <CheckCircle2 size={14} className="text-emerald-600 fill-emerald-600" />
                                   <span className="text-xs font-semibold text-emerald-700">Verified Neighbor</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'Saved' && (
              <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
                 <div className="size-24 bg-slate-100 rounded-lg flex items-center justify-center mx-auto">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-[#121c32]">No Saved Items</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Items you favorite will appear here for easy access.</p>
                 </div>
                 <Link to="/search" className="inline-block px-8 py-3.5 bg-[#FF6B35] hover:bg-[#e85c2e] text-white rounded-md font-semibold text-sm shadow-[0_10px_22px_rgba(255,107,53,0.22)] transition-colors">
                    Browse Marketplace
                 </Link>
              </div>
           )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#121c32]/80 backdrop-blur-sm">
           <div className="bg-white w-full max-w-xl rounded-lg p-8 shadow-[0_14px_40px_rgba(18,28,50,0.25)] border border-slate-200 space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-bold text-[#121c32]">Edit Profile</h3>
                 <button 
                   onClick={() => setIsEditing(false)} 
                   className="size-8 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center"
                 >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                 </button>
              </div>
              
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <div 
                    className="size-24 rounded-lg bg-cover bg-center border border-slate-200 shadow-[0_8px_24px_rgba(18,28,50,0.08)]"
                    style={{backgroundImage: `url("${editForm.avatar || user.avatar || ''}")`}}
                  >
                    {!editForm.avatar && !user.avatar && (
                      <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center">
                        <Camera size={32} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-block px-4 py-2 border border-slate-200 text-[#121c32] rounded-md font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {editForm.avatar || user.avatar ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {editForm.avatar && editForm.avatar !== user.avatar && (
                    <button
                      onClick={() => setEditForm(prev => ({ ...prev, avatar: user?.avatar || '' }))}
                      className="ml-3 text-xs text-slate-500 hover:text-red-500 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                 <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</label>
                    <input 
                      type="text" 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-md py-3 px-4 font-medium text-base focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bio</label>
                    <textarea 
                      rows={4} 
                      value={editForm.bio} 
                      onChange={e => setEditForm({...editForm, bio: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-md py-3 px-4 font-medium text-base leading-relaxed focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] resize-none" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Location</label>
                    <input 
                      type="text" 
                      value={editForm.location} 
                      onChange={e => setEditForm({...editForm, location: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-md py-3 px-4 font-medium text-base focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]" 
                    />
                 </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                 <button 
                   onClick={() => setIsEditing(false)} 
                   className="flex-1 py-3 border border-slate-200 text-[#121c32] rounded-md font-semibold text-sm hover:bg-slate-50 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleSaveProfile}
                   disabled={uploadingAvatar}
                   className="flex-1 py-3 bg-[#FF6B35] hover:bg-[#e85c2e] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md font-semibold text-sm shadow-[0_10px_22px_rgba(255,107,53,0.22)] transition-colors"
                 >
                   {uploadingAvatar ? 'Uploading...' : 'Update Profile'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Mark Sold Confirmation Modal */}
      {confirmMarkSold && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#121c32]/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-lg p-6 shadow-[0_14px_40px_rgba(18,28,50,0.25)] border border-slate-200">
            <h3 className="text-xl font-bold text-[#121c32] mb-2">Mark Item as Sold?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to mark <span className="font-semibold text-[#121c32]">"{confirmMarkSold.itemTitle}"</span> as sold? This will remove it from your active listings.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmMarkSold(null)}
                disabled={markingSold === confirmMarkSold.itemId}
                className="flex-1 py-2.5 border border-slate-200 text-[#121c32] rounded-md font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmMarkSold}
                disabled={markingSold === confirmMarkSold.itemId}
                className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-[#e85c2e] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md font-semibold text-sm transition-colors"
              >
                {markingSold === confirmMarkSold.itemId ? 'Marking...' : 'Mark as Sold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

