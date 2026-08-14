# CivicFix AI - 24-Hour MVP Architecture & Implementation Plan

## 🎯 MVP Philosophy

**Primary Goal**: Working end-to-end workflow in 24 hours
**Strategy**: Core functionality first, AI as clean replaceable module, no external dependencies

## 1. MVP Requirements (24-Hour Scope)

### ✅ MUST HAVE (Critical Path)

#### Citizen Features
- **Issue Submission**
  - Upload single photo (max 5MB)
  - Select category from dropdown OR let AI suggest
  - Capture/select location (GPS or map click)
  - Add optional text description
  - Immediate submission confirmation
  
- **Issue Tracking**
  - View "My Issues" list
  - See issue status (Pending → Assigned → In Progress → Resolved)
  - View AI analysis (category, severity, priority score)
  - View resolution evidence when completed

#### Government/Admin Features
- **Dashboard Overview**
  - Total issues count
  - Critical/high priority issues count
  - Pending issues count
  - Resolved issues count
  - Issues by category (bar chart)
  - Issues by status (pie chart)
  - Recent high-priority issues list

- **Issue Management**
  - List view with filters (status, category, priority)
  - Map view showing all issues
  - Issue detail view
  - Assign to department (dropdown)
  - Update status (dropdown)
  - Upload resolution photo
  - Add admin notes

#### AI/ML Features (Modular & Replaceable)
- **Image Analysis Service** (clean interface)
  - `analyze_image(image) → {category, severity, confidence}`
  - MVP: Rule-based heuristics + keyword matching
  - Future: Plug in CLIP, GPT-4 Vision, or custom model
  
- **Duplicate Detection**
  - Stage 1: GPS proximity check (configurable radius, default 50m)
  - Stage 2: Category match
  - Stage 3 (optional): Simple image hash comparison if time permits
  - Future: CLIP embeddings or perceptual hashing
  
- **Priority Scoring** (Rule-Based)
  - Severity: 40%
  - Safety risk (category-based): 30%
  - Duplicate count: 20%
  - Age: 10%
  - Output: 0-100 score

### ⚠️ NICE TO HAVE (If Time Permits)
- Geographic hotspot visualization
- Average resolution time metric
- Issue history timeline
- Citizen notifications

### ❌ OUT OF SCOPE (Post-MVP)
- Real ML model training
- Advanced authentication (OAuth, 2FA)
- Email notifications
- Mobile app
- Real-time updates
- Cloud storage
- Government API integration
- Multi-language support

### Non-Functional Requirements
- Runs 100% locally (no paid APIs)
- Simple setup (2-3 commands max)
- Responsive design (works on mobile and desktop)
- Fast image upload (<3 seconds)
- Clean, professional UI
- Extensible architecture for future enhancements

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────────┐              ┌──────────────────────┐ │
│  │  Citizen Portal  │              │  Government Portal   │ │
│  │  - Report Issue  │              │  - Dashboard         │ │
│  │  - Track Status  │              │  - Map View          │ │
│  └──────────────────┘              │  - Issue Management  │ │
│                                     └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
                    HTTP/REST API
                             │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │   Auth     │  │   Issues   │  │   Admin/Analytics   │   │
│  │  Service   │  │  Service   │  │      Service        │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│                          │                                   │
│                  ┌───────▼────────┐                          │
│                  │  AI/ML Service │                          │
│                  │  - Classify    │                          │
│                  │  - Duplicate   │                          │
│                  │  - Priority    │                          │
│                  └────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  SQLite DB      │
                    │  + File Storage │
                    └─────────────────┘
```

### Technology Stack (Optimized for 24h)

**Frontend** (Minimal, Fast Setup)
- React 18 with TypeScript
- Vite (fastest dev server)
- Tailwind CSS (utility-first, no custom CSS needed)
- React Router (routing)
- Leaflet + React-Leaflet (maps)
- Recharts (simple charts)
- Axios (API calls)
- **No** complex UI libraries - keep it simple

**Backend** (Lean Python Stack)
- Python 3.10+
- FastAPI (auto-docs, fast development)
- SQLAlchemy (ORM)
- Pydantic (validation)
- Pillow (image processing - resize, thumbnails)
- python-multipart (file uploads)
- passlib + python-jose (simple JWT)
- **No** ML libraries required for MVP

**AI/ML** (MVP: 100% Rule-Based, Future: Real AI)
- MVP Implementation: **Rule-based heuristics ONLY**
- Pillow (image resizing and thumbnails only)
- imagehash (optional, lightweight - for duplicate detection only)
- **ABSOLUTELY NO**: CLIP, PyTorch, Transformers, Hugging Face, TensorFlow, or any ML models
- **NO** model downloads or loading
- **NO** embeddings stored in database
- Architecture designed for easy AI upgrade later

**Database**
- SQLite (single file, zero config)

**Maps**
- Leaflet.js + OpenStreetMap (free, no API key)

---

## 3. Database Schema

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL, -- 'citizen' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issues table
CREATE TABLE issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'resolved'
    priority_score FLOAT NOT NULL,
    
    -- Location
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    address TEXT,
    
    -- Images
    image_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    
    -- AI Analysis
    ai_category_confidence FLOAT,
    ai_severity_confidence FLOAT,
    ai_analysis_notes TEXT,
    
    -- NO image embeddings in MVP
    -- Future: Add embedding column when upgrading to real AI
    
    -- Assignment
    assigned_department VARCHAR(100),
    assigned_at TIMESTAMP,
    
    -- Resolution
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    resolution_image_path VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Duplicate Groups table (tracks which issues are duplicates)
CREATE TABLE duplicate_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primary_issue_id INTEGER NOT NULL,
    duplicate_issue_id INTEGER NOT NULL,
    similarity_score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (primary_issue_id) REFERENCES issues(id),
    FOREIGN KEY (duplicate_issue_id) REFERENCES issues(id),
    UNIQUE(primary_issue_id, duplicate_issue_id)
);

-- Issue History (status changes)
CREATE TABLE issue_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    changed_by_user_id INTEGER,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (issue_id) REFERENCES issues(id),
    FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_category ON issues(category);
CREATE INDEX idx_issues_priority ON issues(priority_score DESC);
CREATE INDEX idx_issues_location ON issues(latitude, longitude);
CREATE INDEX idx_issues_user ON issues(user_id);
CREATE INDEX idx_duplicate_groups_primary ON duplicate_groups(primary_issue_id);
```

---

## 4. API Structure

### Authentication Endpoints
```
POST   /api/auth/register        - Register new user
POST   /api/auth/login           - Login (returns JWT token)
GET    /api/auth/me              - Get current user info
```

### Citizen Endpoints
```
POST   /api/issues               - Create new issue (with image upload)
GET    /api/issues/my            - Get my submitted issues
GET    /api/issues/{id}          - Get single issue details
```

### Admin Endpoints
```
GET    /api/admin/issues         - List all issues (with filters)
GET    /api/admin/issues/{id}    - Get issue details
PATCH  /api/admin/issues/{id}    - Update issue (status, department, notes)
POST   /api/admin/issues/{id}/resolve - Upload resolution evidence

GET    /api/admin/dashboard      - Get dashboard statistics
GET    /api/admin/analytics      - Get analytics data
```

### Utility Endpoints
```
GET    /api/categories           - Get list of issue categories
GET    /api/departments          - Get list of departments
```

### Request/Response Examples

**POST /api/issues** (multipart/form-data)
```
{
  "description": "Large pothole near intersection",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "address": "Connaught Place, New Delhi",
  "image": <file>
}
```

Response:
```json
{
  "id": 123,
  "category": "pothole",
  "severity": "high",
  "priority_score": 78.5,
  "status": "pending",
  "ai_analysis": {
    "category": "pothole",
    "confidence": 0.92,
    "severity": "high",
    "notes": "Large road damage detected with potential safety hazard"
  },
  "duplicate_count": 2,
  "created_at": "2026-08-14T10:30:00Z"
}
```

**GET /api/admin/dashboard**
```json
{
  "total_issues": 1247,
  "by_status": {
    "pending": 234,
    "assigned": 156,
    "in_progress": 89,
    "resolved": 768
  },
  "by_category": {
    "pothole": 423,
    "streetlight": 198,
    "garbage": 287,
    "drainage": 156,
    "footpath": 183
  },
  "high_priority_count": 67,
  "avg_resolution_time_hours": 48.5,
  "recent_issues": [...]
}
```

---

## 5. Frontend Structure

```
frontend/
├── public/
│   └── images/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Loader.tsx
│   │   │   └── Modal.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── citizen/
│   │   │   ├── IssueSubmitForm.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── LocationPicker.tsx
│   │   │   ├── MyIssuesList.tsx
│   │   │   └── IssueDetailCard.tsx
│   │   └── admin/
│   │       ├── Dashboard.tsx
│   │       ├── IssuesTable.tsx
│   │       ├── IssuesMap.tsx
│   │       ├── IssueDetail.tsx
│   │       ├── StatusUpdateForm.tsx
│   │       ├── ResolutionUpload.tsx
│   │       ├── StatCard.tsx
│   │       └── AnalyticsCharts.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── citizen/
│   │   │   ├── ReportIssuePage.tsx
│   │   │   └── MyIssuesPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── IssuesListPage.tsx
│   │       ├── IssuesMapPage.tsx
│   │       └── IssueDetailPage.tsx
│   ├── services/
│   │   ├── api.ts          - Axios instance
│   │   ├── authService.ts
│   │   ├── issueService.ts
│   │   └── adminService.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useIssues.ts
│   │   └── useGeolocation.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── types/
│   │   └── index.ts        - TypeScript interfaces
│   ├── utils/
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### Key UI Pages

1. **Citizen Portal**
   - Landing page with clear "Report Issue" CTA
   - Simple form: photo upload + location + optional description
   - Real-time AI analysis feedback
   - "My Issues" page with status tracking

2. **Admin Portal**
   - Dashboard with key metrics and charts
   - Issues list with advanced filtering
   - Interactive map showing all issues (color-coded by priority)
   - Issue detail page with status update, assignment, resolution tools

---

## 6. AI/ML Service Design (MVP: 100% Lightweight Heuristics)

### 🎯 Design Principle: Clean Interface, Zero ML Dependencies

The AI service MUST have a clean interface so it can be replaced with real computer vision later without touching any other code.

### ⚠️ CRITICAL: NO MACHINE LEARNING IN MVP

**Absolutely forbidden in MVP:**
- ❌ CLIP
- ❌ PyTorch
- ❌ TensorFlow
- ❌ Transformers
- ❌ Hugging Face models
- ❌ Any model downloads
- ❌ Image embeddings
- ❌ Neural networks

**MVP uses ONLY:**
- ✅ Keyword matching from user description
- ✅ User-selected category (if provided)
- ✅ Rule-based severity logic
- ✅ Pillow for basic image info (size, format only)
- ✅ Simple heuristics

### AI Service Interface (Contract - DO NOT CHANGE)

```python
# backend/services/ai_service.py

class AIAnalysisService:
    """
    Modular AI service with clean interface.
    
    MVP: 100% rule-based heuristics (NO ML)
    Future: Swap with CLIP, GPT-4V, or custom model
    
    This interface MUST NOT change when upgrading to real AI.
    """
    
    def analyze_image(self, 
                     image_path: str, 
                     user_description: str = "",
                     user_category: str = None) -> dict:
        """
        Analyze civic issue image and return classification.
        
        DO NOT change this method signature.
        
        Args:
            image_path: Path to uploaded image
            user_description: Optional text description from citizen
            user_category: Optional category selected by citizen
            
        Returns:
            {
                'category': str,           # One of VALID_CATEGORIES
                'severity': str,           # 'low', 'medium', 'high', 'critical'
                'confidence': float,       # 0.0 to 1.0
                'analysis_notes': str      # Human-readable explanation
            }
        """
        pass
```

### MVP Implementation (Rule-Based Only)

```python
# backend/services/ai_service.py

from PIL import Image
import os

VALID_CATEGORIES = [
    'pothole',
    'streetlight',
    'footpath',
    'garbage',
    'drainage',
    'traffic_sign',
    'water_leakage',
    'other'
]

class AIAnalysisService:
    """MVP: Rule-based analysis using keywords and heuristics"""
    
    def analyze_image(self, 
                     image_path: str, 
                     user_description: str = "",
                     user_category: str = None) -> dict:
        """
        MVP Implementation: Use keywords and rules
        
        Priority:
        1. If user selected category, use it
        2. If user description has keywords, match category
        3. Otherwise, default to 'other'
        """
        
        # If user already selected category, trust them
        if user_category and user_category in VALID_CATEGORIES:
            category = user_category
            confidence = 0.95  # High confidence - user knows their issue
        else:
            # Match category from description keywords
            category = self._match_category_from_text(user_description)
            confidence = 0.75 if category != 'other' else 0.50
        
        # Estimate severity from description
        severity = self._estimate_severity(category, user_description)
        
        # Generate analysis notes
        notes = self._generate_notes(category, severity, user_description)
        
        return {
            'category': category,
            'severity': severity,
            'confidence': confidence,
            'analysis_notes': notes
        }
    
    def _match_category_from_text(self, text: str) -> str:
        """
        Match category using keyword detection.
        NO machine learning - just string matching.
        """
        if not text:
            return 'other'
        
        text_lower = text.lower()
        
        # Keyword dictionary
        category_keywords = {
            'pothole': [
                'pothole', 'pot hole', 'road damage', 'crack', 'hole in road', 
                'asphalt', 'pavement crack', 'road crack', 'broken road',
                'uneven road', 'road hole'
            ],
            'streetlight': [
                'street light', 'streetlight', 'lamp', 'light not working',
                'light broken', 'dark', 'no light', 'bulb', 'lighting',
                'light pole', 'lamp post'
            ],
            'footpath': [
                'footpath', 'foot path', 'sidewalk', 'pavement', 'walkway',
                'pedestrian', 'path', 'broken sidewalk', 'damaged pavement'
            ],
            'garbage': [
                'garbage', 'waste', 'trash', 'litter', 'dump', 'rubbish',
                'dirty', 'filth', 'waste pile', 'trash heap', 'garbage pile'
            ],
            'drainage': [
                'drain', 'drainage', 'manhole', 'sewer', 'water logging',
                'flooding', 'open manhole', 'blocked drain', 'clogged',
                'water accumulation', 'stagnant water'
            ],
            'traffic_sign': [
                'sign', 'signal', 'traffic sign', 'road sign', 'board',
                'traffic light', 'stop sign', 'warning sign', 'damaged sign',
                'missing sign', 'bent sign'
            ],
            'water_leakage': [
                'water', 'leak', 'leakage', 'pipe', 'burst', 'water leak',
                'broken pipe', 'water flow', 'pipe burst', 'water waste'
            ],
        }
        
        # Check each category
        for category, keywords in category_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return category
        
        return 'other'
    
    def _estimate_severity(self, category: str, description: str) -> str:
        """
        Estimate severity using rules.
        NO machine learning.
        """
        description_lower = description.lower()
        
        # Critical severity keywords
        critical_keywords = [
            'dangerous', 'urgent', 'accident', 'injury', 'injured',
            'critical', 'emergency', 'life threatening', 'severe danger',
            'immediate', 'fell', 'hurt'
        ]
        
        if any(word in description_lower for word in critical_keywords):
            return 'critical'
        
        # High severity keywords
        high_keywords = [
            'large', 'big', 'major', 'severe', 'bad', 'serious',
            'deep', 'wide', 'huge', 'extensive', 'significant'
        ]
        
        if any(word in description_lower for word in high_keywords):
            return 'high'
        
        # Low severity keywords
        low_keywords = [
            'small', 'minor', 'little', 'tiny', 'slight'
        ]
        
        if any(word in description_lower for word in low_keywords):
            return 'low'
        
        # Category-based default severity
        high_risk_categories = ['drainage', 'pothole', 'traffic_sign']
        if category in high_risk_categories:
            return 'high'
        
        # Default to medium
        return 'medium'
    
    def _generate_notes(self, category: str, severity: str, description: str) -> str:
        """Generate human-readable analysis notes"""
        
        category_names = {
            'pothole': 'Road Damage/Pothole',
            'streetlight': 'Street Lighting Issue',
            'footpath': 'Footpath/Sidewalk Damage',
            'garbage': 'Waste/Garbage Accumulation',
            'drainage': 'Drainage/Manhole Issue',
            'traffic_sign': 'Traffic Sign/Signal Issue',
            'water_leakage': 'Water Leakage',
            'other': 'Other Infrastructure Issue'
        }
        
        category_name = category_names.get(category, 'Infrastructure Issue')
        
        if description:
            return f"Classified as {category_name} with {severity} severity based on description."
        else:
            return f"Classified as {category_name} with {severity} severity."
```

### Duplicate Detection (NO CLIP - Use Location + Optional Image Hash)

```python
# backend/services/duplicate_service.py

from typing import List, Dict
import math

# Optional - only if installed and working
try:
    import imagehash
    from PIL import Image
    HAS_IMAGEHASH = True
except ImportError:
    HAS_IMAGEHASH = False

class DuplicateDetectionService:
    """
    MVP: Location + Category matching
    Optional: Simple image hashing (NOT CLIP embeddings)
    """
    
    def __init__(self, proximity_radius_m: float = 50):
        self.proximity_radius_m = proximity_radius_m
    
    def check_duplicates(self, 
                        new_issue_lat: float,
                        new_issue_lon: float,
                        new_issue_category: str,
                        new_issue_image_path: str,
                        existing_issues: List[dict]) -> List[dict]:
        """
        Find potential duplicates using:
        1. GPS proximity (REQUIRED)
        2. Category match (REQUIRED)
        3. Image similarity (OPTIONAL - only if imagehash available)
        
        NO CLIP embeddings, NO neural networks
        
        Returns list of potential duplicates with scores
        """
        
        duplicates = []
        
        for existing in existing_issues:
            # Skip resolved issues
            if existing.get('status') == 'resolved':
                continue
            
            # Stage 1: GPS proximity check
            distance = self._haversine_distance(
                new_issue_lat, new_issue_lon,
                existing['latitude'], existing['longitude']
            )
            
            if distance > self.proximity_radius_m:
                continue  # Too far away
            
            # Stage 2: Category match
            if new_issue_category != existing['category']:
                continue  # Different issue type
            
            # Base score: within radius + same category = likely duplicate
            base_score = 0.75
            
            # Stage 3: Image similarity (optional enhancement)
            visual_similarity = 0.0
            if HAS_IMAGEHASH:
                try:
                    visual_similarity = self._compare_image_hashes(
                        new_issue_image_path,
                        existing['image_path']
                    )
                except:
                    visual_similarity = 0.0
            
            # Combine scores
            total_score = base_score + (visual_similarity * 0.25)
            
            if total_score >= 0.70:  # Threshold for duplicate
                duplicates.append({
                    'issue_id': existing['id'],
                    'similarity_score': round(total_score, 3),
                    'distance_meters': round(distance, 1),
                    'visual_match': visual_similarity > 0
                })
        
        # Sort by similarity score
        duplicates.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return duplicates
    
    def _haversine_distance(self, lat1: float, lon1: float, 
                           lat2: float, lon2: float) -> float:
        """
        Calculate distance between two GPS points in meters.
        Uses Haversine formula.
        """
        # Earth radius in meters
        R = 6371000
        
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return distance
    
    def _compare_image_hashes(self, img1_path: str, img2_path: str) -> float:
        """
        Optional: Compare images using perceptual hashing.
        
        Uses imagehash library (lightweight, no ML).
        NOT CLIP embeddings.
        
        Returns similarity score 0.0 to 1.0
        """
        if not HAS_IMAGEHASH:
            return 0.0
        
        try:
            # Compute perceptual hashes
            hash1 = imagehash.average_hash(Image.open(img1_path))
            hash2 = imagehash.average_hash(Image.open(img2_path))
            
            # Calculate similarity (inverse of hamming distance)
            hamming_distance = hash1 - hash2
            max_distance = 64  # For average_hash
            
            similarity = 1.0 - (hamming_distance / max_distance)
            
            return max(0.0, similarity)
        except Exception as e:
            # If anything fails, just return 0
            return 0.0
```

### Priority Scoring (Rule-Based - Unchanged)

```python
# backend/services/priority_service.py

from datetime import datetime

class PriorityService:
    """
    Calculate priority score (0-100) using rule-based formula.
    NO machine learning needed.
    """
    
    def calculate_priority_score(self, 
                                 severity: str,
                                 category: str,
                                 duplicate_count: int,
                                 created_at: datetime) -> float:
        """
        Calculate priority score.
        
        Formula:
        - Severity: 40%
        - Safety Risk (category): 30%
        - Duplicate Count: 20%
        - Age: 10%
        
        Returns: Score from 0-100
        """
        
        # 1. Severity score (0-100)
        severity_scores = {
            'critical': 100,
            'high': 75,
            'medium': 50,
            'low': 25
        }
        severity_score = severity_scores.get(severity.lower(), 50)
        
        # 2. Safety risk by category (0-100)
        safety_scores = {
            'pothole': 90,           # High accident risk
            'drainage': 85,          # Falling hazard, flooding
            'traffic_sign': 80,      # Traffic safety
            'streetlight': 70,       # Safety in dark areas
            'footpath': 65,          # Pedestrian safety
            'water_leakage': 60,     # Infrastructure damage
            'garbage': 40,           # Health risk, lower urgency
            'other': 50              # Default
        }
        safety_score = safety_scores.get(category, 50)
        
        # 3. Duplicate count score (0-100)
        # More reports = higher community concern = higher priority
        duplicate_score = min(duplicate_count * 15, 100)
        
        # 4. Age score (0-100)
        # Older unresolved issues get higher priority
        days_old = (datetime.now() - created_at).days
        age_score = min(days_old * 3, 100)
        
        # Weighted average
        priority = (
            severity_score * 0.40 +
            safety_score * 0.30 +
            duplicate_score * 0.20 +
            age_score * 0.10
        )
        
        return round(priority, 2)
```

### Future Upgrade Path (Post-MVP)

When ready to add real AI, just swap the implementation:

```python
# Option A: Use CLIP (post-MVP)
from transformers import CLIPProcessor, CLIPModel

class CLIPAnalysisService(AIAnalysisService):
    """Upgraded AI using CLIP model"""
    
    def __init__(self):
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    
    def analyze_image(self, image_path, user_description="", user_category=None):
        # Use CLIP for real vision analysis
        # SAME return signature - no other code changes needed
        ...

# Option B: Use GPT-4 Vision (post-MVP)
class GPT4VisionService(AIAnalysisService):
    def analyze_image(self, image_path, user_description="", user_category=None):
        # Call OpenAI API
        # SAME return signature
        ...

# Just change instantiation in main.py - no other code changes:
# MVP:    ai_service = AIAnalysisService()
# Future: ai_service = CLIPAnalysisService()
```

### Configuration

```python
# backend/config.py

AI_CONFIG = {
    # MVP: rule-based only
    'mode': 'rule-based',  # DO NOT use 'clip' or 'ml' in MVP
    
    'duplicate_detection': {
        'proximity_radius_meters': 50,
        'use_image_hashing': True,  # Optional - only if imagehash works
        'similarity_threshold': 0.70
    },
    
    'priority_scoring': {
        'weights': {
            'severity': 0.40,
            'safety_risk': 0.30,
            'duplicate_count': 0.20,
            'age': 0.10
        }
    }
}
```

### Dependencies (requirements.txt)

```txt
# Core backend
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
pydantic==2.5.0

# Database
sqlalchemy==2.0.23

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Image handling
Pillow==10.1.0

# Optional: For image-based duplicate detection
# Only install if needed and working
imagehash==4.3.1

# NO CLIP
# NO torch
# NO transformers
# NO tensorflow
# NO huggingface-hub
```

---

## 7. Priority Scoring Logic (Already Defined Above)

See AI/ML Service Design section for complete implementation.

---

## 8. Duplicate Detection Approach (Already Defined Above)

See AI/ML Service Design section for complete implementation.

---

## 9. Authentication & Role Approach (Simple Demo Auth)

### Minimal JWT-Based Auth for MVP

**Goal**: Functional role-based access, not production security

**Implementation:**
```python
# Simple JWT with 2 roles: 'citizen' and 'admin'

# JWT payload
{
  "sub": user_id,
  "email": "user@example.com",
  "role": "citizen" | "admin",
  "exp": timestamp
}

# Protected route example
@app.get("/api/admin/issues")
async def get_all_issues(current_user: User = Depends(get_current_admin_user)):
    # Only accessible if role == 'admin'
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return issues
```

**Endpoints:**
```
POST /api/auth/register    - Register (email, password, full_name)
POST /api/auth/login       - Login (returns JWT)
GET  /api/auth/me          - Get current user info
```

**Demo Accounts** (seeded in database):
```python
# Admin account
Email: admin@civicfix.example
Password: admin123
Role: admin

# Test citizen account
Email: citizen@test.example
Password: test123
Role: citizen
```

**Frontend Auth Flow:**
1. Login → get JWT token
2. Store in localStorage
3. Send in Authorization header: `Bearer <token>`
4. Redirect based on role:
   - Citizen → /report or /my-issues
   - Admin → /admin/dashboard

**No Password Reset, No Email Verification** (out of scope for MVP)

---

## 10. Implementation Tasks (24-Hour Prioritized Plan)

### 🔴 PHASE 1: Foundation & Setup (Hours 1-4)

**Goal**: Project running locally with auth and database

#### Task 1.1: Project Initialization (30 min)
- [ ] Create project structure (backend/ and frontend/ folders)
- [ ] Initialize backend with FastAPI
  - [ ] Create `requirements.txt` (FastAPI, SQLAlchemy, Pillow, python-jose, passlib)
  - [ ] Create `main.py` with basic FastAPI app
  - [ ] Setup CORS for local development
- [ ] Initialize frontend with Vite + React + TypeScript
  - [ ] `npm create vite@latest frontend -- --template react-ts`
  - [ ] Install dependencies (react-router-dom, axios, tailwindcss, leaflet, recharts)
  - [ ] Configure Tailwind CSS
- [ ] Create README with setup instructions

#### Task 1.2: Database Setup (45 min)
- [ ] Create SQLAlchemy models (`backend/models.py`)
  - [ ] User model
  - [ ] Issue model
  - [ ] DuplicateGroup model (simplified)
  - [ ] IssueHistory model (optional for MVP)
- [ ] Create database initialization script (`backend/init_db.py`)
- [ ] Create seed data script with:
  - [ ] Admin account (admin@civicfix.example / admin123)
  - [ ] Test citizen account (citizen@test.example / test123)
  - [ ] 10-15 sample issues with various statuses
- [ ] Test database creation

#### Task 1.3: Authentication System (1.5 hours)
- [ ] Backend auth implementation (`backend/auth.py`)
  - [ ] Password hashing (passlib)
  - [ ] JWT token generation (python-jose)
  - [ ] Token verification
  - [ ] get_current_user dependency
  - [ ] get_current_admin_user dependency
- [ ] Auth API endpoints (`backend/routers/auth.py`)
  - [ ] POST /api/auth/register
  - [ ] POST /api/auth/login
  - [ ] GET /api/auth/me
- [ ] Frontend auth service (`frontend/src/services/authService.ts`)
  - [ ] login(), register(), logout(), getCurrentUser()
  - [ ] Token storage in localStorage
- [ ] Auth context (`frontend/src/context/AuthContext.tsx`)
- [ ] Protected route component
- [ ] Login page UI
- [ ] Register page UI
- [ ] Test: Can register, login, and access protected routes

#### Task 1.4: Basic Layout & Routing (45 min)
- [ ] Frontend routing setup
  - [ ] / - Landing page
  - [ ] /login - Login page
  - [ ] /register - Register page
  - [ ] /report - Citizen: Report issue
  - [ ] /my-issues - Citizen: My issues
  - [ ] /admin/dashboard - Admin: Dashboard
  - [ ] /admin/issues - Admin: Issues list
  - [ ] /admin/map - Admin: Map view
- [ ] Header component (logo, nav, user menu)
- [ ] Role-based navigation menu
- [ ] Basic responsive layout

**✅ Phase 1 Checkpoint**: 
- Backend running on http://localhost:8000
- Frontend running on http://localhost:5173
- Can login as admin or citizen
- Protected routes working

---

### 🟡 PHASE 2: Citizen Features - Issue Submission (Hours 5-8)

**Goal**: Citizens can submit issues with photos and location

#### Task 2.1: AI Service Implementation (1 hour)
- [ ] Create AI service with clean interface (`backend/services/ai_service.py`)
- [ ] Implement **rule-based** `analyze_image()` method (NO ML)
  - [ ] Keyword matching from description
  - [ ] User-selected category (if provided)
  - [ ] Severity estimation from keywords
  - [ ] Default category/severity logic
- [ ] Create duplicate detection service (`backend/services/duplicate_service.py`)
  - [ ] Haversine distance calculation
  - [ ] GPS proximity check (50m radius)
  - [ ] Category matching
  - [ ] Optional: imagehash comparison (if available)
- [ ] Create priority scoring service (`backend/services/priority_service.py`)
  - [ ] Implement rule-based priority calculation
  - [ ] Severity 40%, Safety 30%, Duplicates 20%, Age 10%
- [ ] Test AI service with sample data
- [ ] **Verify: NO CLIP, NO PyTorch, NO Transformers, NO model downloads**

#### Task 2.2: Image Upload & Storage (45 min)
- [ ] Create uploads directory structure
- [ ] Image upload utility (`backend/utils/image_handler.py`)
  - [ ] Save uploaded image
  - [ ] Generate thumbnail (Pillow)
  - [ ] Validate file type and size
- [ ] Test image upload endpoint

#### Task 2.3: Issue Submission Backend (1 hour)
- [ ] Issue API endpoints (`backend/routers/issues.py`)
  - [ ] POST /api/issues (create issue with image)
  - [ ] GET /api/issues/my (get current user's issues)
  - [ ] GET /api/issues/{id} (get single issue)
- [ ] Integrate **rule-based** AI analysis in POST endpoint
- [ ] Call duplicate detection service (location + category + optional imagehash)
- [ ] Calculate and store priority score
- [ ] Link duplicate issues in database
- [ ] Test endpoints with Postman/curl
- [ ] **Verify: No ML dependencies used**

#### Task 2.4: Issue Submission Frontend (1.5 hours)
- [ ] Image upload component with preview
- [ ] Location picker component (Leaflet map + GPS button)
- [ ] Issue submission form
  - [ ] Category dropdown (optional - user can select, or AI will suggest)
  - [ ] Description textarea
  - [ ] Submit button with loading state
- [ ] Show AI analysis results after submission
  - [ ] Detected/confirmed category
  - [ ] Severity level
  - [ ] Priority score
  - [ ] Duplicate count if any
- [ ] Success message and redirect to "My Issues"
- [ ] Error handling and validation

#### Task 2.5: My Issues Page (45 min)
- [ ] Fetch and display user's submitted issues
- [ ] Issue card component showing:
  - [ ] Thumbnail
  - [ ] Category and severity badges
  - [ ] Status badge
  - [ ] Priority score
  - [ ] Submission date
  - [ ] Location
- [ ] Click to view details modal/page
- [ ] Loading and empty states

**✅ Phase 2 Checkpoint**:
- Citizens can upload photo + select location + optionally select category + add description
- Rule-based AI analyzes and suggests/confirms category and severity (NO ML)
- Priority score calculated using rule-based formula
- Duplicates detected using GPS + category + optional imagehash
- Issue appears in "My Issues" page with all analysis data
- **Verify: Absolutely no CLIP, PyTorch, or ML dependencies running**

---

### 🟢 PHASE 3: Admin Features - Dashboard & Management (Hours 9-14)

**Goal**: Admins can view, filter, and manage all issues

#### Task 3.1: Admin Dashboard Backend (1 hour)
- [ ] Admin API endpoints (`backend/routers/admin.py`)
  - [ ] GET /api/admin/dashboard (statistics)
  - [ ] GET /api/admin/issues (list with filters)
  - [ ] GET /api/admin/issues/{id} (detail)
  - [ ] PATCH /api/admin/issues/{id} (update status, assign dept)
- [ ] Dashboard statistics logic:
  - [ ] Total issues count
  - [ ] Count by status
  - [ ] Count by category
  - [ ] Critical/high priority count
  - [ ] Recent issues (last 10)
- [ ] Filtering logic (status, category, priority)

#### Task 3.2: Admin Dashboard Frontend (2 hours)
- [ ] Dashboard layout component
- [ ] Stat cards (4 cards: total, pending, critical, resolved)
- [ ] Issues by category bar chart (Recharts)
- [ ] Issues by status pie chart (Recharts)
- [ ] Recent high-priority issues table
- [ ] Responsive grid layout

#### Task 3.3: Issues List Page (1.5 hours)
- [ ] Issues table component with:
  - [ ] Thumbnail, ID, Category, Severity, Status, Priority, Date
  - [ ] Click row to view details
- [ ] Filter controls:
  - [ ] Status dropdown (All, Pending, Assigned, In Progress, Resolved)
  - [ ] Category dropdown
  - [ ] Priority range selector
- [ ] Sort functionality (by date, priority)
- [ ] Pagination (if time permits, otherwise show all)
- [ ] Loading and empty states

#### Task 3.4: Issue Detail & Management (2 hours)
- [ ] Issue detail page/modal showing:
  - [ ] Full-size image
  - [ ] All issue metadata
  - [ ] Location on map
  - [ ] AI analysis details
  - [ ] Duplicate count and list
  - [ ] Status history (if implemented)
- [ ] Management controls:
  - [ ] Status update dropdown
  - [ ] Department assignment dropdown
  - [ ] Admin notes textarea
  - [ ] Save button
- [ ] Update issue backend endpoint integration
- [ ] Success/error notifications

#### Task 3.5: Map View (1.5 hours)
- [ ] Integrate Leaflet + React-Leaflet
- [ ] Display all issues as markers
- [ ] Color-code markers by priority:
  - [ ] Red: Critical (80-100)
  - [ ] Orange: High (60-79)
  - [ ] Yellow: Medium (40-59)
  - [ ] Green: Low (0-39)
- [ ] Marker popup showing:
  - [ ] Thumbnail
  - [ ] Category and severity
  - [ ] Status
  - [ ] Click to view full details
- [ ] Map controls and zoom
- [ ] Filter markers by status/category

**✅ Phase 3 Checkpoint**:
- Admin can view dashboard with statistics
- Admin can see all issues in table view
- Admin can filter and sort issues
- Admin can view issue details
- Admin can update status and assign department
- Admin can view all issues on map

---

### 🔵 PHASE 4: Resolution & Polish (Hours 15-20)

**Goal**: Complete the workflow + UI polish

#### Task 4.1: Resolution Upload (1.5 hours)
- [ ] Backend: POST /api/admin/issues/{id}/resolve endpoint
  - [ ] Upload resolution photo
  - [ ] Add resolution notes
  - [ ] Update status to 'resolved'
  - [ ] Record resolved_at timestamp
- [ ] Frontend: Resolution upload form in issue detail page
  - [ ] Upload resolution image
  - [ ] Resolution notes textarea
  - [ ] Mark as resolved button
- [ ] Show resolution evidence in citizen view
  - [ ] Before/after images side by side
  - [ ] Resolution notes

#### Task 4.2: Duplicate Detection Testing & Refinement (1 hour)
- [ ] Test duplicate detection with sample issues
  - [ ] Create issues at same GPS coordinates
  - [ ] Test proximity threshold (within 50m)
  - [ ] Test category matching
  - [ ] Test imagehash comparison (if available)
- [ ] Show duplicate issues list in admin detail view
- [ ] Add "View Duplicate" links
- [ ] Display duplicate count badge on issue cards
- [ ] Verify location-based detection is primary method
- [ ] **Verify: No CLIP embeddings, no neural networks**

#### Task 4.3: Priority Score Refinement (45 min)
- [ ] Add background job or endpoint to recalculate priority for old issues
- [ ] Update priority when duplicates are added
- [ ] Test priority scoring with various scenarios

#### Task 4.4: UI Polish (2 hours)
- [ ] Consistent color scheme and styling
- [ ] Responsive design fixes
- [ ] Loading spinners
- [ ] Error messages and toast notifications
- [ ] Empty states with helpful messages
- [ ] Button hover states and transitions
- [ ] Form validation messages
- [ ] Badge colors for status/severity/priority
- [ ] Professional typography

#### Task 4.5: Mobile Responsiveness (1 hour)
- [ ] Test on mobile viewport
- [ ] Fix layout issues
- [ ] Ensure map works on mobile
- [ ] Touch-friendly buttons and inputs
- [ ] Mobile navigation menu

#### Task 4.6: Demo Data & Testing (1.5 hours)
- [ ] Create comprehensive seed data:
  - [ ] 20-30 sample issues across all categories
  - [ ] Mix of statuses (pending, assigned, in progress, resolved)
  - [ ] Some with duplicates (same location)
  - [ ] Various priorities
  - [ ] Some with resolution evidence
- [ ] Test complete citizen workflow
- [ ] Test complete admin workflow
- [ ] Fix critical bugs
- [ ] Edge case testing

**✅ Phase 4 Checkpoint**:
- Complete end-to-end workflow working
- Resolution upload and evidence display working
- UI polished and responsive
- Demo data loaded

---

### 🟣 PHASE 5: Documentation & Final Polish (Hours 21-24)

**Goal**: Production-ready demo

#### Task 5.1: Documentation (1.5 hours)
- [ ] Update README.md with:
  - [ ] Project overview and features
  - [ ] Tech stack
  - [ ] Setup instructions (step-by-step)
  - [ ] Demo account credentials
  - [ ] API documentation
  - [ ] Screenshots
- [ ] Create ARCHITECTURE.md (this file)
- [ ] Add code comments where needed
- [ ] Create simple user guide

#### Task 5.2: Performance & Optimization (1 hour)
- [ ] Optimize image loading (lazy loading)
- [ ] Add database indexes if missing
- [ ] Minimize bundle size (frontend)
- [ ] Remove console.logs
- [ ] Check for memory leaks

#### Task 5.3: Error Handling & Edge Cases (1 hour)
- [ ] Proper error messages throughout app
- [ ] Handle network failures gracefully
- [ ] Handle missing data cases
- [ ] Handle invalid inputs
- [ ] Test with slow internet (simulate)

#### Task 5.4: Final Testing (1 hour)
- [ ] Fresh database initialization test
- [ ] Complete workflow test (submit → manage → resolve)
- [ ] Cross-browser testing (Chrome, Firefox)
- [ ] Mobile testing
- [ ] Fix any remaining bugs

#### Task 5.5: Presentation Prep (30 min)
- [ ] Take screenshots for demo
- [ ] Prepare talking points
- [ ] Test demo flow
- [ ] Prepare backup plan (in case of technical issues)

**✅ Phase 5 Checkpoint**:
- Documentation complete
- All features working
- No critical bugs
- Ready to demo!

---

## Task Summary by Priority

### 🔥 CRITICAL (Must Complete)
- ✅ Database setup with models (NO embedding columns in MVP)
- ✅ Auth system (login, register, JWT)
- ✅ Issue submission (photo, location, optional category, description)
- ✅ Rule-based AI service (keyword matching, NO ML)
- ✅ Priority scoring (rule-based formula)
- ✅ Duplicate detection (GPS + category + optional imagehash)
- ✅ Admin dashboard (stats and charts)
- ✅ Issue management (view, filter, update status, assign department)
- ✅ Map view (all issues, color-coded by priority)
- ✅ Complete workflow (submit → analyze → assign → resolve → display)
- ✅ **Verify throughout: NO CLIP, NO PyTorch, NO ML models**

### ⚠️ IMPORTANT (Should Complete)
- ⭕ Duplicate detection refinement and testing
- ⭕ Resolution upload and display
- ⭕ Responsive design
- ⭕ Demo data (various categories, statuses, locations)
- ⭕ Documentation

### 💡 NICE TO HAVE (If Time Permits)
- ⭕ Image hashing for duplicate detection (imagehash - only if easy to add)
- ⭕ Issue history tracking
- ⭕ Geographic hotspot visualization
- ⭕ Advanced filtering options
- ⭕ Pagination for large datasets

### ❌ FORBIDDEN IN MVP
- ❌ CLIP model or any ML model training
- ❌ PyTorch, TensorFlow, or heavy ML frameworks
- ❌ Image embeddings in database
- ❌ Neural networks of any kind
- ❌ Model downloads or pre-trained model loading

---

## Time Allocation

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1: Foundation | 4 hours | Setup, auth, database |
| Phase 2: Citizen Features | 4 hours | Issue submission |
| Phase 3: Admin Features | 5 hours | Dashboard, management, map |
| Phase 4: Resolution & Polish | 5 hours | Complete workflow, UI |
| Phase 5: Documentation | 3 hours | Docs, testing, demo prep |
| **Buffer** | 3 hours | Bug fixes, unexpected issues |

**Total: 24 hours**

---

## Development Commands (Simple Setup)

### Quick Start

```bash
# 1. Clone/navigate to project
cd CivicFix-AI

# 2. Backend setup
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python init_db.py              # Creates database + seed data
uvicorn main:app --reload      # Starts on http://localhost:8000

# 3. Frontend setup (new terminal)
cd frontend
npm install
npm run dev                    # Starts on http://localhost:5173

# 4. Open browser
# http://localhost:5173
```

### Demo Accounts
```
Admin:
Email: admin@civicfix.example
Password: admin123

Citizen:
Email: citizen@test.example
Password: test123
```

---

## File Storage Structure

```
backend/
├── uploads/
│   ├── issues/
│   │   ├── original/
│   │   │   └── {issue_id}_{timestamp}.jpg
│   │   └── thumbnails/
│   │       └── {issue_id}_{timestamp}_thumb.jpg
│   └── resolutions/
│       └── {issue_id}_resolution_{timestamp}.jpg
└── database/
    └── civicfix.db
```

---

## Key Design Decisions for 24-Hour MVP

### 1. **Rule-Based AI Instead of ML Models**
   - ✅ Zero dependencies on ML frameworks
   - ✅ No model training, downloading, or loading
   - ✅ No GPU requirements
   - ✅ Instant startup time
   - ✅ Keyword matching + user selection + heuristics = acceptable for demo
   - 🔄 Clean interface allows swapping with CLIP/GPT-4V later
   - ⚠️ **CRITICAL**: Absolutely NO PyTorch, TensorFlow, Transformers, CLIP, or any ML in MVP

### 2. **GPS + Category for Duplicate Detection (Optional Image Hash)**
   - ✅ Fast and reliable (Haversine distance formula)
   - ✅ No ML or embeddings required
   - ✅ Location within 50m + same category = likely duplicate
   - 🔄 Can add lightweight imagehash if time permits
   - ⚠️ **NO CLIP embeddings, NO neural network similarity**
   - ✅ Good enough for MVP (catches obvious duplicates)

### 3. **SQLite Over PostgreSQL**
   - ✅ Zero setup, single file
   - ✅ Perfect for local demo
   - 🔄 Easy to migrate to PostgreSQL later

### 4. **Vite Over Create React App**
   - ✅ 10x faster dev server
   - ✅ Faster builds
   - ✅ Better DX for 24-hour timeline

### 5. **Tailwind CSS (No UI Library)**
   - ✅ No learning curve for complex components
   - ✅ Full control over styling
   - ✅ Fast to prototype
   - ✅ Looks professional with minimal effort

### 6. **JWT Over Sessions**
   - ✅ Stateless, simpler for MVP
   - ✅ No Redis or session storage needed
   - ✅ Works well with SPA architecture

### 7. **Local File Storage**
   - ✅ No S3, no cloud storage, no API keys
   - ✅ Works offline
   - 🔄 Easy to swap with S3 later

### 8. **Leaflet Over Google Maps**
   - ✅ Free, no API key, no billing
   - ✅ OpenStreetMap tiles are good quality
   - ✅ Full featured and well documented

### 9. **Demo Authentication**
   - ✅ Just email + password + role
   - ✅ No OAuth complexity
   - ✅ No password reset (out of scope)
   - 🔄 Can add proper auth system later

### 10. **Rule-Based Priority Scoring**
   - ✅ Transparent and explainable
   - ✅ Easy to adjust weights
   - ✅ No ML needed
   - ✅ Works immediately

---

## Success Metrics for 24-Hour MVP

At the end of 24 hours, the MVP MUST demonstrate:

### ✅ Core Workflow (Non-Negotiable)
1. **Citizen submits issue**
   - Upload photo ✓
   - Select location on map ✓
   - Add description ✓
   - Receive AI analysis (category, severity, priority) ✓

2. **Admin views and manages issue**
   - See issue on dashboard ✓
   - View on map ✓
   - Open issue detail ✓
   - Assign to department ✓
   - Change status ✓

3. **Admin resolves issue**
   - Upload resolution photo ✓
   - Add resolution notes ✓
   - Mark as resolved ✓

4. **Citizen sees resolution**
   - View resolved status ✓
   - See before/after photos ✓

### ✅ AI Features (MVP Level - Rule-Based Only)
- Rule-based category detection (keyword matching + user selection) ✓
- Rule-based severity estimation (keyword analysis) ✓
- Priority score calculated using formula (0-100) ✓
- Duplicate detection (GPS proximity + category + optional imagehash) ✓
- **VERIFY: Zero ML dependencies, zero model loading** ✓

### ✅ Admin Dashboard
- Total issues count ✓
- Issues by status ✓
- Issues by category ✓
- High priority issues count ✓
- Charts (bar chart, pie chart) ✓

### ✅ Map View
- All issues displayed as markers ✓
- Color-coded by priority ✓
- Click marker to view details ✓

### ✅ Professional Appearance
- Clean, modern UI ✓
- Responsive (works on mobile) ✓
- No obvious bugs ✓
- Looks like a real product ✓

### ✅ Local & Independent
- Runs 100% locally ✓
- No external API dependencies ✓
- No paid services ✓
- Simple 3-command setup ✓

---

## Risk Mitigation (24-Hour Focused)

### 🔴 HIGH RISK: Running Out of Time
**Mitigation:**
- Stick strictly to prioritized task list
- Core workflow MUST be completed first
- Cut nice-to-have features if behind schedule
- Use Tailwind for fast styling (no custom CSS)
- Copy-paste utility functions instead of over-engineering

**Fallback Plan:**
- Skip image similarity for duplicates (location only)
- Skip geographic hotspot visualization
- Skip issue history tracking
- Skip pagination (show all issues)

### 🟡 MEDIUM RISK: AI Analysis Not Accurate Enough
**Mitigation:**
- Rule-based AI with keyword matching is acceptable for MVP demo
- Allow users to manually select category if they want
- Use sensible defaults based on category safety profiles
- Make it clear in demo that AI is pluggable and can be upgraded
- Focus on showing the **workflow** rather than AI accuracy

**Upgrade Path:**
- Post-MVP: Add imagehash for better duplicate detection
- Post-MVP: Integrate CLIP for real computer vision
- Post-MVP: Use GPT-4 Vision API for analysis

### 🟢 LOW RISK: Map Not Loading
**Mitigation:**
- Leaflet is very stable
- Test early with sample markers
- Have table view as backup

### 🟢 LOW RISK: Image Upload Slow
**Mitigation:**
- Resize images client-side before upload
- Generate thumbnails server-side
- Show progress indicator
- Max 5MB file size

### 🟢 LOW RISK: Database Issues
**Mitigation:**
- SQLite is simple and reliable
- Keep schema simple
- Test init_db.py script early
- Backup database file during development

---

## Future Enhancement Roadmap (Post-MVP)

### Phase 2: Real Computer Vision AI
- [ ] Integrate CLIP for zero-shot image classification (openai/clip-vit-base-patch32)
- [ ] Use GPT-4 Vision API for detailed analysis
- [ ] Store image embeddings for better duplicate detection
- [ ] Train custom model on civic infrastructure dataset
- [ ] Implement confidence thresholds and human-in-the-loop validation
- [ ] Add visual similarity scoring beyond simple hashing

### Phase 3: Production Authentication
- [ ] OAuth integration (Google, etc.)
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Multi-factor authentication
- [ ] Role-based permissions (department-level access)

### Phase 4: Cloud & Scale
- [ ] Migrate to PostgreSQL
- [ ] Deploy to cloud (AWS, GCP, or Azure)
- [ ] S3 or cloud storage for images
- [ ] CDN for static assets
- [ ] Background job queue for AI processing
- [ ] Real-time notifications (WebSocket)

### Phase 5: Advanced Features
- [ ] Mobile app (React Native)
- [ ] Email/SMS notifications
- [ ] Citizen voting on issues (upvoting)
- [ ] Issue comments/discussion
- [ ] Department workflow automation
- [ ] SLA tracking and alerts
- [ ] Public dashboard for transparency
- [ ] API for third-party integrations
- [ ] Multi-language support
- [ ] Government API integrations
- [ ] Advanced analytics and reporting

### Phase 6: Enterprise Features
- [ ] Multi-tenant architecture (multiple cities)
- [ ] Advanced role management
- [ ] Audit logs
- [ ] Compliance reporting
- [ ] Custom workflows per department
- [ ] Integration with existing government systems
- [ ] Data export and reporting tools


---

## 24-Hour Implementation Strategy Summary

### The Golden Rule
**Complete end-to-end workflow > Perfect features**

If you have to choose:
- ✅ Working basic feature > Polished incomplete feature
- ✅ Rule-based AI that works > ML model that's buggy
- ✅ Simple UI that's functional > Beautiful UI that's broken
- ✅ Location-based duplicates > Image-based duplicates
- ✅ Core dashboard > Advanced analytics

### Critical Success Factors

1. **Start with database and auth** - Everything depends on these
2. **Get citizen submission working early** - This is the entry point
3. **Make AI service modular from day 1** - Don't couple it to other code
4. **Use rule-based AI only - NO ML frameworks** - Saves hours of setup/debugging
5. **Test the complete workflow frequently** - Don't wait until the end
6. **Use demo data liberally** - Makes testing and demo easier
7. **Keep it simple** - Every extra feature adds risk
8. **Verify no ML dependencies** - Check requirements.txt doesn't include torch, transformers, etc.

### Time Management Tips

- **Don't over-engineer** - Copy-paste is fine for MVP
- **Don't perfect styling too early** - Functional first, pretty later
- **Don't write tests** - Manual testing is enough for 24h MVP
- **Don't optimize prematurely** - Performance tuning is post-MVP
- **Don't add features** - Stick to the plan

### When You're Behind Schedule

**Drop in this order:**
1. Image hashing for duplicates (keep location + category only)
2. Geographic hotspot visualization
3. Issue history timeline
4. Advanced filtering options
5. Pagination

**Never drop:**
1. Issue submission with photo and location
2. Rule-based AI analysis (category, severity, priority)
3. Duplicate detection (at minimum: GPS + category)
4. Admin dashboard with statistics
5. Status management and assignment
6. Map view with markers
7. Resolution workflow

**Never add:**
1. Any ML frameworks (CLIP, PyTorch, TensorFlow)
2. Model downloads or training
3. Image embeddings
4. Complex authentication (OAuth)
5. Real-time features (WebSocket)
6. Cloud services (S3, APIs)

---

## Ready to Build! 🚀

Once approved, implementation will proceed in this order:

1. **Backend foundation** (database models, auth, API structure)
2. **Rule-based AI services** (analysis, duplicate detection, priority scoring - NO ML)
3. **Citizen flow** (submit issue with optional category selection, view issues)
4. **Admin flow** (dashboard, management, map)
5. **Resolution workflow** (complete the cycle)
6. **Polish & demo prep** (UI, testing, documentation)

The architecture is optimized for speed while maintaining extensibility. Every component can be upgraded post-MVP without rewriting the entire system.

### ✅ MVP Verification Checklist

Before starting implementation, confirm:
- [ ] NO CLIP in requirements.txt
- [ ] NO PyTorch in requirements.txt
- [ ] NO Transformers in requirements.txt
- [ ] NO TensorFlow in requirements.txt
- [ ] NO Hugging Face Hub in requirements.txt
- [ ] NO image embedding columns in database schema
- [ ] AI service uses only keyword matching + user input + rules
- [ ] Duplicate detection uses GPS + category (+ optional imagehash)
- [ ] Priority scoring uses pure mathematical formula
- [ ] Complete workflow specified: submit → analyze → assign → resolve → view

**Estimated completion time: 24 hours** (with 3-hour buffer for unexpected issues)

**Ready for your approval to start implementation!** 🎯
