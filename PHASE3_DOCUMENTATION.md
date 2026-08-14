# Phase 3: Government/Admin Dashboard - Documentation

## Overview

Phase 3 implements a comprehensive government/admin dashboard that allows authorities to manage civic issues efficiently. The system provides tools for issue prioritization, department assignment, status tracking, and resolution evidence management.

## Features Implemented

### 1. Admin Dashboard (`/admin/dashboard`)
- **Statistics Display**: Real-time metrics including total issues, critical issues, high priority issues, pending, in-progress, and resolved counts
- **Visual Analytics**: Bar charts for issues by category and status distribution
- **Performance Metrics**: Average resolution time calculation
- **Priority Queue**: Top 5 high priority issues requiring immediate attention
- **Navigation**: Quick access to issues list and map view

### 2. Admin Issues List (`/admin/issues`)
- **Advanced Search**: Search by issue ID, category, or description text
- **Multi-Faceted Filtering**:
  - Status filter (reported, assigned, in_progress, resolved)
  - Category filter (all issue types)
  - Severity filter (low, medium, high, critical)
  - Priority range filter (0-100)
- **Sorting Options**: By priority score, date created, or severity level
- **Pagination**: 20 issues per page with page navigation
- **Rich Issue Cards**: Display image, ID, status badges, severity, priority score, description preview, location, date, department assignment, and duplicate indicator
- **Active Filter Indicator**: Shows count of active filters with clear all option

### 3. Admin Issue Detail (`/admin/issues/:id`)
- **Complete Issue Information**: Full details with image, location map, description, and AI analysis
- **Quick Stats**: Severity, priority level, confidence score, and duplicate group info
- **Status Management**: 
  - Update status with validation (reported → assigned → in_progress → resolved)
  - Status transition notes
  - Complete status history timeline
- **Department Assignment**: 
  - Assign to valid departments
  - Auto-transitions to 'assigned' status
  - Tracks assignment date
- **Admin Notes**: 
  - Add internal notes (not visible to citizens)
  - Timestamped with admin email
  - Multiple notes append with history
- **Resolution Management**:
  - Required resolution notes
  - Optional resolution photo upload (JPG, PNG, WEBP, max 5MB)
  - Records resolution date
  - Cannot change status after resolved
- **Interactive Map**: Shows exact issue location with marker

### 4. Admin Map View (`/admin/map`)
- **Priority-Based Visualization**:
  - Critical priority: Red markers (score ≥ 80)
  - High priority: Orange markers (score ≥ 60)
  - Medium priority: Amber markers (score ≥ 40)
  - Low priority: Green markers (score < 40)
- **Interactive Markers**: Click to view issue summary popup
- **Priority Legend**: Shows count for each priority level
- **Filtering**: Filter by priority level, severity, or category
- **Issue Popup**: Displays image, details, and link to full issue detail page

### 5. Citizen Resolution View
- **Resolution Evidence Display**: Citizens can see resolution information on their issues
- **Resolution Details**: Resolution date, notes from admin, resolution photo, and resolving department
- **Status Updates**: Automatic notifications when issue status changes

## Technical Implementation

### Backend Architecture

#### Admin Router (`routers/admin_router.py`)
Eight admin-only endpoints with authorization enforcement:

1. **GET `/api/admin/dashboard`**
   - Returns comprehensive statistics
   - Calculates average resolution time
   - Groups issues by category and status

2. **GET `/api/admin/issues`**
   - Supports filtering (status, category, severity, priority range)
   - Search functionality
   - Sorting and pagination

3. **GET `/api/admin/issues/{issue_id}`**
   - Returns full issue details with history
   - Includes reporter email and admin notes
   - Shows complete status change timeline

4. **PATCH `/api/admin/issues/{issue_id}/status`**
   - Updates issue status with validation
   - Creates history entry
   - Enforces valid transitions

5. **PATCH `/api/admin/issues/{issue_id}/department`**
   - Assigns issue to department
   - Auto-transitions to 'assigned' status
   - Validates department name

6. **POST `/api/admin/issues/{issue_id}/notes`**
   - Adds timestamped internal notes
   - Includes admin email
   - Appends to existing notes

7. **POST `/api/admin/issues/{issue_id}/resolution`**
   - Marks issue as resolved
   - Requires resolution notes
   - Optional image upload
   - Records resolution timestamp

8. **GET `/api/admin/issues/map/unresolved`**
   - Returns all unresolved issues for map display
   - Includes coordinates and priority data

#### Authorization
- **Admin Decorator**: `require_admin()` checks user role
- **403 Responses**: Citizens attempting admin endpoints receive 403 Forbidden
- **JWT Required**: All endpoints require valid authentication token

#### Status Workflow
Valid status transitions:
- `reported` → `assigned`
- `assigned` → `in_progress` or back to `reported`
- `in_progress` → `resolved` or back to `assigned`
- `resolved` → (no further transitions allowed)

#### Database Models
Updated `Issue` model with:
- `admin_notes`: Internal notes field (TEXT, nullable)
- `assigned_department`: Department name (VARCHAR(100), nullable)
- `assigned_at`: Department assignment timestamp
- `resolved_at`: Resolution timestamp
- `resolution_notes`: Resolution description (TEXT, nullable)
- `resolution_image_path`: Path to resolution photo (VARCHAR(500), nullable)

`IssueHistory` model tracks:
- Issue ID reference
- Admin user ID
- Old and new status
- Change notes
- Timestamp

#### Departments
Valid department options:
- Roads & Infrastructure
- Electrical / Street Lighting
- Sanitation
- Drainage / Water
- Traffic / Signage
- Parks & Public Spaces
- Other

### Frontend Architecture

#### Pages Created
1. **AdminDashboardPage.tsx**: Main dashboard with statistics
2. **AdminIssuesPage.tsx**: Issues list with filtering and search
3. **AdminIssueDetailPage.tsx**: Detailed issue management interface
4. **AdminMapPage.tsx**: Geographic visualization of issues

#### API Service Functions
Added to `services/api.ts`:
- `getAdminDashboard()`: Fetch dashboard statistics
- `getAdminIssues()`: Fetch filtered issues list
- `getAdminIssueDetail()`: Fetch issue with history
- `updateIssueStatus()`: Update status
- `assignIssueDepartment()`: Assign department
- `addAdminNote()`: Add internal note
- `resolveIssue()`: Mark as resolved with evidence
- `getUnresolvedIssuesForMap()`: Fetch map data

#### Routing
Added to `App.tsx`:
- `/admin/dashboard` → AdminDashboardPage
- `/admin/issues` → AdminIssuesPage
- `/admin/issues/:id` → AdminIssueDetailPage
- `/admin/map` → AdminMapPage

All admin routes protected with `requireRole="admin"`

#### Map Component Enhancement
Updated `Map.tsx` to support:
- Custom marker colors via `color` prop
- Priority display in popups
- Click handlers on markers
- Dynamic icon creation based on color

### Security Features

1. **Role-Based Access Control**:
   - Admin-only endpoints verified at API level
   - Frontend routes protected with role checks
   - Automatic redirect on unauthorized access

2. **Data Segregation**:
   - Admin notes hidden from citizen views
   - Citizens can only view their own issues
   - Admins have full visibility

3. **Input Validation**:
   - Department names validated against whitelist
   - Status transitions validated
   - Image types validated (JPG, PNG, WEBP)
   - File size limits enforced (5MB max)

4. **Audit Trail**:
   - All status changes logged in IssueHistory
   - Admin user tracked for each action
   - Timestamps recorded for all changes

## Testing

### Test Suite (`test_admin.py`)
Comprehensive test coverage including:

#### Authorization Tests (8 tests)
- Unauthenticated requests return 401
- Citizens receive 403 on admin endpoints
- Admins successfully access protected endpoints

#### Status Workflow Tests (6 tests)
- Valid transitions succeed
- Invalid transitions rejected
- Resolved issues locked from changes
- Department assignment auto-transitions status

#### Resolution Evidence Tests (4 tests)
- Resolution with notes only
- Resolution with notes and image
- Required notes validation
- Image type validation

#### Issue History Tests (2 tests)
- Status changes create history entries
- Multiple changes create multiple entries

#### Admin Notes Tests (3 tests)
- Adding notes with timestamps
- Appending multiple notes
- Citizens cannot see admin notes

#### Department Assignment Tests (3 tests)
- Valid department assignment
- Invalid department rejection
- Department reassignment

### Running Tests
```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m pytest test_admin.py -v
```

## Manual Testing Guide

### Prerequisites
1. Backend server running on `http://localhost:8000`
2. Frontend development server running
3. Database migrated with Phase 3 schema (run `migrate_phase3.py`)
4. Test accounts created:
   - Admin: `admin@civicfix.example` / `admin123`
   - Citizen: `citizen@test.example` / `test123`

### Test Scenarios

#### Scenario 1: Admin Dashboard Access
1. Login as admin user
2. Navigate to `/admin/dashboard`
3. **Verify**: Statistics cards display correctly
4. **Verify**: Charts render with data
5. **Verify**: High priority issues list shows issues
6. **Verify**: Navigation buttons work

#### Scenario 2: Issue Filtering and Search
1. From dashboard, click "View All Issues"
2. **Test Search**: Enter issue ID, category, or keyword
3. **Test Filters**: 
   - Select status filter
   - Select severity filter
   - Adjust priority range slider
   - Select category
4. **Verify**: Results update correctly
5. **Verify**: Active filter count updates
6. **Test Clear Filters**: Click "Clear All" button
7. **Verify**: Filters reset

#### Scenario 3: Department Assignment
1. Navigate to an issue detail page
2. Click "Assign Department" or "Change Department"
3. Select a valid department from dropdown
4. Click "Assign Department"
5. **Verify**: Department displayed on issue
6. **Verify**: Status changed to "assigned"
7. **Verify**: Assignment timestamp shown

#### Scenario 4: Status Management
1. On issue detail page, click "Update Status"
2. Select new status from valid transitions
3. Add optional notes
4. Click "Update Status"
5. **Verify**: Status badge updates
6. **Verify**: Status history shows entry
7. **Test Invalid**: Try invalid transition (should fail)

#### Scenario 5: Admin Notes
1. On issue detail page, click "Add Note"
2. Enter internal note text
3. Click "Add Note"
4. **Verify**: Note appears in admin notes section
5. **Verify**: Note includes timestamp and admin email
6. Add another note
7. **Verify**: Both notes visible

#### Scenario 6: Issue Resolution
1. Move issue to "in_progress" status (if not already)
2. Click "Mark Resolved"
3. Enter resolution notes (required)
4. Optionally upload resolution photo
5. Click "Mark as Resolved"
6. **Verify**: Status changes to "resolved"
7. **Verify**: Resolution evidence displayed
8. **Verify**: Resolved timestamp shown
9. **Test Lock**: Try to change status (should fail)

#### Scenario 7: Map View
1. Navigate to `/admin/map`
2. **Verify**: Map displays with colored markers
3. **Verify**: Legend shows priority counts
4. Click on a marker
5. **Verify**: Popup shows issue summary
6. Click "View Full Details" in popup
7. **Verify**: Navigates to issue detail page
8. **Test Filters**: Apply priority/severity/category filters
9. **Verify**: Map updates to show only filtered issues

#### Scenario 8: Citizen Resolution View
1. Logout and login as citizen
2. Navigate to "My Issues"
3. Select a resolved issue
4. **Verify**: Resolution section displays
5. **Verify**: Resolution notes visible
6. **Verify**: Resolution photo visible (if uploaded)
7. **Verify**: Resolving department shown
8. **Verify**: Resolution date displayed

#### Scenario 9: Authorization Testing
1. Login as citizen
2. Try to access `/admin/dashboard`
3. **Verify**: Redirected or shown "Admin access required"
4. Try direct API access: `GET /api/admin/dashboard`
5. **Verify**: 403 Forbidden response
6. **Test All**: Try accessing other admin endpoints
7. **Verify**: All return 403 for citizen users

#### Scenario 10: Admin Notes Privacy
1. Login as admin, add internal note to an issue
2. Logout and login as the citizen who created that issue
3. View the issue detail
4. **Verify**: Admin notes section NOT visible
5. **Verify**: API response does not include admin_notes field

## API Endpoints Reference

### Admin Dashboard
```
GET /api/admin/dashboard
Authorization: Bearer <admin_token>

Response: {
  total_issues: number
  critical_issues: number
  high_priority_issues: number
  pending_issues: number
  in_progress_issues: number
  resolved_issues: number
  issues_by_category: { [category: string]: number }
  issues_by_status: { [status: string]: number }
  average_resolution_time_hours: number | null
}
```

### Admin Issues List
```
GET /api/admin/issues?page=1&page_size=20&status_filter=reported&category_filter=&severity_filter=&priority_min=0&priority_max=100&search=&sort_by=priority_score&sort_order=desc
Authorization: Bearer <admin_token>

Response: {
  issues: Issue[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}
```

### Admin Issue Detail
```
GET /api/admin/issues/{issue_id}
Authorization: Bearer <admin_token>

Response: AdminIssueDetail (includes history, admin_notes, reporter_email)
```

### Update Status
```
PATCH /api/admin/issues/{issue_id}/status
Authorization: Bearer <admin_token>
Content-Type: application/json

Body: {
  new_status: "assigned" | "in_progress" | "resolved" | "reported"
  notes?: string
}

Response: Updated Issue
```

### Assign Department
```
PATCH /api/admin/issues/{issue_id}/department
Authorization: Bearer <admin_token>
Content-Type: application/json

Body: {
  department: string  // Must be valid department name
}

Response: Updated Issue
```

### Add Admin Note
```
POST /api/admin/issues/{issue_id}/notes
Authorization: Bearer <admin_token>
Content-Type: application/json

Body: {
  note: string
}

Response: Updated Issue
```

### Resolve Issue
```
POST /api/admin/issues/{issue_id}/resolution
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Body:
  resolution_notes: string (required)
  resolution_image?: File (JPG/PNG/WEBP, max 5MB)

Response: Updated Issue with resolution data
```

### Map Data
```
GET /api/admin/issues/map/unresolved
Authorization: Bearer <admin_token>

Response: MapIssue[] (id, category, severity, status, priority_score, latitude, longitude, image_path, description, assigned_department)
```

## Database Migration

To upgrade from Phase 2 to Phase 3:

```bash
cd backend
.\venv\Scripts\Activate.ps1
python migrate_phase3.py
```

This adds the `admin_notes` column to the `issues` table. All other Phase 3 fields were already present from Phase 2.

## Deployment Notes

### Environment Variables
No new environment variables required for Phase 3.

### File Storage
Resolution images are stored in `backend/uploads/resolutions/` directory. Ensure this directory:
- Has write permissions
- Is excluded from version control (.gitignore)
- Has sufficient disk space
- Is backed up regularly

### Database Backup
Before deploying Phase 3, backup your database:
```bash
cp backend/civicfix.db backend/civicfix_backup_$(date +%Y%m%d).db
```

### Performance Considerations
- Admin dashboard queries aggregate data; consider caching for large datasets
- Map endpoint returns all unresolved issues; implement pagination if needed
- Image uploads are synchronous; consider async processing for production

## Future Enhancements

Potential improvements for future phases:
1. **Real-time Updates**: WebSocket notifications for status changes
2. **Bulk Operations**: Update status or assign department for multiple issues
3. **Advanced Analytics**: Trends, heat maps, resolution rate by department
4. **Email Notifications**: Notify citizens when issues are updated
5. **Export Functionality**: CSV/PDF reports of issues and statistics
6. **Department Dashboards**: Separate views for each department
7. **SLA Tracking**: Monitor time-to-resolution against targets
8. **Mobile Admin App**: Native apps for field workers
9. **Workflow Automation**: Auto-assign based on category or location
10. **Public Dashboard**: Anonymous view of city-wide statistics

## Troubleshooting

### Common Issues

**Problem**: 403 Forbidden on admin endpoints  
**Solution**: Verify user has `role='admin'` in database. Check JWT token is valid.

**Problem**: Status transition rejected  
**Solution**: Review valid transitions. Cannot transition from resolved. Use /status endpoint, not direct database update.

**Problem**: Resolution upload fails  
**Solution**: Check image type (must be JPG/PNG/WEBP), size (max 5MB), and resolution_notes provided.

**Problem**: Admin notes visible to citizens  
**Solution**: Verify using citizen API endpoints (`/api/issues/{id}`), not admin endpoints. Check IssueResponse schema excludes admin_notes.

**Problem**: Map markers not showing correct colors  
**Solution**: Verify priority_score calculated correctly. Check marker color mapping in AdminMapPage.

**Problem**: Tests failing  
**Solution**: Ensure httpx version <0.24 installed. Check database permissions. Verify test database cleaned up between runs.

## Support

For issues or questions:
1. Check this documentation first
2. Review test suite for examples
3. Inspect browser console for frontend errors
4. Check backend logs for API errors
5. Verify database schema matches Phase 3 requirements

## Changelog

### Phase 3.0.0 (Current)
- ✅ Admin dashboard with statistics and analytics
- ✅ Issues list with advanced filtering and search
- ✅ Issue detail management interface
- ✅ Status workflow with validation
- ✅ Department assignment
- ✅ Admin internal notes
- ✅ Resolution evidence upload
- ✅ Geographic map view with priority-based markers
- ✅ Citizen resolution view
- ✅ Complete authorization and access control
- ✅ Audit trail with issue history
- ✅ Comprehensive test suite

---

**Phase 3 Implementation Complete** ✅

All requirements met. System ready for government/admin use in managing civic issues.
