import os
import sys

try:
    # Add the parent directory to the path to allow imports from foodmodel
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    sys.path.append(parent_dir)
    print(f"Parent dir added: {parent_dir}")
    print("Attempting import from app_fixed logic...")
    
    # Simulate the logic in app_fixed.py
    try:
        from foodmodel.predict import predict_image
        print("Successfully imported predict_image.")
    except ImportError as e:
        print(f"Failed to import predict_image: {e}")
        predict_image = None
    except Exception as e:
        print(f"An unexpected error occurred during import: {e}")
        predict_image = None
    
    # After the fix, this should NOT be None
    print(f"Final predict_image value: {predict_image}")
    if predict_image is not None:
        print("FIX VERIFIED!")
    else:
        print("FIX FAILED!")

except Exception as e:
    print(f"Test Exception: {e}")
    import traceback
    traceback.print_exc()
