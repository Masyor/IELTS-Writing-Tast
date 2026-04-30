import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth, signInWithGoogle, dbService, isTeacher } from './lib/firebase';
import { TestMode, SubmissionStatus, Submission, TestPack } from './types';
import testPacksData from './testPacks.json';
import promptsData from './prompts.json';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TestInterface from './components/TestInterface';
import Review from './components/Review';
import TeacherPortal from './components/TeacherPortal';

export default function App() {
  const [user, setUser] = useState<User | any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [view, setView] = useState<'dashboard' | 'test' | 'review' | 'teacher'>('dashboard');
  const [selectedPack, setSelectedPack] = useState<TestPack | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      const mock = localStorage.getItem('mock_user');
      if (mock) {
        const u = JSON.parse(mock);
        setUser(u);
        if (isTeacher(u)) setView('teacher');
      }
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && isTeacher(u) && view === 'dashboard') {
        setView('teacher');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleStartTest = (pack: TestPack & { classCode?: string }, mode: TestMode) => {
    const submissionId = `sub_${Date.now()}`;
    const newSubmission: Submission = {
      id: submissionId,
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || 'Student',
      testPackId: pack.id,
      classCode: pack.classCode,
      mode,
      task1Response: '',
      task2Response: '',
      task1WordCount: 0,
      task2WordCount: 0,
      status: SubmissionStatus.IN_PROGRESS,
      timeLeft: mode === TestMode.BOTH ? 3600 : mode === TestMode.TASK1 ? 1200 : 2400,
      startedAt: new Date().toISOString(),
    };
    
    setSelectedPack(pack);
    setCurrentSubmission(newSubmission);
    setView('test');
    dbService.saveSubmission(newSubmission);
  };

  const handleResumeTest = (submission: Submission) => {
    let pack: any = testPacksData.find(p => p.id === submission.testPackId);
    
    if (!pack && submission.testPackId?.startsWith('custom_')) {
      const [_, t1Id, t2Id] = submission.testPackId.split('_');
      const t1 = promptsData.task1.find(t => t.id === t1Id);
      const t2 = promptsData.task2.find(t => t.id === t2Id);
      pack = {
        id: submission.testPackId,
        title: `Custom Practice: ${t1?.title || ''}${t1 && t2 ? ' & ' : ''}${t2?.title || ''}`,
        task1: t1 || { title: 'None', prompt: 'No Task 1' },
        task2: t2 || { title: 'None', prompt: 'No Task 2' }
      };
    }

    if (pack) {
      setSelectedPack(pack as TestPack);
      setCurrentSubmission(submission);
      setView('test');
    }
  };

  const handleViewReview = (submission: Submission) => {
    let pack: any = testPacksData.find(p => p.id === submission.testPackId);
    
    if (!pack && submission.testPackId?.startsWith('custom_')) {
      const [_, t1Id, t2Id] = submission.testPackId.split('_');
      const t1 = promptsData.task1.find(t => t.id === t1Id);
      const t2 = promptsData.task2.find(t => t.id === t2Id);
      pack = {
        id: submission.testPackId,
        title: `Custom Practice: ${t1?.title || ''}${t1 && t2 ? ' & ' : ''}${t2?.title || ''}`,
        task1: t1 || { title: 'None', prompt: 'No Task 1' },
        task2: t2 || { title: 'None', prompt: 'No Task 2' }
      };
    }

    if (pack) {
      setSelectedPack(pack as TestPack);
      setCurrentSubmission(submission);
      setView('review');
    }
  };

  const handleLogin = async () => {
    try {
      const u = await signInWithGoogle();
      if (u) {
        setUser(u);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleFinishTest = (finalSubmission: Submission) => {
    setCurrentSubmission(finalSubmission);
    setView('review');
  };

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    localStorage.removeItem('mock_user');
    setUser(null);
    setView('dashboard');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading Test Environment...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} onOpenTeacher={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {view === 'dashboard' && (
        <Dashboard 
          user={user} 
          onStartTest={handleStartTest} 
          onResumeTest={handleResumeTest}
          onViewReview={handleViewReview}
          onOpenTeacher={() => setView('teacher')}
          onLogout={handleLogout}
        />
      )}
      
      {view === 'test' && currentSubmission && selectedPack && (
        <TestInterface 
          submission={currentSubmission} 
          pack={selectedPack} 
          onFinish={handleFinishTest}
        />
      )}

      {view === 'review' && currentSubmission && selectedPack && (
        <div className="h-screen w-full">
          <Review 
            submission={currentSubmission} 
            pack={selectedPack} 
            onBack={() => setView('dashboard')}
            user={user}
          />
        </div>
      )}

      {view === 'teacher' && (
        <TeacherPortal 
          onBack={() => setView('dashboard')}
          user={user}
          packs={testPacksData as TestPack[]}
        />
      )}
    </div>
  );
}
