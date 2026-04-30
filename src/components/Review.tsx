import React, { useState, useEffect } from 'react';
import { Submission, TestPack, TestMode, Annotation } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, FileText, CheckCircle2, Save, MessageSquare, Star } from 'lucide-react';
import SelfAssessmentGrid from './SelfAssessmentGrid';
import { dbService, isTeacher as checkTeacher } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { TASK1_CRITERIA, TASK2_CRITERIA } from '@/constants';
import AnnotatedText from './AnnotatedText';

interface ReviewProps {
  submission: Submission;
  pack: TestPack;
  onBack: () => void;
}

export default function Review({ submission: initialSubmission, pack, onBack, user }: ReviewProps & { user: any }) {
  const [submission, setSubmission] = useState<Submission>(initialSubmission);
  const [activeTask, setActiveTask] = useState<1 | 2>(
    submission.mode === TestMode.TASK2 ? 2 : 1
  );
  const [selfAssessment, setSelfAssessment] = useState(submission.selfAssessment || {});
  const [isSaving, setIsSaving] = useState(false);

  const isTeacher = checkTeacher(user);

  useEffect(() => {
    // If student is viewing, update lastStudentViewedAt
    if (!isTeacher && user?.uid === submission.userId) {
      dbService.updateSubmission(submission.id, {
        studentLastViewedAt: new Date().toISOString()
      });
    }
  }, [submission.id, isTeacher, user?.uid, submission.userId]);

  const handleSaveAssessment = async (task: 'task1' | 'task2', scores: Record<string, number>) => {
    const updated = { ...selfAssessment, [task]: scores };
    setSelfAssessment(updated);
    await dbService.updateSubmission(submission.id, { selfAssessment: updated });
  };

  const handleAddAnnotation = async (newAnon: Omit<Annotation, 'id' | 'createdAt' | 'authorId'>) => {
    const annotation: Annotation = {
      ...newAnon,
      id: crypto.randomUUID(),
      authorId: user.uid,
      createdAt: new Date().toISOString()
    };

    const updatedAnnotations = [...(submission.teacherAnnotations || []), annotation];
    const updatedSubmission = { 
      ...submission, 
      teacherAnnotations: updatedAnnotations,
      teacherReviewedAt: new Date().toISOString()
    };
    
    setSubmission(updatedSubmission);
    setIsSaving(true);
    await dbService.updateSubmission(submission.id, {
      teacherAnnotations: updatedAnnotations,
      teacherReviewedAt: new Date().toISOString()
    });
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleEditAnnotation = async (id: string, comment: string) => {
    const updatedAnnotations = (submission.teacherAnnotations || []).map(a => 
      a.id === id ? { ...a, comment } : a
    );
    const updatedSubmission = { 
      ...submission, 
      teacherAnnotations: updatedAnnotations,
      teacherReviewedAt: new Date().toISOString()
    };
    
    setSubmission(updatedSubmission);
    setIsSaving(true);
    await dbService.updateSubmission(submission.id, {
      teacherAnnotations: updatedAnnotations,
      teacherReviewedAt: new Date().toISOString()
    });
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleDeleteAnnotation = async (id: string) => {
    const updatedAnnotations = (submission.teacherAnnotations || []).filter(a => a.id !== id);
    const updatedSubmission = { ...submission, teacherAnnotations: updatedAnnotations };
    
    setSubmission(updatedSubmission);
    setIsSaving(true);
    await dbService.updateSubmission(submission.id, {
      teacherAnnotations: updatedAnnotations
    });
    setTimeout(() => setIsSaving(false), 500);
  };

  const currentText = activeTask === 1 ? submission.task1Response : submission.task2Response;
  const currentCriteria = activeTask === 1 ? TASK1_CRITERIA : TASK2_CRITERIA;
  const currentScores = (selfAssessment as any)[activeTask === 1 ? 'task1' : 'task2'] || {};

  const calculateBand = (scores: Record<string, number>) => {
    const values = Object.values(scores);
    if (values.length === 0) return '-';
    const sum = values.reduce((a, b) => a + b, 0);
    return (Math.floor((sum / values.length) * 2) / 2).toFixed(1);
  };

  return (
    <div className="flex flex-col h-full bg-[#F0F2F5]">
      <header className="bg-white border-b shrink-0">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">Test Review</h1>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && (
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 animate-in fade-in slide-in-from-right-4">
                <Save className="w-3 h-3 animate-pulse" />
                Saving Feedback...
              </div>
            )}
            <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-green-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SUBMITTED
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow overflow-hidden px-2 md:px-6 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-6 h-full items-stretch">
          {/* Essay View */}
          <section className="flex flex-col gap-4 h-full min-h-0">
            <div className="flex bg-white rounded-xl p-1 shadow-sm border shrink-0">
              {submission.mode !== TestMode.TASK2 && (
                <button 
                  onClick={() => setActiveTask(1)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTask === 1 ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Task 1 Response
                </button>
              )}
              {submission.mode !== TestMode.TASK1 && (
                <button 
                  onClick={() => setActiveTask(2)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTask === 2 ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Task 2 Response
                </button>
              )}
            </div>

            <Card className="border-none shadow-lg rounded-2xl flex-grow overflow-hidden flex flex-col min-h-0">
              <CardHeader className="border-b bg-slate-50/50 py-3 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Response Text</CardTitle>
                  <CardDescription className="font-mono text-xs">Words: {activeTask === 1 ? submission.task1WordCount : submission.task2WordCount}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-grow">
                <AnnotatedText 
                  text={currentText}
                  annotations={submission.teacherAnnotations || []}
                  isTeacher={isTeacher}
                  taskId={activeTask}
                  onAddAnnotation={handleAddAnnotation}
                  onDeleteAnnotation={handleDeleteAnnotation}
                  onEditAnnotation={handleEditAnnotation}
                />
                {!currentText && (
                  <div className="flex items-center justify-center h-full text-slate-300 italic">
                    No response provided for this task.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Self Assessment Column */}
          <section className="overflow-y-auto custom-scrollbar h-full pr-2">
            <Card className="border-none shadow-lg rounded-2xl overflow-hidden mb-6">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {isTeacher ? "Student Self-Assessment" : "Evaluation Summary"}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!isTeacher ? (
                  <>
                    <div className="mb-6">
                      <p className="text-sm text-slate-500 mb-4">
                        Read your response on the left and select the band scores below that best match your performance.
                      </p>
                    </div>
                    <SelfAssessmentGrid 
                      onSave={(scores) => handleSaveAssessment(activeTask === 1 ? 'task1' : 'task2', scores)}
                      initialScores={currentScores}
                      criteria={currentCriteria}
                    />
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                      <div>
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Self-Assessed Band</p>
                        <p className="text-3xl font-black text-green-700">{calculateBand(currentScores)}</p>
                      </div>
                      <Star className="w-8 h-8 text-green-200 fill-current" />
                    </div>
                    
                    <div className="space-y-3">
                      {currentCriteria.map((c) => {
                        const score = currentScores[c.id];
                        return (
                          <div key={c.id} className="p-4 rounded-xl border bg-white shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.label}</h4>
                              <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                                Band {score || '-'}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                              {score ? (c.scores as any)[score] : "No score selected"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {isTeacher && (
           <motion.div 
             initial={{ opacity: 0, y: 100 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 100 }}
             className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
           >
             <div className="bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                 <MessageSquare className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm font-bold">Review Mode: Teacher</p>
                 <p className="text-[10px] text-slate-400">Select text to add a correction note</p>
               </div>
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
