# RBAC & Sub-Role Matrix

This document defines the Role-Based Access Control (RBAC) matrix for CampusHire. It maps primary **Roles** and secondary **Sub-Roles** to their allowed actions across the API.

## Base Roles (`UserRole`)

Roles define the global identity and macro-permissions of a user.

| Role | Scope | Key Capabilities |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Global | Manage platform settings, approve/suspend tenants & users, view global stats. |
| `COLLEGE_ADMIN` | Tenant (College) | Manage college invites, students, training programs, whitelabel config. |
| `CORPORATE_RECRUITER` | Tenant (Company) | Post jobs, manage ATS pipeline, schedule interviews, team management. |
| `STUDENT` | Tenant (College) | Apply for jobs, take courses, view applications. |
| `JOB_SEEKER` | Independent | Apply for jobs, view applications (no college affiliation). |
| `TRAINING_PARTNER` | Tenant (Partner) | Create courses, view enrollments and revenue. |
| `FREELANCE_RECRUITER`| Independent | Generate referral links, track candidate commissions. |
| `VENDOR` | Independent | Accept service requests, perform document verification. |

---

## Sub-Roles (`SubRole`)

Sub-roles refine permissions *within* a tenant (e.g., within a College or Corporate team). They are checked sequentially using the `requireSubRole` middleware.

*Note: Not all base roles utilize sub-roles (e.g., `STUDENT` and `JOB_SEEKER` are always just `MEMBER`).*

| Sub-Role | Intent | Restrictions / Allowed Actions |
| :--- | :--- | :--- |
| **`OWNER`** | Primary account holder. | **Allowed:** Everything. Create/revoke invites, update whitelabel config, suspend users, delete resources. |
| **`ADMIN`** | Top-level delegate. | **Allowed:** Almost everything `OWNER` can do (manage invites, whitelabel config, reject/suspend users).<br>**Denied:** Deleting the `OWNER`, transferring ownership. |
| **`MANAGER`** | Operational manager. | **Allowed:** Day-to-day operations (posting jobs, moving candidates, scheduling interviews).<br>**Denied:** Creating/revoking invites, changing tenant config, suspending platform users. |
| **`MEMBER`** | Standard user. | **Allowed:** Basic reading and limited creation (e.g., reading jobs, making personal notes).<br>**Denied:** Any destructive actions, invites, or tenant configuration. |

---

## Explicitly Protected Routes

The following routes enforce strict sub-role validation via `requireSubRole`:

### Invites (`/api/v1/invites`)
- `POST /` (Create Invite) ➔ `[OWNER, ADMIN]`
- `DELETE /:id` (Revoke Invite) ➔ `[OWNER, ADMIN]`

### Tenant Settings / Whitelabel (`/api/v1/whitelabel`)
- `POST /config` (Update Config) ➔ `[OWNER, ADMIN]`
- `POST /publish` (Publish Config) ➔ `[OWNER, ADMIN]`
- `POST /unpublish` (Unpublish Config) ➔ `[OWNER, ADMIN]`
- `POST /logo` (Upload Logo) ➔ `[OWNER, ADMIN]`
- `POST /favicon` (Upload Favicon) ➔ `[OWNER, ADMIN]`

### Platform Administration (`/api/v1/admin`)
*(Applies to `SUPER_ADMIN` sub-roles)*
- `POST /users/:id/suspend` ➔ `[OWNER, ADMIN]`
- `POST /users/:id/reject` ➔ `[OWNER, ADMIN]`
