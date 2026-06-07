
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { usePersistence } from '../store/PersistenceContext';
import { productsApi, uploadApi, dashboardApi } from '../lib/api';
import { Product, GarageSale } from '../types';
import { MapPin, CheckCircle2, Shield, Settings, LogOut, Plus, Camera } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, authToken, updateUser, signOut } = usePersistence();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('My Garage');
  const [isEditing, setIsEditing] = useState(false);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [mySales, setMySales] = useState<GarageSale[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
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
          const API_BASE = import.meta.env.VITE_API_BASE || '/api';
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
          const API_BASE = import.meta.env.VITE_API_BASE || '/api';
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

        // Fetch user appraisal history
        try {
          const appraisalsRes = await dashboardApi.appraisals();
          setAppraisals(appraisalsRes.appraisals || []);
        } catch (err) {
          console.error('Failed to fetch appraisals:', err);
          setAppraisals([]);
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
    <div className="min-h-screen bg-[#F0EAE0] text-[#1A1A18] font-['Manrope'] antialiased">
      <Navbar />
      <div className="pt-28 pb-28 px-6 md:px-[56px] max-w-[1220px] mx-auto">
        <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#9E8B6F] mb-5">
          My account
        </p>

        {/* Profile Setup Prompt */}
        {needsSetup && (
          <div className="bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm px-6 py-5 mb-8 shadow-[0_8px_24px_rgba(26,26,24,0.06)]">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h3 className="font-['Cormorant_Garamond'] text-[26px] font-light text-[#1A1A18] mb-2 leading-tight">
                  Complete your profile
                </h3>
                <p className="text-[15px] text-[#6B7A6D] leading-relaxed mb-5 max-w-xl">
                  Add a photo, bio, and location so buyers and neighbors recognize you on the marketplace.
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center rounded-sm bg-[#1A2A1C] text-[#F0EAE0] px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-[#2A3E2E] transition-colors"
                >
                  Get started
                </button>
              </div>
              <div className="shrink-0">
                <div className="size-12 rounded-sm bg-[#EFE8DD] border border-[#DED3C3] flex items-center justify-center">
                  <Camera size={20} className="text-[#9E8B6F]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Info Header */}
        <div className="bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm shadow-[0_8px_24px_rgba(26,26,24,0.06)] p-8 mb-10">
           <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="relative shrink-0">
                 <div
                   className="size-32 rounded-sm bg-cover bg-center border border-[#DED3C3] shadow-[0_8px_24px_rgba(26,26,24,0.08)] bg-[#EFE8DD]"
                   style={{ backgroundImage: user.avatar ? `url("${user.avatar}")` : 'none' }}
                 >
                   {!user.avatar && (
                     <div className="w-full h-full flex items-center justify-center">
                       <Camera size={32} className="text-[#A49A8C]" />
                     </div>
                   )}
                 </div>
              </div>
              <div className="flex-1 space-y-4">
                 <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h1 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,44px)] font-light text-[#1A1A18] tracking-[-0.02em] leading-tight">
                      {user.name}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EFE8DD] text-[#3D5A40] text-[10px] font-semibold uppercase tracking-[0.14em] rounded-sm border border-[#C5D4C0]">
                       <CheckCircle2 size={12} className="text-[#3D5A40]" />
                       Verified
                    </span>
                 </div>
                 {user.bio && (
                   <p className="text-[#6B7A6D] text-[16px] leading-[1.75] max-w-2xl">
                     {user.bio}
                   </p>
                 )}
                 <div className="flex items-center gap-6 text-[10px] font-semibold text-[#9E8B6F] uppercase tracking-[0.16em]">
                 {user.location && (
                    <span className="flex items-center gap-1.5">
                       <MapPin size={14} className="text-[#B54419]" />
                       {user.location}
                    </span>
                 )}
                 </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                 <button
                   type="button"
                   onClick={() => setIsEditing(true)}
                   className="px-6 py-3 bg-[#1A2A1C] text-[#F0EAE0] rounded-sm text-[11px] font-semibold uppercase tracking-[0.1em] shadow-[0_8px_20px_rgba(26,42,28,0.15)] hover:bg-[#2A3E2E] transition-colors flex items-center justify-center gap-2"
                 >
                    <Settings size={16} />
                    Edit profile
                 </button>
                 <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-6 py-3 border border-[#DCCFBE] text-[#5F6E63] rounded-sm text-[11px] font-semibold uppercase tracking-[0.1em] bg-[#FAF7F2] hover:bg-[#EFE8DD] transition-colors flex items-center justify-center gap-2"
                 >
                    <LogOut size={16} />
                    Sign out
                 </button>
              </div>
           </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="space-y-10">
           <div className="flex items-center border-b border-[#DCCFBE] pb-0 overflow-x-auto">
              <div className="flex gap-6 md:gap-10 min-w-0">
                 {['My Garage', 'Appraisals', 'Safety', 'Saved'].map(tab => (
                    <button
                       type="button"
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors border-b-2 relative whitespace-nowrap ${
                         activeTab === tab
                           ? 'text-[#1A1A18] border-[#B54419]'
                           : 'text-[#9E8B6F] border-transparent hover:text-[#5F6E63]'
                       }`}
                    >
                       {tab}
                       {tab === 'My Garage' && totalListings > 0 && (
                        <span className="absolute -top-0.5 -right-4 min-w-[1.25rem] h-5 px-1 rounded-sm bg-[#1A2A1C] text-[#F0EAE0] text-[9px] flex items-center justify-center font-bold">
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
                       <p className="text-[#6B7A6D] text-[15px]">Loading your listings…</p>
                    </div>
                 ) : totalListings > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {/* Display Products */}
                       {activeProducts.map(item => {
                         // Handle multiple image formats from API
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
                            to={`/marketplace/${item.id}`}
                            className="group bg-[#FAF7F2] rounded-sm overflow-hidden border border-[#DCCFBE] shadow-[0_6px_20px_rgba(26,26,24,0.06)] hover:shadow-[0_10px_28px_rgba(26,26,24,0.1)] hover:-translate-y-0.5 transition-all relative"
                          >
                             <div className="aspect-[4/3] relative bg-[#EFE8DD] border-b border-[#E2D8C8]">
                                <img src={displayImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
                                <div className="absolute top-3 right-3 z-10">
                                   <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setConfirmMarkSold({ itemId: item.id, itemTitle: item.title });
                                      }}
                                      disabled={markingSold === item.id}
                                      className="px-3 py-1.5 bg-[#1A2A1C]/95 text-[#F0EAE0] text-[9px] font-semibold uppercase tracking-[0.12em] rounded-sm hover:bg-[#B54419] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                      {markingSold === item.id ? 'Updating…' : 'Mark sold'}
                                   </button>
                                </div>
                             </div>
                             <div className="p-5 flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                   <h4 className="font-['Cormorant_Garamond'] text-[22px] font-light text-[#1A1A18] leading-tight truncate mb-1">{item.title}</h4>
                                   <p className="text-[10px] font-semibold text-[#9E8B6F] uppercase tracking-[0.14em]">Listing</p>
                                </div>
                                <span className="text-[19px] font-semibold text-[#1A1A18] shrink-0">${item.price}</span>
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
                          <article
                            key={sale.id}
                            className="group bg-[#FAF7F2] rounded-sm overflow-hidden border border-[#DCCFBE] shadow-[0_6px_20px_rgba(26,26,24,0.06)]"
                          >
                             <div className="aspect-[4/3] relative bg-[#EFE8DD] border-b border-[#E2D8C8]">
                                <img src={displayImage} alt={sale.title} className="w-full h-full object-cover" />
                                <div className="absolute top-3 left-3">
                                   <span className="px-2.5 py-1 bg-[#1A2A1C] text-[#F0EAE0] text-[9px] font-semibold uppercase tracking-[0.12em] rounded-sm">
                                      Garage sale
                                   </span>
                                </div>
                             </div>
                             <div className="p-5">
                                <h4 className="font-['Cormorant_Garamond'] text-[22px] font-light text-[#1A1A18] mb-2 leading-tight">{sale.title}</h4>
                                {startDate && (
                                   <p className="text-[11px] font-medium text-[#6B7A6D] mb-1">
                                      {startDate} {startTime && `· ${startTime}`}
                                   </p>
                                )}
                                {address && (
                                   <p className="text-[12px] text-[#8D8478] truncate">{address}</p>
                                )}
                             </div>
                          </article>
                         );
                       })}
                       
                       <Link
                         to="/marketplace/new"
                         className="aspect-[4/3] min-h-[200px] rounded-sm border-2 border-dashed border-[#C9B8A0] flex flex-col items-center justify-center gap-3 text-[#9E8B6F] hover:border-[#B54419] hover:text-[#B54419] hover:bg-[#FAF7F2]/80 transition-colors group"
                       >
                          <div className="size-12 bg-[#EFE8DD] border border-[#DED3C3] rounded-sm flex items-center justify-center group-hover:bg-[#1A2A1C]/10 transition-colors">
                            <Plus size={24} className="text-[#9E8B6F] group-hover:text-[#B54419]" />
                          </div>
                          <span className="font-semibold text-[10px] uppercase tracking-[0.14em]">New listing</span>
                       </Link>
                    </div>
                 ) : (
                    <div className="max-w-md mx-auto py-16 text-center space-y-6">
                       <div className="size-24 bg-[#EFE8DD] border border-[#DED3C3] rounded-sm flex items-center justify-center mx-auto">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#A49A8C]">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                       </div>
                       <div className="space-y-2">
                          <h3 className="font-['Cormorant_Garamond'] text-[32px] font-light text-[#1A1A18]">Nothing listed yet</h3>
                          <p className="text-[#6B7A6D] text-[15px] leading-relaxed">
                            Post your first item on the marketplace when you&apos;re ready.
                          </p>
                       </div>
                       <Link
                         to="/marketplace/new"
                         className="inline-flex items-center justify-center px-8 py-3.5 bg-[#1A2A1C] text-[#F0EAE0] rounded-sm text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-[#2A3E2E] transition-colors"
                       >
                          Create listing
                       </Link>
                    </div>
                 )}
              </div>
           )}

           {activeTab === 'Safety' && (
              <div className="max-w-2xl mx-auto space-y-6">
                 <div className="bg-[#FAF7F2] p-8 rounded-sm border border-[#DCCFBE] shadow-[0_8px_24px_rgba(26,26,24,0.06)]">
                    <div className="space-y-1 mb-8">
                       <h3 className="font-['Cormorant_Garamond'] text-[28px] font-light text-[#1A1A18]">Safety &amp; privacy</h3>
                       <p className="text-[15px] text-[#6B7A6D] leading-relaxed">
                         Control how you meet buyers and what we suggest for exchanges.
                       </p>
                    </div>

                    <div className="space-y-6">
                       <div className="p-6 bg-[#F0EAE0]/60 rounded-sm border border-[#DED3C3]">
                          <div className="flex items-start justify-between gap-4">
                             <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                   <div className="shrink-0 size-10 rounded-sm bg-[#EFE8DD] border border-[#DED3C3] flex items-center justify-center">
                                      <Shield size={18} className="text-[#B54419]" />
                                   </div>
                                   <div>
                                      <h4 className="font-semibold text-[15px] text-[#1A1A18] mb-1">Public meetups only</h4>
                                      <p className="text-[14px] text-[#6B7A6D] leading-relaxed">
                                         When on, we only suggest public meeting spots—cafés, community spaces, and similar—for safer local handoffs.
                                      </p>
                                   </div>
                                </div>
                                <div className="ml-[52px] space-y-1">
                                   <p className="text-[12px] text-[#8D8478] font-medium">
                                      {safeMeetOnly
                                         ? 'Public locations only'
                                         : 'Private meetups may be suggested'}
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
                                      safeMeetOnly ? 'bg-[#1A2A1C]' : 'bg-[#C9B8A0]'
                                   } ${savingPreference ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                      <div className={`absolute top-[2px] left-[2px] bg-[#FAF7F2] rounded-full h-5 w-5 transition-transform duration-200 shadow-sm ${
                                         safeMeetOnly ? 'translate-x-5' : 'translate-x-0'
                                      }`} />
                                   </div>
                                </label>
                             </div>
                          </div>
                       </div>

                       <div className="p-6 bg-[#F0EAE0]/60 rounded-sm border border-[#DED3C3]">
                          <div className="flex items-start gap-4">
                             <div className="shrink-0 size-10 rounded-sm bg-[#E8F0E9] border border-[#C5D4C0] flex items-center justify-center">
                                <CheckCircle2 size={18} className="text-[#3D5A40]" />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-semibold text-[15px] text-[#1A1A18] mb-1">Profile verification</h4>
                                <p className="text-[14px] text-[#6B7A6D] leading-relaxed mb-4">
                                   Verified profiles help others trust who they&apos;re buying from on YardFront.
                                </p>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F2] border border-[#C5D4C0] rounded-sm">
                                   <CheckCircle2 size={14} className="text-[#3D5A40]" />
                                   <span className="text-[10px] font-semibold text-[#3D5A40] uppercase tracking-[0.12em]">Verified</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'Appraisals' && (
              <div>
                 {appraisals.length > 0 ? (
                    <div className="space-y-4">
                       {appraisals.map((a) => (
                          <div
                            key={a.id}
                            className="bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm p-5 shadow-[0_6px_20px_rgba(26,26,24,0.06)]"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div>
                                <p className="font-['Cormorant_Garamond'] text-[22px] font-light text-[#1A1A18]">{a.item_name || 'Unknown item'}</p>
                                <p className="text-[11px] text-[#9E8B6F] mt-1 uppercase tracking-[0.08em]">
                                  {new Date(a.created_at).toLocaleDateString()} · {a.item_category || 'General'} · {a.item_condition || 'Unknown'}
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-[16px] font-semibold text-[#1A1A18]">
                                  ${Math.round(a.price_low || 0)} – ${Math.round(a.price_high || 0)}
                                </p>
                                <p className="text-[12px] text-[#6B7A6D]">Confidence: {a.confidence_score || 0}%</p>
                              </div>
                            </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="max-w-md mx-auto py-16 text-center space-y-6">
                      <div className="size-24 bg-[#EFE8DD] border border-[#DED3C3] rounded-sm flex items-center justify-center mx-auto">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#A49A8C]">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-['Cormorant_Garamond'] text-[32px] font-light text-[#1A1A18]">No appraisals yet</h3>
                        <p className="text-[#6B7A6D] text-[15px] leading-relaxed">
                          Run your first appraisal from the homepage—no account required to try it.
                        </p>
                      </div>
                      <Link
                        to="/#try"
                        className="inline-flex items-center justify-center px-8 py-3.5 bg-[#1A2A1C] text-[#F0EAE0] rounded-sm text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-[#2A3E2E] transition-colors"
                      >
                        Try it
                      </Link>
                    </div>
                 )}
              </div>
           )}

           {activeTab === 'Saved' && (
              <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
                 <div className="size-24 bg-[#EFE8DD] border border-[#DED3C3] rounded-sm flex items-center justify-center mx-auto">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#A49A8C]">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                 </div>
                 <div className="space-y-2">
                    <h3 className="font-['Cormorant_Garamond'] text-[32px] font-light text-[#1A1A18]">No saved items</h3>
                    <p className="text-[#6B7A6D] text-[15px] leading-relaxed">
                      Saved listings will show here once that feature is connected to your account.
                    </p>
                 </div>
                 <Link
                   to="/marketplace"
                   className="inline-flex items-center justify-center px-8 py-3.5 bg-[#1A2A1C] text-[#F0EAE0] rounded-sm text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-[#2A3E2E] transition-colors"
                 >
                    Browse marketplace
                 </Link>
              </div>
           )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A18]/75 backdrop-blur-sm">
           <div className="bg-[#FAF7F2] w-full max-w-xl rounded-sm p-8 shadow-[0_20px_50px_rgba(26,26,24,0.2)] border border-[#DCCFBE] space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="font-['Cormorant_Garamond'] text-[30px] font-light text-[#1A1A18]">Edit profile</h3>
                 <button
                   type="button"
                   onClick={() => setIsEditing(false)}
                   className="size-8 rounded-sm hover:bg-[#EFE8DD] transition-colors flex items-center justify-center border border-transparent hover:border-[#DED3C3]"
                 >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#8D8478]">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                 </button>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <div
                    className="size-24 rounded-sm bg-cover bg-center border border-[#DED3C3] shadow-[0_6px_20px_rgba(26,26,24,0.08)]"
                    style={{ backgroundImage: `url("${editForm.avatar || user.avatar || ''}")` }}
                  >
                    {!editForm.avatar && !user.avatar && (
                      <div className="w-full h-full bg-[#EFE8DD] rounded-sm flex items-center justify-center">
                        <Camera size={32} className="text-[#A49A8C]" />
                      </div>
                    )}
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-[#FAF7F2]/90 rounded-sm flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#1A2A1C] border-t-transparent rounded-full animate-spin" />
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
                    className="inline-block px-4 py-2 border border-[#DCCFBE] text-[#1A1A18] rounded-sm text-[11px] font-semibold uppercase tracking-[0.08em] bg-[#FAF7F2] hover:bg-[#EFE8DD] transition-colors cursor-pointer"
                  >
                    {editForm.avatar || user.avatar ? 'Change photo' : 'Upload photo'}
                  </label>
                  {editForm.avatar && editForm.avatar !== user.avatar && (
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, avatar: user?.avatar || '' }))}
                      className="ml-3 text-[12px] text-[#8D8478] hover:text-[#B54419] font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                 <div className="space-y-2">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9E8B6F]">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm py-3 px-4 text-[15px] text-[#1A1A18] placeholder:text-[#A49A8C] focus:outline-none focus:border-[#1A2A1C] focus:ring-1 focus:ring-[#1A2A1C]/20"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9E8B6F]">Bio</label>
                    <textarea
                      rows={4}
                      value={editForm.bio}
                      onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm py-3 px-4 text-[15px] text-[#1A1A18] leading-relaxed placeholder:text-[#A49A8C] focus:outline-none focus:border-[#1A2A1C] focus:ring-1 focus:ring-[#1A2A1C]/20 resize-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9E8B6F]">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm py-3 px-4 text-[15px] text-[#1A1A18] placeholder:text-[#A49A8C] focus:outline-none focus:border-[#1A2A1C] focus:ring-1 focus:ring-[#1A2A1C]/20"
                    />
                 </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#DCCFBE]">
                 <button
                   type="button"
                   onClick={() => setIsEditing(false)}
                   className="flex-1 py-3 border border-[#DCCFBE] text-[#1A1A18] rounded-sm text-[11px] font-semibold uppercase tracking-[0.08em] bg-[#FAF7F2] hover:bg-[#EFE8DD] transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   type="button"
                   onClick={handleSaveProfile}
                   disabled={uploadingAvatar}
                   className="flex-1 py-3 bg-[#1A2A1C] hover:bg-[#2A3E2E] disabled:bg-[#C9B8A0] disabled:cursor-not-allowed text-[#F0EAE0] rounded-sm text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors"
                 >
                   {uploadingAvatar ? 'Uploading…' : 'Save'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Mark Sold Confirmation Modal */}
      {confirmMarkSold && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A18]/75 backdrop-blur-sm">
          <div className="bg-[#FAF7F2] w-full max-w-md rounded-sm p-6 shadow-[0_20px_50px_rgba(26,26,24,0.2)] border border-[#DCCFBE]">
            <h3 className="font-['Cormorant_Garamond'] text-[26px] font-light text-[#1A1A18] mb-2">Mark as sold?</h3>
            <p className="text-[14px] text-[#6B7A6D] mb-6 leading-relaxed">
              This removes <span className="font-semibold text-[#1A1A18]">&ldquo;{confirmMarkSold.itemTitle}&rdquo;</span> from your active listings.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmMarkSold(null)}
                disabled={markingSold === confirmMarkSold.itemId}
                className="flex-1 py-2.5 border border-[#DCCFBE] text-[#1A1A18] rounded-sm text-[11px] font-semibold uppercase tracking-[0.08em] bg-[#FAF7F2] hover:bg-[#EFE8DD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkSold}
                disabled={markingSold === confirmMarkSold.itemId}
                className="flex-1 py-2.5 bg-[#1A2A1C] hover:bg-[#2A3E2E] disabled:bg-[#C9B8A0] disabled:cursor-not-allowed text-[#F0EAE0] rounded-sm text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors"
              >
                {markingSold === confirmMarkSold.itemId ? 'Updating…' : 'Mark sold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

