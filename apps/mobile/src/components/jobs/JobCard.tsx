import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatSalaryRange } from "@campushire/utils";
import type { JobCard as JobCardType } from "@/lib/api/jobs.api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";

interface JobCardProps {
  job: JobCardType;
  onApply: (jobId: string) => void;
  onToggleSave?: (jobId: string) => void;
}

export function JobCard({ job, onApply, onToggleSave }: JobCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.company}>{job.company}</Text>
          <Text style={styles.title}>{job.title}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onToggleSave?.(job.id)}
          style={styles.saveButton}
        >
          <Text style={styles.saveText}>{job.hasSaved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <Badge label={job.workMode} variant="info" />
        <Badge label={job.jobType} />
      </View>

      <Text style={styles.location}>{job.location ?? "Location not specified"}</Text>
      <Text style={styles.salary}>
        {job.salaryRange ?? formatSalaryRange(0, 0)}
      </Text>

      <View style={styles.skillsRow}>
        {job.skills.slice(0, 3).map((skill) => (
          <Text key={skill} style={styles.skillChip}>
            {skill}
          </Text>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Badge label={`${Math.round(job.matchScore)}% Match`} variant="success" />
        <Button
          label={job.hasApplied ? "Applied" : "Apply"}
          onPress={() => onApply(job.id)}
          disabled={job.hasApplied}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerLeft: {
    flex: 1,
    marginRight: 8
  },
  company: {
    color: Colors.textSecondary,
    fontSize: 12
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2
  },
  saveButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border
  },
  saveText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600"
  },
  metaRow: {
    flexDirection: "row",
    gap: 8
  },
  location: {
    color: Colors.textSecondary,
    fontSize: 13
  },
  salary: {
    color: Colors.textPrimary,
    fontWeight: "600"
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  skillChip: {
    backgroundColor: Colors.navy50,
    color: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  }
});
