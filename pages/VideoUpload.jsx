import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, Film, Play, ArrowLeft, Video } from 'lucide-react';

const FACT_ROTATE_MS = 15000;
const PROGRESS_POLL_MS = 1500;
const STORAGE_KEY_JOBS = 'basketball_jobs';
const API_BASE = ''; // use proxy; e.g. 'http://localhost:8000' if no proxy

const getStoredJobs = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_JOBS);
        if (stored) return JSON.parse(stored);
        const legacy = localStorage.getItem('basketball_last_job');
        if (legacy) {
            const data = JSON.parse(legacy);
            const jobs = [{ jobId: data.jobId, filename: data.filename, outputFilename: data.outputFilename || `${data.jobId}/a.mp4` }];
            localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
            localStorage.removeItem('basketball_last_job');
            return jobs;
        }
    } catch (_) { }
    return [];
};

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
    const [analysisStatus, setAnalysisStatus] = useState('');
    const [jobId, setJobId] = useState(null);
    const [filename, setFilename] = useState(null);
    const [outputFilename, setOutputFilename] = useState(null);
    const [outputReady, setOutputReady] = useState(false);
    const [showAllVideos, setShowAllVideos] = useState(false);
    const [allJobs, setAllJobs] = useState([]);
    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!showAllVideos) return;
        const close = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowAllVideos(false);
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showAllVideos]);

    // Load jobs from localStorage on mount
    useEffect(() => {
        setAllJobs(getStoredJobs());
    }, []);

    // Restore most recent job on mount (survives refresh)
    useEffect(() => {
        const jobs = getStoredJobs();
        if (jobs.length > 0 && status === 'idle') {
            const latest = jobs[0];
            setStatus('success');
            setJobId(latest.jobId);
            setFilename(latest.filename);
            setOutputFilename(latest.outputFilename || `${latest.jobId}/a.mp4`);
        }
    }, []);

    // Save job to list when we have a successful upload
    useEffect(() => {
        if (status === 'success' && jobId && filename) {
            const newJob = {
                jobId,
                filename,
                outputFilename: outputFilename || `${jobId}/a.mp4`,
            };
            setAllJobs((prev) => {
                const filtered = prev.filter((j) => j.jobId !== jobId);
                const updated = [newJob, ...filtered];
                localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(updated));
                return updated;
            });
        }
    }, [status, jobId, filename, outputFilename]);

    const goBackToUpload = () => {
        setStatus('idle');
        setFile(null);
        setProgress(0);
        setAnalysisPercent(0);
        setAnalysisStatus('');
        setJobId(null);
        setFilename(null);
        setOutputFilename(null);
        setOutputReady(false);
    };

    const selectJob = (job) => {
        setStatus('success');
        setJobId(job.jobId);
        setFilename(job.filename);
        setOutputFilename(job.outputFilename || `${job.jobId}/a.mp4`);
        setOutputReady(false);
        setAnalysisPercent(0);
        setShowAllVideos(false);
    };

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
                if (data.status) setAnalysisStatus(data.status);
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
        setAnalysisStatus('');
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
            setOutputFilename(response.data.output_filename || `${response.data.job_id}/a.mp4`);
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
    const originalVideoUrl = filename ? `${videoBaseUrl}/api/videos/original/${encodeURIComponent(filename)}` : null;
    const analyzedVideoUrl = outputFilename ? `${videoBaseUrl}/api/videos/analyzed/${outputFilename}` : null;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* UI remains the same as before, just adding the logic below */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] py-20 flex flex-col items-center">

                        {status === 'success' ? (
                            <div className="text-center w-full">
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                    <button
                                        onClick={goBackToUpload}
                                        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        Upload Another Video
                                    </button>
                                    {allJobs.length > 1 && (
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setShowAllVideos(!showAllVideos)}
                                                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium"
                                            >
                                                <Video className="w-5 h-5" />
                                                Switch video ({allJobs.length})
                                            </button>
                                            {showAllVideos && (
                                                <div className="absolute right-0 top-full mt-1 min-w-[280px] max-h-60 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-10">
                                                    {allJobs.map((job) => (
                                                        <button
                                                            key={job.jobId}
                                                            type="button"
                                                            onClick={() => selectJob(job)}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-medium truncate"
                                                        >
                                                            {job.filename || job.jobId}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <CheckCircle className="w-20 h-20 text-green-500 mb-4 mx-auto" />
                                <h2 className="text-2xl font-bold text-slate-800">Upload Complete!</h2>
                                <p className="text-slate-500 mb-4">
                                    {outputReady ? 'AI analysis complete!' : (analysisStatus ? `${analysisStatus.replace(/_/g, ' ')}...` : 'AI analysis in progress...')}
                                </p>

                                {/* Analysis progress bar */}
                                <div className="w-64 mx-auto mb-6">
                                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                                        <span>Analysis</span>
                                        <span>{Math.min(analysisPercent, 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-emerald-500 transition-all duration-500 ${analysisPercent === 0 && !outputReady ? 'indeterminate-progress' : ''}`}
                                            style={{ width: analysisPercent === 0 && !outputReady ? '40%' : `${Math.min(analysisPercent, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Video cards - embedded on page */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {/* Original video card */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2 bg-slate-100 flex items-center gap-2">
                                            <Film className="w-4 h-4 text-slate-600" />
                                            <span className="font-semibold text-slate-700">Original Video</span>
                                        </div>
                                        <div className="aspect-video bg-black">
                                            {originalVideoUrl && (
                                                <video
                                                    src={originalVideoUrl}
                                                    controls
                                                    className="w-full h-full object-contain"
                                                    playsInline
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {/* Analyzed video card */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2 bg-violet-100 flex items-center gap-2">
                                            <Play className="w-4 h-4 text-violet-600" />
                                            <span className="font-semibold text-violet-700">
                                                {outputReady ? 'Analyzed Video' : 'Analyzed Video (processing...)'}
                                            </span>
                                        </div>
                                        <div className="aspect-video bg-black flex items-center justify-center">
                                            {outputReady && analyzedVideoUrl ? (
                                                <video
                                                    src={analyzedVideoUrl}
                                                    controls
                                                    className="w-full h-full object-contain"
                                                    playsInline
                                                    preload="metadata"
                                                    onError={(e) => {
                                                        console.error('Analyzed video failed to load:', analyzedVideoUrl, e);
                                                    }}
                                                />
                                            ) : (
                                                <p className="text-slate-400 text-sm">Analysis in progress...</p>
                                            )}
                                        </div>
                                    </div>
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

                                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                    <button
                                        disabled={status === 'uploading'}
                                        onClick={() => fileInputRef.current.click()}
                                        className="bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold py-4 px-12 rounded-xl shadow-lg disabled:opacity-50"
                                    >
                                        {status === 'uploading' ? 'Please Wait...' : 'Select Video File'}
                                    </button>
                                    {allJobs.length > 0 && (
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                type="button"
                                                disabled={status === 'uploading'}
                                                onClick={() => setShowAllVideos(!showAllVideos)}
                                                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-4 px-6 rounded-xl border border-slate-200 disabled:opacity-50"
                                            >
                                                <Video className="w-5 h-5" />
                                                View all uploads ({allJobs.length})
                                            </button>
                                            {showAllVideos && (
                                                <div className="absolute top-full left-0 mt-1 min-w-[280px] max-h-60 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-10">
                                                    {allJobs.map((job) => (
                                                        <button
                                                            key={job.jobId}
                                                            type="button"
                                                            onClick={() => selectJob(job)}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-medium truncate"
                                                        >
                                                            {job.filename || job.jobId}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoUpload;