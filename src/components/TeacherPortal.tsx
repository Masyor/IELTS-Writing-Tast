import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  FileDown, 
  Users,
  GraduationCap,
  FileText,
  Trash2,
  Plus
} from 'lucide-react';
import { dbService, isTeacher as checkTeacher } from '@/lib/firebase';
import { Submission, SubmissionStatus, TestPack } from '@/types';
import promptsData from '@/prompts.json';
import testPacksData from '@/testPacks.json';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
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
import Review from './Review';

interface TeacherPortalProps {
  onBack: () => void;
  user: any;
  packs: TestPack[];
}

export default function TeacherPortal({ onBack, user, packs }: TeacherPortalProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassCode, setSelectedClassCode] = useState<string>('all');
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  const fetchAllSubmissions = async (codes?: string[]) => {
    setLoading(true);
    try {
      let data;
      if (codes && codes.length > 0) {
        data = await dbService.getSubmissionsByClasses(codes);
      } else if (checkTeacher(user)) {
        data = await dbService.getSubmissions();
      } else {
        data = [];
      }
      setSubmissions(data as Submission[]);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const getPackTitle = (testPackId: string) => {
    const pack = testPacksData.find(p => p.id === testPackId);
    if (pack) return pack.title;
    
    if (testPackId?.startsWith('custom_')) {
      const parts = testPackId.split('_');
      // custom_task1Id_task2Id_timestamp
      const t1Id = parts[1];
      const t2Id = parts[2];
      const t1 = promptsData.task1.find(t => t.id === t1Id);
      const t2 = promptsData.task2.find(t => t.id === t2Id);
      if (t1 && t2) return `Custom: ${t1.title} & ${t2.title}`;
      if (t1) return `Custom: ${t1.title}`;
      if (t2) return `Custom: ${t2.title}`;
    }
    
    return testPackId;
  };

  const getVirtualPack = (testPackId: string) => {
    const pack = testPacksData.find(p => p.id === testPackId);
    if (pack) return pack;

    if (testPackId?.startsWith('custom_')) {
      const parts = testPackId.split('_');
      const t1Id = parts[1];
      const t2Id = parts[2];
      const t1 = promptsData.task1.find(t => t.id === t1Id);
      const t2 = promptsData.task2.find(t => t.id === t2Id);
      return {
        id: testPackId,
        title: getPackTitle(testPackId),
        task1: t1 || { title: 'None', prompt: 'No Task 1' },
        task2: t2 || { title: 'None', prompt: 'No Task 2' }
      };
    }

    return packs[0];
  };

  useEffect(() => {
    const init = async () => {
      const teacherClasses = await dbService.getTeacherClasses(user.uid);
      setClasses(teacherClasses || []);
      const codes = (teacherClasses || []).map((c: any) => c.code);
      await fetchAllSubmissions(codes);
    };
    init();
  }, [user.uid]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setCreatingClass(true);
    try {
      const newClass = await dbService.createClass(user.uid, newClassName.trim());
      setClasses(prev => [...prev, newClass]);
      setNewClassName('');
    } catch (error) {
      console.error('Failed to create class:', error);
    } finally {
      setCreatingClass(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.classCode && s.classCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = selectedClassCode === 'all' || s.classCode === selectedClassCode;
    return matchesSearch && matchesClass;
  });
  
  const handleDelete = async (id: string) => {
    try {
      await dbService.deleteSubmission(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete submission:', error);
    }
  };

  const exportCSV = () => {
    if (filteredSubmissions.length === 0) return;

    const headers = [
      'Student Name',
      'Student Email',
      'Test Pack',
      'Mode',
      'Status',
      'Task 1 Words',
      'Task 2 Words',
      'Task 1 Response',
      'Task 2 Response',
      'Started At',
      'Submitted At'
    ];

    const rows = filteredSubmissions.map(s => [
      `"${s.userName}"`,
      `"${s.userEmail}"`,
      `"${s.testPackId}"`,
      `"${s.mode}"`,
      `"${s.status}"`,
      s.task1WordCount || 0,
      s.task2WordCount || 0,
      `"${(s.task1Response || '').replace(/"/g, '""')}"`,
      `"${(s.task2Response || '').replace(/"/g, '""')}"`,
      new Date(s.startedAt).toLocaleString(),
      s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ielts_submissions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full">
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-xl">
                <GraduationCap className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Teacher Portal</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 font-semibold" />}>
                <Plus className="w-4 h-4" />
                Manage Classes
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Class Management</DialogTitle>
                </DialogHeader>
                <div className="flex gap-2 py-4 border-b">
                  <input
                    placeholder="New class name..."
                    className="flex-grow px-4 py-2 border rounded-xl"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                  <Button onClick={handleCreateClass} disabled={creatingClass}>
                    {creatingClass ? 'Creating...' : 'Create Code'}
                  </Button>
                </div>
                <div className="flex-grow overflow-y-auto pt-4 space-y-3">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Your Active Classes</h4>
                  {classes.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 italic">No classes created yet.</p>
                  ) : (
                    classes.map(c => (
                      <div key={c.id} className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-opacity",
                        c.active === false ? "bg-slate-50 opacity-60" : "bg-white border-blue-100 shadow-sm"
                      )}>
                        <div>
                          <p className={cn("font-bold", c.active === false ? "text-slate-500" : "text-slate-800")}>
                            {c.name}
                            {c.active === false && <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded uppercase">Retired</span>}
                          </p>
                          <p className="text-xs text-slate-400">Created {format(new Date(c.createdAt), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "px-3 py-1.5 rounded-lg border-2 border-dashed font-mono font-bold",
                            c.active === false ? "border-slate-200 text-slate-400" : "border-blue-200 text-blue-600"
                          )}>
                            {c.code}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] font-bold p-1 h-auto text-slate-400 hover:text-red-500"
                            onClick={async () => {
                              try {
                                await dbService.updateClass(c.id, { active: !c.active });
                                setClasses(prev => prev.map(cl => cl.id === c.id ? { ...cl, active: !cl.active } : cl));
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                          >
                            {c.active === false ? 'Reactivate' : 'Retire'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              onClick={exportCSV}
              className="rounded-xl gap-2 font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Submissions</p>
            <p className="text-4xl font-black text-slate-800">{submissions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">In Progress</p>
            <p className="text-4xl font-black text-amber-500">
              {submissions.filter(s => s.status === SubmissionStatus.IN_PROGRESS).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Awaiting Review</p>
            <p className="text-4xl font-black text-green-600">
              {submissions.filter(s => s.status === SubmissionStatus.SUBMITTED).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search students by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {classes.length > 0 && (
                <select 
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100"
                  value={selectedClassCode}
                  onChange={(e) => setSelectedClassCode(e.target.value)}
                >
                  <option value="all">All My Classes</option>
                  {classes.map(c => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
              )}
              <Button variant="ghost" size="sm" className="text-slate-500">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-bold text-slate-600 py-4">Student</TableHead>
                  <TableHead className="font-bold text-slate-600">Class</TableHead>
                  <TableHead className="font-bold text-slate-600">Test Pack</TableHead>
                  <TableHead className="font-bold text-slate-600">Mode</TableHead>
                  <TableHead className="font-bold text-slate-600">Status</TableHead>
                  <TableHead className="font-bold text-slate-600">Word Count (T1/T2)</TableHead>
                  <TableHead className="font-bold text-slate-600">Self-Assessed</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400">Loading records...</TableCell>
                  </TableRow>
                ) : filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((s) => (
                    <TableRow key={s.id} className="group hover:bg-slate-50/80 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{s.userName}</span>
                          <span className="text-xs text-slate-500">{s.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.classCode ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold">
                            {s.classCode}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px] italic">Private</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-600">
                        {getPackTitle(s.testPackId)}
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                          {s.mode.replace('task', 'Task ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {s.status === SubmissionStatus.SUBMITTED ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            Submitted
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                            In Progress
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {s.task1WordCount} / {s.task2WordCount}
                      </TableCell>
                      <TableCell>
                        {s.selfAssessment ? (
                          <div className="flex gap-0.5">
                            {['task1', 'task2'].map((t: any) => s.selfAssessment?.[t as keyof typeof s.selfAssessment] && (
                              <div key={t} className="w-5 h-5 bg-blue-100 text-blue-700 text-[10px] font-black rounded flex items-center justify-center">
                                {t === 'task1' ? '1' : '2'}
                              </div>
                            ))}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" />}>
                              <Trash2 className="w-4 h-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete submission?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove student's practice record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Dialog>
                            <DialogTrigger render={<Button variant="outline" size="sm" className="rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm" />}>
                              Review
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[95vw] max-w-[95vw] w-full h-[95vh] p-0 flex flex-col rounded-2xl overflow-hidden border-none shadow-2xl">
                              <DialogHeader className="hidden">
                                <DialogTitle>Review</DialogTitle>
                              </DialogHeader>
                              <Review 
                                submission={s} 
                                pack={getVirtualPack(s.testPackId) as TestPack} 
                                onBack={() => {}} 
                                user={user}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                      <div className="flex flex-col items-center">
                        <Users className="w-12 h-12 mb-4 opacity-10" />
                        No submissions found matching your search.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
