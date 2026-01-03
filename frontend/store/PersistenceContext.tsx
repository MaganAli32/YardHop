
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, GarageSale, CommunityPost, UserProfile, Chat, Message } from '../types';
import { supabase } from '../lib/supabase';

interface PersistenceContextType {
  user: UserProfile | null;
  loading: boolean;
  authToken: string | null;
  products: Product[];
  sales: GarageSale[];
  posts: CommunityPost[];
  chats: Chat[];
  coords: { lat: number; lng: number } | null;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  addProduct: (product: Product) => void;
  addSale: (sale: GarageSale) => void;
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
  const [sales, setSales] = useState<GarageSale[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Load user profile from Supabase
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUser({
          name: data.name || 'User',
          email: data.email,
          bio: data.bio || '',
          location: data.location || '',
          avatar: data.avatar_url || '',
          role: (data.role as any) || 'Buyer',
          joinedDate: new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          verified: data.verified || false,
          preferences: {
            safeMeetOnly: data.safe_meet_only ?? true,
            notifications: data.notifications_enabled ?? true,
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

    // Initialize Supabase Auth
    const initAuth = async () => {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setAuthToken(session.access_token);
        await loadUserProfile(session.user.id);
      }

      setLoading(false);

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          setAuthToken(session.access_token);
          await loadUserProfile(session.user.id);
        } else {
          setAuthToken(null);
          setUser(null);
        }
        setLoading(false);
      });
    };

    initAuth();

    // Load saved chats from localStorage (temporary until messaging API is fully integrated)
    const savedChats = localStorage.getItem('yh_chats');
    if (savedChats) setChats(JSON.parse(savedChats));
  }, []);

  useEffect(() => {
    // Save chats to localStorage (temporary)
    if (chats.length > 0) {
      localStorage.setItem('yh_chats', JSON.stringify(chats));
    }
  }, [chats]);

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.preferences?.safeMeetOnly !== undefined) updateData.safe_meet_only = updates.preferences.safeMeetOnly;
      if (updates.preferences?.notifications !== undefined) updateData.notifications_enabled = updates.preferences.notifications;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', authUser.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const addProduct = (p: Product) => setProducts(prev => [p, ...prev]);
  const addSale = (s: GarageSale) => setSales(prev => [s, ...prev]);
  const addPost = (post: CommunityPost) => setPosts(prev => [post, ...prev]);
  const markAsSold = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAuthToken(null);
      setChats([]);
      localStorage.removeItem('yh_chats');
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
      user, loading, authToken, products, sales, posts, chats, coords,
      updateUser, addProduct, addSale, addPost, markAsSold, signOut,
      sendMessage, getOrCreateChat 
    }}>
      {children}
    </PersistenceContext.Provider>
  );
};

export const usePersistence = () => {
  const context = useContext(PersistenceContext);
  if (!context) throw new Error('usePersistence must be used within a PersistenceProvider');
  return context;
};
