-- Create conversations table to track chat threads between customers and providers
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, provider_id)
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Customers can view their conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Providers can view their conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.user_id = auth.uid()
    AND service_providers.id = conversations.provider_id
  )
);

CREATE POLICY "Customers can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for chat messages
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = chat_messages.conversation_id
    AND (
      conversations.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM service_providers
        WHERE service_providers.user_id = auth.uid()
        AND service_providers.id = conversations.provider_id
      )
    )
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = chat_messages.conversation_id
    AND (
      conversations.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM service_providers
        WHERE service_providers.user_id = auth.uid()
        AND service_providers.id = conversations.provider_id
      )
    )
  )
);

CREATE POLICY "Users can update read status of messages"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = chat_messages.conversation_id
    AND (
      conversations.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM service_providers
        WHERE service_providers.user_id = auth.uid()
        AND service_providers.id = conversations.provider_id
      )
    )
  )
);

CREATE POLICY "Admins can view all messages"
ON public.chat_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Create index for better query performance
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_provider_id ON public.conversations(provider_id);