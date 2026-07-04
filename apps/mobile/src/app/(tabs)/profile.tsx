import { StyleSheet, Text, View } from "react-native";
import { getRoleLabel } from "@campushire/utils";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/hooks/useAuth";

const safeNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

export default function ProfileTab() {
  const { user, logout } = useAuth();

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "CampusHire User";
  const roleLabel = user ? getRoleLabel(user.role) : "User";
  const studentScore = safeNumber(
    user?.studentProfile && typeof user.studentProfile === "object"
      ? (user.studentProfile as Record<string, unknown>).careerScore
      : null
  );
  const seekerScore = safeNumber(
    user?.jobSeekerProfile && typeof user.jobSeekerProfile === "object"
      ? (user.jobSeekerProfile as Record<string, unknown>).careerScore
      : null
  );
  const careerScore = Math.max(studentScore, seekerScore);

  return (
    <View style={styles.container}>
      <Header title="My Profile" subtitle="Manage your account" />
      <View style={styles.content}>
        <Card style={styles.profileCard}>
          <Avatar name={fullName} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
            <Text style={styles.tin}>TIN: {user?.tin ?? "Not available"}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.metricTitle}>Career Score</Text>
          <Text style={styles.metricValue}>{careerScore}/100</Text>
        </Card>

        <Button label="Logout" variant="outline" onPress={() => void logout()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  },
  role: {
    color: Colors.accent,
    fontWeight: "600"
  },
  tin: {
    marginTop: 2,
    color: Colors.textSecondary
  },
  metricTitle: {
    color: Colors.textSecondary
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4
  }
});
