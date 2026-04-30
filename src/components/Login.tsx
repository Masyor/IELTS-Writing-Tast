import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: () => Promise<any>;
  onOpenTeacher: () => void;
}

export default function Login({ onLogin, onOpenTeacher }: LoginProps) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#f0f2f5]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-4"
      >
        <Card className="shadow-2xl border-none p-4">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-3xl">IELTS</span>
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-800">
              Writing Mock Test
            </CardTitle>
            <CardDescription className="text-slate-500 pt-2 text-base">
              The official practice environment for your IELTS journey.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={onLogin}
              className="w-full py-8 text-xl bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-2xl transition-all shadow-md flex gap-4 font-bold"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
