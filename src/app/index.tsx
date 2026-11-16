import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  deleteConversation,
  getAllConversations,
  type Conversation,
} from "../storage/ChatRepository";

const ChatHistory = () => {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    try {
      const data = await getAllConversations();
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      Alert.alert("Error", "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConversations();
    }, []),
  );

  const openNewChat = () => {
    router.push("/chat");
  };

  const openConversation = (id: string) => {
    router.push({
      pathname: "/chat",
      params: { conversationId: id },
    });
  };
  const handleDeleteConversation = (id: string, title: string) => {
    Alert.alert(
      "Delete Conversation",
      `Are you sure you want to delete "${title}" Conversation ? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversation(id);
              await loadConversations();
            } catch (error) {
              console.error("Failed to delete conversation:", error);
              Alert.alert("Error", "Could not delete conversation.");
            }
          },
        },
      ],
    );
  };
  return (
    <SafeAreaView className="flex-1 px-4">
      <Pressable
        onPress={openNewChat}
        className="bg-blue-600 rounded-xl p-4 my-4"
      >
        <Text className="text-white text-center font-bold">+ New Chat</Text>
      </Pressable>
      {loading ? (
        <Text className="text-center mt-6">Loading conversations...</Text>
      ) : conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg font-semibold">No conversations yet</Text>
          <Text className="text-gray-500 mt-2">Start a new chat to begin.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}

          renderItem={({ item }) => (
            <View className="flex-row items-center border-b border-gray-200 py-4">
              <Pressable
                onPress={() => openConversation(item.id)}
                className="flex-1"
              >
                <Text className="font-semibold text-base">{item.title}</Text>

                <Text className="text-gray-500 text-xs mt-1">
                  {new Date(item.updated_at).toLocaleString()}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleDeleteConversation(item.id, item.title)}
                className="bg-red-100 rounded-lg px-3 py-2 ml-3"
              >
                <Text className="text-red-600 font-semibold">Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
export default ChatHistory;
