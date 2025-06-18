// Mock response data for Todoist API tests

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  is_completed: boolean;
  labels: string[];
  order: number;
  priority: number;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  url: string;
  comment_count: number;
  assignee_id: string | null;
  assigner_id: string | null;
  created_at: string;
  due: {
    date: string;
    string: string;
    lang: string;
    is_recurring: boolean;
  } | null;
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
  parent_id: string | null;
}

export const mockTasks: TodoistTask[] = [
  {
    id: "2995104339",
    content: "Buy milk",
    description: "Buy organic milk from the store",
    is_completed: false,
    labels: ["shopping"],
    order: 1,
    priority: 2,
    project_id: "220474322",
    section_id: null,
    parent_id: null,
    url: "https://todoist.com/showTask?id=2995104339",
    comment_count: 0,
    assignee_id: null,
    assigner_id: null,
    created_at: "2023-06-18T08:00:00.000000Z",
    due: {
      date: "2023-06-20",
      string: "Jun 20",
      lang: "en",
      is_recurring: false
    }
  },
  {
    id: "2995104340",
    content: "Write documentation",
    description: "Update API documentation",
    is_completed: false,
    labels: ["work"],
    order: 2,
    priority: 3,
    project_id: "220474323",
    section_id: null,
    parent_id: null,
    url: "https://todoist.com/showTask?id=2995104340",
    comment_count: 2,
    assignee_id: null,
    assigner_id: null,
    created_at: "2023-06-18T09:00:00.000000Z",
    due: null
  }
];

export const mockProjects: TodoistProject[] = [
  {
    id: "220474322",
    name: "Personal",
    comment_count: 0,
    order: 1,
    color: "berry_red",
    is_shared: false,
    is_favorite: false,
    is_inbox_project: false,
    is_team_inbox: false,
    view_style: "list",
    url: "https://todoist.com/showProject?id=220474322",
    parent_id: null
  },
  {
    id: "220474323",
    name: "Work",
    comment_count: 5,
    order: 2,
    color: "blue",
    is_shared: true,
    is_favorite: true,
    is_inbox_project: false,
    is_team_inbox: false,
    view_style: "list",
    url: "https://todoist.com/showProject?id=220474323",
    parent_id: null
  }
];

export const mockTaskCreateRequest = {
  content: "New task",
  description: "Task description",
  project_id: "220474322",
  due_string: "tomorrow"
};

export const mockTaskCreateResponse: TodoistTask = {
  id: "2995104341",
  content: "New task",
  description: "Task description",
  is_completed: false,
  labels: [],
  order: 3,
  priority: 1,
  project_id: "220474322",
  section_id: null,
  parent_id: null,
  url: "https://todoist.com/showTask?id=2995104341",
  comment_count: 0,
  assignee_id: null,
  assigner_id: null,
  created_at: "2023-06-18T10:00:00.000000Z",
  due: {
    date: "2023-06-19",
    string: "tomorrow",
    lang: "en",
    is_recurring: false
  }
};

export const mockErrorResponses = {
  unauthorized: {
    status: 401,
    data: {
      error: "Unauthorized",
      error_description: "Invalid API token"
    }
  },
  notFound: {
    status: 404,
    data: {
      error: "Not Found",
      error_description: "Task not found"
    }
  },
  badRequest: {
    status: 400,
    data: {
      error: "Bad Request",
      error_description: "Invalid request parameters"
    }
  },
  tooManyRequests: {
    status: 429,
    data: {
      error: "Too Many Requests",
      error_description: "Rate limit exceeded"
    }
  }
};