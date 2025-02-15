import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "../utils/axios";
import { useSearchParams } from "react-router-dom";
import { getImageUrl } from "../utils/imageUrl";

interface ChatPreview {
  _id: string;
  product: {
    _id: string;
    title: string;
    images: { url: string }[];
  };
  otherUser: {
    _id: string;
    name: string;
    role: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
  };
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
}

export default function MyChats() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setSending] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Memoize fetch functions to avoid recreating them on each render
  const fetchChats = useCallback(async () => {
    try {
      const response = await axios.get("/chat/conversations");
      setChats(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching chats:", error);
      return [];
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const response = await axios.get(
        `/chat/product/${selectedChat.product._id}`
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [selectedChat]);

  // Combined polling function
  const pollUpdates = useCallback(async () => {
    const newChats = await fetchChats();

    // Update messages only if the chat is still selected
    if (selectedChat) {
      const currentChat = newChats.find(
        (chat: ChatPreview) => chat._id === selectedChat._id
      );
      if (currentChat) {
        await fetchMessages();
      }
    }

    // Schedule next poll
    pollTimeoutRef.current = setTimeout(pollUpdates, 3000);
  }, [fetchChats, fetchMessages, selectedChat]);

  // Handle initial load and URL parameters
  useEffect(() => {
    const loadInitialData = async () => {
      const initialChats = await fetchChats();
      setLoading(false);

      const productId = searchParams.get("productId");
      const userId = searchParams.get("userId");

      if (initialChats.length > 0 && (productId || userId)) {
        const targetChat = initialChats.find((chat: ChatPreview) => {
          if (productId && userId) {
            return (
              chat.product._id === productId && chat.otherUser._id === userId
            );
          }
          if (productId) {
            return chat.product._id === productId;
          }
          if (userId) {
            return chat.otherUser._id === userId;
          }
          return false;
        });

        if (targetChat) {
          setSelectedChat(targetChat);
        }
      }
    };

    loadInitialData();
  }, [searchParams, fetchChats]);

  // Setup and cleanup polling
  useEffect(() => {
    pollUpdates();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [pollUpdates]);

  // Improved scroll handling
  const scrollToBottom = useCallback((forceScroll = false) => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        const isScrolledNearBottom =
          chatContainer.scrollHeight -
            chatContainer.scrollTop -
            chatContainer.clientHeight <
          150;

        // Always scroll if user is near bottom, a new message is from the current user,
        // or if force scroll is requested (e.g., on chat selection)
        if (isScrolledNearBottom || forceScroll) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, []);

  // When messages change
  useEffect(() => {
    // Determine if the latest message is from the current user
    const isLatestMessageFromCurrentUser =
      messages.length > 0 &&
      messages[messages.length - 1].sender._id === user?._id;

    scrollToBottom(isLatestMessageFromCurrentUser);
  }, [messages, user, scrollToBottom]);

  // When chat is selected
  useEffect(() => {
    if (selectedChat) {
      scrollToBottom(true); // Force scroll on chat selection
    }
  }, [selectedChat, scrollToBottom]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !selectedChat) return;

    try {
      setSending(true);
      await axios.post(`/chat/product/${selectedChat.product._id}`, {
        content: newMessage.trim(),
      });
      setNewMessage("");
      // Immediately fetch updates after sending
      await Promise.all([fetchMessages(), fetchChats()]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">My Chats</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat List */}
        <div className="lg:col-span-1 bg-gray-800 rounded-lg overflow-hidden">
          <div className="space-y-2 p-4">
            {chats.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No chats found. Start a conversation from a product page!
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    selectedChat?._id === chat._id
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-600 flex-shrink-0">
                      <img
                        src={getImageUrl(chat.product.images[0]?.url)}
                        alt={chat.product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {chat.product.title}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {user?.role === "customer" ? "Vendor" : "Customer"}:{" "}
                        {chat.otherUser.name}
                      </p>
                      <p className="text-gray-400 text-sm truncate">
                        {chat.lastMessage.content}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <div className="bg-gray-800 rounded-lg h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700">
                    <img
                      src={getImageUrl(selectedChat.product.images[0]?.url)}
                      alt={selectedChat.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {selectedChat.product.title}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {user?.role === "customer" ? "Vendor" : "Customer"}:{" "}
                      {selectedChat.otherUser.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${
                      message.sender._id === user?._id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.sender._id === user?._id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-200"
                      }`}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-0" />{" "}
                {/* Add height-0 to prevent extra space */}
              </div>

              {/* Message Input */}
              <form
                onSubmit={sendMessage}
                className="p-4 border-t border-gray-700"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSending ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg h-[600px] flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <p>Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
