import { initLlama, type LlamaContext } from "llama.rn";
import { useEffect, useState } from "react";
import { Alert, Button, Text, View } from "react-native";

const MODEL_PATH =
  "/data/user/0/com.akshita_thakur.PocketMind/files/models/qwen2.5-1.5b-instruct-q3_k_m.gguf";

export default function HomeScreen() {
  const [status, setStatus] = useState("Model not loaded");
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [busy, setBusy] = useState(false);

  async function testInference() {
    if (!context || busy) return;

    setBusy(true);
    setStatus("Generating response...");

    const start = Date.now();

    try {
      const result = await context.completion({
        prompt:
          "You are a helpful assistant. User: What is artificial intelligence? Answer in 2 short sentences. Assistant:",
        n_predict: 100,
        temperature: 0.7,
      });

      const elapsed = (Date.now() - start) / 1000;
      console.log("LLM performance:", JSON.stringify(result.timings));

      setStatus(`Response (${elapsed.toFixed(2)} seconds):\n${result.text}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Inference failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadModel() {
    if (context || busy) return;

    setBusy(true);
    setStatus("Getting Started .....");
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
      setStatus("Model loaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Load failed: ${message}`);
      Alert.alert("Model load failed", message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadModel();
  }, []);
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        PocketMind
      </Text>

      <Text style={{ marginBottom: 16 }}>{status}</Text>

      {loadTime !== null && (
        <Text style={{ marginBottom: 16 }}>
          Model load time: {(loadTime / 1000).toFixed(2)} seconds
        </Text>
      )}

      <View>
        <Button
          title={busy ? "Generating..." : "Test Inference"}
          onPress={testInference}
          disabled={busy || context === null}
        />
      </View>
    </View>
  );
}
