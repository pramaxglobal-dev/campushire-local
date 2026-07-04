import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Colors } from "@/constants/colors";
import { useNotifications } from "@/lib/hooks/useNotifications";

export default function NotificationsTab() {
  const { notifications, loading, refreshing, refresh, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <View style={styles.container}>
      <Header title="Notifications" subtitle="Stay updated in real-time" />
      <View style={styles.actions}>
        <Button label="Mark all read" variant="outline" onPress={() => void markAllAsRead()} />
      </View>
      {loading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={70} />
          <Skeleton height={70} />
          <Skeleton height={70} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, !item.isRead ? styles.unreadRow : null]}
              onPress={() => void markAsRead(item.id)}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(item.createdAt))} ago
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  actions: {
    paddingHorizontal: 12
  },
  skeletonWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10
  },
  list: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4
  },
  unreadRow: {
    borderColor: Colors.accent,
    backgroundColor: Colors.sky50
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: "700"
  },
  body: {
    color: Colors.textSecondary
  },
  time: {
    color: Colors.textTertiary,
    fontSize: 12
  },
  empty: {
    marginTop: 24,
    textAlign: "center",
    color: Colors.textSecondary
  }
});
