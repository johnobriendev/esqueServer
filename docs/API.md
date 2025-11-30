# API Documentation

Base URL: `/api`

All endpoints (except `/api/health`) require authentication via Auth0 JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Table of Contents

- [Health Check](#health-check)
- [User Endpoints](#user-endpoints)
- [Project Endpoints](#project-endpoints)
- [Task Endpoints](#task-endpoints)
- [Cross-Project Task Endpoints](#cross-project-task-endpoints)
- [Comment Endpoints](#comment-endpoints)
- [Team Collaboration Endpoints](#team-collaboration-endpoints)
- [Permissions Model](#permissions-model)
- [Error Responses](#error-responses)

---

## Health Check

### Get Server Status

```
GET /api/health
```

Check if the server is running.

**Authentication**: None required

**Response**: `200 OK`
```json
{
  "status": "ok"
}
```

---

## User Endpoints

### Get Current User

```
GET /api/users/me
```

Get the authenticated user's profile information.

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "authProviderId": "auth0|123456",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Update Current User

```
PATCH /api/users/me
```

Update the authenticated user's profile.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "newemail@example.com"
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "newemail@example.com",
  "name": "Jane Doe",
  "authProviderId": "auth0|123456",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

---

## Project Endpoints

### List All Projects

```
GET /api/projects
```

Get all projects where the user is either the owner or a collaborator.

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "My Project",
    "description": "Project description",
    "userId": "uuid",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "role": "owner"
  },
  {
    "id": "uuid",
    "name": "Shared Project",
    "description": "Collaborative project",
    "userId": "other-user-uuid",
    "createdAt": "2025-01-10T08:00:00Z",
    "updatedAt": "2025-01-10T08:00:00Z",
    "role": "editor"
  }
]
```

### Get Single Project

```
GET /api/projects/:id
```

Get details of a specific project.

**URL Parameters**:
- `id` - Project UUID

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "My Project",
  "description": "Project description",
  "userId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Responses**:
- `404 Not Found` - Project doesn't exist or user doesn't have access

### Create Project

```
POST /api/projects
```

Create a new project. The authenticated user becomes the owner.

**Request Body**:
```json
{
  "name": "New Project",
  "description": "Optional description"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "name": "New Project",
  "description": "Optional description",
  "userId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Validation**:
- `name` - Required, string, max 255 characters
- `description` - Optional, string

### Update Project

```
PATCH /api/projects/:id
```

Update a project's name or description.

**URL Parameters**:
- `id` - Project UUID

**Required Permission**: Owner only

**Request Body**:
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "description": "Updated description",
  "userId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T15:00:00Z"
}
```

**Error Responses**:
- `403 Forbidden` - User is not the owner
- `404 Not Found` - Project doesn't exist

### Delete Project

```
DELETE /api/projects/:id
```

Delete a project and all associated tasks, comments, and collaborators.

**URL Parameters**:
- `id` - Project UUID

**Required Permission**: Owner only

**Response**: `200 OK`
```json
{
  "message": "Project deleted successfully"
}
```

**Error Responses**:
- `403 Forbidden` - User is not the owner
- `404 Not Found` - Project doesn't exist

---

## Task Endpoints

All task endpoints are scoped to a specific project.

### List Project Tasks

```
GET /api/projects/:projectId/tasks
```

Get all tasks for a project.

**URL Parameters**:
- `projectId` - Project UUID

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Task title",
    "description": "Task description",
    "status": "in_progress",
    "priority": "high",
    "position": 1000,
    "statusPosition": 500,
    "customFields": {},
    "version": 1,
    "updatedBy": "uuid",
    "projectId": "uuid",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

**Task Status Values**: `todo`, `in_progress`, `done`
**Priority Values**: `low`, `medium`, `high`, `urgent`

### Get Single Task

```
GET /api/projects/:projectId/tasks/:taskId
```

Get details of a specific task.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "title": "Task title",
  "description": "Task description",
  "status": "in_progress",
  "priority": "high",
  "position": 1000,
  "statusPosition": 500,
  "customFields": {},
  "version": 1,
  "updatedBy": "uuid",
  "projectId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Create Task

```
POST /api/projects/:projectId/tasks
```

Create a new task in a project.

**URL Parameters**:
- `projectId` - Project UUID

**Required Permission**: Owner or Editor

**Request Body**:
```json
{
  "title": "New task",
  "description": "Task description",
  "status": "todo",
  "priority": "medium",
  "customFields": {
    "tags": ["frontend", "bug"]
  }
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "title": "New task",
  "description": "Task description",
  "status": "todo",
  "priority": "medium",
  "position": 1000,
  "statusPosition": 1000,
  "customFields": {
    "tags": ["frontend", "bug"]
  },
  "version": 1,
  "updatedBy": "uuid",
  "projectId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Validation**:
- `title` - Required, string
- `description` - Optional, string
- `status` - Optional, one of: `todo`, `in_progress`, `done` (default: `todo`)
- `priority` - Optional, one of: `low`, `medium`, `high`, `urgent` (default: `medium`)
- `customFields` - Optional, JSON object

### Update Task

```
PATCH /api/projects/:projectId/tasks/:taskId
```

Update a task's properties.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID

**Required Permission**: Owner or Editor

**Request Body** (all fields optional):
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "customFields": {
    "tags": ["backend"]
  }
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "position": 1000,
  "statusPosition": 500,
  "customFields": {
    "tags": ["backend"]
  },
  "version": 2,
  "updatedBy": "uuid",
  "projectId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

### Update Task Priority

```
PATCH /api/projects/:projectId/tasks/:taskId/priority
```

Update a task's priority and optionally its position in the priority-based view.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID

**Required Permission**: Owner or Editor

**Request Body**:
```json
{
  "priority": "urgent",
  "position": 1500
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "title": "Task title",
  "priority": "urgent",
  "position": 1500,
  "version": 3,
  "updatedBy": "uuid"
}
```

### Update Task Status

```
PATCH /api/projects/:projectId/tasks/:taskId/status
```

Update a task's status and optionally its position in the status-based (Kanban) view.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID

**Required Permission**: Owner or Editor

**Request Body**:
```json
{
  "status": "done",
  "statusPosition": 2000
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "title": "Task title",
  "status": "done",
  "statusPosition": 2000,
  "version": 4,
  "updatedBy": "uuid"
}
```

### Bulk Update Tasks

```
PUT /api/projects/:projectId/tasks/bulk
```

Update multiple tasks at once.

**URL Parameters**:
- `projectId` - Project UUID

**Required Permission**: Owner or Editor

**Request Body**:
```json
{
  "tasks": [
    {
      "id": "task-uuid-1",
      "status": "done"
    },
    {
      "id": "task-uuid-2",
      "priority": "urgent"
    }
  ]
}
```

**Response**: `200 OK`
```json
{
  "count": 2,
  "message": "Tasks updated successfully"
}
```

### Reorder Tasks

```
PUT /api/projects/:projectId/tasks/reorder
```

Reorder tasks for Kanban or priority views.

**URL Parameters**:
- `projectId` - Project UUID

**Required Permission**: Owner or Editor

**Request Body**:
```json
{
  "tasks": [
    {
      "id": "task-uuid-1",
      "position": 1000,
      "statusPosition": 500
    },
    {
      "id": "task-uuid-2",
      "position": 2000,
      "statusPosition": 1000
    }
  ]
}
```

**Response**: `200 OK`
```json
{
  "count": 2,
  "message": "Tasks reordered successfully"
}
```

### Delete Task

```
DELETE /api/projects/:projectId/tasks/:taskId
```

Delete a single task and all its comments.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID

**Required Permission**: Owner or Editor

**Response**: `200 OK`
```json
{
  "message": "Task deleted successfully"
}
```

### Delete Multiple Tasks

```
DELETE /api/projects/:projectId/tasks
```

Delete multiple tasks at once.

**URL Parameters**:
- `projectId` - Project UUID

**Required Permission**: Owner or Editor

**Request Body**:
```json
{
  "taskIds": ["task-uuid-1", "task-uuid-2", "task-uuid-3"]
}
```

**Response**: `200 OK`
```json
{
  "count": 3,
  "message": "Tasks deleted successfully"
}
```

---

## Cross-Project Task Endpoints

### Get Urgent Tasks

```
GET /api/tasks/urgent
```

Get all urgent priority tasks across all projects the user has access to.

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Urgent task",
    "description": "Critical issue",
    "status": "todo",
    "priority": "urgent",
    "position": 1000,
    "statusPosition": 500,
    "customFields": {},
    "version": 1,
    "updatedBy": "uuid",
    "projectId": "uuid",
    "project": {
      "id": "uuid",
      "name": "Project Name"
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

---

## Comment Endpoints

### List Task Comments

```
GET /api/projects/:projectId/tasks/:taskId/comments
```

Get all comments for a task, ordered by creation date.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "content": "This is a comment",
    "taskId": "uuid",
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

### Create Comment

```
POST /api/projects/:projectId/tasks/:taskId/comments
```

Add a comment to a task.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID

**Required Permission**: Owner or Editor

**Request Body**:
```json
{
  "content": "This is my comment"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "content": "This is my comment",
  "taskId": "uuid",
  "userId": "uuid",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Validation**:
- `content` - Required, string, non-empty

### Update Comment

```
PATCH /api/projects/:projectId/tasks/:taskId/comments/:commentId
```

Update a comment's content.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID
- `commentId` - Comment UUID

**Required Permission**: Comment author only

**Request Body**:
```json
{
  "content": "Updated comment text"
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "content": "Updated comment text",
  "taskId": "uuid",
  "userId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

**Error Responses**:
- `403 Forbidden` - User is not the comment author

### Delete Comment

```
DELETE /api/projects/:projectId/tasks/:taskId/comments/:commentId
```

Delete a comment.

**URL Parameters**:
- `projectId` - Project UUID
- `taskId` - Task UUID
- `commentId` - Comment UUID

**Required Permission**: Comment author or project owner

**Response**: `200 OK`
```json
{
  "message": "Comment deleted successfully"
}
```

**Error Responses**:
- `403 Forbidden` - User is not the comment author or project owner

---

## Team Collaboration Endpoints

### Invite User to Project

```
POST /api/team/projects/:id/invite
```

Invite a user to collaborate on a project via email.

**URL Parameters**:
- `id` - Project UUID

**Required Permission**: Owner only

**Request Body**:
```json
{
  "email": "collaborator@example.com",
  "role": "editor"
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "collaborator@example.com",
  "role": "editor",
  "token": "secure-random-token",
  "status": "pending",
  "expiresAt": "2025-01-22T10:30:00Z",
  "projectId": "uuid",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Validation**:
- `email` - Required, valid email address
- `role` - Required, one of: `editor`, `viewer`

**Notes**:
- Invitations expire after 7 days
- Cannot invite the project owner
- Cannot send duplicate pending invitations

**Error Responses**:
- `400 Bad Request` - Invalid email or trying to invite owner
- `403 Forbidden` - User is not the owner
- `409 Conflict` - Pending invitation already exists

### List User's Invitations

```
GET /api/team/users/invitations
```

Get all pending invitations for the authenticated user.

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "role": "editor",
    "token": "secure-random-token",
    "status": "pending",
    "expiresAt": "2025-01-22T10:30:00Z",
    "projectId": "uuid",
    "project": {
      "id": "uuid",
      "name": "Project Name",
      "description": "Project description"
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

### Accept Invitation

```
POST /api/team/invitations/:token/accept
```

Accept a project invitation using the invitation token.

**URL Parameters**:
- `token` - Invitation token (from email or invitation object)

**Response**: `200 OK`
```json
{
  "message": "Invitation accepted successfully",
  "projectId": "uuid",
  "role": "editor"
}
```

**Error Responses**:
- `404 Not Found` - Invalid or expired token
- `403 Forbidden` - Invitation not for this user

### Decline Invitation

```
DELETE /api/team/invitations/:id
```

Decline a project invitation.

**URL Parameters**:
- `id` - Invitation UUID

**Response**: `200 OK`
```json
{
  "message": "Invitation declined successfully"
}
```

**Error Responses**:
- `404 Not Found` - Invitation doesn't exist
- `403 Forbidden` - Invitation not for this user

### List Project Collaborators

```
GET /api/team/projects/:id/collaborators
```

Get all collaborators for a project, including the owner.

**URL Parameters**:
- `id` - Project UUID

**Response**: `200 OK`
```json
[
  {
    "userId": "uuid",
    "projectId": "uuid",
    "role": "owner",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  {
    "userId": "uuid",
    "projectId": "uuid",
    "role": "editor",
    "user": {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "createdAt": "2025-01-16T09:00:00Z",
    "updatedAt": "2025-01-16T09:00:00Z"
  }
]
```

### Remove Collaborator

```
DELETE /api/team/projects/:id/collaborators/:userId
```

Remove a collaborator from a project.

**URL Parameters**:
- `id` - Project UUID
- `userId` - User UUID to remove

**Required Permission**: Owner only

**Response**: `200 OK`
```json
{
  "message": "Collaborator removed successfully"
}
```

**Error Responses**:
- `400 Bad Request` - Cannot remove the project owner
- `403 Forbidden` - User is not the owner
- `404 Not Found` - Collaborator not found

### Update Collaborator Role

```
PUT /api/team/projects/:id/collaborators/:userId/role
```

Change a collaborator's role.

**URL Parameters**:
- `id` - Project UUID
- `userId` - User UUID

**Required Permission**: Owner only

**Request Body**:
```json
{
  "role": "viewer"
}
```

**Response**: `200 OK`
```json
{
  "userId": "uuid",
  "projectId": "uuid",
  "role": "viewer",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

**Validation**:
- `role` - Required, one of: `editor`, `viewer`

**Error Responses**:
- `400 Bad Request` - Cannot change owner's role
- `403 Forbidden` - User is not the owner
- `404 Not Found` - Collaborator not found

---

## Permissions Model

| Role | View | Create Tasks | Edit Tasks | Delete Tasks | Invite Users | Manage Collaborators | Edit/Delete Project |
|------|------|-------------|-----------|--------------|--------------|---------------------|-------------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Additional Rules**:
- Users can only update/delete their own comments (except project owners can delete any comment)
- Viewers have read-only access to all project data
- Only owners can delete projects or modify project settings
- Invitations expire after 7 days

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data or validation error
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User doesn't have permission for this action
- `404 Not Found` - Resource not found or user doesn't have access
- `409 Conflict` - Resource conflict (e.g., duplicate invitation)
- `500 Internal Server Error` - Server error

### Example Error Response

```json
{
  "error": "You do not have permission to edit this project"
}
```

---

## Data Encryption

The following fields are encrypted at rest using AES-256-GCM:
- Project `name` and `description`
- Task `title` and `description`
- Comment `content`

Encryption/decryption happens automatically in the Prisma middleware layer. API consumers receive decrypted data and should send plaintext data.

---

## Rate Limiting

Rate limits are applied per user to prevent abuse. If you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

---

## Versioning

Tasks include a `version` field that increments with each update. This can be used for optimistic locking or conflict detection in collaborative editing scenarios.

The `updatedBy` field tracks which user last modified the task.
