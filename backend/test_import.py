import os
import sys

try:
    # Add the parent directory to the path to allow imports from foodmodel
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    sys.path.append(parent_dir)
    print(f"Parent dir added: {parent_dir}")
    print("Attempting import...")
    from foodmodel.predict import predict_image
    print("Import successful!")
    print(f"predict_image: {predict_image}")
except ImportError as e:
    print(f"ImportError: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"Exception: {e}")
    import traceback
    traceback.print_exc()
