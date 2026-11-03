import { initLlama, type LlamaContext } from "llama.rn";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChatBubble from "../component/ChatBubble";
import ChatInput from "../component/ChatInput";

const MODEL_PATH =
  "/data/user/0/com.akshita_thakur.PocketMind/files/models/qwen2.5-1.5b-instruct-q3_k_m.gguf";
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function HomeScreen() {
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [conversation, setConversation] = useState<Message[]>([]);

  async function loadModel() {
    if (context || busy) return;

    setBusy(true);
    const start = Date.now();

    try {
      const loadedContext = await initLlama({
        model: MODEL_PATH,
        n_ctx: 1024,
        n_threads: 4,
        use_mmap: true,
      });

      setContext(loadedContext);
      setLoadTime(Date.now() - start);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("Model load failed", message);
    } finally {
      setBusy(false);
    }
  }

  async function testInference(message: string) {
    if (!context || busy) return;
    setAnswer("");
    setBusy(true);

    const start = Date.now();

    try {
      const result = await context.completion(
        {
          prompt: `You are PocketMind, a helpful assistant. User: ${message} Answer in 2 short sentences. Assistant:`,
          n_predict: 100,
          temperature: 0.7,
        },
        (data) => {
          setAnswer((prev) => prev + data.token);
        },
      );

      console.log("LLM performance:", JSON.stringify(result.timings));
      const elapsed = (Date.now() - start) / 1000;
      setAnswer(`Response (${elapsed.toFixed(2)} seconds):\n${result.text}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
    } finally {
      setBusy(false);
    }
  }

  const handleSend = (message: string) => {
    if (!message.trim() || busy || !context) return;
    setQuestion(message);
    testInference(message);
  };

  useEffect(() => {
    loadModel();
  }, []);
  return (
    <SafeAreaView className="flex-1 px-2">
      <View className="flex-1 p-6 ">
        {question && <ChatBubble message={question} role="user" />}
        {answer && <ChatBubble message={answer} role="assistant" />}
        {/* {loadTime !== null && (
          <Text style={{ marginBottom: 16 }}>
            Model load time: {(loadTime / 1000).toFixed(2)} seconds
          </Text>
        )} */}
        <View></View>
        {busy && (
          <View className="flex-row gap-2">
            <ActivityIndicator size="small" color="blue" />
            <Text>PocketMind is thinking...</Text>
          </View>
        )}
      </View>
      <ChatInput onSend={handleSend} disabled={busy || context === null} />
    </SafeAreaView>
  );
}
