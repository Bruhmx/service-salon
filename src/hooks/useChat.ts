import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'customer' | 'provider';
  message: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  provider_id: string;
  customer_name: string;
  provider_name: string;
  last_message: string;
  last_message_at: string;
}

export const useChat = (providerId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch conversations for the current user
  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async (conversationId: string, message: string, senderType: 'customer' | 'provider') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: user.id,
            sender_type: senderType,
            message: message,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Start a new conversation
  const startConversation = async (customerId: string, customerName: string, providerId: string, providerName: string, initialMessage: string) => {
    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([
          {
            customer_id: customerId,
            provider_id: providerId,
            customer_name: customerName,
            provider_name: providerName,
            last_message: initialMessage,
          }
        ])
        .select()
        .single();

      if (convError) throw convError;

      // Send initial message
      await sendMessage(conversation.id, initialMessage, 'customer');

      return conversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  };

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Check if this message belongs to a conversation the user is part of
          const isRelevant = conversations.some(conv => conv.id === newMessage.conversation_id);
          if (isRelevant) {
            setMessages(prev => [...prev, newMessage]);
            
            // Update conversations list with new last message
            setConversations(prev => 
              prev.map(conv => 
                conv.id === newMessage.conversation_id 
                  ? { ...conv, last_message: newMessage.message, last_message_at: newMessage.created_at }
                  : conv
              ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, conversations]);

  return {
    conversations,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startConversation,
  };
};
