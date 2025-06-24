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

export interface GetTasksParams {
  project_id?: string;
  section_id?: string;
  label?: string;
  filter?: string;
  lang?: string;
  ids?: number[];
}

export interface CreateTaskParams {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string;
  parent_id?: string;
  order?: number;
  priority?: number;
  labels?: string[];
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  due_lang?: string;
  assignee_id?: string;
}

export interface UpdateTaskParams {
  content?: string;
  description?: string;
  project_id?: string;
  priority?: number;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  due_lang?: string;
  assignee_id?: string;
  labels?: string[];
}

export interface CreateProjectParams {
  name: string;
  parent_id?: string;
  color?: string;
  is_favorite?: boolean;
  view_style?: string;
}

export interface UpdateProjectParams {
  name?: string;
  color?: string;
  is_favorite?: boolean;
  view_style?: string;
}