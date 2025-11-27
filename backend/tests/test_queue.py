import sys
import time
from services.queue import test_task, get_task_status

def run_test():
    print("Enqueueing test task...")
    task = test_task.delay("Hello World")
    print(f"Task ID: {task.id}")
    
    print("Waiting for result...")
    for _ in range(10):
        status = get_task_status(task.id)
        print(f"Status: {status['status']}")
        
        if status['status'] == 'SUCCESS':
            print(f"Result: {status['result']}")
            return True
        elif status['status'] == 'FAILURE':
            print("Task failed!")
            return False
            
        time.sleep(1)
        
    print("Timeout waiting for result")
    return False

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)
