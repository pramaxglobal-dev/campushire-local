import { useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatDistanceToNow, format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { apiClient, unwrapResponse } from "@/lib/api/client";

interface InterviewItem {
  id: string;
  round: string;
  mode: string;
  scheduledStartAt: string;
  meetingLink?: string | null;
  status: string;
}

export default function InterviewsTab() {
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/api/interviews");
      const payload = unwrapResponse<InterviewItem[]>(response);
      setItems(payload);
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : "Unable to load interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Interviews" subtitle="Upcoming and completed rounds" />
      {loading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={120} />
          <Skeleton height={120} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        >
          {items.length === 0 ? (
            <Text style={styles.empty}>No interviews scheduled yet.</Text>
          ) : (
            items.map((item) => {
              const start = new Date(item.scheduledStartAt);
              return (
                <Card key={item.id} style={styles.card}>
                  <Text style={styles.round}>{item.round.replaceAll("_", " ")}</Text>
                  <Text style={styles.meta}>{format(start, "dd MMM yyyy, hh:mm a")}</Text>
                  <Text style={styles.meta}>Mode: {item.mode.replaceAll("_", " ")}</Text>
                  <Text style={styles.countdown}>
                    {start.getTime() > Date.now()
                      ? `Interview ${formatDistanceToNow(start)} from now`
                      : "Interview completed"}
                  </Text>
                  {item.meetingLink ? (
                    <Button
                      label="Join Meeting"
                      onPress={() => {
                        void Linking.openURL(item.meetingLink ?? "");
                      }}
                    />
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  skeletonWrap: {
    paddingHorizontal: 12,
    gap: 10
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10
  },
  card: {
    gap: 8
  },
  round: {
    color: Colors.textPrimary,
    fontWeight: "700"
  },
  meta: {
    color: Colors.textSecondary
  },
  countdown: {
    color: Colors.accent,
    fontWeight: "600"
  },
  empty: {
    textAlign: "center",
    marginTop: 24,
    color: Colors.textSecondary
  }
});
