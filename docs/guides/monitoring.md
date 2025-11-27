# Monitoring Background Tasks

This guide explains how to monitor the Celery task queue, which handles background jobs like Grammar Generation and Book Imports.

## 1. Using Redis CLI (Quick Check)
Since Redis is the broker, you can check the queue length directly.

### Check Queue Length
Run this command to see how many tasks are waiting in the `celery` queue:
```bash
docker compose exec redis redis-cli llen celery
```
- **0**: Queue is empty (all tasks processed or idle).
- **>0**: Tasks are waiting to be picked up.

### Monitor in Real-time
To watch tasks being added/removed in real-time:
```bash
docker compose exec redis redis-cli monitor
```
*(Press Ctrl+C to exit)*

## 2. Using Flower (Visual Dashboard)
[Flower](https://flower.readthedocs.io/en/latest/) is a web-based tool for monitoring and administrating Celery clusters.

### Installation
```bash
pip install flower
```

### Running Flower
Start it alongside your worker:
```bash
cd backend
celery -A celery_worker flower
```

### Accessing the Dashboard
Open your browser to: **[http://localhost:5555](http://localhost:5555)**

You will see:
- **Active Tasks**: Currently running jobs.
- **Processed Tasks**: History of success/failure.
- **Task Args**: See exactly what data was sent to the task.
- **Graphs**: Success/failure rates over time.

## 3. Troubleshooting

### Worker Not Starting?
Check the logs:
```bash
celery -A celery_worker worker --loglevel=info
```

### Tasks Stuck in "Pending"?
1. Check if the worker is running (`ps aux | grep celery`).
2. Check if Redis is running (`docker compose ps`).
3. Ensure the worker is connected to the correct Redis URL (check `.env`).
