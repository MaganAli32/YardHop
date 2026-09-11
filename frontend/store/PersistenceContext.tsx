
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CommunityPost, UserProfile, Chat, Message } from '../types';
import { supabase } from '../lib/supabase';

interface PersistenceContextType {
  user: UserProfile | null;
  loading: boolean;
  authToken: string | null;
  products: Product[];
  posts: CommunityPost[];
  chats: Chat[];
  coords: { lat: number; lng: number } | null;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  addProduct: (product: Product) => void;
  addPost: (post: CommunityPost) => void;
  markAsSold: (productId: string) => void;
  signOut: () => Promise<void>;
  // Messaging Actions
  sendMessage: (chatId: string, text: string) => void;
  getOrCreateChat: (product: Product) => Chat;
}

const PersistenceContext = createContext<PersistenceContextType | undefined>(undefined);

export const PersistenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Load user profile from Supabase
  const loadUserProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const profile = data as Record<string, unknown> | null;
      if (profile) {
        setUser({
          name: (profile.name as string) || 'User',
          email: (profile.email as string) ?? '',
          bio: (profile.bio as string) || '',
          location: (profile.location as string) || '',
          avatar: (profile.avatar_url as string) || '',
          role: ((profile.role as string) as UserProfile['role']) || 'Buyer',
          joinedDate: new Date((profile.created_at as string) || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          verified: (profile.verified as boolean) || false,
          preferences: {
            safeMeetOnly: (profile.safe_meet_only as boolean) ?? true,
            notifications: (profile.notifications_enabled as boolean) ?? true,
          },
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  useEffect(() => {
    // Geolocation Support
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Set up auth state listener FIRST (before checking session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session) {
        // Set authToken immediately so ProtectedRoute knows user is authenticated
        setAuthToken(session.access_token);
        // Load user profile (this can happen async, authToken is already set)
        loadUserProfile(session.user.id).then(() => {
          setLoading(false);
        }).catch((error) => {
          console.error('Error loading user profile:', error);
          setLoading(false);
        });
      } else {
        setAuthToken(null);
        setUser(null);
        setLoading(false);
      }
    });

    // Then check for existing session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (session) {
          console.log('Existing session found:', session.user.email);
          setAuthToken(session.access_token);
          await loadUserProfile(session.user.id);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Init auth error:', err);
        setLoading(false);
      }
    };

    initAuth();

    // Load saved chats from localStorage (temporary until messaging API is fully integrated)
    // Backward compatibility: check both old and new localStorage keys
    const savedChats = localStorage.getItem('yf_chats') || localStorage.getItem('yh_chats');
    if (savedChats) {
      setChats(JSON.parse(savedChats));
      // Migrate old key to new key
      if (localStorage.getItem('yh_chats') && !localStorage.getItem('yf_chats')) {
        localStorage.setItem('yf_chats', savedChats);
        localStorage.removeItem('yh_chats');
      }
    }

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Save chats to localStorage (temporary)
    if (chats.length > 0) {
      localStorage.setItem('yf_chats', JSON.stringify(chats));
      // Remove old key if it exists
      if (localStorage.getItem('yh_chats')) {
        localStorage.removeItem('yh_chats');
      }
    }
  }, [chats]);

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!user || !supabase) return;
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.preferences?.safeMeetOnly !== undefined) updateData.safe_meet_only = updates.preferences.safeMeetOnly;
      if (updates.preferences?.notifications !== undefined) updateData.notifications_enabled = updates.preferences.notifications;

      const { error } = await supabase
        .from('profiles')
        .update(updateData as never)
        .eq('id', authUser.id);

      if (error) throw error;

      setUser((prev: UserProfile | null): UserProfile | null =>
        prev ? { ...prev, ...updates } : null
      );
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const addProduct = (p: Product) => setProducts(prev => [p, ...prev]);
  const addPost = (post: CommunityPost) => setPosts(prev => [post, ...prev]);
  const markAsSold = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  
  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setAuthToken(null);
      setChats([]);
      localStorage.removeItem('yf_chats');
      localStorage.removeItem('yh_chats'); // Also remove old key for cleanup
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getOrCreateChat = (product: Product): Chat => {
    const existing = chats.find(c => c.productId === product.id);
    if (existing) return existing;

    const newChat: Chat = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      productTitle: product.title,
      productImage: product.image,
      productPrice: product.price,
      participants: [user?.name || 'You', product.sellerName || 'Verified Neighbor'],
      messages: [],
      unread: false
    };

    setChats(prev => [newChat, ...prev]);
    return newChat;
  };

  const sendMessage = (chatId: string, text: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: 'me',
          senderName: user?.name || 'You',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: text,
          lastTimestamp: newMessage.timestamp
        };
      }
      return chat;
    }));
  };

  return (
    <PersistenceContext.Provider value={{ 
      user, loading, authToken, products, posts, chats, coords,
      updateUser, addProduct, addPost, markAsSold, signOut,
      sendMessage, getOrCreateChat 
    }}>
      {children}
    </PersistenceContext.Provider>
  );
};

export const usePersistence = () => {
  const context = useContext(PersistenceContext);
  if (!context) {
    throw new Error('usePersistence must be used within a PersistenceProvider');
  }
  return context;
};
