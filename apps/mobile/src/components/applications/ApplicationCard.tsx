import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatDate } from "@campushire/utils";
import type { ApplicationCard as ApplicationCardType } from "@/lib/api/applications.api";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/applications/StatusBadge";
import { Colors } from "@/constants/colors";

interface Props {
  item: ApplicationCardType;
  onPress?: (id: string) => void;
}

export function ApplicationCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity onPress={() => onPress?.(item.id)} accessibilityRole="button">
      <Card style={styles.card}>
        <Text style={styles.title}>{item.jobTitle}</Text>
        <Text style={styles.company}>{item.company}</Text>
        <View style={styles.row}>
          <StatusBadge status={item.status} />
          <Text style={styles.date}>{formatDate(new Date(item.appliedAt), "dd MMM yyyy")}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 15
  },
  company: {
    color: Colors.textSecondary,
    fontSize: 13
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  date: {
    color: Colors.textTertiary,
    fontSize: 12
  }
});
