# Simple Python backend container
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY cafe-recommend/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . ./

# Set working directory to backend
WORKDIR /app/cafe-recommend/backend

# Create necessary directories
RUN mkdir -p logs static/menu_images uploads

# Copy any existing static files
COPY cafe-recommend/backend/static ./static/ 2>/dev/null || true

# Set environment variables
ENV PYTHONPATH=/app/cafe-recommend/backend
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Start command - use environment PORT variable
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT 