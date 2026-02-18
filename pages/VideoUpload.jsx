import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, CheckCircle } from 'lucide-react';

const VideoUpload = () => {
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('idle');
    const fileInputRef = useRef(null);

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
            console.log('Upload successful:', response.data);
        } catch (error) {
            console.error("Upload failed:", error);
            setStatus('idle');
            setProgress(0);
            alert(
                error.response?.data?.detail ||
                "Upload failed. Make sure FastAPI is running on port 8000."
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* UI remains the same as before, just adding the logic below */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] py-20 flex flex-col items-center">

                        {status === 'success' ? (
                            <div className="text-center">
                                <CheckCircle className="w-20 h-20 text-green-500 mb-4 mx-auto" />
                                <h2 className="text-2xl font-bold text-slate-800">Upload Complete!</h2>
                                <p className="text-slate-500">AI Analysis is starting...</p>
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
                                    <div className="w-64 h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
                                        <div
                                            className="h-full bg-violet-600 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
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