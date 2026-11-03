import { Text, View } from "react-native";

type ChatBubbleProps = {
  message?: string;
  role?: "user" | "assistant";
};

const ChatBubble = ({ message, role }: ChatBubbleProps) => {
  const isUser = role === "user";

  return (
    <View
      className={`w-full flex-row ${
        isUser ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-blue-600 rounded-br-sm" : "bg-gray-300 rounded-bl-sm"
        }`}
      >
        <Text
          className={`text-base leading-6 ${
            isUser ? "text-white" : "text-gray-900"
          }`}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

export default ChatBubble;
