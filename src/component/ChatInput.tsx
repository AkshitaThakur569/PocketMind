import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type ChatInputProps = {
  onSend?: (message: string) => void;
  disabled?: boolean;
};

const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) return;

    onSend?.(trimmedMessage);
    setMessage("");
  };

  return (
    <View className="flex-row items-end gap-2 rounded-3xl border border-gray-200 bg-white p-2">
      <TextInput
        className="max-h-28 min-h-12 flex-1 px-3 py-3 text-base text-gray-900"
        placeholder="Message PocketMind..."
        placeholderTextColor="#9CA3AF"
        value={message}
        onChangeText={setMessage}
        multiline
        editable={!disabled}
      />

      <Pressable
        onPress={handleSend}
        disabled={!message.trim() || disabled}
        className={`h-11 w-11 items-center justify-center rounded-full ${
          message.trim() && !disabled ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <Text className="text-4xl font-bold text-white mb-2">↑</Text>
      </Pressable>
    </View>
  );
};

export default ChatInput;
