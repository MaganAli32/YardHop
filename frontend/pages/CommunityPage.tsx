
import React, { useState, useMemo, useEffect } from 'react';
import { usePersistence } from '../store/PersistenceContext';
import { communityApi } from '../lib/api';

const POST_TYPES = ['All', 'Free', 'Announcement', 'Event', 'Question', 'Lost & Found'];

const CommunityPage: React.FC = () => {
  const { authToken } = usePersistence();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedType, setSelectedType] = useState('All');
  const [distance, setDistance] = useState(5);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError('');
      try {
        const params: any = {};
        if (selectedType !== 'All') {
          params.type = selectedType.toLowerCase();
        }
        const data = await communityApi.list(params);
        setPosts(data || []);
      } catch (err: any) {
        console.error('Failed to fetch community posts:', err);
        setError(err.message || 'Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedType]);

  const filteredPosts = useMemo(() => {
    return posts;
  }, [posts]);

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Free': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'Event': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Lost & Found': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'Announcement': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-sans text-slate-900 dark:text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <div className="bg-white dark:bg-white/5 p-6 rounded-[24px] border border-gray-100 dark:border-white/10 shadow-sm">
                <h2 className="text-xl font-bold mb-6">Community Board</h2>
                
                {/* Distance Filter */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Distance</span>
                    <span className="text-sm font-bold text-primary">{distance} mi</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">Filter by Type</h3>
                  <div className="space-y-2">
                    {POST_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          selectedType === type 
                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Feed */}
          <div className="lg:col-span-3 lg:col-start-2 max-w-2xl mx-auto w-full">
            <div className="space-y-6">
              {filteredPosts.map(post => (
                <div key={post.id} className="bg-white dark:bg-surface-dark rounded-[24px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Post Header */}
                  <div className="p-5 flex items-start justify-between">
                    <div className="flex gap-3">
                      <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-white/10" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{post.authorName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getTypeColor(post.type)}`}>
                            {post.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          {post.timestamp} • <span className="material-symbols-outlined !text-[12px]">location_on</span> {post.distance}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="px-5 pb-3">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{post.title}</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>
                  </div>

                  {/* Post Images */}
                  {post.images && post.images.length > 0 && (
                    <div className="mt-2">
                      <img src={post.images[0]} alt="Post content" className="w-full h-64 object-cover" />
                    </div>
                  )}

                  {/* Post Footer */}
                  <div className="px-5 py-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex gap-4">
                      <button className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors text-sm font-medium group">
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">thumb_up</span>
                        {post.likes}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 z-40 flex items-center gap-2 h-14 px-6 rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-orange-600 hover:scale-105 active:scale-95">
        <span className="material-symbols-outlined !text-2xl">edit</span>
        <span className="font-bold text-sm hidden sm:inline">New Post</span>
      </button>
    </div>
  );
};

export default CommunityPage;
