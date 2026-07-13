import axios from "axios";

const API_URL = "http://localhost:4000";

const testCredentials = [
  { email: "superadmin.demo1@talentorx.local", password: "Talentor@123", role: "SUPER_ADMIN" },
  { email: "collegeadmin.demo1@talentorx.local", password: "Talentor@123", role: "COLLEGE_ADMIN" },
  { email: "student.demo1@talentorx.local", password: "Talentor@123", role: "STUDENT" },
  { email: "jobseeker.demo1@talentorx.local", password: "Talentor@123", role: "JOB_SEEKER" },
  { email: "corporaterecruiter.demo1@talentorx.local", password: "Talentor@123", role: "CORPORATE_RECRUITER" },
  { email: "freelancerecruiter.demo1@talentorx.local", password: "Talentor@123", role: "FREELANCE_RECRUITER" },
  { email: "vendor.demo1@talentorx.local", password: "Talentor@123", role: "VENDOR" },
  { email: "trainingpartner.demo1@talentorx.local", password: "Talentor@123", role: "TRAINING_PARTNER" },
];

async function testLogin() {
  console.log("Testing demo user logins...\n");

  for (const cred of testCredentials) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: cred.email,
        password: cred.password,
      });

      if (response.data.success) {
        console.log(`✅ ${cred.role}: Login successful`);
        console.log(`   User: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
        console.log(`   Email: ${response.data.data.user.email}`);
      } else {
        console.log(`❌ ${cred.role}: Login failed - ${response.data.error}`);
      }
    } catch (error: any) {
      console.log(`❌ ${cred.role}: Login error - ${error.response?.data?.error || error.message}`);
    }
    console.log("");
  }
}

testLogin().catch(console.error);
