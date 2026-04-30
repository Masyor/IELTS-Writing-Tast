export enum TestMode {
  TASK1 = 'task1',
  TASK2 = 'task2',
  BOTH = 'both'
}

export enum SubmissionStatus {
  IN_PROGRESS = 'in-progress',
  SUBMITTED = 'submitted'
}

export interface Task1Data {
  id: string;
  title: string;
  prompt: string;
  image?: string;
}

export interface Task2Data {
  id: string;
  title: string;
  prompt: string;
}

export interface TestPack {
  id: string;
  title: string;
  task1: Task1Data;
  task2: Task2Data;
}

export interface BandScoreCriteria {
  category: string;
  scores: {
    [key: number]: string;
  };
}

export interface SelfAssessment {
  task1?: Record<string, number>;
  task2?: Record<string, number>;
}

export interface Annotation {
  id: string;
  taskId: 1 | 2;
  text: string;
  startIndex: number;
  endIndex: number;
  comment: string;
  category?: 'grammar' | 'vocabulary' | 'structure' | 'other';
  authorId: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  testPackId: string;
  mode: TestMode;
  task1Response: string;
  task2Response: string;
  task1WordCount: number;
  task2WordCount: number;
  status: SubmissionStatus;
  timeLeft: number;
  startedAt: any;
  submittedAt?: any;
  selfAssessment?: SelfAssessment;
  teacherAnnotations?: Annotation[];
  teacherReviewedAt?: any;
  studentLastViewedAt?: any;
  classCode?: string;
}

export interface ClassGroup {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  createdAt: any;
  active: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'student' | 'teacher';
  createdAt: any;
  activeClassCodes?: string[];
}
