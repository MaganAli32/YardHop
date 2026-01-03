
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';

const ProfilePage: React.FC = () => {
  const { user, products, markAsSold, updateUser, signOut } = usePersistence();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('My Garage');
  const [isEditing, setIsEditing] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: user.name,
    bio: user.bio,
    location: user.location
  });

  const myListings = products.filter(p => p.sellerName === "You" || p.sellerName === user.name);

  const handleSaveProfile = () => {
    updateUser(editForm);
    setIsEditing(false);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Profile Info Header */}
        <div className="bg-white dark:bg-surface-dark rounded-[48px] p-10 md:p-12 shadow-sm border border-slate-200 dark:border-white/5 mb-8 animate-fadeInUp">
           <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="relative group shrink-0">
                 <div 
                   className="size-44 rounded-[48px] bg-cover bg-center border-4 border-white dark:border-gray-800 shadow-2xl transition-transform group-hover:scale-105" 
                   style={{backgroundImage: `url("${user.avatar}")`}}
                 ></div>
              </div>
              <div className="flex-1 text-center md:text-left space-y-4">
                 <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{user.name}</h1>
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-green-200">
                       <span className="material-symbols-outlined !text-sm fill">verified</span> Verified Neighbor
                    </span>
                 </div>
                 <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-2xl font-medium italic">
                   "{user.bio}"
                 </p>
                 <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1">
                       <span className="material-symbols-outlined !text-sm">location_on</span> {user.location}
                    </span>
                    <span className="size-1 bg-slate-200 rounded-full"></span>
                    <span className="flex items-center gap-1">
                       <span className="material-symbols-outlined !text-sm">star</span> Collector Level 4
                    </span>
                 </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[24px] font-black text-sm shadow-xl hover:-translate-y-1 transition-all"
                 >
                    Edit Profile
                 </button>
                 <button 
                  onClick={handleSignOut}
                  className="px-10 py-4 bg-gray-100 dark:bg-white/5 text-slate-400 rounded-[24px] font-black text-sm hover:text-red-500 transition-all"
                 >
                    Sign Out
                 </button>
              </div>
           </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="space-y-10">
           <div className="flex items-center justify-center md:justify-start border-b border-slate-200 dark:border-white/5 pb-2">
              <div className="flex gap-12">
                 {['My Garage', 'Safety', 'Saved'].map(tab => (
                    <button 
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-4 relative ${activeTab === tab ? 'text-primary border-primary' : 'text-slate-400 border-transparent'}`}
                    >
                       {tab}
                       {tab === 'My Garage' && myListings.length > 0 && (
                        <span className="absolute -top-1 -right-4 size-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-black">
                          {myListings.length}
                        </span>
                       )}
                    </button>
                 ))}
              </div>
           </div>

           {activeTab === 'My Garage' && (
              <div className="animate-fadeIn">
                 {myListings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       {myListings.map(item => (
                          <div key={item.id} className="group bg-white dark:bg-surface-dark rounded-[40px] overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all">
                             <div className="aspect-[4/3] relative">
                                <img src={item.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute top-6 right-6 flex gap-2">
                                   <button 
                                      onClick={() => markAsSold(item.id)}
                                      className="px-4 py-2 bg-slate-900/90 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-green-600"
                                   >
                                      Mark Sold
                                   </button>
                                </div>
                             </div>
                             <div className="p-8 flex justify-between items-center">
                                <div>
                                   <h4 className="font-bold text-lg text-slate-900 dark:text-white truncate">{item.title}</h4>
                                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Neighborhood Find</p>
                                </div>
                                <span className="text-xl font-black text-primary">${item.price}</span>
                             </div>
                          </div>
                       ))}
                       <Link to="/sell-hub" className="aspect-[4/3] rounded-[40px] border-4 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group">
                          <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">add_circle</span>
                          <span className="font-black text-[10px] uppercase tracking-widest">List New Treasure</span>
                       </Link>
                    </div>
                 ) : (
                    <div className="max-w-md mx-auto py-20 text-center space-y-8 animate-fadeInUp">
                       <div className="size-32 bg-slate-100 dark:bg-white/5 rounded-[48px] flex items-center justify-center mx-auto text-slate-200">
                          <span className="material-symbols-outlined !text-6xl">garage</span>
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-2xl font-black">Your Garage is Empty</h3>
                          <p className="text-slate-500 font-medium">Turn your clutter into neighborhood cash. Start by listing your first item or hosting a full yard sale.</p>
                       </div>
                       <Link to="/sell-hub" className="inline-block px-12 py-5 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                          Start Selling Today
                       </Link>
                    </div>
                 )}
              </div>
           )}

           {activeTab === 'Safety' && (
              <div className="max-w-2xl mx-auto bg-white dark:bg-surface-dark p-10 rounded-[40px] border border-slate-200 dark:border-white/5 space-y-8 animate-fadeIn">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black">Community Trust Controls</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage how neighbors interact with you</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl">
                       <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white">Public Meetups Only</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase">Stitch suggests safe public zones for all sales</p>
                       </div>
                       <input type="checkbox" checked={user.preferences.safeMeetOnly} className="size-6 text-primary rounded-lg border-slate-200 focus:ring-primary" readOnly />
                    </div>
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl">
                       <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white">Profile Verification</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase">Your neighbor status is verified by local map data</p>
                       </div>
                       <span className="material-symbols-outlined text-green-500 fill">verified</span>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Edit Modal (Standard Logic) */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white dark:bg-surface-dark w-full max-w-xl rounded-[48px] p-12 shadow-2xl space-y-10 animate-fadeInUp">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black">Edit Identity</h3>
                 <button onClick={() => setIsEditing(false)} className="size-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Neighborhood Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl py-5 px-8 font-black text-lg" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Neighborhood Bio</label>
                    <textarea rows={3} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl py-5 px-8 font-medium text-lg leading-relaxed" />
                 </div>
              </div>
              <div className="flex gap-4 pt-6">
                 <button onClick={() => setIsEditing(false)} className="flex-1 py-5 bg-slate-100 dark:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                 <button onClick={handleSaveProfile} className="flex-1 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">Update Profile</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
