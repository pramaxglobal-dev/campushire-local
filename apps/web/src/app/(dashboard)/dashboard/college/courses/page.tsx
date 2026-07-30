"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Clock, 
  Award, 
  Building2, 
  Search, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle,
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@/components/ui";

interface Course {
  id: string;
  title: string;
  description: string;
  durationHours?: number;
  price: number;
  currency?: string;
  level?: string;
  mode?: string;
  skillsCovered?: string[];
  trainingPartnerProfile?: {
    businessName?: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface CollegeStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentProfile?: {
    program?: string;
    department?: string;
    yearOfStudy?: number;
  };
}

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  program?: string;
  department?: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progressPct: number;
  enrolledAt: string;
}

interface AssignedCourseGroup {
  courseId: string;
  courseTitle: string;
  trainingPartnerName: string;
  durationHours?: number;
  price: number;
  assignedCount: number;
  completedCount: number;
  completionPct: number;
  students: StudentProgress[];
}

export default function CollegeCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<AssignedCourseGroup[]>([]);
  const [students, setStudents] = useState<CollegeStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state for Assign to Students
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [modalStudentSearch, setModalStudentSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accordion detail view state for Section B
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Check coordinator role
  const isCoordinator = user?.role === "COLLEGE_ADMIN" && user?.subRole === "MEMBER";

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch available courses
      const coursesRes = await apiClient.get<Course[]>("/courses");
      if (coursesRes.data) {
        setCourses(coursesRes.data);
      }

      // 2. Fetch assigned courses progress for Section B
      const assignedRes = await apiClient.get<AssignedCourseGroup[]>("/courses/assigned");
      if (assignedRes.data) {
        setAssignedGroups(assignedRes.data);
      }

      // 3. Fetch college students for Section A assign checklist
      const studentsRes = await apiClient.get<{ items: CollegeStudent[] }>("/users?role=STUDENT&limit=100");
      if (studentsRes.data?.items) {
        setStudents(studentsRes.data.items);
      } else if (Array.isArray(studentsRes.data)) {
        setStudents(studentsRes.data as unknown as CollegeStudent[]);
      }
    } catch (err: any) {
      console.error("Failed to load courses data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Filter available courses
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.description.toLowerCase().includes(q) ||
      (c.trainingPartnerProfile?.businessName || "").toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  // Filter modal students
  const filteredModalStudents = useMemo(() => {
    if (!modalStudentSearch.trim()) return students;
    const q = modalStudentSearch.toLowerCase();
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }, [students, modalStudentSearch]);

  const handleOpenAssignModal = (course: Course) => {
    if (isCoordinator) return;
    setSelectedCourse(course);
    setSelectedStudentIds([]);
    setModalStudentSearch("");
    setErrorMessage(null);
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredModalStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredModalStudents.map(s => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCourse || selectedStudentIds.length === 0) return;
    setAssigning(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post<{ enrolledCount: number; failedIds: string[] }>(
        `/courses/${selectedCourse.id}/assign`,
        { userIds: selectedStudentIds }
      );

      const enrolledCount = res.data?.enrolledCount ?? selectedStudentIds.length;
      const msg = `${enrolledCount} student${enrolledCount === 1 ? "" : "s"} have been enrolled in "${selectedCourse.title}".`;
      setSuccessMessage(msg);

      // Close modal
      setSelectedCourse(null);
      setSelectedStudentIds([]);

      // Refresh Section B
      await fetchData();

      // Clear success alert after 6s
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to assign course to students.";
      setErrorMessage(msg);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4" /> Training & Skill Development
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Course Management</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Assign industry-recognized training courses from certified Training Partners to your college students and track their completion progress.
            </p>
          </div>

          {isCoordinator && (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-200 px-4 py-2 rounded-xl text-xs font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Coordinator View (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-4 rounded-xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-sm">{successMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => setSuccessMessage(null)} 
            className="text-emerald-700 hover:text-emerald-900 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* SECTION A: Available Courses */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Section A: Available Courses
            </h2>
            <p className="text-xs text-slate-500">
              Browse training courses published by verified partners across the platform.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search courses or partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse h-48 bg-slate-100 border-slate-200 rounded-2xl" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 p-8 text-center rounded-2xl">
            <CardContent className="space-y-3 p-0">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600">No available courses found.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No published courses match your search criteria. Check back when Training Partners publish new training programs.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const partnerName =
                course.trainingPartnerProfile?.businessName ||
                (course.trainingPartnerProfile?.user
                  ? `${course.trainingPartnerProfile.user.firstName} ${course.trainingPartnerProfile.user.lastName}`
                  : "Training Partner");

              return (
                <Card 
                  key={course.id} 
                  className="group hover:shadow-lg transition-all duration-200 border-slate-200 rounded-2xl flex flex-col justify-between overflow-hidden bg-white hover:border-indigo-200"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-semibold">
                        {course.level || "ALL LEVELS"}
                      </Badge>
                      <span className="text-sm font-bold text-emerald-700">
                        {course.price > 0 ? `₹${course.price.toLocaleString("en-IN")}` : "FREE"}
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {course.title}
                    </CardTitle>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{partnerName}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 py-2 flex-1 space-y-3">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    {course.durationHours && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{course.durationHours} Hours Duration</span>
                      </div>
                    )}

                    {course.skillsCovered && course.skillsCovered.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {course.skillsCovered.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
                            {skill}
                          </span>
                        ))}
                        {course.skillsCovered.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium px-1">
                            +{course.skillsCovered.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>

                  <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50">
                    <Button
                      variant={isCoordinator ? "outline" : "default"}
                      disabled={isCoordinator}
                      onClick={() => handleOpenAssignModal(course)}
                      className={`w-full text-xs font-semibold rounded-xl h-9 transition-all ${
                        isCoordinator 
                          ? "opacity-60 cursor-not-allowed text-slate-400 border-slate-200" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      {isCoordinator ? "Assign Disabled (Coordinator)" : "Assign to Students"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION B: Assigned Courses & Progress */}
      <section className="space-y-4 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" /> Section B: Assigned Courses & Progress
          </h2>
          <p className="text-xs text-slate-500">
            Monitor course assignments made to your college students and track individual completion status.
          </p>
        </div>

        {assignedGroups.length === 0 ? (
          <Card className="border-slate-200 bg-white p-8 text-center rounded-2xl shadow-sm">
            <CardContent className="space-y-2 p-0">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No courses assigned yet.</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Assign a course from Section A above to get started with student skill development tracking.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10"></th>
                    <th className="py-3.5 px-4">Course Name</th>
                    <th className="py-3.5 px-4">Training Partner</th>
                    <th className="py-3.5 px-4 text-center">Assigned</th>
                    <th className="py-3.5 px-4 text-center">Completed</th>
                    <th className="py-3.5 px-4">Completion Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {assignedGroups.map((group) => {
                    const isExpanded = expandedCourseId === group.courseId;

                    return (
                      <React.Fragment key={group.courseId}>
                        <tr 
                          onClick={() => setExpandedCourseId(isExpanded ? null : group.courseId)}
                          className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {group.courseTitle}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-600">
                            {group.trainingPartnerName}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                              {group.assignedCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">
                              {group.completedCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                  style={{ width: `${group.completionPct}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-800 w-10 text-right">
                                {group.completionPct}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Accordion Detail View: Student Progress List */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50/80 p-4 border-b border-slate-200">
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-inner">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                    Assigned Students for "{group.courseTitle}" ({group.students.length})
                                  </h4>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {group.students.map((st) => (
                                    <div 
                                      key={st.id}
                                      className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs"
                                    >
                                      <div>
                                        <p className="font-semibold text-slate-900">{st.name}</p>
                                        <p className="text-[11px] text-slate-500">{st.email}</p>
                                      </div>

                                      <div className="flex items-center gap-4">
                                        <span className="text-[11px] font-medium text-slate-500">
                                          Progress: {st.progressPct}%
                                        </span>
                                        <Badge
                                          variant={
                                            st.status === "COMPLETED" 
                                              ? "success" 
                                              : st.status === "IN_PROGRESS" 
                                              ? "info" 
                                              : "secondary"
                                          }
                                          className="text-[10px] px-2 py-0.5 uppercase font-bold"
                                        >
                                          {st.status.replace("_", " ")}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ASSIGNMENT MODAL */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Assign Course to Students</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{selectedCourse.title}</p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search student by name or email..."
                    value={modalStudentSearch}
                    onChange={(e) => setModalStudentSearch(e.target.value)}
                    className="pl-8 text-xs py-1.5 rounded-xl"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-semibold rounded-xl"
                >
                  {selectedStudentIds.length === filteredModalStudents.length && filteredModalStudents.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {filteredModalStudents.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    No students found in your college roster.
                  </p>
                ) : (
                  filteredModalStudents.map((st) => {
                    const isChecked = selectedStudentIds.includes(st.id);

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleStudent(st.id)}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors text-xs ${
                          isChecked ? "bg-indigo-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{st.firstName} {st.lastName}</p>
                            <p className="text-[11px] text-slate-500">{st.email}</p>
                          </div>
                        </div>

                        {st.studentProfile?.program && (
                          <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                            {st.studentProfile.program}
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="text-xs text-slate-500 flex justify-between font-medium">
                <span>Selected: <strong className="text-indigo-600">{selectedStudentIds.length}</strong> students</span>
                <span>Total available: {students.length}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedCourse(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={assigning || selectedStudentIds.length === 0}
                onClick={handleConfirmAssignment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl px-5"
              >
                {assigning ? "Enrolling..." : "Confirm Assignment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
