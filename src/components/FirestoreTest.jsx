import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function FirestoreTest() {
    const [status, setStatus] = useState('idle'); // idle, testing, success, error
    const [message, setMessage] = useState('');

    const runWriteTest = async () => {
        setStatus('testing');
        setMessage('Attempting to write to "test_logs"...');

        try {
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Server didn't respond in 5s")), 5000));
            const writePromise = addDoc(collection(db, 'test_logs'), {
                test: true,
                createdAt: serverTimestamp(),
                userAgent: navigator.userAgent
            });

            const docRef = await Promise.race([writePromise, timeout]);
            setStatus('success');
            setMessage(`✅ Write Success! ID: ${docRef.id}`);
        } catch (error) {
            setStatus('error');
            console.error("Write Test Error:", error);
            setMessage(`❌ Write Error: ${error.message}`);
        }
    };

    const runReadTest = async () => {
        setStatus('testing');
        setMessage('Attempting to read from "test_logs"...');
        try {
            // Just try to get the collection (even if empty)
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Server didn't respond in 5s")), 5000));
            // We need to import getDocs
            const { getDocs } = await import('firebase/firestore');
            const readPromise = getDocs(collection(db, 'test_logs'));

            await Promise.race([readPromise, timeout]);
            setStatus('success');
            setMessage('✅ Read Success! Connection is open.');
        } catch (error) {
            setStatus('error');
            console.error("Read Test Error:", error);
            setMessage(`❌ Read Error: ${error.message}`);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-w-sm">
            <h3 className="font-bold text-slate-800 mb-2">Firestore Diagnostics</h3>

            <div className={`mb-4 p-3 rounded text-sm font-mono break-words ${status === 'idle' ? 'bg-slate-100 text-slate-600' :
                    status === 'testing' ? 'bg-blue-100 text-blue-700' :
                        status === 'success' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                }`}>
                {message || "Ready to test..."}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={runReadTest}
                    disabled={status === 'testing'}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 px-4 rounded transition disabled:opacity-50"
                >
                    Test Read
                </button>
                <button
                    onClick={runWriteTest}
                    disabled={status === 'testing'}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded transition disabled:opacity-50"
                >
                    Test Write
                </button>
            </div>
        </div>
    );
}
