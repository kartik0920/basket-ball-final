from fastapi import FastAPI, UploadFile, File, HTTPException
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
    print(f"Created upload folder: {UPLOAD_DIR}")
else:
    print(f"Upload folder already exists: {UPLOAD_DIR}")


@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
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

    return {
        "message": "Upload successful",
        "filename": file.filename,
        "path": file_path,
    }


@app.get("/")
def root():
    return "Hello"


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
