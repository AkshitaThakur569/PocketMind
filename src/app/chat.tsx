import { File } from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import { initLlama, type LlamaContext } from "llama.rn";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChatBubble from "../component/ChatBubble";
import ChatInput from "../component/ChatInput";
import {
  createConversation,
  getMessages,
  saveMessage,
} from "../storage/ChatRepository";

type ModelStatus = "not_available" | "loading" | "ready" | "failed";

const MODEL_PATH =
  "/storage/emulated/0/Android/data/com.akshita_thakur.PocketMind/files/models/qwen2.5-1.5b-instruct-q3_k_m.gguf";
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatScreen() {
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("not_available");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const { conversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();
  const isModelLoadingRef = useRef(false);
  const isGeneratingRef = useRef(false);
  async function loadModel() {
    if (
      isModelLoadingRef.current ||
      context ||
      modelStatus === "loading" ||
      modelStatus === "ready"
    )
      return;

    isModelLoadingRef.current = true;
    setModelStatus("loading");
    setModelError(null);
    const start = Date.now();

    try {
      const modelFile = new File(`file://${MODEL_PATH}`);

      if (!modelFile.exists) {
        throw new Error("Model file not found. Please check the model path.");
      }
      if (modelFile.size === 0) {
        throw new Error("Model file is empty.");
      }
      if (!modelFile.name.endsWith(".gguf")) {
        throw new Error("Invalid model file format. Expected a .gguf file.");
      }
      const loadedContext = await initLlama({
        model: MODEL_PATH,
        n_ctx: 1024,
        n_threads: 4,
        use_mmap: true,
      });

      setContext(loadedContext);
      setLoadTime(Date.now() - start);
      setModelStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Model loading failed:", message);
      setModelError(message);
      setModelStatus("failed");
    } finally {
      isModelLoadingRef.current = false;
    }
  }

  async function testInference(
    message: string,
    previousMessages: Message[],
    conversationId: string,
  ) {
    if (!context || modelStatus !== "ready" || isGenerating) return;
    setIsGenerating(true);

    const start = Date.now();
    let assistantResponse = "";
    const assistantId = Date.now().toString() + "-assistant";

    setConversation((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);
    try {
      const result = await context.completion(
        {
          messages: [
            {
              role: "system",
              content: "You are PocketMind, a helpful AI assistant.",
            },
            ...previousMessages.map((item) => ({
              role: item.role,
              content: item.content,
            })),
          ],
          n_predict: 100,
          temperature: 0.7,
        },
        (data) => {
          assistantResponse += data.token;

          setConversation((prev) =>
            prev.map((item) =>
              item.id === assistantId
                ? { ...item, content: assistantResponse }
                : item,
            ),
          );
        },
      );

      if (assistantResponse.trim()) {
        await saveMessage(conversationId, "assistant", assistantResponse);
      }

      console.log("Inference completed in:", Date.now() - start, "ms");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      console.error("Inference failed:", message);

      if (assistantResponse.trim()) {
        // Preserve and save partially generated response
        try {
          await saveMessage(conversationId, "assistant", assistantResponse);
        } catch (saveError) {
          console.error("Failed to save partial response:", saveError);
        }
      } else {
        // Remove empty assistant message
        setConversation((prev) =>
          prev.filter((item) => item.id !== assistantId),
        );
      }

      Alert.alert("Inference Error", message);
    } finally {
      setIsGenerating(false);
    }
  }

  const startNewChat = () => {
    if (isGenerating) {
      Alert.alert(
        "Generation in Progess",
        "Please stop the current response before starting a new chat.",
      );
      return;
    }
    setConversation([]);
    setActiveConversationId(null);
  };

  const handleSend = async (message: string) => {
    if (
      !message.trim() ||
      modelStatus !== "ready" ||
      isGenerating ||
      !context ||
      isGeneratingRef.current
    ) {
      return;
    }

    isGeneratingRef.current = true;

    try {
      let conversationId = activeConversationId;

      if (!conversationId) {
        conversationId = await createConversation(message.trim().slice(0, 40));
        setActiveConversationId(conversationId);
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: message.trim(),
      };

      await saveMessage(conversationId, "user", userMessage.content);

      const updatedConversation = [...conversation, userMessage];

      setConversation(updatedConversation);

      await testInference(
        userMessage.content,
        updatedConversation,
        conversationId,
      );
    } catch (error) {
      console.error("Failed to save user message:", error);
      Alert.alert("Storage Error", "Could not save your message.");
    } finally {
      isGeneratingRef.current = false;
    }
  };

  async function loadConversation(id: string) {
    try {
      const savedMessages = await getMessages(id);

      setConversation(
        savedMessages.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
        })),
      );

      setActiveConversationId(id);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      Alert.alert("Error", "Could not load this conversation.");
    }
  }
  async function stopGeneration() {
    if (!context || !isGenerating) return;

    try {
      await context.stopCompletion();
    } catch (error) {
      console.log("Stop generation failed:", error);
    }
  }

  useEffect(() => {
    if (typeof conversationId === "string") {
      loadConversation(conversationId);
    } else {
      setConversation([]);
      setActiveConversationId(null);
    }
  }, [conversationId]);

  useEffect(() => {
    loadModel();
  }, []);

  return (
    <SafeAreaView className="flex-1 px-2">
      <Pressable
        onPress={startNewChat}
        className="bg-blue-600 rounded-xl p-3 mx-4 my-2"
      >
        <Text className="text-white text-center font-semibold">+ New Chat</Text>
      </Pressable>
      <ScrollView className="flex-1 px-6">
        {modelStatus === "loading" && (
          <View className="flex-row items-center gap-2 mb-4">
            <ActivityIndicator size="small" color="blue" />
            <Text className="text-gray-600">Loading PocketMind model...</Text>
          </View>
        )}

        {modelStatus === "failed" && (
          <View className="mb-4 rounded-xl bg-red-100 p-3">
            <Text className="font-semibold text-red-700">
              Model loading failed
            </Text>
            <Text className="text-red-600">{modelError}</Text>
            <Pressable onPress={loadModel} className="mt-2">
              <Text className="font-semibold text-blue-600">
                Retry loading model
              </Text>
            </Pressable>
          </View>
        )}

        {modelStatus === "ready" && (
          <Text className="mb-3 text-green-700">PocketMind is ready</Text>
        )}
        {conversation.map((item) => (
          <ChatBubble key={item.id} message={item.content} role={item.role} />
        ))}
        {loadTime !== null && (
          <Text style={{ marginBottom: 16 }}>
            Model load time: {(loadTime / 1000).toFixed(2)} seconds
          </Text>
        )}
        {isGenerating && (
          <View className="flex-row items-center self-start gap-2 mb-4 rounded-xl bg-gray-200 px-4 py-3">
            <ActivityIndicator size="small" color="blue" />
            <Text className="text-black font-medium">
              PocketMind is thinking...
            </Text>
          </View>
        )}
      </ScrollView>
      {isGenerating && (
        <View className="flex-row justify-end mb-3 px-3">
          <Pressable
            onPress={stopGeneration}
            className="rounded-full w-12 h-12 bg-red-500 px-3 py-2 items-center justify-center"
          >
            <Text className="text-white">X</Text>
          </Pressable>
        </View>
      )}
      <ChatInput
        onSend={handleSend}
        disabled={modelStatus !== "ready" || isGenerating}
      />
    </SafeAreaView>
  );
}
