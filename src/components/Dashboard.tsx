import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  Clock, 
  ChevronRight, 
  UserCircle, 
  Trophy,
  History,
  LayoutDashboard,
  LogOut,
  Trash2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { dbService, isTeacher } from '@/lib/firebase';
import { Submission, TestPack, TestMode, SubmissionStatus } from '@/types';
import testPacksData from '@/testPacks.json';
import promptsData from '@/prompts.json';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from 'motion/react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface DashboardProps {
  user: any;
  onStartTest: (pack: TestPack, mode: TestMode) => void;
  onResumeTest: (submission: Submission) => void;
  onViewReview: (submission: Submission) => void;
  onOpenTeacher: () => void;
  onLogout: () => void;
}

export default function Dashboard({ user, onStartTest, onResumeTest, onViewReview, onOpenTeacher, onLogout }: DashboardProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask1Id, setSelectedTask1Id] = useState<string>('');
  const [selectedTask2Id, setSelectedTask2Id] = useState<string>('');
  const [classCode, setClassCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [joinStatus, setJoinStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchProfile = async () => {
    // Fetch user profile for classes
    if (dbService.getUser) {
       const profile = await dbService.getUser(user.uid);
       setUserProfile(profile);
       if (profile?.activeClassCodes?.length > 0 && !selectedClass) {
         setSelectedClass(profile.activeClassCodes[0]);
       }
    } else {
      // Fallback for mock
      const mockStore = JSON.parse(localStorage.getItem('ielts_mock_store') || '{}');
      const profile = mockStore[`user_${user.uid}`] || { activeClassCodes: [] };
      setUserProfile(profile);
      if (profile.activeClassCodes?.length > 0 && !selectedClass) {
        setSelectedClass(profile.activeClassCodes[0]);
      }
    }
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      const data = await dbService.getSubmissions(user.uid);
      setSubmissions(data as Submission[]);
      await fetchProfile();
      setLoading(false);
    };
    fetchSubmissions();
  }, [user.uid]);

  const handleJoinClass = async () => {
    if (!classCode.trim()) return;
    setJoining(true);
    setJoinStatus(null);
    try {
      await dbService.joinClass(user.uid, classCode.trim().toUpperCase());
      await fetchProfile();
      const data = await dbService.getSubmissions(user.uid);
      setSubmissions(data as Submission[]);
      setClassCode('');
      setJoinStatus({ type: 'success', message: 'Successfully joined class!' });
      setTimeout(() => {
        setIsJoinDialogOpen(false);
        setJoinStatus(null);
      }, 1500);
    } catch (error: any) {
      setJoinStatus({ type: 'error', message: error.message || 'Failed to join class' });
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dbService.deleteSubmission(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete submission:', error);
    }
  };

  const ongoingTests = submissions.filter(s => s.status === SubmissionStatus.IN_PROGRESS);
  const completedTests = submissions.filter(s => s.status === SubmissionStatus.SUBMITTED);

  const getPackTitle = (testPackId: string) => {
    const pack = testPacksData.find(p => p.id === testPackId);
    if (pack) return pack.title;
    
    if (testPackId?.startsWith('custom_')) {
      const [_, t1Id, t2Id] = testPackId.split('_');
      const t1 = promptsData.task1.find(t => t.id === t1Id);
      const t2 = promptsData.task2.find(t => t.id === t2Id);
      if (t1 && t2) return `Custom: ${t1.title} & ${t2.title}`;
      if (t1) return `Custom: ${t1.title}`;
      if (t2) return `Custom: ${t2.title}`;
    }
    
    return 'Unknown Test';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-12 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl shadow-lg">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Student Dashboard</h1>
            <p className="text-slate-500">Welcome back, {user.displayName}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 font-semibold gap-2 rounded-xl hover:bg-blue-100" />}>
              <Plus className="w-4 h-4" />
              Join Class
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Join a Class</DialogTitle>
                <DialogDescription>
                  Enter the 7-character code provided by your teacher.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Class Code</Label>
                    <input
                      id="code"
                      value={classCode}
                      onChange={(e) => {
                        setClassCode(e.target.value.toUpperCase());
                        if (joinStatus) setJoinStatus(null);
                      }}
                      placeholder="E.g. XJ92KL1"
                      className="w-full px-4 py-3 border rounded-xl font-mono text-center text-2xl uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                      maxLength={7}
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-400 text-center">
                      Must be exactly 7 characters (e.g. {Math.random().toString(36).substring(2, 9).toUpperCase()})
                    </p>
                  </div>
                  {joinStatus && (
                    <div className={cn(
                      "p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-1",
                      joinStatus.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    )}>
                      {joinStatus.message}
                    </div>
                  )}
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl text-lg font-bold"
                    onClick={handleJoinClass}
                    disabled={joining || classCode.length < 7}
                  >
                    {joining ? 'Joining...' : 'Join Class'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {isTeacher(user) && (
            <Button variant="outline" onClick={onOpenTeacher} className="border-slate-800 text-slate-800 font-semibold gap-2 rounded-xl">
              <UserCircle className="w-4 h-4" />
              Teacher Portal
            </Button>
          )}
          <Button variant="ghost" onClick={onLogout} className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 border rounded-full bg-white shadow-sm">
            <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user.email}</span>
          </div>
        </div>
      </header>

      <Tabs defaultValue="available" className="space-y-8">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="available" className="data-[state=active]:bg-white">Available Packs</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white">My Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8 space-y-4"
          >
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-bold">Getting Started:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>If your teacher gave you a <strong>Class Code</strong>, click "Join Class" above to link your results.</li>
                    <li>Select one or both tasks below to begin a timed session.</li>
                    <li>The timer will start immediately once you click "Launch Test".</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold">Self-Assessment Disclaimer:</p>
                  <p className="opacity-90">
                    The band scores you select during the review phase are <strong>unofficial</strong>. They are based entirely on your own interpretation of the IELTS criteria and are intended for self-reflection and practice purposes only.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <Card className="bg-white border-none shadow-md overflow-hidden max-w-2xl mx-auto rounded-3xl">
            <div className="h-2 bg-slate-800"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-slate-800">Configure Your Mock test</CardTitle>
              <CardDescription>Select Tasks to practice and your timer will adjust automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {userProfile?.activeClassCodes?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Assign to Class (Optional)</Label>
                  <select 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-slate-800 focus:bg-white transition-all outline-none"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">No Class (Private)</option>
                    {userProfile.activeClassCodes.map((code: string) => (
                      <option key={code} value={code}>Class {code}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Academic Task 1 (20m)</Label>
                  <select 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-slate-800 focus:bg-white transition-all outline-none"
                    value={selectedTask1Id}
                    onChange={(e) => setSelectedTask1Id(e.target.value)}
                  >
                    <option value="">-- None --</option>
                    <option value="random">🎲 Random Task 1</option>
                    {promptsData.task1.map(task => (
                      <option key={task.id} value={task.id}>{task.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Academic Task 2 (40m)</Label>
                  <select 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-slate-800 focus:bg-white transition-all outline-none"
                    value={selectedTask2Id}
                    onChange={(e) => setSelectedTask2Id(e.target.value)}
                  >
                    <option value="">-- None --</option>
                    <option value="random">🎲 Random Task 2</option>
                    {promptsData.task2.map(task => (
                      <option key={task.id} value={task.id}>{task.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selection Summary */}
              {(selectedTask1Id || selectedTask2Id) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Projected Duration:</span>
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Clock className="w-4 h-4" />
                      {selectedTask1Id && selectedTask2Id ? '60 mins' : selectedTask1Id ? '20 mins' : '40 mins'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Test Mode:</span>
                    <div className="bg-slate-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-slate-600">
                      {selectedTask1Id && selectedTask2Id ? 'Full Test' : selectedTask1Id ? 'Task 1 Only' : 'Task 2 Only'}
                    </div>
                  </div>
                </motion.div>
              )}

              <Button 
                onClick={() => {
                  if (!selectedTask1Id && !selectedTask2Id) return;
                  
                  // Handle random selection
                  let t1 = promptsData.task1.find(t => t.id === selectedTask1Id);
                  if (selectedTask1Id === 'random') {
                    const idx = Math.floor(Math.random() * promptsData.task1.length);
                    t1 = promptsData.task1[idx];
                  }

                  let t2 = promptsData.task2.find(t => t.id === selectedTask2Id);
                  if (selectedTask2Id === 'random') {
                    const idx = Math.floor(Math.random() * promptsData.task2.length);
                    t2 = promptsData.task2[idx];
                  }
                  
                  const mode = selectedTask1Id && selectedTask2Id 
                    ? TestMode.BOTH 
                    : selectedTask1Id ? TestMode.TASK1 : TestMode.TASK2;

                  const pack: any = {
                    id: `custom_${t1?.id || 'none'}_${t2?.id || 'none'}_${Date.now()}`,
                    title: `Custom Practice: ${t1?.title || ''}${t1 && t2 ? ' & ' : ''}${t2?.title || ''}`,
                    task1: t1 || { title: 'None', prompt: 'No Task 1' },
                    task2: t2 || { title: 'None', prompt: 'No Task 2' },
                    classCode: selectedClass
                  };

                  onStartTest(pack, mode);
                }}
                disabled={!selectedTask1Id && !selectedTask2Id}
                className="w-full bg-slate-800 hover:bg-slate-700 h-16 rounded-2xl text-xl font-bold shadow-xl group transition-all"
              >
                Launch Test Environment
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <div className="space-y-12">
            {ongoingTests.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  In Progress
                </h3>
                <div className="grid gap-4">
                  {ongoingTests.map(sub => (
                    <Card key={sub.id} className="border-l-4 border-l-amber-500 shadow-sm">
                      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-50 rounded-xl">
                            <Clock className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {getPackTitle(sub.testPackId)}
                            </p>
                            <p className="text-sm text-slate-500">
                              Started {format(new Date(sub.startedAt), 'MMM d, h:mm a')} • {sub.mode.replace('task', 'Task ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" />}>
                              <Trash2 className="w-4 h-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete ongoing test?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove your progress for this practice session. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(sub.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button 
                            onClick={() => onResumeTest(sub)}
                            className="bg-amber-600 hover:bg-amber-700 rounded-xl"
                          >
                            Resume Session
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Previous Submissions
              </h3>
              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-xl" />)}
                </div>
              ) : completedTests.length > 0 ? (
                <div className="grid gap-4">
                  {completedTests.map(sub => (
                    <Card key={sub.id} className="hover:border-slate-300 transition-colors shadow-sm">
                      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-50 rounded-xl">
                            <FileText className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                              {getPackTitle(sub.testPackId)}
                              {!!sub.teacherReviewedAt && (!sub.studentLastViewedAt || new Date(sub.teacherReviewedAt) > new Date(sub.studentLastViewedAt)) && (
                                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" title="New teacher feedback" />
                              )}
                            </p>
                            <p className="text-sm text-slate-500">
                              Submitted {format(new Date(sub.submittedAt || sub.startedAt), 'MMM d, yyyy')} • {sub.mode.replace('task', 'Task ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!!sub.teacherReviewedAt && (!sub.studentLastViewedAt || new Date(sub.teacherReviewedAt) > new Date(sub.studentLastViewedAt)) && (
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
                              New Feedback
                            </span>
                          )}
                          {sub.selfAssessment && (
                            <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                              <Trophy className="w-3 h-3" />
                              Self-Assessed
                            </div>
                          )}
                          <Button 
                            variant="outline" 
                            onClick={() => onViewReview(sub)}
                            className="rounded-xl border-slate-200"
                          >
                            View Results
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger render={
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            } />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete practice history?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this completed test from your practice history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(sub.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No completed tests yet</p>
                  <p className="text-sm text-slate-400">Your practice history will appear here once you submit a test.</p>
                </div>
              )}
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
