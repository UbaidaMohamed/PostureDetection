"""
Minimal Flask WSGI app used as an entrypoint for hosting on Render (or similar).

Notes:
- This is intentionally lightweight and does NOT attempt to access a webcam or run MediaPipe
  on the server. If you want server-side processing, expose an endpoint that accepts images
  (multipart/form-data) and processes them with your posture functions.
- Run with: gunicorn -w 1 -b 0.0.0.0:$PORT webapp:app
"""
from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/")
def index():
    return jsonify({"message": "PostureDetection Python service", "status": "ok"})


@app.route("/health")
def health():
    return "OK", 200


@app.route("/info")
def info():
    return jsonify({
        "python_app": "PostureDetection",
        "note": "This service is a placeholder. Do not attempt to access a local webcam from the server."
    })


@app.route("/process-image", methods=["POST"])
def process_image():
    """Placeholder endpoint that would accept an uploaded image and run posture detection on it.

    Expected: multipart/form-data with a file field named 'image'.
    Currently returns 501 to avoid running expensive or incompatible processing on the deployment host.
    """
    if "image" not in request.files:
        return jsonify({"error": "no image uploaded"}), 400

    # You can save the file and call your posture detection functions here.
    # file = request.files["image"]
    # file.save("/tmp/uploaded.jpg")
    # result = run_posture_on_file("/tmp/uploaded.jpg")

    return jsonify({"error": "server-side processing not implemented in this placeholder", "status": "not_implemented"}), 501


if __name__ == "__main__":
    # Local dev convenience: use Flask dev server when running python webapp.py
    app.run(host="0.0.0.0", port=5000, debug=True)
