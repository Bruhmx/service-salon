import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: string;
  provider_id: string;
  customer_id: string;
  service_providers: {
    business_name: string;
    profile_image_url: string | null;
  };
}

const CustomerChats = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversationId");
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
        loadMessages(conversationId);
        setupRealtimeSubscription(conversationId);
      }
    }
  }, [conversationId, conversations]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setCurrentUserId(session.user.id);
  };

  const loadConversations = async () => {
    try {
      const { data: convData, error } = await supabase
        .from("conversations")
        .select("id, provider_id, customer_id")
        .eq("customer_id", currentUserId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (convData && convData.length > 0) {
        const providerIds = convData.map(c => c.provider_id);
        const { data: providersData } = await supabase
          .from("service_providers")
          .select("id, business_name, profile_image_url")
          .in("id", providerIds);

        const providersMap = new Map(providersData?.map(p => [p.id, p]) || []);

        const enrichedConvs = convData.map(conv => ({
          ...conv,
          service_providers: providersMap.get(conv.provider_id) || {
            business_name: "Unknown Provider",
            profile_image_url: null
          }
        }));

        setConversations(enrichedConvs as Conversation[]);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
    setTimeout(scrollToBottom, 100);
  };

  const setupRealtimeSubscription = (convId: string) => {
    const channel = supabase
      .channel(`chat-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Show conversation list when no conversation selected OR on desktop */}
      {!selectedConversation && (
        <div className="container mx-auto max-w-2xl p-4 md:p-6">
          <Card className="shadow-lg border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/me")} 
                  className="hover:bg-primary/10 p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Your Chats</h2>
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {conversations.length}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground px-4">
                      No conversations yet. Visit a service provider's page to start chatting!
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        loadMessages(conv.id);
                        setupRealtimeSubscription(conv.id);
                      }}
                      className="w-full text-left p-4 rounded-xl hover:shadow-md transition-all duration-200 border bg-card border-border hover:bg-muted/50 hover:border-primary/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-primary/20">
                          <AvatarImage 
                            src={conv.service_providers.profile_image_url || undefined} 
                            alt={conv.service_providers.business_name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-lg">
                            {conv.service_providers.business_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {conv.service_providers.business_name}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Service Provider
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat View - Full screen on mobile */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Chat Header */}
          <div className="border-b bg-gradient-to-r from-card to-primary/5 p-4 flex items-center gap-3 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-md">
              <AvatarImage 
                src={selectedConversation.service_providers.profile_image_url || undefined} 
                alt={selectedConversation.service_providers.business_name}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                {selectedConversation.service_providers.business_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-bold text-lg">
                {selectedConversation.service_providers.business_name}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Active now
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-gradient-to-br from-background to-muted/20" ref={scrollRef}>
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="rounded-full bg-muted p-6 mb-3">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex animate-fade-in ${
                      msg.sender_id === currentUserId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${
                        msg.sender_id === currentUserId
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border"
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_id === currentUserId 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t bg-card p-4 shadow-lg">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full px-4 border-2 focus:border-primary transition-colors"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-full h-10 w-10 shadow-lg hover:scale-105 transition-transform"
                disabled={!newMessage.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerChats;
