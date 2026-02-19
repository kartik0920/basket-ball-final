from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import sys
import subprocess
import random
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# basketball-final location: Advanced Ball Tracking runs from here
BASKETBALL_FINAL_DIR = r"D:\Study\skillzo-ec2\Temp\basketball-final"
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output_videos"

for directory in (UPLOAD_DIR, OUTPUT_DIR):
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created folder: {directory}")
    else:
        print(f"Folder already exists: {directory}")


# Basketball facts for display during upload/analysis wait
BASKETBALL_FACTS = [
    "Basketball was invented by Dr. James Naismith in 1891 using two peach baskets.",
    "The first basketball game was played with a soccer ball and two peach baskets as hoops.",
    "The NBA three-point line is 23.75 feet from the hoop (22 feet in the corners).",
    "A regulation basketball hoop is 10 feet (3.05 m) high—same since 1891.",
    "Michael Jordan was cut from his high school varsity team as a sophomore.",
    "The average NBA player runs about 2.5 miles during a single game.",
    "Wilt Chamberlain scored 100 points in a single game on March 2, 1962.",
    "The shortest NBA player ever was Tyrone 'Muggsy' Bogues at 5 feet 3 inches.",
    "Basketball became an Olympic sport in 1936 at the Berlin Games.",
    "A basketball must be inflated to between 7.5 and 8.5 psi.",
    "The Harlem Globetrotters have won over 27,000 games in their history.",
    "LeBron James has been to the NBA Finals 10 times across three different teams.",
    "The term 'slam dunk' was coined by Lakers announcer Chick Hearn.",
    "FIBA (international) uses a slightly smaller basketball than the NBA.",
    "The first dunk in an NBA game was in 1946 by Bob Kurland.",
]


def run_ball_tracking_analysis(
    uploaded_path: str,
    output_path: str,
    progress_file_path: str,
) -> None:
    """Run basketball-final's Advanced Ball Tracking in the background."""
    if not os.path.isdir(BASKETBALL_FINAL_DIR):
        print(f"⚠️ basketball-final not found at {BASKETBALL_FINAL_DIR}; skipping analysis.")
        return
    main_py = os.path.join(BASKETBALL_FINAL_DIR, "main.py")
    if not os.path.isfile(main_py):
        print(f"⚠️ main.py not found in {BASKETBALL_FINAL_DIR}; skipping analysis.")
        return
    abs_upload = os.path.abspath(uploaded_path)
    abs_output = os.path.abspath(output_path)
    abs_progress = os.path.abspath(progress_file_path)
    cmd = [
        sys.executable,
        "main.py",
        "--video", abs_upload,
        "--output", abs_output,
        "--progress-file", abs_progress,
    ]
    try:
        print(f"🏀 Starting Advanced Ball Tracking: {abs_upload} -> {abs_output}")
        subprocess.run(cmd, cwd=BASKETBALL_FINAL_DIR, check=False)
        print(f"✅ Ball tracking finished: {abs_output}")
    except Exception as e:
        print(f"❌ Ball tracking error: {e}")


@app.get("/basketball-facts")
@app.get("/api/basketball-facts")
def get_basketball_fact():
    """Return a random basketball fact for display during upload/analysis wait."""
    return {"fact": random.choice(BASKETBALL_FACTS)}


@app.post("/upload-video")
@app.post("/api/upload-video")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        # Stream the file to disk (efficient for large videos)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        return {"error": f"Failed to save file: {str(e)}"}
    finally:
        file.file.close()

    # Schedule Advanced Ball Tracking (basketball-final) after upload
    base_name = os.path.splitext(file.filename)[0]
    output_filename = f"{base_name}_analyzed.avi"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    progress_file_path = os.path.join(OUTPUT_DIR, f"{base_name}_progress.json")
    background_tasks.add_task(
        run_ball_tracking_analysis,
        file_path,
        output_path,
        progress_file_path,
    )

    return {
        "message": "Upload successful",
        "filename": file.filename,
        "path": file_path,
        "analysis_started": True,
        "output_path": output_path,
        "job_id": base_name,
        "output_filename": output_filename,
    }


@app.get("/analysis-progress")
@app.get("/api/analysis-progress")
def get_analysis_progress(job_id: str):
    """Return analysis progress (percent) for a given job."""
    progress_path = os.path.join(OUTPUT_DIR, f"{job_id}_progress.json")
    if not os.path.isfile(progress_path):
        return {"percent": 0, "status": "pending", "output_ready": False}
    try:
        with open(progress_path, "r") as f:
            data = json.load(f)
        output_path = os.path.join(OUTPUT_DIR, f"{job_id}_analyzed.avi")
        output_ready = data.get("percent", 0) >= 100 and os.path.isfile(output_path)
        return {
            "percent": data.get("percent", 0),
            "status": data.get("status", "processing"),
            "output_ready": output_ready,
        }
    except Exception:
        return {"percent": 0, "status": "processing", "output_ready": False}


@app.get("/videos/original/{filename}")
@app.get("/api/videos/original/{filename}")
def serve_original_video(filename: str):
    """Serve the uploaded (original) video file."""
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(path, media_type="video/mp4")


@app.get("/videos/analyzed/{filename}")
@app.get("/api/videos/analyzed/{filename}")
def serve_analyzed_video(filename: str):
    """Serve the analyzed (ball-tracking) video file."""
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(path, media_type="video/x-msvideo")


@app.get("/")
def root():
    return "Welcome to skillzo"


def main():
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
        )
    except Exception as e:
        print(f"error as :{e}")


if __name__ == "__main__":
    main()
