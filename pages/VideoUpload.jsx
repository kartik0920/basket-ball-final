import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, Film, Play } from 'lucide-react';

const FACT_ROTATE_MS = 15000;
const PROGRESS_POLL_MS = 1500;
const API_BASE = ''; // use proxy; e.g. 'http://localhost:8000' if no proxy

const fetchBasketballFact = async () => {
    try {
        const url = API_BASE ? `${API_BASE}/api/basketball-facts` : '/api/basketball-facts';
        const { data } = await axios.get(url);
        return data?.fact || 'Basketball is one of the most popular sports in the world.';
    } catch {
        return 'Basketball was invented in 1891 by Dr. James Naismith.';
    }
};

const VideoUpload = () => {
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('idle');
    const [fact, setFact] = useState('');
    const [analysisPercent, setAnalysisPercent] = useState(0);
    const [jobId, setJobId] = useState(null);
    const [filename, setFilename] = useState(null);
    const [outputFilename, setOutputFilename] = useState(null);
    const [outputReady, setOutputReady] = useState(false);
    const fileInputRef = useRef(null);

    // Show and rotate basketball facts during upload or post-upload wait
    useEffect(() => {
        if (status !== 'uploading' && status !== 'success') return;

        const setNewFact = () => {
            fetchBasketballFact().then(setFact);
        };

        setNewFact();
        const interval = setInterval(setNewFact, FACT_ROTATE_MS);
        return () => clearInterval(interval);
    }, [status]);

    // Poll analysis progress when upload is complete
    useEffect(() => {
        if (status !== 'success' || !jobId) return;

        const fetchProgress = async () => {
            try {
                const url = API_BASE ? `${API_BASE}/api/analysis-progress` : '/api/analysis-progress';
                const { data } = await axios.get(url, { params: { job_id: jobId } });
                setAnalysisPercent(data.percent ?? 0);
                setOutputReady(data.output_ready ?? false);
            } catch {
                setAnalysisPercent(0);
            }
        };

        fetchProgress();
        const interval = setInterval(fetchProgress, PROGRESS_POLL_MS);
        return () => clearInterval(interval);
    }, [status, jobId]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            uploadVideo(selectedFile);
        }
    };

    const uploadVideo = async (selectedFile) => {
        const formData = new FormData();
        formData.append('file', selectedFile);

        setStatus('uploading');
        setProgress(0);
        setAnalysisPercent(0);
        setOutputReady(false);

        try {
            const response = await axios.post('/api/upload-video', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percentCompleted);
                    }
                },
            });
            setStatus('success');
            setJobId(response.data.job_id);
            setFilename(response.data.filename);
            setOutputFilename(response.data.output_filename || `${response.data.job_id}_analyzed.avi`);
            console.log('Upload successful:', response.data);
        } catch (error) {
            console.error("Upload failed:", error);
            setStatus('idle');
            setProgress(0);
            setJobId(null);
            setFilename(null);
            setOutputFilename(null);
            alert(
                error.response?.data?.detail ||
                "Upload failed. Make sure FastAPI is running on port 8000."
            );
        }
    };

    const videoBaseUrl = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    const openOriginalVideo = () => {
        if (filename) window.open(`${videoBaseUrl}/api/videos/original/${encodeURIComponent(filename)}`, '_blank');
    };
    const openAnalyzedVideo = () => {
        if (outputFilename) window.open(`${videoBaseUrl}/api/videos/analyzed/${encodeURIComponent(outputFilename)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* UI remains the same as before, just adding the logic below */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] py-20 flex flex-col items-center">

                        {status === 'success' ? (
                            <div className="text-center w-full">
                                <CheckCircle className="w-20 h-20 text-green-500 mb-4 mx-auto" />
                                <h2 className="text-2xl font-bold text-slate-800">Upload Complete!</h2>
                                <p className="text-slate-500 mb-4">
                                    {outputReady ? 'AI analysis complete!' : 'AI analysis in progress...'}
                                </p>

                                {/* Analysis progress bar */}
                                <div className="w-64 mx-auto mb-6">
                                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                                        <span>Analysis</span>
                                        <span>{Math.min(analysisPercent, 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-500"
                                            style={{ width: `${Math.min(analysisPercent, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* View Videos buttons */}
                                <div className="flex flex-wrap gap-3 justify-center mb-6">
                                    <button
                                        onClick={openOriginalVideo}
                                        className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-5 rounded-xl transition-colors"
                                    >
                                        <Film className="w-4 h-4" />
                                        View Original Video
                                    </button>
                                    <button
                                        onClick={openAnalyzedVideo}
                                        disabled={!outputReady}
                                        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl transition-colors"
                                    >
                                        <Play className="w-4 h-4" />
                                        {outputReady ? 'View Analyzed Video' : 'Analyzing...'}
                                    </button>
                                </div>

                                {fact && (
                                    <div className="max-w-md mx-auto text-left bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Did you know?</p>
                                        <p className="text-slate-700 text-sm leading-relaxed">{fact}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-8">
                                    <Upload className="text-white w-10 h-10" />
                                </div>

                                <h2 className="text-2xl font-bold text-slate-800 mb-8">
                                    {status === 'uploading' ? `Uploading: ${progress}%` : 'Upload Your Basketball Video'}
                                </h2>

                                {status === 'uploading' && (
                                    <div className="w-64 h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
                                        <div
                                            className="h-full bg-violet-600 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}

                                {(status === 'uploading' && fact) && (
                                    <div className="max-w-md mx-auto mb-8 text-left bg-violet-50 border border-violet-200 rounded-xl px-5 py-4">
                                        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">Did you know?</p>
                                        <p className="text-slate-700 text-sm leading-relaxed">{fact}</p>
                                    </div>
                                )}

                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*" />

                                <button
                                    disabled={status === 'uploading'}
                                    onClick={() => fileInputRef.current.click()}
                                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold py-4 px-12 rounded-xl shadow-lg disabled:opacity-50"
                                >
                                    {status === 'uploading' ? 'Please Wait...' : 'Select Video File'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoUpload;