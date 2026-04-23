import sys
import os
print("Starting import test...")

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from foodmodel.predict import predict_image
    print("SUCCESS: predict_image imported!")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()

