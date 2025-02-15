import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "../utils/axios";

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [receiverId, setReceiverId] = useState("");

  useEffect(() => {
    if (receiverId) {
      fetchMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [receiverId]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/chat/${receiverId}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !receiverId) return;

    try {
      await axios.post(`/api/chat/${receiverId}`, {
        content: newMessage,
      });
      setNewMessage("");
      fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Enter user ID to chat with"
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          className="form-input mb-4"
        />
      </div>

      {receiverId && (
        <>
          <div className="bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto mb-4">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`mb-2 p-2 rounded-lg ${
                  message.sender._id === user?.id
                    ? "bg-blue-600 ml-auto"
                    : "bg-gray-700"
                } max-w-[70%]`}
              >
                <p className="text-sm text-gray-300">{message.sender.name}</p>
                <p>{message.content}</p>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="form-input flex-1"
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!newMessage.trim()}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
